import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuctionContext = createContext();

export const AuctionProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAuctions = async () => {
        setLoading(true);
        try {
            // Fetch auctions with status 'active' and their images
            const { data: auctions, error: auctionError } = await supabase
                .from('auctions')
                .select('*, auction_images(image_url)')
                .eq('status', 'active')
                .order('end_time', { ascending: true });

            if (auctionError) throw auctionError;

            // Fetch bids for these auctions
            const { data: bids, error: bidError } = await supabase
                .from('bids')
                .select('*')
                .in('auction_id', auctions.map(a => a.id))
                .order('created_at', { ascending: false });

            if (bidError) throw bidError;

            // Map data to the format used by the frontend
            const formattedProducts = auctions.map(a => ({
                id: a.id,
                name: a.title,
                description: a.description,
                image: a.auction_images?.[0]?.image_url || 'https://via.placeholder.com/400',
                startPrice: a.start_price,
                minIncrement: a.min_increment,
                endTime: a.end_time,
                bids: bids.filter(b => b.auction_id === a.id).map(b => ({
                    id: b.id,
                    email: b.user_id, // We'll need to join with profiles if we want email, for now use ID or assume current user. 
                    // Actually user_id is the foreign key to profiles.
                    amount: b.bid_amount,
                    time: b.created_at
                }))
            }));

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
                                    time: newBid.created_at
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
