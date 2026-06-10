import React, { useState, useEffect } from 'react';
import OrderRow from '../componets/OrderRow';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import Navbar from '../componets/Navbar';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import './OrderList.css';

function OrderList({ searchQuery, setSearchQuery, activeFilter, setActiveFilter, onOrderClick }) {
    const { user } = useAuth();
    const [sortBy, setSortBy] = useState('urgent');
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const customerCache = React.useRef({});

    const fetchCustomer = async (customerRef) => {
        if (!customerRef) return { nama: '-', no_hp: '-' };
        const refPath = typeof customerRef === 'string' ? customerRef : customerRef.path;
        if (customerCache.current[refPath]) return customerCache.current[refPath];
        try {
            const customerDoc = await getDoc(
                typeof customerRef === 'string' ? doc(db, customerRef) : customerRef
            );
            const data = customerDoc.exists()
                ? { nama: customerDoc.data().nama || '-', no_hp: customerDoc.data().no_hp || '-' }
                : { nama: '-', no_hp: '-' };
            customerCache.current[refPath] = data;
            return data;
        } catch {
            return { nama: '-', no_hp: '-' };
        }
    };

    useEffect(() => {
        setIsLoading(true);
        const unsub = onSnapshot(collection(db, 'transactions'), async (snapshot) => {
            const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const resolved = await Promise.all(
                raw.map(async (tx) => {
                    const customer = await fetchCustomer(tx.customer_id);
                    return {
                        ...tx,
                        nama: tx.nama || tx.customerNama || customer.nama || '-',
                        hp: tx.hp || tx.customerHp || tx.no_hp || customer.no_hp || '-',
                        status: tx.status_order || tx.status || 'Waiting List',
                        statusBayar: tx.statusBayar || 'Belum Lunas',
                        metode_pembayaran: tx.metode_pembayaran || '',
                        tanggal: tx.tanggal || (tx.created_at?.seconds
                            ? new Date(tx.created_at.seconds * 1000).toLocaleDateString('id-ID', {
                                day: '2-digit', month: 'short', year: 'numeric'
                            }) : '-'),
                        total: Array.isArray(tx.items)
                            ? tx.items.map(it =>
                                it.satuan === 'meter' && it.luas
                                    ? `${it.qty}× ${it.nama} (${Number(it.luas).toFixed(2)}m²)`
                                    : `${it.qty}× ${it.nama}`
                            ).join(', ')
                            : '-',
                    };
                })
            );
            setTransactions(resolved);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    // Hitung hari kerja untuk sorting
    const hitungHariKerja = (tglStr) => {
        if (!tglStr || typeof tglStr !== 'string') return 0;
        const bulanIndo = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
            'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
        };
        const parts = tglStr.split(' ');
        if (parts.length < 3) return 0;
        const tglMasuk = new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));
        tglMasuk.setHours(0, 0, 0, 0);
        const hariIni = new Date();
        hariIni.setHours(0, 0, 0, 0);
        let hariKerja = 0;
        let cursor = new Date(tglMasuk);
        while (cursor <= hariIni) {
            if (cursor.getDay() !== 0) hariKerja++;
            cursor.setDate(cursor.getDate() + 1);
        }
        return hariKerja;
    };

    const getCount = (status) =>
        status === 'Semua'
            ? transactions.length
            : transactions.filter(o => o.status === status).length;

    const applyFilter = (list) => list.filter(o => {
        const q = (searchQuery || '').toLowerCase();
        const nama = (o?.nama || '').toLowerCase();
        const hp = (o?.hp || '').toString();
        return (nama.includes(q) || hp.includes(q)) &&
            (activeFilter === 'Semua' || o.status === activeFilter);
    });

    const sortList = (list) => [...list].sort((a, b) => {
        if (sortBy === 'urgent') {
            return hitungHariKerja(b.tanggal) - hitungHariKerja(a.tanggal);
        }
        const tA = a.created_at?.seconds || 0;
        const tB = b.created_at?.seconds || 0;
        return tB - tA;
    });

    const filtered = applyFilter(transactions);
    const orderAktif = sortList(filtered.filter(o => o.status !== 'Ready Anter'));
    const orderReady = sortList(filtered.filter(o => o.status === 'Ready Anter'));
    const totalAktif = transactions.filter(o => o.status !== 'Ready Anter').length;

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h3 style={{ margin: 0, color: '#04CDCD', fontSize: 16 }}>Carpetology Admin</h3>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {totalAktif} order aktif hari ini
                    </div>
                </div>
                <button onClick={() => signOut(auth)} style={styles.logoutBtn}>Logout</button>
            </div>

            {/* Search */}
            <div style={styles.searchWrapper}>
                <span>🔍</span>
                <input
                    type="text"
                    placeholder="Cari nama atau nomor HP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                />
                {searchQuery && (
                    <span onClick={() => setSearchQuery('')} style={{ cursor: 'pointer', color: '#94a3b8' }}>✖</span>
                )}
            </div>

            {/* Filter */}
            <div style={styles.filterGrid}>
                {[
                    { id: 'Semua', label: 'Semua' },
                    { id: 'Waiting List', label: `⏳ Waiting (${getCount('Waiting List')})` },
                    { id: 'Sudah Dicuci', label: `🧼 Dicuci (${getCount('Sudah Dicuci')})` },
                    { id: 'Ready Anter', label: `✅ Ready (${getCount('Ready Anter')})` },
                ].map((item) => (
                    <button
                        key={item.id}
                        style={{
                            ...styles.filterBtn,
                            ...(activeFilter === item.id ? styles.filterActive : styles.filterInactive),
                        }}
                        onClick={() => setActiveFilter(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Jadwal Home Visit */}
            <button
                className="jadwal-home-visit-btn"
                onClick={() => navigate('/admin/jadwal-home-visit')}
            >
                🏠 Jadwal Home Visit
            </button>

            {/* Sort */}
            <div style={styles.sortContainer}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Urutkan:</span>
                <div style={styles.toggleGroup}>
                    <button onClick={() => setSortBy('urgent')}
                        style={{ ...styles.toggleBtn, ...(sortBy === 'urgent' ? styles.toggleActive : {}) }}>
                        🚨 Paling Lama
                    </button>
                    <button onClick={() => setSortBy('terbaru')}
                        style={{ ...styles.toggleBtn, ...(sortBy === 'terbaru' ? styles.toggleActive : {}) }}>
                        ⏱️ Terbaru
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={styles.statsBar}>
                <span>📋 Aktif: <strong>{totalAktif}</strong></span>
                <span style={{ margin: '0 12px', color: '#bfdbfe' }}>|</span>
                <span>✅ Ready: <strong>{getCount('Ready Anter')}</strong></span>
                <span style={{ margin: '0 12px', color: '#bfdbfe' }}>|</span>
                <span>Total: <strong>{transactions.length}</strong></span>
            </div>

            {/* List */}
            <div style={styles.listContainer}>
                {isLoading ? (
                    <div style={styles.loadingWrap}>
                        <div style={styles.spinner} />
                        <p style={{ color: '#94a3b8', fontSize: 13 }}>Memuat data...</p>
                    </div>
                ) : (
                    <>
                        {/* Order Aktif */}
                        {orderAktif.length > 0 && (
                            <>
                                <div style={styles.sectionHeader}>
                                    🔥 Order Aktif
                                    <span style={styles.sectionCount}>{orderAktif.length}</span>
                                </div>
                                {orderAktif.map((order) => (
                                    <OrderRow key={order.id} order={order} onClick={onOrderClick} isReady={false} />
                                ))}
                            </>
                        )}

                        {/* Ready Anter — redup */}
                        {orderReady.length > 0 && (
                            <>
                                <div style={{ ...styles.sectionHeader, color: '#22c55e', borderLeftColor: '#22c55e' }}>
                                    ✅ Ready Anter
                                    <span style={{ ...styles.sectionCount, backgroundColor: '#dcfce7', color: '#15803d' }}>
                                        {orderReady.length}
                                    </span>
                                </div>
                                {orderReady.map((order) => (
                                    <OrderRow key={order.id} order={order} onClick={onOrderClick} isReady={true} />
                                ))}
                            </>
                        )}

                        {orderAktif.length === 0 && orderReady.length === 0 && (
                            <div style={styles.emptyState}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>Data tidak ditemukan</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* FAB */}
            {(user?.role === 'admin' || user?.role === 'Admin') && (
                <button style={styles.fab} onClick={() => navigate('/admin/kasir')}>+</button>
            )}

            {(user?.role === 'admin' || user?.role === 'Admin') && (
                <div style={styles.bottomNav}><Navbar /></div>
            )}
        </div>
    );
}

const styles = {
    container: { display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', backgroundColor: '#fff' },
    header: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' },
    logoutBtn: { fontSize: '12px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' },
    searchWrapper: { display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '25px', padding: '8px 16px', margin: '12px 16px 4px' },
    searchInput: { border: 'none', outline: 'none', flex: 1, marginLeft: '8px', fontSize: '14px' },
    filterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '4px 16px' },
    filterBtn: { padding: '8px 4px', borderRadius: '8px', borderWidth: '1px', borderStyle: 'solid', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
    filterInactive: { borderColor: '#e2e8f0', backgroundColor: '#fff', color: '#64748b' },
    filterActive: { borderColor: '#04CDCD', backgroundColor: '#04CDCD', color: '#fff' },
    sortContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', backgroundColor: '#f8fafc' },
    statsBar: { padding: '8px 16px', backgroundColor: '#eff6ff', color: '#1e40af', fontSize: '12px', textAlign: 'center', borderBottom: '1px solid #dbeafe' },
    toggleGroup: { display: 'flex', gap: '4px' },
    toggleBtn: { padding: '5px 8px', fontSize: '11px', borderRadius: '6px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#cbd5e1', cursor: 'pointer', backgroundColor: '#fff' }, toggleActive: { backgroundColor: '#1e293b', color: '#fff', borderColor: '#1e293b' },
    listContainer: { flex: 1, overflowY: 'auto', paddingBottom: '80px' },
    sectionHeader: {
        padding: '8px 16px', fontSize: 11, fontWeight: 800,
        color: '#ef4444', backgroundColor: '#f8fafc',
        borderLeft: '3px solid #ef4444',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        display: 'flex', alignItems: 'center', gap: 8,
        position: 'sticky', top: 0, zIndex: 5,
    },
    sectionCount: {
        backgroundColor: '#fee2e2', color: '#ef4444',
        borderRadius: 10, padding: '1px 8px', fontSize: 11,
    },
    loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
    spinner: { width: 32, height: 32, border: '3px solid #f3f3f3', borderTop: '3px solid #04CDCD', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    emptyState: { textAlign: 'center', paddingTop: 60 },
    fab: { position: 'absolute', bottom: '80px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#04CDCD', color: '#fff', border: 'none', fontSize: '28px', boxShadow: '0 4px 10px rgba(4,205,205,0.4)', cursor: 'pointer', zIndex: 10 },
    bottomNav: { width: '100%', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }
};

export default OrderList;