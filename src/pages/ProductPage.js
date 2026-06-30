import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../componets/Navbar';
import {
    Package, Search, X, Plus, Trash2, ChevronRight,
    Layers, AlertTriangle, Tag, Sofa, Bed,
} from 'lucide-react';

function SkeletonList() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i} style={S.skeletonCard}>
                    <div style={S.skeletonIcon} />
                    <div style={{ flex: 1 }}>
                        <div style={S.skeletonLine} />
                        <div style={{ ...S.skeletonLine, width: '55%', marginBottom: 0 }} />
                    </div>
                </div>
            ))}
            <style>{`@keyframes ppPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
        </div>
    );
}

function ProductIcon({ nama = '', size = 20 }) {
    const n = nama.toLowerCase();
    if (n.includes('karpet'))  return <Layers size={size} color="#04CDCD" />;
    if (n.includes('spring'))  return <Bed size={size} color="#04CDCD" />;
    if (n.includes('sofa'))    return <Sofa size={size} color="#04CDCD" />;
    if (n.includes('tikar'))   return <Layers size={size} color="#04CDCD" />;
    if (n.includes('bantal'))  return <Package size={size} color="#04CDCD" />;
    return <Package size={size} color="#04CDCD" />;
}

const ProductPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [products, setProducts]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting]         = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'products'), orderBy('nama_produk', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    const filtered = products.filter(p =>
        (p.nama_produk || '').toLowerCase().includes(search.toLowerCase())
    );

    async function handleDelete() {
        if (!deleteTarget || deleting) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, 'products', deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus layanan.');
        } finally {
            setDeleting(false);
        }
    }

    const isAdmin = user?.role === 'admin' || user?.role === 'Admin';

    return (
        <div style={S.page}>

            {/* ── Hero Header ── */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <div style={S.logoWrap}>
                        <div style={S.logoIconWrap}>
                            <Package size={22} color="#04CDCD" />
                        </div>
                        <div>
                            <div style={S.brand}>Layanan</div>
                            <div style={S.tagline}>Carpetology ID · Daftar Layanan</div>
                        </div>
                    </div>
                </div>

                {/* Search di dalam hero */}
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}>
                        <Search size={16} color="#94a3b8" />
                    </span>
                    <input
                        type="text"
                        placeholder="Cari layanan..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={S.searchInput}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={S.searchClear}>
                            <X size={14} color="#64748b" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Stats bar (overlap hero) ── */}
            <div style={S.statsBar}>
                <span style={S.statsLabel}>
                    {search ? `Hasil: "${search}"` : 'Total Layanan'}
                </span>
                <span style={S.statsCount}>
                    {loading ? '...' : `${filtered.length} layanan`}
                </span>
            </div>

            {/* ── List ── */}
            <div style={S.list}>
                {loading ? (
                    <SkeletonList />
                ) : filtered.length > 0 ? (
                    filtered.map(product => (
                        <div key={product.id} style={S.card}>
                            <div style={S.cardIcon}>
                                <ProductIcon nama={product.nama_produk} size={20} />
                            </div>
                            <div style={S.cardBody}>
                                <div style={S.cardName}>{product.nama_produk}</div>
                                <div style={S.cardPrice}>
                                    Rp {product.harga_jual?.toLocaleString('id-ID')}
                                    {product.satuan && (
                                        <span style={S.cardSatuan}>/ {product.satuan}</span>
                                    )}
                                </div>
                            </div>
                            <div style={S.cardActions}>
                                <button
                                    style={S.btnDetail}
                                    onClick={() => navigate(`/admin/produk/${product.id}`)}
                                >
                                    <ChevronRight size={14} color="#475569" />
                                    Detail
                                </button>
                                <button
                                    style={S.btnDelete}
                                    onClick={() => setDeleteTarget({ id: product.id, nama: product.nama_produk })}
                                >
                                    <Trash2 size={13} color="#ef4444" />
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={S.emptyState}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                            {search
                                ? <Search size={40} color="#cbd5e1" />
                                : <Package size={40} color="#cbd5e1" />}
                        </div>
                        <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                            {search ? 'Layanan tidak ditemukan' : 'Belum ada layanan'}
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8' }}>
                            {search
                                ? `Tidak ada layanan dengan kata "${search}"`
                                : 'Tap tombol di bawah untuk menambahkan layanan pertama'}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add button ── */}
            <div style={S.addWrap}>
                <button style={S.btnAdd} onClick={() => navigate('/admin/tambah-produk')}>
                    <Plus size={18} color="#fff" />
                    Tambah Layanan
                </button>
            </div>

            {/* ── Navbar ── */}
            {isAdmin && (
                <div style={S.navbarWrap}>
                    <Navbar />
                </div>
            )}

            {/* ── Delete modal ── */}
            {deleteTarget && (
                <div
                    style={S.modalOverlay}
                    onClick={() => !deleting && setDeleteTarget(null)}
                >
                    <div style={S.modal} onClick={e => e.stopPropagation()}>
                        <div style={S.modalHandle} />
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                            <div style={S.modalIconWrap}>
                                <Trash2 size={28} color="#ef4444" />
                            </div>
                        </div>
                        <h2 style={S.modalTitle}>Hapus Layanan?</h2>
                        <p style={S.modalSub}>
                            <strong>{deleteTarget.nama}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
                        </p>
                        <div style={S.modalBtns}>
                            <button
                                style={S.modalCancel}
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                Batal
                            </button>
                            <button
                                style={{ ...S.modalConfirm, opacity: deleting ? 0.5 : 1 }}
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes ppPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
                @keyframes ppFadeIn { from{opacity:0} to{opacity:1} }
                @keyframes ppSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
            `}</style>
        </div>
    );
};

