import React from 'react';
import { useAuth } from '../context/AuthContext';
import pkg from '../../package.json';
import { isTestEnv } from '../utils/envConfig';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const version = pkg.version;

    return (
        <nav className="navbar glass-card">
            <div className="nav-brand">
                <h1>
                    <span>鼠婦棲地</span>
                    {isTestEnv && <span className="test-badge" style={{ color: '#ff4d4f', fontSize: '0.6em', marginLeft: '10px', verticalAlign: 'middle', border: '1px solid #ff4d4f', padding: '2px 6px', borderRadius: '4px' }}>測試台</span>}
                </h1>
                <span className="version">v{version}</span>
            </div>
            <div className="nav-actions">
                {user ? (
                    <>
                        <span className="user-email">
                            {user.line_group_name ? `${user.line_group_name} (${user.email})` : user.email}
                        </span>
                        {user.isAdmin && <span className="badge-admin">Admin</span>}
                        <button onClick={logout} className="btn-logout">登出</button>
                    </>
                ) : (
                    <span className="nav-guest">歡迎來到競標平台</span>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
