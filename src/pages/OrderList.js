import React, { useState, useEffect } from 'react';
import OrderRow from '../componets/OrderRow';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import Navbar from '../componets/Navbar';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import {
    Search, X, Home, Flame, CheckCircle, Clock, Plus,
    Layers, AlarmClock, LayoutList, LogOut,
} from 'lucide-react';

function OrderList({ searchQuery, setSearchQuery, activeFilter, setActiveFilter, onOrderClick }) {
    const { user } = useAuth();
    const [sortBy, setSortBy] = useState('urgent');
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const customerCache = React.useRef({});

    const getReadyTimestamp = (order) => {
        const ts = order.ready_at || order.created_at;
        if (!ts) return null;
        return ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    };

    const isAutoHidden = (order) => {
        if (order.status !== 'Ready Anter') return false;
        const readyDate = getReadyTimestamp(order);
        if (!readyDate) return false;
        const selisihHari = (new Date() - readyDate) / (1000 * 60 * 60 * 24);
        return selisihHari >= 7;
    };

    const sisaHariReady = (order) => {
        const readyDate = getReadyTimestamp(order);
        if (!readyDate) return 7;
        const selisihHari = (new Date() - readyDate) / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.ceil(7 - selisihHari));
    };

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
                        ready_at: tx.ready_at || null,
                        created_at: tx.created_at || null,
                        is_hidden: tx.is_hidden || false,
                        nama: tx.nama || tx.customerNama || customer.nama || '-',
                        hp: tx.hp || tx.customerHp || tx.no_hp || customer.no_hp || '-',
                        status: tx.status_order || tx.status || 'Waiting List',
                        statusBayar: tx.statusBayar || 'Belum Lunas',
                        metode_pembayaran: tx.metode_pembayaran || tx.metode || '',
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

    const visibleTransactions = transactions.filter(
        o => !o.is_hidden && !isAutoHidden(o) && o.layanan_type !== "home_visit"
    );

    const getCount = (status) =>
        status === 'Semua'
            ? visibleTransactions.length
            : visibleTransactions.filter(o => o.status === status).length;

    const applyFilter = (list) => list.filter(o => {
        if (o.is_hidden) return false;
        if (isAutoHidden(o)) return false;
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

    const filtered = applyFilter(visibleTransactions);
    const orderAktif = sortList(filtered.filter(o => o.status !== 'Ready Anter'));
    const orderReady = sortList(filtered.filter(o => o.status === 'Ready Anter'));
    const totalAktif = visibleTransactions.filter(o => o.status !== 'Ready Anter').length;

    const isAdmin = user?.role === 'admin' || user?.role === 'Admin';

    return (
        <div style={S.page}>

            {/* ── Hero Header ── */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <div style={S.logoWrap}>
                        <div style={S.logoIconWrap}>
                            <Layers size={20} color="#04CDCD" />
                        </div>
                        <div>
                            <div style={S.brand}>Carpetology</div>
                            <div style={S.tagline}>Admin Dashboard</div>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut(auth)}
                        style={S.logoutBtn}
                    >
                        <LogOut size={12} />
                        Logout
                    </button>
                </div>

                {/* Stats */}
                <div style={S.statsRow}>
                    <div style={S.statChip}>
                        <span style={S.statNum}>{totalAktif}</span>
                        <span style={S.statLbl}>Order Aktif</span>
                    </div>
                    <div style={S.statDivider} />
                    <div style={S.statChip}>
                        <span style={{ ...S.statNum, color: '#86efac' }}>{getCount('Ready Anter')}</span>
                        <span style={S.statLbl}>Ready Anter</span>
                    </div>
                    <div style={S.statDivider} />
                    <div style={S.statChip}>
                        <span style={S.statNum}>{visibleTransactions.length}</span>
                        <span style={S.statLbl}>Total Order</span>
                    </div>
                </div>
            </div>

            <div style={S.contentWrap}>

                {/* ── Search ── */}
                <div style={S.searchWrap}>
                    <span style={S.searchIconWrap}>
                        <Search size={16} color="#94a3b8" />
                    </span>
                    <input
                        type="text"
                        placeholder="Cari nama atau nomor HP..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={S.searchInput}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={S.searchClear}>
                            <X size={14} color="#64748b" />
                        </button>
                    )}
                </div>

                {/* ── Filter chips ── */}
                <div style={S.filterRow}>
                    {[
                        { id: 'Semua', label: `Semua (${getCount('Semua')})`, icon: <LayoutList size={11} /> },
                        { id: 'Waiting List', label: `Waiting (${getCount('Waiting List')})`, icon: <Clock size={11} /> },
                        { id: 'Sudah Dicuci', label: `Dicuci (${getCount('Sudah Dicuci')})`, icon: <CheckCircle size={11} /> },
                        { id: 'Ready Anter', label: `Ready (${getCount('Ready Anter')})`, icon: <CheckCircle size={11} /> },
                    ].map((item) => (
                        <button
                            key={item.id}
                            style={{
                                ...S.filterChip,
                                background: activeFilter === item.id ? '#04CDCD' : '#fff',
                                color: activeFilter === item.id ? '#fff' : '#475569',
                                borderColor: activeFilter === item.id ? '#04CDCD' : '#e2e8f0',
                                fontWeight: activeFilter === item.id ? 700 : 600,
                            }}
                            onClick={() => setActiveFilter(item.id)}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>

                {/* ── Jadwal Home Visit ── */}
                <button
                    onClick={() => navigate('/admin/jadwal-home-visit')}
                    style={S.homeVisitBtn}
                >
                    <Home size={20} color="#fff" />
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Jadwal Home Visit</div>
                        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>Sofa & Springbed — cuci di tempat</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 18, opacity: 0.7 }}>›</span>
                </button>

                {/* ── Sort ── */}
                <div style={S.sortRow}>
                    <span style={S.sortLabel}>Urutkan:</span>
                    <div style={S.toggleGroup}>
                        <button
                            onClick={() => setSortBy('urgent')}
                            style={{ ...S.toggleBtn, ...(sortBy === 'urgent' ? S.toggleActive : {}) }}
                        >
                            <Flame size={11} /> Paling Lama
                        </button>
                        <button
                            onClick={() => setSortBy('terbaru')}
                            style={{ ...S.toggleBtn, ...(sortBy === 'terbaru' ? S.toggleActive : {}) }}
                        >
                            <AlarmClock size={11} /> Terbaru
                        </button>
                    </div>
                </div>

                {/* ── Order List ── */}
                {isLoading ? (
                    <div style={S.loadingWrap}>
                        <div style={S.spinner} />
                        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>Memuat data...</div>
                    </div>
                ) : (
                    <>
                        {orderAktif.length > 0 && (
                            <>
                                <div style={S.sectionHeader}>
                                    <Flame size={13} color="#ef4444" />
                                    Order Aktif
                                    <span style={S.sectionCount}>{orderAktif.length}</span>
                                </div>
                                <div style={S.cardList}>
                                    {orderAktif.map((order) => (
                                        <OrderRow key={order.id} order={order} onClick={onOrderClick} isReady={false} />
                                    ))}
                                </div>
                            </>
                        )}

                        {orderReady.length > 0 && (
                            <>
                                <div style={{ ...S.sectionHeader, color: '#15803d', borderLeftColor: '#22c55e' }}>
                                    <CheckCircle size={13} color="#22c55e" />
                                    Ready Anter
                                    <span style={{ ...S.sectionCount, backgroundColor: '#dcfce7', color: '#15803d' }}>
                                        {orderReady.length}
                                    </span>
                                </div>
                                <div style={S.cardList}>
                                    {orderReady.map((order) => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                            onClick={onOrderClick}
                                            isReady={true}
                                            isAdmin={isAdmin}
                                            sisaHari={sisaHariReady(order)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {orderAktif.length === 0 && orderReady.length === 0 && (
                            <div style={S.emptyState}>
                                <LayoutList size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                                    {searchQuery ? 'Tidak ditemukan' : 'Belum ada order'}
                                </div>
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                    {searchQuery ? 'Coba cek ejaan nama atau nomor HP.' : 'Data order akan muncul di sini.'}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── FAB ── */}
            {isAdmin && (
                <button className="fixed-fab" style={S.fab} onClick={() => navigate('/admin/kasir')}>
                    <Plus size={28} color="#fff" />
                </button>
            )}

            {/* ── Navbar ── */}
            {isAdmin && (
                <div className="fixed-bottom-bar" style={S.navbarInner}>
                    <Navbar />
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

const S = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 130,
    },
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '20px 20px 0',
    },
    heroInner: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        maxWidth: 500,
        margin: '0 auto 20px',
    },
    logoWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    logoIconWrap: {
        width: 36,
        height: 36,
        background: '#04CDCD22',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brand: {
        fontSize: 20,
        fontWeight: 800,
        color: '#04CDCD',
        letterSpacing: '-0.3px',
    },
    tagline: {
        fontSize: 10,
        color: '#6B8894',
        marginTop: 1,
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'none',
        border: '1px solid #2C4A54',
        color: '#6B8894',
        padding: '5px 12px',
        borderRadius: 6,
        fontSize: 11,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    statsRow: {
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px 12px 0 0',
        padding: '12px 20px',
        maxWidth: 500,
        margin: '0 auto',
    },
    statChip: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
    },
    statNum: {
        fontSize: 20,
        fontWeight: 800,
        color: '#fff',
    },
    statLbl: {
        fontSize: 9,
        color: '#6B8894',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: 600,
    },
    statDivider: {
        width: 1,
        background: 'rgba(255,255,255,0.2)',
        margin: '0 4px',
    },
    contentWrap: {
        maxWidth: 500,
        margin: '0 auto',
        padding: '16px 16px 0',
    },
    searchWrap: {
        position: 'relative',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
    },
    searchIconWrap: {
        position: 'absolute',
        left: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 1,
    },
    searchInput: {
        width: '100%',
        padding: '12px 40px 12px 42px',
        borderRadius: 12,
        border: '1.5px solid #e2e8f0',
        fontSize: 14,
        fontFamily: 'inherit',
        outline: 'none',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        color: '#1e293b',
    },
    searchClear: {
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '50%',
        width: 24,
        height: 24,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    filterRow: {
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        overflowX: 'auto',
        paddingBottom: 2,
    },
    filterChip: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 12px',
        borderRadius: 20,
        border: '1.5px solid',
        fontSize: 12,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        flexShrink: 0,
        transition: 'all 0.15s',
    },
    homeVisitBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #04CDCD, #028585)',
        color: '#fff',
        border: 'none',
        borderRadius: 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
        marginBottom: 12,
        boxShadow: '0 4px 16px rgba(4,205,205,0.25)',
        boxSizing: 'border-box',
    },
    sortRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
        marginBottom: 12,
    },
    sortLabel: {
        fontSize: 12,
        color: '#64748b',
    },
    toggleGroup: {
        display: 'flex',
        gap: 4,
    },
    toggleBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        fontSize: 11,
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        backgroundColor: '#fff',
        fontFamily: 'inherit',
        color: '#64748b',
    },
    toggleActive: {
        backgroundColor: '#1e293b',
        color: '#fff',
        borderColor: '#1e293b',
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: 800,
        color: '#ef4444',
        borderLeft: '3px solid #ef4444',
        padding: '6px 12px',
        backgroundColor: '#fff',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 8,
        marginBottom: 10,
    },
    sectionCount: {
        backgroundColor: '#fee2e2',
        color: '#ef4444',
        borderRadius: 10,
        padding: '1px 8px',
        fontSize: 11,
    },
    cardList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginBottom: 16,
    },
    loadingWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 20px',
    },
    spinner: {
        width: 32,
        height: 32,
        border: '3px solid #f1f5f9',
        borderTop: '3px solid #04CDCD',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    emptyState: {
        textAlign: 'center',
        padding: '48px 20px',
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: '50%',
        backgroundColor: '#04CDCD',
        color: '#fff',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(4,205,205,0.4)',
        cursor: 'pointer',
    },
    navbarInner: {
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#fff',
    },
};

export default OrderList;