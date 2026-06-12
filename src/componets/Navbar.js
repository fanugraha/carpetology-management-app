import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Lucide-style SVG icons (inline, no dependency)
const IconHome = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const IconBox = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

const IconCashRegister = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7l1-4h18l1 4" />
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M12 12v4" />
    <path d="M10 14h4" />
    <path d="M6 11h.01" />
    <path d="M18 11h.01" />
  </svg>
);

const navItems = [
  { path: '/admin',          key: 'orders', label: 'Orders',  Icon: IconHome         },
  { path: '/admin/products', key: 'produk', label: 'Produk',  Icon: IconBox          },
  { path: '/admin/kasir',    key: 'kasir',  label: 'Kasir',   Icon: IconCashRegister },
];

function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div style={S.bar}>
      {navItems.map(({ path, key, label, Icon }) => {
        const active = isActive(path);
        return (
          <div
            key={key}
            onClick={() => navigate(path)}
            style={S.item}
          >
            <Icon size={22} color={active ? '#04CDCD' : '#94a3b8'} />
            <span style={{ ...S.label, color: active ? '#04CDCD' : '#94a3b8', fontWeight: active ? 700 : 400 }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const S = {
  bar: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    height: 60,
    backgroundColor: '#fff',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
    height: '100%',
    cursor: 'pointer',
  },
  label: {
    fontSize: 11,
  },
};

export default Navbar;