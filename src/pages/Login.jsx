import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TermsModal from '../components/TermsModal';
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

    const handleLineLogin = () => {
        const state = crypto.randomUUID();
        localStorage.setItem('line_login_state', state);

        const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-callback`;

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: '2009342089',
            redirect_uri: redirectUri,
            state: state,
            scope: 'profile openid email'
        });

        const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
        window.location.href = lineAuthUrl;
    };

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

                {!isSignUp && (
                    <>
                        <div className="login-divider">
                            <span>或</span>
                        </div>

                        <button
                            type="button"
                            className="btn-line w-full"
                            onClick={handleLineLogin}
                        >
                            <svg className="line-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.21 3.74 7.74 8.79 8.4.34.07.81.23.93.52.1.27.07.68.03.95l-.15.91c-.05.27-.21 1.07.94.58 1.14-.49 6.17-3.63 8.42-6.22C22.88 13.41 22 11.62 22 10.5 22 5.82 17.52 2 12 2zm-3.06 11.12H6.87a.53.53 0 01-.53-.53V8.53c0-.29.24-.53.53-.53s.53.24.53.53v3.53h1.54c.29 0 .53.24.53.53s-.24.53-.53.53zm1.9-.53a.53.53 0 01-1.06 0V8.53a.53.53 0 011.06 0v4.06zm4.14 0a.53.53 0 01-.4.51.53.53 0 01-.52-.19l-2.1-2.86v2.54a.53.53 0 01-1.06 0V8.53a.53.53 0 01.4-.51.53.53 0 01.53.19l2.09 2.85V8.53a.53.53 0 011.06 0v4.06zm3.16-2.53a.53.53 0 010 1.06h-1.54v1h1.54a.53.53 0 010 1.06h-2.07a.53.53 0 01-.53-.53V8.53c0-.29.24-.53.53-.53h2.07a.53.53 0 010 1.06h-1.54v1h1.54z" />
                            </svg>
                            LINE 登入
                        </button>
                    </>
                )}
            </div>

            <TermsModal show={showTerms} onClose={() => setShowTerms(false)} />
        </div>
    );
};

export default Login;
