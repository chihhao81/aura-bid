import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuctionContext = createContext();

export const AuctionProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const ensureUTC = (dateStr) => {
        if (!dateStr) return null;
        if (dateStr.includes('Z')) return dateStr;
        return dateStr.replace(' ', 'T') + 'Z';
    };

    const fetchAuctions = async () => {
        setLoading(true);
        try {
            // Fetch auctions with status not 'closed'
            const { data: auctions, error: auctionError } = await supabase
                .from('auctions')
                .select('*')
                .neq('status', 'closed')
                .order('end_time', { ascending: true });

            if (auctionError) throw auctionError;

            // Fetch bids for these auctions
            const { data: bids, error: bidError } = await supabase
                .from('bids')
                .select('*')
                .in('auction_id', auctions.map(a => a.id))
                .order('created_at', { ascending: false });

            if (bidError) throw bidError;

            // Generate signed URLs for all unique product_ids
            const productIds = [...new Set(auctions.map(a => a.product_id))];
            const { data: signedUrls } = await supabase
                .storage
                .from('product_images')
                .createSignedUrls(productIds.map(id => `${id}.jpg`), 3600);

            // Map data to the format used by the frontend
            const formattedProducts = auctions.map(a => {
                const signedUrlObj = signedUrls?.find(s => s.path === `${a.product_id}.jpg`);
                return {
                    id: a.id,
                    name: a.title,
                    description: a.description,
                    image: signedUrlObj?.signedUrl || 'https://via.placeholder.com/300?text=No+Image',
                    startPrice: a.start_price,
                    minIncrement: a.min_increment,
                    startTime: ensureUTC(a.start_time),
                    endTime: ensureUTC(a.end_time),
                    status: a.status,
                    bids: bids.filter(b => b.auction_id === a.id).map(b => ({
                        id: b.id,
                        email: b.user_id,
                        amount: b.bid_amount,
                        time: ensureUTC(b.created_at)
                    }))
                };
            });

            setProducts(formattedProducts);
        } catch (error) {
            console.error('Error fetching auctions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuctions();

        const channel = supabase
            .channel('bids-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'bids' },
                payload => {
                    const newBid = payload.new;
                    setProducts(prev => prev.map(p => {
                        if (p.id === newBid.auction_id) {
                            if (p.bids.some(b => b.id === newBid.id)) return p;
                            return {
                                ...p,
                                bids: [{
                                    id: newBid.id,
                                    email: newBid.user_id, // For now displaying system record
                                    amount: newBid.bid_amount,
                                    time: ensureUTC(newBid.created_at)
                                }, ...p.bids]
                            };
                        }
                        return p;
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const addProduct = async (product) => {
        // Implementation for admin (could be RPC but let's see if we need it)
        // User requested RPC for addProduct
    };

    const placeBid = async (productId, amount) => {
        try {
            const { error } = await supabase.rpc('place_bid', {
                p_auction_id: productId,
                p_amount: amount
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error placing bid:', error);
            throw error;
        }
    };

    return (
        <AuctionContext.Provider value={{ products, loading, fetchAuctions, addProduct, placeBid }}>
            {children}
        </AuctionContext.Provider>
    );
};

export const useAuction = () => useContext(AuctionContext);