const S = {
    page: {
        minHeight: '100vh',
        height: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },

    // Hero
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '20px 20px 48px',
        flexShrink: 0,
    },
    heroInner: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        maxWidth: 500,
        margin: '0 auto 16px',
    },
    logoWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    logoIconWrap: {
        width: 40,
        height: 40,
        background: 'rgba(4,205,205,0.15)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brand: {
        fontSize: 20,
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '-0.3px',
    },
    tagline: {
        fontSize: 10,
        color: '#6B8894',
        marginTop: 1,
    },

    // Search (inside hero)
    searchWrap: {
        position: 'relative',
        maxWidth: 500,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
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
        borderRadius: 14,
        border: 'none',
        fontSize: 14,
        fontFamily: 'inherit',
        outline: 'none',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        color: '#1e293b',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    },
    searchClear: {
        position: 'absolute',
        right: 12,
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
    },

    // Stats bar
    statsBar: {
        background: '#fff',
        borderRadius: 16,
        margin: '-24px auto 0',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        maxWidth: 468,
        marginTop: -24,
        marginLeft: 'auto',
        marginRight: 'auto',
    },
    statsLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: 600,
    },
    statsCount: {
        fontSize: 13,
        fontWeight: 800,
        color: '#04CDCD',
    },

    // List
    list: {
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        paddingBottom: 16,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
    },

    // Card
    card: {
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'rgba(4,205,205,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    cardBody: {
        flex: 1,
        minWidth: 0,
    },
    cardName: {
        fontSize: 14,
        fontWeight: 800,
        color: '#1e293b',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginBottom: 3,
    },
    cardPrice: {
        fontSize: 13,
        fontWeight: 700,
        color: '#04CDCD',
    },
    cardSatuan: {
        fontSize: 11,
        fontWeight: 500,
        color: '#94a3b8',
        marginLeft: 2,
    },
    cardActions: {
        display: 'flex',
        gap: 6,
        flexShrink: 0,
    },
    btnDetail: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '7px 11px',
        borderRadius: 10,
        border: '1.5px solid #e2e8f0',
        background: '#f8fafc',
        color: '#475569',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: 'pointer',
    },
    btnDelete: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '7px 11px',
        borderRadius: 10,
        border: '1.5px solid #fecaca',
        background: '#fff5f5',
        color: '#ef4444',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: 'pointer',
    },

    // Skeleton
    skeletonCard: {
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: '1px solid #f1f5f9',
    },
    skeletonIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        background: '#f1f5f9',
        flexShrink: 0,
        animation: 'ppPulse 1.4s ease-in-out infinite',
    },
    skeletonLine: {
        height: 12,
        borderRadius: 6,
        background: '#f1f5f9',
        marginBottom: 8,
        width: '100%',
        animation: 'ppPulse 1.4s ease-in-out infinite',
    },

    // Empty
    emptyState: {
        textAlign: 'center',
        padding: '48px 20px',
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #f1f5f9',
    },

    // Add button
    addWrap: {
        padding: '10px 16px 8px',
        background: '#f8fafc',
        flexShrink: 0,
    },
    btnAdd: {
        width: '100%',
        padding: 15,
        borderRadius: 16,
        border: 'none',
        background: '#04CDCD',
        color: '#fff',
        fontSize: 15,
        fontWeight: 900,
        fontFamily: 'inherit',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        boxShadow: '0 4px 20px rgba(4,205,205,0.35)',
        letterSpacing: '0.3px',
    },

    // Navbar
    navbarWrap: {
        flexShrink: 0,
        borderTop: '1px solid #e2e8f0',
        background: '#fff',
        width: '100%',
    },

    // Modal
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
        animation: 'ppFadeIn 0.2s ease',
    },
    modal: {
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px 32px',
        width: '100%',
        maxWidth: 520,
        animation: 'ppSlideUp 0.25s ease',
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        background: '#e2e8f0',
        margin: '0 auto 20px',
    },
    modalIconWrap: {
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: '#fff5f5',
        border: '2px solid #fecaca',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 900,
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 6,
    },
    modalSub: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalBtns: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
    },
    modalCancel: {
        padding: 14,
        borderRadius: 14,
        border: '2px solid #e2e8f0',
        background: '#fff',
        fontSize: 14,
        fontWeight: 700,
        color: '#64748b',
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    modalConfirm: {
        padding: 14,
        borderRadius: 14,
        border: 'none',
        background: '#ef4444',
        color: '#fff',
        fontSize: 14,
        fontWeight: 800,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
};

export default ProductPage;