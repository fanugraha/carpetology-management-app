import React from 'react';

function Navbar({ activeMenu }) {
    return (
        <div style={styles.bottomNav}>
            <div style={activeMenu === 'orders' ? styles.navActive : styles.navItem}>🏠<br />Orders</div>
            <div style={activeMenu === 'produk' ? styles.navActive : styles.navItem}>📦<br />Produk</div>
            <div style={activeMenu === 'kasir' ? styles.navActive : styles.navItem}>🏪<br />Kasir</div>
        </div>
    );
}

const styles = {
    bottomNav: { position: 'fixed', bottom: 0, width: '100%', height: '60px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', zIndex: 100 },
    navActive: { color: '#04CDCD', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' },
    navItem: { color: '#94a3b8', fontSize: '11px', textAlign: 'center' }
};

export default Navbar;