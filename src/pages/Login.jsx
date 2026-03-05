import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const { login, signup, resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (isSignUp && !agreed) {
            alert('您必須勾選同意使用條款才能進行註冊');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('請輸入正確的 Email 格式');
            return;
        }

        if (password.length < 6) {
            setErrorMsg('密碼長度必須至少為 6 位數');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signup(email, password);
                alert('註冊成功！請檢查信箱驗證。');
                setIsSignUp(false);
            } else {
                await login(email, password);
            }
        } catch (err) {
            setErrorMsg(err.message || '驗證失敗，請檢查輸入資訊');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            alert('請先輸入 Email');
            return;
        }
        try {
            await resetPassword(email);
            alert('密碼重設信件已寄出，請查收信箱。');
        } catch (err) {
            alert('寄送失敗: ' + err.message);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass-card">
                <div className="auth-tabs">
                    <button
                        type="button"
                        className={`tab-btn ${!isSignUp ? 'active' : ''}`}
                        onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
                    >
                        登入
                    </button>
                    <button
                        type="button"
                        className={`tab-btn ${isSignUp ? 'active' : ''}`}
                        onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
                    >
                        註冊
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <h2>{isSignUp ? '加入鼠婦棲地競標系統' : '歡迎回來'}</h2>
                    <p>{isSignUp ? '立即註冊開始您的競標之旅' : '請輸入您的帳號密碼進行登入'}</p>

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="請輸入 Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>密碼</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="請輸入密碼"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '隱藏' : '顯示'}
                            </button>
                        </div>
                        {!isSignUp && (
                            <div className="forgot-password-link">
                                <span onClick={handleForgotPassword}>忘記密碼？</span>
                            </div>
                        )}
                    </div>

                    {isSignUp && (
                        <div className="terms-checkbox-container">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                />
                                <span>我已閱讀並同意 <span className="terms-link" onClick={() => setShowTerms(true)}>競標平台使用條款</span></span>
                            </label>
                        </div>
                    )}

                    {errorMsg && <p className="error-message">{errorMsg}</p>}

                    <button type="submit" className="btn-primary w-full" disabled={loading || (isSignUp && !agreed)}>
                        {loading ? '處理中...' : (isSignUp ? '完成註冊' : '登入')}
                    </button>
                </form>
            </div>

            {showTerms && (
                <div className="modal-overlay" onClick={() => setShowTerms(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>平台服務條款與競標規則</h3>
                            <button className="close-btn" onClick={() => setShowTerms(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <section>
                                <h4>1. 條款接受</h4>
                                <p>使用者在註冊帳號或使用本網站服務前，應詳細閱讀本使用條款。當使用者完成註冊或使用本網站服務，即視為已閱讀、理解並同意遵守本條款之所有內容。</p>
                            </section>
                            <section>
                                <h4>2. 帳號與資料</h4>
                                <p>使用者應提供真實且正確之資料進行註冊，並妥善保管帳號及密碼。因帳號管理不當所造成之損失，由使用者自行負責。</p>
                            </section>
                            <section>
                                <h4>3. 競標規則</h4>
                                <ul>
                                    <li>1. 使用者可於競標期間內對商品進行出價，每次出價須高於目前最高出價並符合商品設定之最低加價幅度。</li>
                                    <li>2. 使用者一旦提交出價，即視為具有購買意願之承諾。</li>
                                    <li>3. 競標結束時，出價最高且符合規則之使用者即為得標者。</li>
                                    <li>4. 得標者應於指定時間內完成付款或交易程序，否則視為棄標。</li>
                                </ul>
                            </section>
                            <section>
                                <h4>4. 棄標與違規處理</h4>
                                <p>若得標者未依規定完成交易，本網站有權取消其得標資格，並可能採取以下措施：</p>
                                <ul>
                                    <li>1. 限制或暫停帳號使用</li>
                                    <li>2. 取消相關競標結果</li>
                                    <li>3. 限制未來參與競標之權利</li>
                                </ul>
                            </section>
                            <section>
                                <h4>5. 禁止行為</h4>
                                <p>使用者不得從事以下行為：</p>
                                <ul>
                                    <li>1. 提供不實資料或冒用他人身分註冊帳號。</li>
                                    <li>2. 使用多個帳號操控或干擾競標價格。</li>
                                    <li>3. 使用自動化程式、機器人或其他技術手段影響競標公平性。</li>
                                    <li>4. 利用系統漏洞、程式錯誤（Bug）或非正常方式獲取不當利益。</li>
                                    <li>5. 以任何方式干擾或破壞網站系統正常運作。</li>
                                    <li>6. 若發現上述行為，本網站有權取消競標結果並終止帳號使用權。</li>
                                </ul>
                            </section>
                            <section>
                                <h4>6. 系統與服務聲明</h4>
                                <p>本網站將盡力維持服務穩定，但不保證服務完全不中斷或無錯誤。</p>
                                <p>如因系統異常、網路延遲、技術問題或其他不可抗力因素導致競標資料異常，本網站有權取消或調整競標結果。</p>
                            </section>
                            <section>
                                <h4>7. 條款修改與解釋</h4>
                                <p>本網站有權隨時修改本條款內容並公告於網站。使用者繼續使用本服務即視為同意修改後條款。在法律允許範圍內，本網站保留本條款之最終解釋權。</p>
                            </section>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={() => setShowTerms(false)}>關閉</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
