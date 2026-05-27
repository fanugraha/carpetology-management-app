import React, { useState } from 'react';
import OrderRow from '../componets/OrderRow';

function OrderList({ orders, searchQuery, setSearchQuery, activeFilter, setActiveFilter, onOrderClick, onAddClick }) {
    // State baru untuk mengatur tipe pengurutan: 'kritis' atau 'terbaru'
    const [sortBy, setSortBy] = useState('kritis');

    // 1. Fungsi Pembantu Menghitung Umur Orderan (Aging)
    const getAgeInDays = (tglStr) => {
        const bulanIndo = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
        const parts = tglStr.split(' ');
        if (parts.length < 3) return 0;
        const tgl = new Date(parts[2], bulanIndo[parts[1]], parts[0]);
        return Math.floor((new Date() - tgl) / (1000 * 60 * 60 * 24));
    };

    // 2. HITUNG COUNTER (Jumlah orderan tiap status secara real-time)
    const getCount = (status) => {
        if (status === 'Semua') return orders.length;
        return orders.filter(o => o.status === status).length;
    };

    // 3. PROSES DATA: Filter, Search, dan Sorting
    const filteredOrders = (orders || [])
        .filter((order) => {
            const matchesSearch = order.nama.toLowerCase().includes(searchQuery.toLowerCase()) || order.hp.includes(searchQuery);
            const matchesFilter = activeFilter === 'Semua' || order.status === activeFilter;
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            // Jika disortir berdasarkan "Paling Kritis" (SLA Prioritas)
            if (sortBy === 'kritis') {
                // Orderan 'Ready Anter' otomatis selalu ditaruh paling bawah
                if (a.status === 'Ready Anter' && b.status !== 'Ready Anter') return 1;
                if (a.status !== 'Ready Anter' && b.status === 'Ready Anter') return -1;
                // Urutkan dari yang hari mengendapnya paling lama
                return getAgeInDays(b.tanggal) - getAgeInDays(a.tanggal);
            }

            // Jika disortir berdasarkan "Terbaru Masuk" (Berdasarkan ID timestamp)
            return b.id - a.id;
        });

    return (
        <div style={styles.container}>
            {/* Search Bar */}
            <div style={styles.searchWrapper}>
                <span style={styles.searchIcon}>🔍</span>
                <input
                    type="text"
                    placeholder="Cari pelanggan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                />
                {searchQuery && <span style={styles.clearIcon} onClick={() => setSearchQuery('')}>✖</span>}
            </div>

            {/* INDIKATOR COUNTER PADA FILTER BUTTONS */}
            <div style={styles.filterGrid}>
                {[
                    { id: 'Semua', label: 'Semua' },
                    { id: 'Waiting List', label: `Waiting (${getCount('Waiting List')})` },
                    { id: 'Sudah Dicuci', label: `Dicuci (${getCount('Sudah Dicuci')})` },
                    { id: 'Ready Anter', label: `Ready (${getCount('Ready Anter')})` }
                ].map((item) => (
                    <button
                        key={item.id}
                        style={{ ...styles.filterBtn, ...(activeFilter === item.id ? styles.filterActive : {}) }}
                        onClick={() => setActiveFilter(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* BARU: CONTROL PANEL UTK SORTING */}
            <div style={styles.sortContainer}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Urutkan:</span>
                <div style={styles.toggleGroup}>
                    <button
                        onClick={() => setSortBy('kritis')}
                        style={{ ...styles.toggleBtn, ...(sortBy === 'kritis' ? styles.toggleActive : {}) }}
                    >
                        🚨 Paling Kritis (SLA)
                    </button>
                    <button
                        onClick={() => setSortBy('terbaru')}
                        style={{ ...styles.toggleBtn, ...(sortBy === 'terbaru' ? styles.toggleActive : {}) }}
                    >
                        ⏱️ Input Terbaru
                    </button>
                </div>
            </div>

            {/* Table Header */}
            <div style={styles.tableHeader}>
                <span style={{ flex: 1.6 }}>Pelanggan / Item</span>
                <span style={{ flex: 1.2 }}>Tanggal/Jam</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Status</span>
            </div>

            {/* List Container */}
            <div style={styles.listContainer}>
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                        <OrderRow key={order.id} order={order} onClick={onOrderClick} />
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '14px' }}>
                        Data orderan tidak ditemukan
                    </div>
                )}
            </div>

            {/* Floating Action Button (+) */}
            <button style={styles.fab} onClick={onAddClick}>+</button>

            {/* Bottom Nav */}
            <div style={styles.bottomNav}>
                <div style={styles.navActive}>🏠<br /><span style={{ fontSize: '11px' }}>Order List</span></div>
                <div style={styles.navItem}>📦<br /><span style={{ fontSize: '11px' }}>Produk</span></div>
                <div style={styles.navItem}>🏪<br /><span style={{ fontSize: '11px' }}>Kasir</span></div>
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', backgroundColor: '#fff' },
    searchWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '25px', padding: '8px 16px', margin: '16px 16px 4px 16px' },
    searchIcon: { color: '#94a3b8', marginRight: '8px' },
    clearIcon: { color: '#94a3b8', marginLeft: '8px', cursor: 'pointer' },
    searchInput: { border: 'none', outline: 'none', flex: 1, fontSize: '15px' },
    filterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '4px 16px' },
    filterBtn: { padding: '8px 4px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '12px', color: '#334155', cursor: 'pointer', fontWeight: 'bold' },
    filterActive: { backgroundColor: '#6366f1', color: '#fff', borderColor: '#6366f1' },

    // Style Tambahan Baru untuk Pengurutan
    sortContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', backgroundColor: '#f8fafc', marginTop: '6px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' },
    toggleGroup: { display: 'flex', gap: '4px' },
    toggleBtn: { padding: '5px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '500', color: '#64748b' },
    toggleActive: { backgroundColor: '#1e293b', color: '#fff', borderColor: '#1e293b', fontWeight: 'bold' },

    tableHeader: { display: 'flex', backgroundColor: '#f1f5f9', padding: '8px 16px', fontSize: '13px', color: '#64748b', fontWeight: '600' },
    listContainer: { flex: 1, overflowY: 'auto', paddingBottom: '80px' },
    fab: { position: 'absolute', bottom: '75px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#6366f1', color: '#fff', border: 'none', fontSize: '28px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    bottomNav: { position: 'absolute', bottom: 0, width: '100%', height: '60px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', boxSizing: 'border-box' },
    navActive: { color: '#6366f1', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer' },
    navItem: { color: '#94a3b8', textAlign: 'center', cursor: 'pointer' }
};

export default OrderList;