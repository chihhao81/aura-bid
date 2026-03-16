import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { supabase } from '../utils/supabaseClient';
import './Admin.css';

export const PRODUCT_SIZES = [
    { id: '0', value: '0.3cm以上' },
    { id: '1', value: '0.5cm以上' },
    { id: '2', value: '亞成成體' }
];

const Admin = () => {
    const { addProduct, fetchAuctions } = useAuction();
    const [productsList, setProductsList] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const getCurrentTime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const getDefaultEndTime = () => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        tomorrow.setMinutes(0, 0, 0);
        tomorrow.setHours(tomorrow.getHours() + 1);

        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        const hours = String(tomorrow.getHours()).padStart(2, '0');
        const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const [formData, setFormData] = useState({
        productId: '',
        title: '',
        description: '',
        startPrice: '0',
        minIncrement: '50',
        startTime: getCurrentTime(),
        endTime: getDefaultEndTime(),
        productSize: '0',
        quantity: 1,
        paymentAccountId: localStorage.getItem('aura_last_payment_account') || ''
    });

    const [paymentAccountsList, setPaymentAccountsList] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const fetchPaymentAccounts = async (force = false) => {
        if (!force) {
            const cached = localStorage.getItem('aura_payment_accounts_cache');
            if (cached) {
                try {
                    setPaymentAccountsList(JSON.parse(cached));
                    return;
                } catch (e) {
                    console.error('解析匯款帳號快取失敗:', e);
                }
            }
        }

        setLoadingAccounts(true);
        try {
            const { data, error } = await supabase
                .from('payment_accounts')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;
            setPaymentAccountsList(data || []);
            localStorage.setItem('aura_payment_accounts_cache', JSON.stringify(data || []));

            if (data && data.length > 0) {
                const currentSaved = localStorage.getItem('aura_last_payment_account');
                const exists = data.find(acc => acc.id === currentSaved);
                if (!exists) {
                    setFormData(prev => ({ ...prev, paymentAccountId: data[0].id }));
                }
            }
        } catch (err) {
            console.error('獲取匯款帳號清單失敗:', err);
            alert('匯款帳號清單獲取失敗。');
        } finally {
            setLoadingAccounts(false);
        }
    };

    const fetchProducts = async (force = false) => {
        // Try to load from cache first if not forced
        if (!force) {
            const cached = localStorage.getItem('aura_products_cache');
            if (cached) {
                try {
                    setProductsList(JSON.parse(cached));
                    return;
                } catch (e) {
                    console.error('解析快取失敗:', e);
                }
            }
        }

        setLoadingProducts(true);
        try {
            const { data, error } = await supabase.functions.invoke("get-products", {
                headers: {
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
            });
            if (error) throw error;
            setProductsList(data || []);
            localStorage.setItem('aura_products_cache', JSON.stringify(data || []));
        } catch (err) {
            console.error('獲取產品清單失敗:', err);
            alert('產品清單獲取失敗，請確認網路或後端 CORS 設定。');
        } finally {
            setLoadingProducts(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchPaymentAccounts();

        // Close dropdown when clicking outside
        const handleClickOutside = (e) => {
            if (!e.target.closest('.autocomplete-container')) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const filteredProducts = productsList.filter(p =>
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleProductSelect = (product) => {
        setFormData({
            ...formData,
            productId: product.id,
            title: product.name,
        });
        setSearchTerm(`${product.id} - ${product.name}`);
        setShowDropdown(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.productId) {
            alert('請選擇產品');
            return;
        }
        if (!formData.paymentAccountId) {
            alert('請選擇匯款帳號');
            return;
        }

        setSubmitting(true);
        try {
            const finalStartTime = formData.startTime ? new Date(formData.startTime) : new Date();
            const finalEndTime = new Date(formData.endTime);

            if (formData.paymentAccountId) {
                localStorage.setItem('aura_last_payment_account', formData.paymentAccountId);
            }

            const { error } = await supabase.rpc('create_auction', {
                p_description: formData.description || '',
                p_start_price: Number(formData.startPrice),
                p_min_increment: Number(formData.minIncrement),
                p_start_time: finalStartTime.toISOString(),
                p_end_time: finalEndTime.toISOString(),
                p_product_id: String(formData.productId),
                p_product_name: String(formData.title),
                p_product_size: String(formData.productSize),
                p_quantity: Number(formData.quantity),
                p_payment_account_id: String(formData.paymentAccountId)
            });
            if (error) throw error;

            setFormData({
                productId: '',
                title: '',
                description: '',
                startPrice: '0',
                minIncrement: '50',
                startTime: getCurrentTime(),
                endTime: getDefaultEndTime(),
                productSize: '0',
                quantity: 1,
                paymentAccountId: localStorage.getItem('aura_last_payment_account') || ''
            });
            setSearchTerm('');
            alert('產品發佈成功！');
            fetchAuctions();
        } catch (error) {
            alert('發佈失敗: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="admin-container">
            <form className="admin-card glass-card" onSubmit={handleSubmit}>
                <h2>新增競標產品</h2>

                <div className="input-group">
                    <label>產品 ({filteredProducts.length})</label>
                    <div className="product-selection-header">
                        <div className="autocomplete-container">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="請輸入產品 ID 或名稱搜尋..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                            />
                            {showDropdown && (
                                <div className="dropdown-list">
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.map(p => (
                                            <div
                                                key={p.id}
                                                className="dropdown-item"
                                                onClick={() => handleProductSelect(p)}
                                            >
                                                {p.id} - {p.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dropdown-item no-results">找無相關產品</div>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="refresh-btn"
                            onClick={() => fetchProducts(true)}
                            disabled={loadingProducts}
                            title="重新整理清單"
                        >
                            {loadingProducts ? '...' : '刷新'}
                        </button>
                    </div>
                </div>

                <div className="row">
                    <div className="input-group">
                        <label>尺寸</label>
                        <select
                            value={formData.productSize}
                            onChange={(e) => setFormData({ ...formData, productSize: e.target.value })}
                            required
                        >
                            {PRODUCT_SIZES.map(size => (
                                <option key={size.id} value={size.id}>
                                    {size.value}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>數量</label>
                        <input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                            onWheel={(e) => e.target.blur()}
                            min="1"
                            required
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label>匯款帳號</label>
                    <div className="product-selection-header">
                        <select
                            value={formData.paymentAccountId}
                            onChange={(e) => setFormData({ ...formData, paymentAccountId: e.target.value })}
                            required
                            style={{ flex: 1, padding: '10px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: 'inherit', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                        >
                            <option value="" disabled style={{ color: '#000' }}>請選擇匯款帳號</option>
                            {paymentAccountsList.map(acc => {
                                const last5 = acc.account_number ? String(acc.account_number).slice(-5) : '';
                                return (
                                    <option key={acc.id} value={acc.id} style={{ color: '#000' }}>
                                        {last5}-{acc.label}
                                    </option>
                                );
                            })}
                        </select>
                        <button
                            type="button"
                            className="refresh-btn"
                            style={{ marginLeft: '10px' }}
                            onClick={() => fetchPaymentAccounts(true)}
                            disabled={loadingAccounts}
                            title="重新整理清單"
                        >
                            {loadingAccounts ? '...' : '刷新'}
                        </button>
                    </div>
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
                        <label>最小加價</label>
                        <input
                            type="number"
                            value={formData.minIncrement}
                            onChange={(e) => setFormData({ ...formData, minIncrement: e.target.value })}
                            onWheel={(e) => e.target.blur()}
                            required
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="input-group">
                        <label>競標起始時間 (選填)</label>
                        <input
                            type="datetime-local"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
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
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                    {submitting ? '發佈中...' : '發佈產品'}
                </button>
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
    const [customerId, setCustomerId] = useState('');
    const [lineGroupName, setLineGroupName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.rpc('verify_user', {
                p_user_id: userId,
                p_customer_id: customerId,
                p_line_group_display_name: lineGroupName,
                p_phone: phone
            });
            if (error) throw error;
            alert('使用者驗證成功！');
            setUserId('');
            setCustomerId('');
            setLineGroupName('');
            setPhone('');
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
                <label>鼠婦棲地使用者ID</label>
                <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="C00001"
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
            <div className="input-group">
                <label>電話</label>
                <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
