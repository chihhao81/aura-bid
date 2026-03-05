import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';

const AuctionContext = createContext();

export const AuctionProvider = ({ children }) => {
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const { user } = useAuth();

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Sound play error:', e));
    };

    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        playNotificationSound();
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const ensureUTC = (dateStr) => {
        if (!dateStr) return null;
        if (dateStr.includes('Z')) return dateStr;
        return dateStr.replace(' ', 'T') + 'Z';
    };

    const fetchAuctions = async () => {
        setLoading(true);
        try {
            const { data: auctionsData, error: auctionError } = await supabase
                .from('auctions')
                .select('*')
                .neq('status', 'closed');

            if (auctionError) throw auctionError;

            // Fetch bids
            const { data: bids, error: bidError } = await supabase
                .from('bids')
                .select('id, user_id, bid_amount, created_at, auction_id')
                .in('auction_id', auctionsData.map(a => a.id))
                .order('created_at', { ascending: false });

            if (bidError) throw bidError;

            // Fetch profiles for all bidders
            const userIds = [...new Set(bids.map(b => b.user_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, line_group_display_name')
                .in('id', userIds);

            const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product_images`;

            const formattedAuctions = auctionsData.map(a => {
                return {
                    id: a.id,
                    name: a.title,
                    description: a.description,
                    image: `${STORAGE_URL}/${a.product_id}.jpg`,
                    startPrice: a.start_price,
                    minIncrement: a.min_increment,
                    startTime: ensureUTC(a.start_time),
                    endTime: ensureUTC(a.end_time),
                    status: a.status,
                    product_id: a.product_id,
                    bids: bids.filter(b => b.auction_id === a.id).map(b => {
                        const profile = profiles?.find(p => p.id === b.user_id);
                        return {
                            id: b.id,
                            email: b.user_id,
                            line_group_name: profile?.line_group_display_name || '未加入群組',
                            amount: b.bid_amount,
                            time: ensureUTC(b.created_at)
                        };
                    })
                };
            });

            // Sorting logic: active > upcoming > ended, then by endTime ascending
            const sorted = formattedAuctions.sort((a, b) => {
                const statusOrder = { 'active': 1, 'upcoming': 2, 'ended': 3 };
                if (statusOrder[a.status] !== statusOrder[b.status]) {
                    return statusOrder[a.status] - statusOrder[b.status];
                }
                return new Date(a.endTime) - new Date(b.endTime);
            });

            setAuctions(sorted);
        } catch (error) {
            console.error('Error fetching auctions:', error);
        } finally {
            setLoading(false);
        }
    };

    const auctionsRef = React.useRef(auctions);
    useEffect(() => {
        auctionsRef.current = auctions;
    }, [auctions]);

    useEffect(() => {
        fetchAuctions();

        // 監聽出價更新
        const bidsChannel = supabase
            .channel('bids-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bids' },
                async (payload) => {
                    console.log('Bid Realtime Event:', payload);
                    const newBid = payload.new;

                    // 1. 先處理通知 (副作用移出 setAuctions)
                    const targetAuction = auctionsRef.current.find(a => a.id === newBid.auction_id);
                    if (targetAuction && user && newBid.user_id !== user.id) {
                        const userHasBid = targetAuction.bids.some(b => b.email === user.id);
                        if (userHasBid) {
                            addNotification(`通知：拍賣「${targetAuction.name}」有了新的出價 $${newBid.bid_amount}，您已被超標！`, 'warning');
                        }
                    }

                    // 2. 更新狀態 (純函數)
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('line_group_display_name')
                        .eq('id', newBid.user_id)
                        .single();

                    setAuctions(prev => prev.map(a => {
                        if (a.id === newBid.auction_id) {
                            if (a.bids.some(b => b.id === newBid.id)) return a;

                            return {
                                ...a,
                                bids: [{
                                    id: newBid.id,
                                    email: newBid.user_id,
                                    line_group_name: profile?.line_group_display_name || '未加入群組',
                                    amount: newBid.bid_amount,
                                    time: ensureUTC(newBid.created_at)
                                }, ...a.bids]
                            };
                        }
                        return a;
                    }));
                }
            )
            .subscribe();

        // 監聽拍賣狀態更新
        const auctionsChannel = supabase
            .channel('auctions-status')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'auctions' },
                payload => {
                    const updatedAuction = payload.new;

                    // 1. 先處理通知
                    const oldAuction = auctionsRef.current.find(a => a.id === updatedAuction.id);
                    if (oldAuction && updatedAuction.status === 'ended' && oldAuction.status !== 'ended') {
                        if (user && oldAuction.bids.length > 0 && oldAuction.bids[0].email === user.id) {
                            addNotification(`恭喜！您已成功得標拍賣「${oldAuction.name}」！請盡速私訊官方帳號進行後續處理。`, 'success');
                        }
                    }

                    // 2. 更新狀態
                    setAuctions(prev => {
                        const newAuctions = prev.map(a => {
                            if (a.id === updatedAuction.id) {
                                return {
                                    ...a,
                                    status: updatedAuction.status,
                                    startTime: ensureUTC(updatedAuction.start_time),
                                    endTime: ensureUTC(updatedAuction.end_time)
                                };
                            }
                            return a;
                        });

                        return [...newAuctions].sort((a, b) => {
                            const statusOrder = { 'active': 1, 'upcoming': 2, 'ended': 3 };
                            if (statusOrder[a.status] !== statusOrder[b.status]) {
                                return statusOrder[a.status] - statusOrder[b.status];
                            }
                            return new Date(a.endTime) - new Date(b.endTime);
                        });
                    });
                }
            )
            .subscribe();

        return () => {
            console.log('Cleaning up realtime channels');
            supabase.removeChannel(bidsChannel);
            supabase.removeChannel(auctionsChannel);
        };
    }, [user?.id]);

    const addProduct = async (product) => {
        // Implementation for admin
    };

    const placeBid = async (auctionId, amount) => {
        const { error } = await supabase.rpc('place_bid', {
            p_auction_id: auctionId,
            p_amount: amount
        });

        if (error) {
            console.error('Error in place_bid RPC:', error);
            // Throw the actual message from Postgres (e.g. "You are already the highest bidder")
            throw new Error(error.message || '出價失敗');
        }
    };

    return (
        <AuctionContext.Provider value={{
            auctions,
            loading,
            fetchAuctions,
            addProduct,
            placeBid,
            notifications,
            removeNotification
        }}>
            {children}
            <div className="toast-container">
                {notifications.map(n => (
                    <div key={n.id} className={`toast-item ${n.type}`}>
                        <div className="toast-content">{n.message}</div>
                        <button className="toast-close" onClick={() => removeNotification(n.id)}>&times;</button>
                    </div>
                ))}
            </div>
        </AuctionContext.Provider>
    );
};

export const useAuction = () => useContext(AuctionContext);
