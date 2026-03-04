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
    const { login, signup, resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
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

                    {errorMsg && <p className="error-message">{errorMsg}</p>}

                    <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading ? '處理中...' : (isSignUp ? '完成註冊' : '登入')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
