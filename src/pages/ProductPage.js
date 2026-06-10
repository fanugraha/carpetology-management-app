import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../componets/Navbar';
import './ProductPage.css';

function SkeletonList() {
    return (
        <div className="pp-skeleton">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="pp-skeleton__card">
                    <div className="pp-skeleton__icon" />
                    <div className="pp-skeleton__lines">
                        <div className="pp-skeleton__line" />
                        <div className="pp-skeleton__line pp-skeleton__line--short" />
                    </div>
                </div>
            ))}
        </div>
    );
}

const ProductPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

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
            alert('Gagal menghapus produk.');
        } finally {
            setDeleting(false);
        }
    }

    function productIcon(nama = '') {
        const n = nama.toLowerCase();
        if (n.includes('karpet')) return '🟫';
        if (n.includes('spring')) return '🛏️';
        if (n.includes('sofa')) return '🛋️';
        if (n.includes('tikar')) return '🟩';
        if (n.includes('bantal')) return '🪑';
        return '🧹';
    }

    const isAdmin = user?.role === 'admin' || user?.role === 'Admin';

    return (
        <div className="pp-root">

            {/* Header */}
            <div className="pp-header">
                <p className="pp-header__eyebrow">Carpetology</p>
                <h1 className="pp-header__title">Produk</h1>
                <div className="pp-search-wrap">
                    <span className="pp-search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari produk..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pp-search"
                    />
                    {search && (
                        <button className="pp-search-clear" onClick={() => setSearch('')}>✕</button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="pp-stats">
                <span className="pp-stats__label">
                    {search ? `Hasil: "${search}"` : 'Total Produk'}
                </span>
                <span className="pp-stats__count">
                    {loading ? '...' : `${filtered.length} produk`}
                </span>
            </div>

            {/* List */}
            <div className="pp-list">
                {loading ? (
                    <SkeletonList />
                ) : filtered.length > 0 ? (
                    filtered.map(product => (
                        <div key={product.id} className="pp-card">
                            <div className="pp-card__icon">
                                {productIcon(product.nama_produk)}
                            </div>
                            <div className="pp-card__body">
                                <div className="pp-card__name">{product.nama_produk}</div>
                                <div className="pp-card__price">
                                    Rp {product.harga_jual?.toLocaleString('id-ID')}
                                    {product.satuan && (
                                        <span className="pp-card__satuan">/ {product.satuan}</span>
                                    )}
                                </div>
                            </div>
                            <div className="pp-card__actions">
                                <button
                                    className="pp-btn-detail"
                                    onClick={() => navigate(`/produk/${product.id}`)}
                                >
                                    Detail
                                </button>
                                <button
                                    className="pp-btn-delete"
                                    onClick={() => setDeleteTarget({ id: product.id, nama: product.nama_produk })}
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="pp-empty">
                        <div className="pp-empty__emoji">📦</div>
                        <p className="pp-empty__title">
                            {search ? 'Produk tidak ditemukan' : 'Belum ada produk'}
                        </p>
                        <p className="pp-empty__sub">
                            {search
                                ? `Tidak ada produk dengan kata "${search}"`
                                : 'Tap tombol di bawah untuk menambahkan produk pertama'}
                        </p>
                    </div>
                )}
            </div>

            {/* Add button */}
            <div className="pp-add-wrap">
                <button className="pp-btn-add" onClick={() => navigate('/tambah-produk')}>
                    <span style={{ fontSize: 18 }}>＋</span>
                    Tambah Produk
                </button>
            </div>

            {/* Navbar */}
            {isAdmin && (
                <div className="pp-navbar">
                    <Navbar />
                </div>
            )}

            {/* Delete modal */}
            {deleteTarget && (
                <div className="pp-modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
                    <div className="pp-modal" onClick={e => e.stopPropagation()}>
                        <div className="pp-modal__handle" />
                        <div className="pp-modal__icon">🗑️</div>
                        <h2 className="pp-modal__title">Hapus Produk?</h2>
                        <p className="pp-modal__sub">
                            <strong>{deleteTarget.nama}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
                        </p>
                        <div className="pp-modal__btns">
                            <button
                                className="pp-modal__cancel"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                Batal
                            </button>
                            <button
                                className="pp-modal__confirm"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductPage;