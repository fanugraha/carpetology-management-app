import React, { useState } from 'react';
import OrderRow from '../componets/OrderRow';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

function OrderList({ orders, searchQuery, setSearchQuery, activeFilter, setActiveFilter, onOrderClick, onAddClick }) {
    const { user } = useAuth();
    const [sortBy, setSortBy] = useState('urgent');

    // Perhitungan total order aktif (selain 'Ready Anter')
    const totalOrderAktif = (orders || []).filter(o => o.status !== 'Ready Anter').length;

    const getAgeInDays = (tglStr) => {
        const bulanIndo = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
        const parts = tglStr.split(' ');
        if (parts.length < 3) return 0;
        const tgl = new Date(parts[2], bulanIndo[parts[1]], parts[0]);
        return Math.floor((new Date() - tgl) / (1000 * 60 * 60 * 24));
    };

    const getCount = (status) => status === 'Semua' ? orders.length : orders.filter(o => o.status === status).length;

    const filteredOrders = (orders || []).filter(o =>
        (o.nama.toLowerCase().includes(searchQuery.toLowerCase()) || o.hp.includes(searchQuery)) &&
        (activeFilter === 'Semua' || o.status === activeFilter)
    ).sort((a, b) => {
        if (sortBy === 'urgent') {
            if (a.status === 'Ready Anter' && b.status !== 'Ready Anter') return 1;
            if (a.status !== 'Ready Anter' && b.status === 'Ready Anter') return -1;
            return getAgeInDays(b.tanggal) - getAgeInDays(a.tanggal);
        }
        return b.id - a.id;
    });

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={{ margin: 0 }}>Carpetology</h3>
                <button onClick={() => signOut(auth)} style={styles.logoutBtn}>Logout</button>
            </div>

            <div style={styles.searchWrapper}>
                <span>🔍</span>
                <input type="text" placeholder="Cari pelanggan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
                {searchQuery && <span onClick={() => setSearchQuery('')} style={{ cursor: 'pointer' }}>✖</span>}
            </div>

            <div style={styles.filterGrid}>
                {[{ id: 'Semua', label: 'Semua' }, { id: 'Waiting List', label: `Waiting (${getCount('Waiting List')})` }, { id: 'Sudah Dicuci', label: `Dicuci (${getCount('Sudah Dicuci')})` }, { id: 'Ready Anter', label: `Ready (${getCount('Ready Anter')})` }].map((item) => (
                    <button key={item.id} style={{ ...styles.filterBtn, ...(activeFilter === item.id ? styles.filterActive : {}) }} onClick={() => setActiveFilter(item.id)}>
                        {item.label}
                    </button>
                ))}
            </div>

            <div style={styles.sortContainer}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Urutkan:</span>
                <div style={styles.toggleGroup}>
                    <button onClick={() => setSortBy('urgent')} style={{ ...styles.toggleBtn, ...(sortBy === 'urgent' ? styles.toggleActive : {}) }}>🚨 Urgent</button>
                    <button onClick={() => setSortBy('terbaru')} style={{ ...styles.toggleBtn, ...(sortBy === 'terbaru' ? styles.toggleActive : {}) }}>⏱️ Terbaru</button>
                </div>
            </div>

            {/* STATISTIK TOTAL ORDER */}
            <div style={styles.statsBar}>
                Total Order Belum Selesai: <strong>{totalOrderAktif} Order</strong>
            </div>

            <div style={styles.tableHeader}>
                <span style={{ flex: 1.6 }}>Pelanggan</span>
                <span style={{ flex: 1.2 }}>Tanggal</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Status</span>
            </div>

            <div style={styles.listContainer}>
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => <OrderRow key={order.id} order={order} onClick={onOrderClick} />)
                ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>Data tidak ditemukan</p>
                )}
            </div>

            <button style={styles.fab} onClick={onAddClick}>+</button>

            {(user?.role === 'admin' || user?.role === 'Admin') && (
                <div style={styles.bottomNav}>
                    <div style={styles.navActive}>🏠<br />Orders</div>
                    <div style={styles.navItem}>📦<br />Produk</div>
                    <div style={styles.navItem}>🏪<br />Kasir</div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', backgroundColor: '#fff' },
    header: { padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logoutBtn: { fontSize: '12px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' },
    searchWrapper: { display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '25px', padding: '8px 16px', margin: '0 16px 4px 16px' },
    searchInput: { border: 'none', outline: 'none', flex: 1, marginLeft: '8px', fontSize: '15px' },
    filterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '4px 16px' },
    filterBtn: { padding: '8px 4px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
    filterActive: { backgroundColor: '#6366f1', color: '#fff', borderColor: '#6366f1' },
    sortContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', backgroundColor: '#f8fafc', marginTop: '6px' },
    // Tambahan style untuk statsBar
    statsBar: { padding: '8px 16px', backgroundColor: '#eff6ff', color: '#1e40af', fontSize: '12px', textAlign: 'center', borderBottom: '1px solid #dbeafe' },
    toggleGroup: { display: 'flex', gap: '4px' },
    toggleBtn: { padding: '5px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' },
    toggleActive: { backgroundColor: '#1e293b', color: '#fff' },
    tableHeader: { display: 'flex', backgroundColor: '#f1f5f9', padding: '8px 16px', fontSize: '13px', color: '#64748b', fontWeight: '600' },
    listContainer: { flex: 1, overflowY: 'auto', paddingBottom: '80px' },
    fab: { position: 'absolute', bottom: '80px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#6366f1', color: '#fff', border: 'none', fontSize: '28px', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)', cursor: 'pointer', zIndex: 10 },
    bottomNav: { position: 'absolute', bottom: 0, width: '100%', height: '60px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', zIndex: 10 },
    navActive: { color: '#6366f1', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' },
    navItem: { color: '#94a3b8', fontSize: '11px', textAlign: 'center' }
};

export default OrderList;