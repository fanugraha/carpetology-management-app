import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
    { path: '/admin', key: 'orders', label: 'Orders', icon: '🏠' },
    { path: '/admin/products', key: 'produk', label: 'Produk', icon: '📦' },
    { path: '/admin/kasir', key: 'kasir', label: 'Kasir', icon: '🏪' },
];

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/admin') {
            return location.pathname === '/admin' || location.pathname === '/admin/';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            width: '100%',
            height: '60px',
            backgroundColor: '#fff',
            // TIDAK ada position: fixed di sini
        }}>
            {navItems.map((item) => (
                <div
                    key={item.key}
                    onClick={() => navigate(item.path)}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        flex: 1,
                        height: '100%',
                        cursor: 'pointer',
                        color: isActive(item.path) ? '#04CDCD' : '#94a3b8',
                        fontWeight: isActive(item.path) ? '600' : '400',
                    }}
                >
                    <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
                    <span style={{ fontSize: '11px' }}>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

export default Navbar;