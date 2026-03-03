import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import './Admin.css';

const Admin = () => {
    const { addProduct } = useAuction();
    const getDefaultEndTime = () => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        tomorrow.setMinutes(0, 0, 0);
        tomorrow.setHours(tomorrow.getHours() + 1);

        // Format to YYYY-MM-DDTHH:mm for datetime-local input
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        const hours = String(tomorrow.getHours()).padStart(2, '0');
        const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startPrice: '',
        endTime: getDefaultEndTime()
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.rpc('create_auction', {
                p_title: formData.title,
                p_description: formData.description,
                p_starting_price: Number(formData.startPrice),
                p_end_time: formData.endTime
            });
            if (error) throw error;

            setFormData({
                title: '',
                description: '',
                startPrice: '',
                endTime: getDefaultEndTime()
            });
            alert('產品發佈成功！');
        } catch (error) {
            alert('發佈失敗: ' + error.message);
        }
    };

    return (
        <div className="admin-container">
            <form className="admin-card glass-card" onSubmit={handleSubmit}>
                <h2>新增競標產品</h2>
                <div className="input-group">
                    <label>產品標題</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />
                </div>
                <div className="input-group">
                    <label>產品描述 (選填)</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows="3"
                        className="admin-textarea"
                    />
                </div>
                <div className="row">
                    <div className="input-group">
                        <label>起標價</label>
                        <input
                            type="number"
                            value={formData.startPrice}
                            onChange={(e) => setFormData({ ...formData, startPrice: e.target.value })}
                            onWheel={(e) => e.target.blur()}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>競標結束時間</label>
                        <input
                            type="datetime-local"
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            required
                        />
                    </div>
                </div>
                <button type="submit" className="btn-primary w-full">發佈產品</button>
            </form>

            <div className="admin-card glass-card verify-section">
                <h2>驗證使用者</h2>
                <UserVerification />
            </div>
        </div>
    );
};

const UserVerification = () => {
    const [userId, setUserId] = useState('');
    const [phone, setPhone] = useState('');
    const [lineDisplayName, setLineDisplayName] = useState('');
    const [lineGroupName, setLineGroupName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.rpc('verify_user', {
                p_user_id: userId,
                p_phone: phone,
                p_line_display_name: lineDisplayName,
                p_line_group_display_name: lineGroupName
            });
            if (error) throw error;
            alert('使用者驗證成功！');
            setUserId('');
            setPhone('');
            setLineDisplayName('');
            setLineGroupName('');
        } catch (err) {
            alert('驗證失敗: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleVerify}>
            <div className="input-group">
                <label>使用者 ID (User ID)</label>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="請輸入使用者 UUID"
                    required
                />
            </div>
            <div className="input-group">
                <label>電話</label>
                <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                />
            </div>
            <div className="input-group">
                <label>LINE 顯示名稱</label>
                <input
                    type="text"
                    value={lineDisplayName}
                    onChange={(e) => setLineDisplayName(e.target.value)}
                    required
                />
            </div>
            <div className="input-group">
                <label>LINE 群組顯示名稱</label>
                <input
                    type="text"
                    value={lineGroupName}
                    onChange={(e) => setLineGroupName(e.target.value)}
                    required
                />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? '處理中...' : '提交驗證'}
            </button>
        </form>
    );
};

export default Admin;
