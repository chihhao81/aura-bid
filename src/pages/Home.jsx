import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
    const { auctions, placeBid, fetchAuctions, loading: auctionLoading } = useAuction();
    const { user } = useAuth();
    const [cooldown, setCooldown] = useState({});
    const [historyModal, setHistoryModal] = useState({ show: false, bids: [], auctionName: '' });
    const [descModal, setDescModal] = useState({ show: false, content: '', title: '' });

    const maskEmail = (email) => {
        if (!email) return '系統用戶';
        // If it's a UUID (guest/placeholder), mask it or show generic name
        if (email.length > 30) return '用戶 ' + email.slice(0, 5) + '...';
        const parts = email.split('@');
        if (parts.length < 2) return email;
        if (parts[0].length <= 5) return '*****@' + parts[1];
        return parts[0].slice(0, -5) + '*****@' + parts[1];
    };

    const handleBid = async (auctionId, minIncrement, currentBids) => {
        if (!user.is_verified) {
            alert('您尚未通過人工驗證，請聯繫Line官方帳號。\nLine Id: @056qctjm');
            return;
        }

        if (cooldown[auctionId]) {
            alert('深呼吸一下');
            return;
        }

        const auction = auctions.find(a => a.id === auctionId);
        const currentPrice = currentBids.length > 0 ? currentBids[0].amount : auction.startPrice;
        const minBid = currentPrice + minIncrement;

        const amount = prompt(`請輸入出價金額 (最低 ${minBid}):`, minBid);

        if (amount && Number(amount) >= minBid) {
            try {
                await placeBid(auctionId, Number(amount));
                // Fallback: manually fetch if realtime is slow
                await fetchAuctions();

                setCooldown(prev => ({ ...prev, [auctionId]: true }));
                setTimeout(() => {
                    setCooldown(prev => ({ ...prev, [auctionId]: false }));
                }, 5000);
            } catch (err) {
                alert(err.message || '出價失敗，請稍後再試');
            }
        } else if (amount) {
            alert('金額不足！');
        }
    };

    if (auctionLoading) return <div className="loading-container">讀取中...</div>;

    return (
        <div className="home-container">
            {auctions.length === 0 ? (
                <div className="no-products-container glass-card">
                    <p>目前沒有競標中的商品</p>
                </div>
            ) : (
                <div className="product-grid">
                    {auctions.map(auction => {
                        const currentPrice = auction.bids.length > 0 ? auction.bids[0].amount : auction.startPrice;
                        const parseUTC = (dateStr) => {
                            if (!dateStr) return new Date();
                            if (dateStr.includes('Z')) return new Date(dateStr);
                            return new Date(dateStr.replace(' ', 'T') + 'Z');
                        };
                        const isEnded = auction.status === 'ended' || parseUTC(auction.endTime) < new Date();
                        const isUpcoming = !isEnded && (auction.status === 'upcoming' || parseUTC(auction.startTime) > new Date());

                        return (
                            <AuctionCard
                                key={auction.id}
                                auction={auction}
                                user={user}
                                isUpcoming={isUpcoming}
                                isEnded={isEnded}
                                handleBid={handleBid}
                                cooldown={cooldown}
                                setHistoryModal={setHistoryModal}
                                setDescModal={setDescModal}
                            />
                        );
                    })}
                </div>
            )}

            {historyModal.show && (
                <div className="modal-overlay" onClick={() => setHistoryModal({ ...historyModal, show: false })}>
                    <div className="modal-content glass-card history-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{historyModal.auctionName} - 完整出價紀錄</h3>
                            <button className="close-btn" onClick={() => setHistoryModal({ ...historyModal, show: false })}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>出價者</th>
                                        <th>時間</th>
                                        <th>金額</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyModal.bids.map((bid, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div className="bidder-info">
                                                    <span className="group-name-detail">{bid.line_group_name}</span>
                                                </div>
                                            </td>
                                            <td>{new Date(bid.time).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="price-detail">${bid.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={() => setHistoryModal({ ...historyModal, show: false })}>關閉</button>
                        </div>
                    </div>
                </div>
            )}

            {descModal.show && (
                <div className="modal-overlay" onClick={() => setDescModal({ ...descModal, show: false })}>
                    <div className="modal-content glass-card desc-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{descModal.title} - 商品詳情</h3>
                            <button className="close-btn" onClick={() => setDescModal({ ...descModal, show: false })}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="full-description">
                                {descModal.content}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={() => setDescModal({ ...descModal, show: false })}>關閉</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
const AuctionCard = ({ auction, user, isUpcoming, isEnded, handleBid, cooldown, setHistoryModal, setDescModal }) => {
    const currentPrice = auction.bids.length > 0 ? auction.bids[0].amount : auction.startPrice;
    const [isTension, setIsTension] = useState(false);

    return (
        <div className={`product-card glass-card ${isUpcoming ? 'is-upcoming' : ''} ${isEnded ? 'is-ended' : ''} ${isTension ? 'tension-pulse' : ''}`}>
            <div className="product-image" style={{ backgroundImage: `url(${auction.image})` }}>
                {isUpcoming && <div className="status-overlay upcoming">即將開始</div>}
                {isEnded && <div className="status-overlay ended">已結束</div>}
            </div>
            <div className="product-info">
                <h3>{auction.name}</h3>
                {auction.description && (
                    <div
                        className="product-description"
                        onClick={() => setDescModal({ show: true, content: auction.description, title: auction.name })}
                    >
                        {auction.description}
                    </div>
                )}
                <div className="price-info">
                    <span className="label">
                        {isUpcoming ? '起標價格' : (isEnded ? '得標價' : '目前最高價')}
                    </span>
                    <span className="amount">${currentPrice}</span>
                </div>
                <div className="meta-info">
                    {isUpcoming && <span>開始時間: {new Date(auction.startTime).toLocaleString()}</span>}
                    {!isEnded && !isUpcoming && (
                        <div className="countdown-wrapper">
                            <span className="label">剩餘時間: </span>
                            <CountdownTimer
                                endTime={auction.endTime}
                                onTensionChange={setIsTension}
                            />
                        </div>
                    )}
                    <span>結束時間: {new Date(auction.endTime).toLocaleString()}</span>
                    <span>最低加價: ${auction.minIncrement}</span>
                </div>

                {isEnded && auction.bids.length > 0 && (
                    <div className="winner-announcement">
                        <p>🏆 恭喜：{auction.bids[0].line_group_name}</p>
                    </div>
                )}

                {user && !user.isAdmin && !isEnded && !isUpcoming && (
                    <button
                        className="btn-primary bid-btn"
                        onClick={() => handleBid(auction.id, auction.minIncrement, auction.bids)}
                        disabled={cooldown[auction.id]}
                    >
                        {cooldown[auction.id] ? '深呼吸一下' : '我要出價'}
                    </button>
                )}

                <div className="bid-history">
                    <h4>出價紀錄</h4>
                    <BidHistory
                        bids={auction.bids}
                        onShowAll={() => setHistoryModal({ show: true, bids: auction.bids, auctionName: auction.name })}
                    />
                </div>
            </div>
        </div>
    );
};

const CountdownTimer = ({ endTime, onTensionChange }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const end = new Date(endTime.replace(' ', 'T') + (endTime.includes('Z') ? '' : 'Z'));
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('已結束');
                onTensionChange(false);
                return;
            }

            // Check for tension (less than 1 minute)
            if (diff < 60000) {
                onTensionChange(true);
            } else {
                onTensionChange(false);
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            let timeStr = '';
            if (days > 0) timeStr += `${days}天 `;
            timeStr += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            setTimeLeft(timeStr);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [endTime, onTensionChange]);

    return <span className={`timer-text ${timeLeft === '已結束' ? 'ended' : ''}`}>{timeLeft}</span>;
};

const BidHistory = ({ bids, onShowAll }) => {
    const displayBids = bids.slice(0, 3);

    if (bids.length === 0) return <p className="no-bids">暫無出價</p>;

    return (
        <div className="history-list-wrapper">
            <div className="history-list">
                {displayBids.map((bid, i) => (
                    <div key={i} className="history-item">
                        <span className="bidder">
                            <span className="group-name-only">{bid.line_group_name}</span>
                        </span>
                        <span className="time">{new Date(bid.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="price">${bid.amount}</span>
                    </div>
                ))}
            </div>
            {bids.length > 0 && (
                <button
                    className="toggle-history-btn"
                    onClick={onShowAll}
                >
                    顯示完整紀錄 ({bids.length})
                </button>
            )}
        </div>
    );
};

export default Home;
