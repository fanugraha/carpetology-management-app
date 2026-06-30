import React, { useState, useEffect, useRef } from 'react';
import {
    collection, onSnapshot, query, orderBy,
    addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
    Users, Search, X, Plus, Pencil, Trash2,
    Phone, User, MapPin, ChevronDown, ChevronUp,
    Download, MessageCircle, Check, AlertTriangle, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Navbar from '../componets/Navbar';

/* ─── Modal Konfirmasi Hapus ─── */
function DeleteModal({ customer, onConfirm, onCancel }) {
    return (
        <div style={S.overlay}>
            <div style={S.modal}>
                <div style={S.modalIcon}>
                    <AlertTriangle size={28} color="#dc2626" />
                </div>
                <div style={S.modalTitle}>Hapus Pelanggan?</div>
                <div style={S.modalBody}>
                    Data <strong>{customer.nama}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
                </div>
                <div style={S.modalActions}>
                    <button onClick={onCancel} style={S.btnCancel}>Batal</button>
                    <button onClick={onConfirm} style={S.btnDelete}>Ya, Hapus</button>
                </div>
            </div>
        </div>
    );
}

/* ─── Form Tambah / Edit ─── */
function CustomerForm({ initial, onSave, onCancel, saving }) {
    const [form, setForm] = useState({
        nama: initial?.nama || '',
        no_hp: initial?.no_hp || '',
        alamat: initial?.alamat || '',
        catatan: initial?.catatan || '',
    });

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
    const valid = form.nama.trim() && form.no_hp.trim();

    return (
        <div style={S.overlay}>
            <div style={{ ...S.modal, maxWidth: 420, width: '92%' }}>
                <div style={S.modalTitle}>{initial ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</div>

                <div style={S.formGroup}>
                    <label style={S.formLabel}><User size={12} /> Nama Pelanggan *</label>
                    <input
                        style={S.formInput}
                        placeholder="Nama lengkap"
                        value={form.nama}
                        onChange={e => set('nama', e.target.value)}
                        autoFocus
                    />
                </div>
                <div style={S.formGroup}>
                    <label style={S.formLabel}><Phone size={12} /> No. HP / WhatsApp *</label>
                    <input
                        style={S.formInput}
                        placeholder="+62 8xx-xxxx-xxxx"
                        value={form.no_hp}
                        onChange={e => set('no_hp', e.target.value)}
                        type="tel"
                    />
                </div>
                <div style={S.formGroup}>
                    <label style={S.formLabel}><MapPin size={12} /> Alamat</label>
                    <textarea
                        style={{ ...S.formInput, minHeight: 64, resize: 'vertical' }}
                        placeholder="Alamat lengkap (opsional)"
                        value={form.alamat}
                        onChange={e => set('alamat', e.target.value)}
                    />
                </div>
                <div style={S.formGroup}>
                    <label style={S.formLabel}>Catatan</label>
                    <input
                        style={S.formInput}
                        placeholder="Catatan tambahan (opsional)"
                        value={form.catatan}
                        onChange={e => set('catatan', e.target.value)}
                    />
                </div>

                <div style={S.modalActions}>
                    <button onClick={onCancel} style={S.btnCancel} disabled={saving}>Batal</button>
                    <button
                        onClick={() => valid && onSave(form)}
                        style={{ ...S.btnSave, opacity: valid ? 1 : 0.5 }}
                        disabled={!valid || saving}
                    >
                        {saving ? 'Menyimpan...' : <><Check size={13} /> Simpan</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Customer Card ─── */
function CustomerCard({ customer, onEdit, onDelete }) {
    const [expanded, setExpanded] = useState(false);

    const waLink = `https://wa.me/${customer.no_hp?.replace(/\D/g, '')}`;
    const createdDate = customer.created_at?.seconds
        ? new Date(customer.created_at.seconds * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        : '-';

    return (
        <div style={S.card}>
            <div style={S.cardTop}>
                <div style={S.avatar}>
                    {(customer.nama || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.custName}>{customer.nama}</div>
                    <div style={S.custHp}>
                        <Phone size={10} color="#94a3b8" />
                        {customer.no_hp || '-'}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setExpanded(e => !e)} style={S.expandBtn}>
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div style={S.expandWrap}>
                    <div style={S.infoGrid}>
                        <div style={S.infoCell}>
                            <div style={S.infoLabel}><MapPin size={9} /> Alamat</div>
                            <div style={S.infoVal}>{customer.alamat || '-'}</div>
                        </div>
                        <div style={S.infoCell}>
                            <div style={S.infoLabel}>Tgl Daftar</div>
                            <div style={S.infoVal}>{createdDate}</div>
                        </div>
                    </div>
                    {customer.catatan && (
                        <div style={S.noteBox}>{customer.catatan}</div>
                    )}
                    <div style={S.cardActions}>
                        <a href={waLink} target="_blank" rel="noreferrer" style={S.waBtn}>
                            <MessageCircle size={13} /> WA
                        </a>
                        <button onClick={() => onEdit(customer)} style={S.btnEdit}>
                            <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => onDelete(customer)} style={S.btnDelCard}>
                            <Trash2 size={13} /> Hapus
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Main Page ─── */
export default function CustomerPage() {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2800);
    };

    useEffect(() => {
        const q = query(collection(db, 'customers'), orderBy('created_at', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSave = async (form) => {
        setSaving(true);
        try {
            if (editTarget) {
                await updateDoc(doc(db, 'customers', editTarget.id), { ...form });
                showToast('Data pelanggan diperbarui');
            } else {
                await addDoc(collection(db, 'customers'), {
                    ...form,
                    created_at: serverTimestamp(),
                });
                showToast('Pelanggan baru ditambahkan');
            }
        } catch (e) {
            showToast('Gagal menyimpan data', 'error');
        }
        setSaving(false);
        setShowForm(false);
        setEditTarget(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDoc(doc(db, 'customers', deleteTarget.id));
            showToast('Pelanggan dihapus');
        } catch {
            showToast('Gagal menghapus', 'error');
        }
        setDeleteTarget(null);
    };

    const handleExport = () => {
        const rows = filteredCustomers.map(c => ({
            'Nama': c.nama || '',
            'No. HP': c.no_hp || '',
            'Alamat': c.alamat || '',
            'Catatan': c.catatan || '',
            'Tgl Daftar': c.created_at?.seconds
                ? new Date(c.created_at.seconds * 1000).toLocaleDateString('id-ID')
                : '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pelanggan');
        XLSX.writeFile(wb, `data-pelanggan-${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('File Excel berhasil diunduh');
    };

    const filteredCustomers = customers.filter(c => {
        const s = searchTerm.toLowerCase().trim();
        if (!s) return true;
        return (
            (c.nama || '').toLowerCase().includes(s) ||
            (c.no_hp || '').replace(/\D/g, '').includes(s.replace(/\D/g, '')) ||
            (c.alamat || '').toLowerCase().includes(s)
        );
    });

    return (
        <div style={S.page}>
            {/* Header */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <div style={S.logoWrap}>
                        <div style={S.logoIconWrap}>
                            <Layers size={20} color="#04CDCD" />
                        </div>
                        <div>
                            <div style={S.brand}>Data Pelanggan</div>
                            <div style={S.tagline}>Carpetology ID — Manajemen Pelanggan</div>
                        </div>
                    </div>
                </div>

                <div style={S.statsRow}>
                    <div style={S.statChip}>
                        <span style={S.statNum}>{customers.length}</span>
                        <span style={S.statLbl}>Total Pelanggan</span>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
                    <div style={S.statChip}>
                        <span style={{ ...S.statNum, color: '#86efac' }}>{filteredCustomers.length}</span>
                        <span style={S.statLbl}>Hasil Pencarian</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={S.contentWrap}>
                {/* Action row */}
                <div style={S.actionRow}>
                    <button onClick={() => { setEditTarget(null); setShowForm(true); }} style={S.btnAdd}>
                        <Plus size={15} /> Tambah
                    </button>
                    <button onClick={handleExport} style={S.btnExport} disabled={filteredCustomers.length === 0}>
                        <Download size={15} /> Export Excel
                    </button>
                </div>

                {/* Search */}
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}><Search size={16} color="#94a3b8" /></span>
                    <input
                        type="text"
                        placeholder="Cari nama, HP, atau alamat..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={S.searchInput}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={S.searchClear}>
                            <X size={14} color="#64748b" />
                        </button>
                    )}
                </div>

                {/* List */}
                {isLoading ? (
                    <div style={S.loadingWrap}>
                        <div style={S.spinner} />
                        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>Memuat data...</div>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div style={S.emptyState}>
                        <Users size={40} color="#cbd5e1" />
                        <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 12 }}>
                            {searchTerm ? 'Tidak ditemukan' : 'Belum ada pelanggan'}
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
                            {searchTerm
                                ? 'Coba kata kunci lain atau cek ejaan.'
                                : 'Klik "Tambah" untuk mendaftarkan pelanggan pertama.'}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filteredCustomers.map(c => (
                            <CustomerCard
                                key={c.id}
                                customer={c}
                                onEdit={cust => { setEditTarget(cust); setShowForm(true); }}
                                onDelete={setDeleteTarget}
                            />
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div style={S.footer}>
                    <div style={{ fontWeight: 700, color: '#04CDCD', marginBottom: 4 }}>Carpetology ID</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Jasa Cuci Karpet & Laundry Professional</div>
                </div>
            </div>

            {/* Modals */}
            {showForm && (
                <CustomerForm
                    initial={editTarget}
                    onSave={handleSave}
                    onCancel={() => { setShowForm(false); setEditTarget(null); }}
                    saving={saving}
                />
            )}
            {deleteTarget && (
                <DeleteModal
                    customer={deleteTarget}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            {/* Toast */}
            {toast && (
                <div style={{
                    ...S.toast,
                    background: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
                    color: toast.type === 'error' ? '#dc2626' : '#15803d',
                    border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
                }}>
                    {toast.type === 'error' ? <AlertTriangle size={14} /> : <Check size={14} />}
                    {toast.msg}
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* ── Bottom Navbar ── */}
            <div className="fixed-bottom-bar" style={{ borderTop: '1px solid #f1f5f9', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)', backgroundColor: '#fff' }}>
                <Navbar />
            </div>
        </div>
    );
}

/* ─── Styles ─── */
const S = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 80,
    },
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '20px 20px 0',
    },
    heroInner: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        maxWidth: 500,
        margin: '0 auto 20px',
    },
    logoWrap: { display: 'flex', alignItems: 'center', gap: 10 },
    logoIconWrap: {
        width: 36, height: 36,
        background: '#04CDCD22',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    brand: { fontSize: 18, fontWeight: 800, color: '#04CDCD', letterSpacing: '-0.3px' },
    tagline: { fontSize: 10, color: '#6B8894', marginTop: 1 },
    statsRow: {
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px 12px 0 0',
        padding: '12px 20px',
        maxWidth: 500,
        margin: '0 auto',
    },
    statChip: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
    statNum: { fontSize: 20, fontWeight: 800, color: '#fff' },
    statLbl: { fontSize: 9, color: '#6B8894', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 },

    contentWrap: { maxWidth: 500, margin: '0 auto', padding: '16px 16px 0' },

    actionRow: { display: 'flex', gap: 10, marginBottom: 14 },
    btnAdd: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 18px',
        background: '#04CDCD',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        flex: 1,
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(4,205,205,0.25)',
    },
    btnExport: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 16px',
        background: '#fff',
        color: '#475569',
        border: '1.5px solid #e2e8f0',
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },

    searchWrap: { position: 'relative', marginBottom: 14, display: 'flex', alignItems: 'center' },
    searchIcon: {
        position: 'absolute', left: 14, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center',
        pointerEvents: 'none', zIndex: 1,
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
        position: 'absolute', right: 10, top: '50%',
        transform: 'translateY(-50%)',
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '50%',
        width: 24, height: 24,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1,
    },

    // Card
    card: {
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #f1f5f9',
    },
    cardTop: { display: 'flex', alignItems: 'center', gap: 12 },
    avatar: {
        width: 40, height: 40,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #04CDCD22, #04CDCD44)',
        color: '#04CDCD',
        fontSize: 16,
        fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        border: '1.5px solid #04CDCD33',
    },
    custName: { fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 3 },
    custHp: {
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 12, color: '#64748b',
    },
    expandBtn: {
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#64748b',
        width: 28, height: 28,
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
    },
    expandWrap: { marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 },

    infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 },
    infoCell: { background: '#f8fafc', borderRadius: 8, padding: '8px 10px' },
    infoLabel: {
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 10, color: '#94a3b8', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2,
    },
    infoVal: { fontSize: 12, fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' },
    noteBox: {
        background: '#fff7ed',
        color: '#c2410c',
        fontSize: 11,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid #fed7aa',
        marginBottom: 10,
        lineHeight: 1.5,
    },
    cardActions: { display: 'flex', gap: 8 },
    waBtn: {
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '8px 14px',
        borderRadius: 10,
        border: '1.5px solid #e2e8f0',
        color: '#04CDCD',
        textDecoration: 'none',
        fontSize: 12, fontWeight: 700,
        fontFamily: 'inherit',
        background: '#f0fefe',
        cursor: 'pointer',
    },
    btnEdit: {
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '8px 14px',
        borderRadius: 10,
        border: '1.5px solid #e2e8f0',
        color: '#475569',
        fontSize: 12, fontWeight: 700,
        fontFamily: 'inherit',
        background: '#fff',
        cursor: 'pointer',
    },
    btnDelCard: {
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '8px 14px',
        borderRadius: 10,
        border: '1.5px solid #fee2e2',
        color: '#dc2626',
        fontSize: 12, fontWeight: 700,
        fontFamily: 'inherit',
        background: '#fff5f5',
        cursor: 'pointer',
        marginLeft: 'auto',
    },

    // Modal / Overlay
    overlay: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
        padding: 16,
    },
    modal: {
        background: '#fff',
        borderRadius: 20,
        padding: '28px 24px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    },
    modalIcon: { display: 'flex', justifyContent: 'center', marginBottom: 14 },
    modalTitle: {
        fontSize: 16, fontWeight: 800, color: '#1e293b',
        textAlign: 'center', marginBottom: 8,
    },
    modalBody: {
        fontSize: 13, color: '#64748b', textAlign: 'center',
        lineHeight: 1.6, marginBottom: 20,
    },
    modalActions: { display: 'flex', gap: 10, marginTop: 20 },
    btnCancel: {
        flex: 1, padding: '11px',
        borderRadius: 12,
        border: '1.5px solid #e2e8f0',
        background: '#fff',
        color: '#64748b',
        fontSize: 13, fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    btnDelete: {
        flex: 1, padding: '11px',
        borderRadius: 12,
        border: 'none',
        background: '#dc2626',
        color: '#fff',
        fontSize: 13, fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    btnSave: {
        flex: 1, padding: '11px',
        borderRadius: 12,
        border: 'none',
        background: '#04CDCD',
        color: '#fff',
        fontSize: 13, fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    },

    // Form
    formGroup: { marginBottom: 14 },
    formLabel: {
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700, color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.4px',
        marginBottom: 6,
    },
    formInput: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        border: '1.5px solid #e2e8f0',
        fontSize: 13,
        fontFamily: 'inherit',
        outline: 'none',
        boxSizing: 'border-box',
        color: '#1e293b',
    },

    // States
    loadingWrap: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '60px 20px',
    },
    spinner: {
        width: 32, height: 32,
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
    },

    // Toast
    toast: {
        position: 'fixed',
        bottom: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        borderRadius: 12,
        fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        zIndex: 300,
        whiteSpace: 'nowrap',
    },

    footer: {
        textAlign: 'center',
        padding: '32px 20px 16px',
        color: '#94a3b8',
        fontSize: 12,
    },
};