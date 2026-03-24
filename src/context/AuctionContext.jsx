import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from './AuthContext';
import { SUPABASE_URL } from '../utils/envConfig';
import { ensureUTC, sortAuctions } from '../utils/auctionUtils';

const AuctionContext = createContext();

export const AuctionProvider = ({ children }) => {
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const { user } = useAuth();
    const notifiedWonAuctions = React.useRef(new Set());
    const notifiedOutbids = React.useRef(new Set());
    const profilesCache = React.useRef(new Map());

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Sound play error:', e));
    };

    const addNotification = (message, type = 'info', auctionId = null) => {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        setNotifications(prev => {
            const updated = [...prev, { id, message, type, auctionId }];
            return updated.slice(-3); // 只保留最後 3 個通知
        });
        playNotificationSound();
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };


    const formatAuctionsData = (auctionsData, bids, profiles) => {
        const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/product_images`;

        return auctionsData.map(a => ({
            id: a.id,
            name: a.title,
            description: a.description,
            image: `${STORAGE_URL}/${a.product_id}.jpg`,
            startPrice: a.start_price,
            minIncrement: a.min_increment,
            startTime: ensureUTC(a.start_time),
            endTime: ensureUTC(a.end_time),
            createdAt: ensureUTC(a.created_at),
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
        }));
    };

    const fetchRawData = async () => {
        const { data: auctionsData, error: auctionError } = await supabase
            .from('auctions')
            .select('*')
            .neq('status', 'closed');

        if (auctionError) throw auctionError;

        const { data: bids, error: bidError } = await supabase
            .from('bids')
            .select('id, user_id, bid_amount, created_at, auction_id')
            .in('auction_id', auctionsData.map(a => a.id))
            .order('created_at', { ascending: false });

        if (bidError) throw bidError;

        const userIds = [...new Set(bids.map(b => b.user_id))];
        const uncachedIds = userIds.filter(id => !profilesCache.current.has(id));

        if (uncachedIds.length > 0) {
            const { data: newProfiles } = await supabase
                .from('profiles')
                .select('id, line_group_display_name')
                .in('id', uncachedIds);

            newProfiles?.forEach(p => profilesCache.current.set(p.id, p));
        }

        const profiles = userIds.map(id => profilesCache.current.get(id)).filter(Boolean);

        return formatAuctionsData(auctionsData, bids, profiles);
    };

    const fetchAuctions = async () => {
        setLoading(true);
        try {
            const formatted = await fetchRawData();
            setAuctions(sortAuctions(formatted));
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
        if (!user) {
            setAuctions([]);
            setLoading(false);
            return;
        }

        fetchAuctions();

        const intervalId = setInterval(async () => {
            try {
                const freshAuctions = await fetchRawData();
                const oldAuctions = auctionsRef.current;

                // 被超標通知：找出新的出價，且出價者不是自己、自己有出過價
                if (user) {
                    for (const freshA of freshAuctions) {
                        const oldA = oldAuctions.find(a => a.id === freshA.id);
                        if (!oldA) continue;

                        const oldBidIds = new Set(oldA.bids.map(b => b.id));
                        const newBids = freshA.bids.filter(b => !oldBidIds.has(b.id));

                        for (const newBid of newBids) {
                            if (newBid.email !== user.id) {
                                const userHasBid = oldA.bids.some(b => b.email === user.id);
                                if (userHasBid && !notifiedOutbids.current.has(newBid.id)) {
                                    notifiedOutbids.current.add(newBid.id);
                                    addNotification(`通知：拍賣「${freshA.name}」有了新的出價 $${newBid.amount}，您已被超標！`, 'warning', freshA.id);
                                }
                            }
                        }

                        // 得標通知：拍賣從非 ended 變成 ended，且最高出價者是自己
                        if (freshA.status === 'ended' && oldA.status !== 'ended') {
                            if (freshA.bids.length > 0 && freshA.bids[0].email === user.id) {
                                if (!notifiedWonAuctions.current.has(freshA.id)) {
                                    notifiedWonAuctions.current.add(freshA.id);
                                    addNotification(`恭喜！您已成功得標拍賣「${freshA.name}」！請盡速私訊官方帳號進行後續處理。`, 'success');
                                }
                            }
                        }
                    }
                }

                setAuctions(sortAuctions(freshAuctions));
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 5000);

        return () => clearInterval(intervalId);
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
            // 發生出價錯誤（如：價格已被更新），立刻重新拉取最新資料
            await fetchAuctions();
            // Throw the actual message from Postgres (e.g. "You are already the highest bidder")
            throw new Error(error.message || '出價失敗');
        }
        
        // 出價成功也主動更新一下，讓 UI 立即反應
        await fetchAuctions();
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
                    <div
                        key={n.id}
                        className={`toast-item ${n.type}`}
                        onClick={() => {
                            if (n.auctionId) {
                                const el = document.getElementById(`auction-${n.auctionId}`);
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    // 增加一個短暫的高亮效果或移除通知
                                    removeNotification(n.id);
                                }
                            }
                        }}
                    >
                        <div className="toast-content">{n.message}</div>
                        <button
                            className="toast-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(n.id);
                            }}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </AuctionContext.Provider>
    );
};

export const useAuction = () => useContext(AuctionContext);
