import React, { useState } from 'react';
import OrderRow from '../componets/OrderRow';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import Navbar from '../componets/Navbar';
import { useNavigate } from 'react-router-dom';
import './OrderList.css';



function OrderList({ orders, searchQuery, setSearchQuery, activeFilter, setActiveFilter, onOrderClick, onAddClick }) {
    const { user } = useAuth();
    const [sortBy, setSortBy] = useState('urgent');

    // Fungsi bantu untuk mengubah string tanggal "25 Mei 2026" jadi objek Date
    const parseDate = (tglStr) => {
        // 1. TAMBAHKAN PENGECEKAN INI:
        if (!tglStr || typeof tglStr !== 'string') {
            return new Date(0); // Kembalikan tanggal sangat lama jika data kosong
        }

        const bulanIndo = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
        const parts = tglStr.split(' ');

        // 2. Tambahkan pengecekan jika format tanggal tidak sesuai
        if (parts.length < 3) return new Date(0);

        return new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));
    };

    const navigate = useNavigate();

    const totalOrderAktif = (orders || []).filter(o => o.status !== 'Ready Anter').length;
    const getCount = (status) => status === 'Semua' ? orders.length : orders.filter(o => o.status === status).length;

    const filteredOrders = (orders || []).filter(o => {
        const query = (searchQuery || "").toLowerCase();
        const nama = (o?.nama || "").toLowerCase();
        const hp = (o?.hp || "").toString();
        return (nama.includes(query) || hp.includes(query)) &&
            (activeFilter === 'Semua' || o.status === activeFilter);
    }).sort((a, b) => {
        const dateA = parseDate(a.tanggal);
        const dateB = parseDate(b.tanggal);

        if (sortBy === 'urgent') {
            // Urutkan status dulu: bukan 'Ready Anter' di atas
            if (a.status === 'Ready Anter' && b.status !== 'Ready Anter') return 1;
            if (a.status !== 'Ready Anter' && b.status === 'Ready Anter') return -1;
            // Jika status sama, yang paling lama masuk di atas
            return dateA - dateB;
        } else {
            // Urutan Terbaru: Tanggal yang lebih besar (lebih baru) di atas
            return dateB - dateA;
        }
    });

    return (
        <div style={styles.container}>
            {/* Header, Search, FilterGrid tetap sama seperti sebelumnya */}
            <div style={styles.header}>
                <h3 style={{ margin: 0, color: '#04CDCD' }}>Carpetology Admin</h3>
                <button onClick={() => signOut(auth)} style={styles.logoutBtn}>Logout</button>
            </div>

            <div style={styles.searchWrapper}>
                <span>🔍</span>
                <input type="text" placeholder="Cari pelanggan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={styles.searchInput} />
                {searchQuery && <span onClick={() => setSearchQuery('')} style={{ cursor: 'pointer' }}>✖</span>}
            </div>

            <div style={styles.filterGrid}>
                {[{ id: 'Semua', label: 'Semua' }, { id: 'Waiting List', label: `Waiting (${getCount('Waiting List')})` }, { id: 'Sudah Dicuci', label: `Dicuci (${getCount('Sudah Dicuci')})` }, { id: 'Ready Anter', label: `Ready (${getCount('Ready Anter')})` }].map((item) => (
                    <button
                        key={item.id}
                        style={{ ...styles.filterBtn, ...(activeFilter === item.id ? styles.filterActive : styles.filterInactive) }}
                        onClick={() => setActiveFilter(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <button
                className="jadwal-home-visit-btn"
                onClick={() => navigate('/admin/jadwal-home-visit')}
            >
                Jadwal Home Visit
            </button>

            <div style={styles.sortContainer}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Urutkan:</span>
                <div style={styles.toggleGroup}>
                    <button onClick={() => setSortBy('urgent')} style={{ ...styles.toggleBtn, ...(sortBy === 'urgent' ? styles.toggleActive : {}) }}>🚨 Urgent</button>
                    <button onClick={() => setSortBy('terbaru')} style={{ ...styles.toggleBtn, ...(sortBy === 'terbaru' ? styles.toggleActive : {}) }}>⏱️ Terbaru</button>
                </div>
            </div>

            <div style={styles.statsBar}>Total Order Belum Selesai: <strong>{totalOrderAktif} Order</strong></div>

            <div style={styles.listContainer}>
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => <OrderRow key={order.id} order={order} onClick={onOrderClick} />)
                ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>Data tidak ditemukan</p>
                )}
            </div>

            {/* Fab dan Navbar tetap sama... */}
            <button style={styles.fab} onClick={onAddClick}>+</button>
            {(user?.role === 'admin' || user?.role === 'Admin') && (
                <div style={styles.bottomNav}><Navbar /></div>
            )}
        </div>
    );
}

// ... styles tetap sama seperti yang Anda miliki ...

const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', backgroundColor: '#fff' },
    header: { padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logoutBtn: { fontSize: '12px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' },
    searchWrapper: { display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '25px', padding: '8px 16px', margin: '0 16px 4px 16px' },
    searchInput: { border: 'none', outline: 'none', flex: 1, marginLeft: '8px', fontSize: '15px' },
    filterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '4px 16px' },
    // Memisahkan border agar tidak konflik shorthand
    filterBtn: { padding: '8px 4px', borderRadius: '8px', borderWidth: '1px', borderStyle: 'solid', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
    filterInactive: { borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#64748b' },
    filterActive: { borderColor: '#04CDCD', backgroundColor: '#04CDCD', color: '#fff' },
    sortContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', backgroundColor: '#f8fafc', marginTop: '6px' },
    statsBar: { padding: '8px 16px', backgroundColor: '#eff6ff', color: '#1e40af', fontSize: '12px', textAlign: 'center', borderBottom: '1px solid #dbeafe' },
    toggleGroup: { display: 'flex', gap: '4px' },
    toggleBtn: { padding: '5px 8px', fontSize: '11px', borderRadius: '6px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#cbd5e1', cursor: 'pointer' },
    toggleActive: { backgroundColor: '#1e293b', color: '#fff', borderColor: '#1e293b' },
    tableHeader: { display: 'flex', backgroundColor: '#f1f5f9', padding: '8px 16px', fontSize: '13px', color: '#64748b', fontWeight: '600' },
    listContainer: { flex: 1, overflowY: 'auto', paddingBottom: '80px' },
    fab: { position: 'absolute', bottom: '80px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#04CDCD', color: '#fff', border: 'none', fontSize: '28px', boxShadow: '0 4px 10px rgba(4, 205, 205, 0.4)', cursor: 'pointer', zIndex: 10 },
    bottomNav: { position: 'absolute', bottom: 0, width: '100%', height: '60px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', zIndex: 10 }
};

export default OrderList;