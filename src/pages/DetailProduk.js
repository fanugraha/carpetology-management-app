import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
    ChevronLeft, Package, Layers, Bed, Sofa,
    Tag, DollarSign, Ruler, Clock, Trash2,
    Save, CheckCircle, PenLine, Eye, Sparkles,
    AlertTriangle,
} from 'lucide-react';

const SATUAN_OPTIONS = ['pcs', 'm²', 'meter', 'unit', 'kg', 'set'];

// ── Floating label input ──────────────────────────────────────────────────
function FloatInput({ label, icon, type = 'text', value, onChange }) {
    const raised = value !== '' && value !== undefined && value !== null;
    return (
        <div style={SF.field}>
            {icon && <span style={SF.fieldIcon}>{icon}</span>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder=" "
                style={{ ...SF.input, paddingLeft: icon ? 42 : 14 }}
            />
            <label style={{
                ...SF.label,
                left: icon ? 42 : 14,
                ...(raised ? SF.labelRaised : {}),
            }}>
                {label}
            </label>
        </div>
    );
}

// ── Floating label select ─────────────────────────────────────────────────
function FloatSelect({ label, icon, value, onChange, options }) {
    const raised = !!value;
    return (
        <div style={SF.field}>
            {icon && <span style={SF.fieldIcon}>{icon}</span>}
            <select
                value={value}
                onChange={onChange}
                style={{ ...SF.select, paddingLeft: icon ? 42 : 14 }}
            >
                <option value="" disabled hidden> </option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <label style={{
                ...SF.label,
                left: icon ? 42 : 14,
                ...(raised ? SF.labelRaised : {}),
            }}>
                {label}
            </label>
            <span style={SF.selectArrow}>▾</span>
        </div>
    );
}

function ProductIcon({ nama = '', size = 22 }) {
    const n = nama.toLowerCase();
    if (n.includes('karpet')) return <Layers size={size} color="#04CDCD" />;
    if (n.includes('spring')) return <Bed size={size} color="#04CDCD" />;
    if (n.includes('sofa'))   return <Sofa size={size} color="#04CDCD" />;
    if (n.includes('tikar'))  return <Layers size={size} color="#04CDCD" />;
    if (n.includes('bantal')) return <Package size={size} color="#04CDCD" />;
    return <Package size={size} color="#04CDCD" />;
}

export default function DetailProduk() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id;

    const [original, setOriginal]     = useState(null);
    const [formData, setFormData]     = useState({ nama_produk: '', harga_jual: '', satuan: '' });
    const [tab, setTab]               = useState('lihat');
    const [loading, setLoading]       = useState(!isNew);
    const [saving, setSaving]         = useState(false);
    const [deleting, setDeleting]     = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [success, setSuccess]       = useState(null);

    const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

    useEffect(() => {
        if (isNew) return;
        const unsub = onSnapshot(doc(db, 'products', id), (snap) => {
            if (snap.exists()) {
                const d = { id: snap.id, ...snap.data() };
                setOriginal(d);
                setFormData({
                    nama_produk: d.nama_produk || '',
                    harga_jual:  d.harga_jual !== undefined ? String(d.harga_jual) : '',
                    satuan:      d.satuan || '',
                });
            }
            setLoading(false);
        });
        return unsub;
    }, [id, isNew]);

    const hasChanges = !isNew && original && (
        formData.nama_produk !== (original.nama_produk || '') ||
        String(formData.harga_jual) !== String(original.harga_jual ?? '') ||
        formData.satuan !== (original.satuan || '')
    );

    const isFormValid = formData.nama_produk.trim() && formData.harga_jual && formData.satuan;

    async function handleSave() {
        if (!isFormValid || saving) return;
        setSaving(true);
        const payload = {
            nama_produk: formData.nama_produk.trim(),
            harga_jual:  Number(formData.harga_jual),
            satuan:      formData.satuan,
        };
        try {
            if (isNew) {
                await addDoc(collection(db, 'products'), { ...payload, created_at: serverTimestamp() });
            } else {
                await updateDoc(doc(db, 'products', id), { ...payload, updated_at: serverTimestamp() });
            }
            setSuccess('saved');
            setTimeout(() => navigate(-1), 1800);
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan produk.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (deleting) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, 'products', id));
            setShowDelete(false);
            setSuccess('deleted');
            setTimeout(() => navigate(-1), 1800);
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus produk.');
        } finally {
            setDeleting(false);
        }
    }

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12 }}>
            <div style={S.spinner} />
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Memuat produk...</span>
            <style>{`@keyframes dpSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const displayTitle = isNew ? 'Produk Baru' : (original?.nama_produk || 'Detail Produk');

    return (
        <div style={S.page}>

            {/* ── Hero Header ── */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <button style={S.backBtn} onClick={() => navigate(-1)}>
                        <ChevronLeft size={16} color="#a0b8c0" />
                        <span>Kembali</span>
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.heroEyebrow}>Carpetology · Produk</div>
                        <div style={S.heroTitle}>{displayTitle}</div>
                    </div>
                    <div style={S.heroIconWrap}>
                        <ProductIcon nama={formData.nama_produk} size={22} />
                    </div>
                </div>

                {/* Mode badge */}
                <div style={S.heroInner}>
                    <div style={{
                        ...S.modeBadge,
                        background: isNew ? 'rgba(255,255,255,0.15)' : 'rgba(245,158,11,0.25)',
                        color: isNew ? '#fff' : '#fde68a',
                    }}>
                        {isNew
                            ? <><Sparkles size={11} /> Tambah Baru</>
                            : <><PenLine size={11} /> Mode Edit</>
                        }
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={S.content}>

                {/* Tab toggle (mode edit saja) */}
                {!isNew && (
                    <div style={S.tabs}>
                        {[
                            { key: 'lihat', label: 'Lihat', icon: <Eye size={13} /> },
                            { key: 'edit',  label: 'Edit',  icon: <PenLine size={13} /> },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    ...S.tab,
                                    ...(tab === t.key ? S.tabActive : {}),
                                }}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Mode Lihat ── */}
                {!isNew && tab === 'lihat' && original && (
                    <div style={S.card}>
                        <div style={S.cardHeader}>
                            <span style={S.cardHeaderLabel}>Informasi Produk</span>
                        </div>

                        {[
                            {
                                icon: <Tag size={16} color="#04CDCD" />,
                                label: 'Nama Produk',
                                val: original.nama_produk,
                            },
                            {
                                icon: <DollarSign size={16} color="#04CDCD" />,
                                label: 'Harga Jual',
                                val: (
                                    <span style={{ color: '#04CDCD' }}>
                                        Rp {Number(original.harga_jual).toLocaleString('id-ID')}
                                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginLeft: 4 }}>
                                            / {original.satuan}
                                        </span>
                                    </span>
                                ),
                            },
                            {
                                icon: <Ruler size={16} color="#04CDCD" />,
                                label: 'Satuan',
                                val: original.satuan,
                            },
                            ...(original.updated_at ? [{
                                icon: <Clock size={16} color="#04CDCD" />,
                                label: 'Terakhir diubah',
                                val: (
                                    <span style={{ fontSize: 13, color: '#64748b' }}>
                                        {original.updated_at?.toDate?.().toLocaleString('id-ID') || '-'}
                                    </span>
                                ),
                            }] : []),
                        ].map((row, i) => (
                            <div key={i} style={S.previewRow}>
                                <div style={S.previewIconWrap}>{row.icon}</div>
                                <div style={S.previewBody}>
                                    <div style={S.previewLabel}>{row.label}</div>
                                    <div style={S.previewVal}>{row.val}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Mode Form ── */}
                {(isNew || tab === 'edit') && (
                    <div style={S.card}>
                        <div style={S.cardHeader}>
                            <span style={S.cardHeaderLabel}>
                                {isNew ? 'Data Produk Baru' : 'Ubah Data Produk'}
                                {hasChanges && (
                                    <span style={{
                                        display: 'inline-block', width: 6, height: 6,
                                        borderRadius: '50%', background: '#f59e0b',
                                        marginLeft: 7, verticalAlign: 'middle',
                                    }} />
                                )}
                            </span>
                        </div>

                        <div style={S.cardBody}>
                            <FloatInput
                                label="Nama Produk"
                                icon={<Tag size={15} color="#94a3b8" />}
                                value={formData.nama_produk}
                                onChange={e => set('nama_produk', e.target.value)}
                            />

                            <FloatInput
                                label="Harga Jual (Rp)"
                                icon={<DollarSign size={15} color="#94a3b8" />}
                                type="number"
                                value={formData.harga_jual}
                                onChange={e => set('harga_jual', e.target.value)}
                            />

                            {formData.harga_jual && Number(formData.harga_jual) > 0 && (
                                <div style={S.pricePreview}>
                                    <DollarSign size={13} color="#04CDCD" style={{ flexShrink: 0 }} />
                                    Rp {Number(formData.harga_jual).toLocaleString('id-ID')}
                                    {formData.satuan && ` / ${formData.satuan}`}
                                </div>
                            )}

                            <FloatSelect
                                label="Satuan"
                                icon={<Ruler size={15} color="#94a3b8" />}
                                value={formData.satuan}
                                onChange={e => set('satuan', e.target.value)}
                                options={SATUAN_OPTIONS}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Bottom action bar ── */}
            <div style={{
                ...S.actions,
                gridTemplateColumns: isNew ? '1fr' : '1fr 1fr',
            }}>
                {!isNew && (
                    <button style={S.btnDanger} onClick={() => setShowDelete(true)}>
                        <Trash2 size={15} color="#ef4444" /> Hapus
                    </button>
                )}

                {(isNew || tab === 'edit') && (
                    <button
                        style={{
                            ...S.btnPrimary,
                            opacity: (!isFormValid || saving || (!isNew && !hasChanges)) ? 0.35 : 1,
                            cursor: (!isFormValid || saving || (!isNew && !hasChanges)) ? 'not-allowed' : 'pointer',
                        }}
                        disabled={!isFormValid || saving || (!isNew && !hasChanges)}
                        onClick={handleSave}
                    >
                        {saving ? (
                            <>
                                <span style={S.spinnerSmall} />
                                Menyimpan...
                            </>
                        ) : isNew
                            ? <><Save size={15} color="#fff" /> Simpan Produk</>
                            : <><CheckCircle size={15} color="#fff" /> Simpan{hasChanges ? ' Perubahan' : ''}</>
                        }
                    </button>
                )}

                {!isNew && tab === 'lihat' && (
                    <button style={S.btnPrimary} onClick={() => setTab('edit')}>
                        <PenLine size={15} color="#fff" /> Ubah Data
                    </button>
                )}
            </div>

            {/* ── Delete modal ── */}
            {showDelete && (
                <div style={S.modalOverlay} onClick={() => !deleting && setShowDelete(false)}>
                    <div style={S.modal} onClick={e => e.stopPropagation()}>
                        <div style={S.modalHandle} />
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                            <div style={S.modalIconWrap}>
                                <Trash2 size={28} color="#ef4444" />
                            </div>
                        </div>
                        <h2 style={S.modalTitle}>Hapus Produk?</h2>
                        <p style={S.modalSub}>
                            <strong>{original?.nama_produk}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
                        </p>
                        <div style={S.modalBtns}>
                            <button style={S.modalCancel} onClick={() => setShowDelete(false)} disabled={deleting}>
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

            {/* ── Success overlay ── */}
            {success && (
                <div style={S.successOverlay}>
                    <div style={S.successBox}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                background: success === 'saved' ? '#dcfce7' : '#fff5f5',
                                border: `2px solid ${success === 'saved' ? '#86efac' : '#fecaca'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {success === 'saved'
                                    ? <CheckCircle size={30} color="#22c55e" />
                                    : <Trash2 size={28} color="#ef4444" />
                                }
                            </div>
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
                            {success === 'saved' ? 'Berhasil Disimpan!' : 'Produk Dihapus'}
                        </h2>
                        <p style={{ fontSize: 13, color: '#94a3b8' }}>
                            {success === 'saved' ? 'Data produk telah diperbarui' : 'Produk berhasil dihapus dari sistem'}
                        </p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes dpSpin    { to { transform: rotate(360deg); } }
                @keyframes dpFadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes dpPop     { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
                @keyframes dpSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </div>
    );
}

// ── Field styles (floating label) ─────────────────────────────────────────
const SF = {
    field: {
        position: 'relative',
    },
    fieldIcon: {
        position: 'absolute',
        left: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 15,
        pointerEvents: 'none',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
    },
    input: {
        width: '100%',
        padding: '22px 14px 8px 42px',
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: 14,
        fontSize: 14,
        color: '#0f172a',
        fontFamily: 'inherit',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    select: {
        width: '100%',
        padding: '22px 14px 8px 42px',
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: 14,
        fontSize: 14,
        color: '#0f172a',
        fontFamily: 'inherit',
        outline: 'none',
        appearance: 'none',
        cursor: 'pointer',
        boxSizing: 'border-box',
    },
    selectArrow: {
        position: 'absolute',
        right: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 12,
        color: '#94a3b8',
        pointerEvents: 'none',
    },
    label: {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 13,
        fontWeight: 500,
        color: '#94a3b8',
        pointerEvents: 'none',
        transition: 'all 0.18s ease',
        transformOrigin: 'left center',
    },
    labelRaised: {
        top: 10,
        transform: 'translateY(0) scale(0.78)',
        color: '#64748b',
        fontWeight: 700,
    },
};

// ── Page styles ───────────────────────────────────────────────────────────
const S = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 100,
    },

    // Hero
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '16px 20px 20px',
        flexShrink: 0,
    },
    heroInner: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        maxWidth: 500,
        margin: '0 auto 8px',
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#a0b8c0',
        padding: '7px 12px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    heroEyebrow: {
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.5,
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    heroTitle: {
        fontSize: 20,
        fontWeight: 900,
        color: '#fff',
        letterSpacing: '-0.3px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    heroIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    modeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
    },

    // Content
    content: {
        flex: 1,
        padding: '16px 16px 0',
        maxWidth: 500,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
    },

    // Tabs
    tabs: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4,
        background: '#f1f5f9',
        borderRadius: 14,
        padding: 4,
        marginBottom: 14,
    },
    tab: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 10,
        borderRadius: 10,
        border: 'none',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: 'pointer',
        color: '#64748b',
        background: 'transparent',
        transition: 'all 0.18s',
    },
    tabActive: {
        background: '#fff',
        color: '#04CDCD',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },

    // Card
    card: {
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 16px rgba(15,23,42,0.06)',
        overflow: 'hidden',
        marginBottom: 14,
    },
    cardHeader: {
        padding: '12px 18px',
        background: '#f8fafc',
        borderBottom: '1px solid #f1f5f9',
    },
    cardHeaderLabel: {
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 1.5,
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    cardBody: {
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
    },

    // Preview rows
    previewRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        borderBottom: '1px solid #f8fafc',
    },
    previewIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'rgba(4,205,205,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    previewBody: { flex: 1 },
    previewLabel: {
        fontSize: 10,
        fontWeight: 700,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    previewVal: {
        fontSize: 14,
        fontWeight: 700,
        color: '#1e293b',
    },

    // Price preview
    pricePreview: {
        background: 'rgba(4,205,205,0.07)',
        border: '1.5px solid rgba(4,205,205,0.2)',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 13,
        color: '#04CDCD',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    },

    // Bottom actions
    actions: {
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: '#fff',
        borderTop: '1px solid #f1f5f9',
        padding: '14px 16px',
        display: 'grid',
        gap: 10,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        zIndex: 20,
        boxSizing: 'border-box',
    },
    btnPrimary: {
        padding: 15,
        borderRadius: 16,
        border: 'none',
        background: '#04CDCD',
        color: '#fff',
        fontSize: 14,
        fontWeight: 800,
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        boxShadow: '0 4px 16px rgba(4,205,205,0.3)',
        transition: 'all 0.15s',
    },
    btnDanger: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: 15,
        borderRadius: 16,
        border: '2px solid #fecaca',
        background: '#fff',
        color: '#ef4444',
        fontSize: 14,
        fontWeight: 800,
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition: 'all 0.15s',
    },

    // Spinner
    spinner: {
        width: 34,
        height: 34,
        border: '3px solid rgba(4,205,205,0.2)',
        borderTopColor: '#04CDCD',
        borderRadius: '50%',
        animation: 'dpSpin 0.7s linear infinite',
    },
    spinnerSmall: {
        width: 14,
        height: 14,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'dpSpin 0.7s linear infinite',
        display: 'inline-block',
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
        animation: 'dpFadeIn 0.2s ease',
    },
    modal: {
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px 32px',
        width: '100%',
        maxWidth: 520,
        animation: 'dpSlideUp 0.25s ease',
    },
    modalHandle: {
        width: 40, height: 4,
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
        fontSize: 17, fontWeight: 900,
        color: '#1e293b', textAlign: 'center', marginBottom: 6,
    },
    modalSub: {
        fontSize: 13, color: '#94a3b8',
        textAlign: 'center', marginBottom: 24,
    },
    modalBtns: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
    },
    modalCancel: {
        padding: 14, borderRadius: 14,
        border: '2px solid #e2e8f0', background: '#fff',
        fontSize: 14, fontWeight: 700, color: '#64748b',
        cursor: 'pointer', fontFamily: 'inherit',
    },
    modalConfirm: {
        padding: 14, borderRadius: 14,
        border: 'none', background: '#ef4444', color: '#fff',
        fontSize: 14, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
    },

    // Success overlay
    successOverlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        animation: 'dpFadeIn 0.2s ease',
    },
    successBox: {
        background: '#fff',
        borderRadius: 24,
        padding: '32px 28px',
        textAlign: 'center',
        maxWidth: 300,
        width: '90%',
        animation: 'dpPop 0.25s ease',
    },
};