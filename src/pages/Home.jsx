import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
    const { products, placeBid, loading: auctionLoading } = useAuction();
    const { user } = useAuth();
    const [cooldown, setCooldown] = useState({});

    const maskEmail = (email) => {
        if (!email) return '系統用戶';
        // If it's a UUID (guest/placeholder), mask it or show generic name
        if (email.length > 30) return '用戶 ' + email.slice(0, 5) + '...';
        const parts = email.split('@');
        if (parts.length < 2) return email;
        if (parts[0].length <= 5) return '*****@' + parts[1];
        return parts[0].slice(0, -5) + '*****@' + parts[1];
    };

    const handleBid = async (productId, minIncrement, currentBids) => {
        if (!user.is_verified) {
            alert('您尚未通過人工驗證，請聯繫管理員。');
            return;
        }

        if (cooldown[productId]) {
            alert('深呼吸一下');
            return;
        }

        const currentPrice = currentBids.length > 0 ? currentBids[0].amount : 0;
        const product = products.find(p => p.id === productId);
        const minBid = Math.max(product.startPrice, currentPrice + minIncrement);

        const amount = prompt(`請輸入出價金額 (最低 ${minBid}):`, minBid);

        if (amount && Number(amount) >= minBid) {
            try {
                await placeBid(productId, Number(amount));
                setCooldown(prev => ({ ...prev, [productId]: true }));
                setTimeout(() => {
                    setCooldown(prev => ({ ...prev, [productId]: false }));
                }, 5000);
            } catch (err) {
                alert('出價失敗，請稍後再試');
            }
        } else if (amount) {
            alert('金額不足！');
        }
    };

    if (auctionLoading) return <div className="loading-container">讀取中...</div>;

    return (
        <div className="home-container">
            <div className="product-grid">
                {products.map(product => {
                    const currentPrice = product.bids.length > 0 ? product.bids[0].amount : product.startPrice;
                    const isEnded = new Date(product.endTime) < new Date();

                    return (
                        <div key={product.id} className="product-card glass-card">
                            <div className="product-image" style={{ backgroundImage: `url(${product.image})` }}>
                                {isEnded && <div className="ended-overlay">已結束</div>}
                            </div>
                            <div className="product-info">
                                <h3>{product.name}</h3>
                                <div className="price-info">
                                    <span className="label">目前最高價</span>
                                    <span className="amount">${currentPrice}</span>
                                </div>
                                <div className="meta-info">
                                    <span>結束時間: {new Date(product.endTime).toLocaleString()}</span>
                                    <span>最低加價: ${product.minIncrement}</span>
                                </div>

                                {user && !user.isAdmin && !isEnded && (
                                    <button
                                        className="btn-primary bid-btn"
                                        onClick={() => handleBid(product.id, product.minIncrement, product.bids)}
                                        disabled={cooldown[product.id]}
                                    >
                                        {cooldown[product.id] ? '深呼吸一下' : '我要出價'}
                                    </button>
                                )}

                                <div className="bid-history">
                                    <h4>出價紀錄</h4>
                                    <BidHistory bids={product.bids} maskEmail={maskEmail} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const BidHistory = ({ bids, maskEmail }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const displayBids = isExpanded ? bids : bids.slice(0, 3);

    if (bids.length === 0) return <p className="no-bids">暫無出價</p>;

    return (
        <div className="history-list-wrapper">
            <div className="history-list">
                {displayBids.map((bid, i) => (
                    <div key={i} className="history-item">
                        <span className="bidder">{maskEmail(bid.email)}</span>
                        <span className="time">{new Date(bid.time).toLocaleTimeString()}</span>
                        <span className="price">${bid.amount}</span>
                    </div>
                ))}
            </div>
            {bids.length > 3 && (
                <button
                    className="toggle-history-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? '收起紀錄' : `顯示全部 (${bids.length})`}
                </button>
            )}
        </div>
    );
};

export default Home;
