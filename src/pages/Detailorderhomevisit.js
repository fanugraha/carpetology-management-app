import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import {
    User, Phone, MapPin, ArrowLeft,
    CheckCircle, AlertTriangle, Sun, Cloud,
    Loader2, Trash2, CalendarDays, Clock, Edit3,
} from 'lucide-react';

const BULAN_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatTanggal(str) {
    if (!str) return '-';
    const d = new Date(str + 'T00:00:00');
    return `${HARI_FULL[d.getDay()]}, ${d.getDate()} ${BULAN_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Field input ──
function FieldInput({ label, icon: Icon, type = 'text', value, onChange }) {
    return (
        <div style={S.fieldWrap}>
            <label style={S.fieldLabel}>{label}</label>
            <div style={S.fieldInner}>
                {Icon && <Icon size={16} color="#94a3b8" style={{ flexShrink: 0 }} />}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    style={S.fieldInput}
                    placeholder={label}
                />
            </div>
        </div>
    );
}

// ── Field textarea ──
function FieldTextarea({ label, value, onChange }) {
    return (
        <div style={S.fieldWrap}>
            <label style={S.fieldLabel}>{label}</label>
            <textarea
                value={value}
                onChange={onChange}
                rows={3}
                style={S.fieldTextarea}
                placeholder={label}
            />
        </div>
    );
}

export default function UbahOrderHomeVisit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const role = (user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isCS = role === 'cs';
    const canEditDelete = isAdmin || isCS;

    const [original, setOriginal] = useState(null);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const ref = doc(db, 'bookings', id);
        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() };
                setOriginal(data);
                setFormData(prev => prev ?? {
                    nama: data.nama || '',
                    no_hp: data.no_hp || '',
                    tanggal: data.tanggal || '',
                    sesi: Number(data.sesi) || '',
                    maps_lokasi: data.maps_lokasi || '',
                    keterangan: data.keterangan || '',
                });
            }
            setLoading(false);
        });
        return unsub;
    }, [id]);

    const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

    const isSesi1Disabled = () => {
        if (!formData?.tanggal) return false;
        const day = new Date(formData.tanggal).getDay();
        return [2, 4, 6].includes(day);
    };

    const changedFields = useMemo(() => {
        if (!original || !formData) return [];
        return ['nama', 'no_hp', 'tanggal', 'sesi', 'maps_lokasi', 'keterangan']
            .filter(k => String(formData[k]) !== String(original[k] ?? ''));
    }, [original, formData]);

    const hasChanges = changedFields.length > 0;

    const fieldLabel = {
        nama: 'Nama', no_hp: 'No. HP', tanggal: 'Tanggal',
        sesi: 'Sesi', maps_lokasi: 'Maps', keterangan: 'Keterangan',
    };

    const displayVal = (key, val) => {
        if (key === 'sesi') return val === 1 ? 'Sesi 1 (09:00–11:00)' : 'Sesi 2 (13:00–15:00)';
        if (key === 'tanggal') return formatTanggal(val);
        return val || '-';
    };

    async function handleSave() {
        if (!hasChanges || saving) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'bookings', id), {
                nama: formData.nama,
                no_hp: formData.no_hp,
                tanggal: formData.tanggal,
                sesi: Number(formData.sesi),
                maps_lokasi: formData.maps_lokasi,
                keterangan: formData.keterangan,
                updated_at: new Date(),
            });
            setSuccess(true);
            setIsEditing(false);
            setTimeout(() => setSuccess(false), 2000);
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
        }
        setDeleting(true);
        try {
            await deleteDoc(doc(db, 'bookings', id));
            navigate(-1);
        } catch (err) {
            alert('Gagal menghapus: ' + err.message);
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    }

    if (loading || !formData) return (
        <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <span style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>Memuat data...</span>
        </div>
    );

    return (
        <div style={S.page}>

            {/* ── Header ── */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <button onClick={() => navigate(-1)} style={S.backBtn}>
                        <ArrowLeft size={14} />
                        Kembali
                    </button>
                    <div style={S.heroText}>
                        <div style={S.eyebrow}>Home Visit · Detail</div>
                        <div style={S.heroTitle}>{original?.nama}</div>
                        <div style={S.heroSub}>
                            {original?.tanggal ? formatTanggal(original.tanggal) : '-'}
                            {' · '}
                            {original?.sesi === 1 ? 'Sesi 1 (09:00–11:00)' : 'Sesi 2 (13:00–15:00)'}
                        </div>
                    </div>
                </div>
            </div>

            <div style={S.contentWrap}>

                {/* ── Success banner ── */}
                {success && (
                    <div style={S.successBanner}>
                        <CheckCircle size={16} color="#15803d" />
                        <span>Berhasil disimpan!</span>
                    </div>
                )}

                {/* ── Diff preview ── */}
                {hasChanges && isEditing && (
                    <div style={S.diffBox}>
                        <div style={S.diffTitle}>
                            <AlertTriangle size={14} color="#f97316" />
                            Perubahan belum disimpan
                        </div>
                        {changedFields.map(k => (
                            <div key={k} style={S.diffRow}>
                                <span style={S.diffKey}>{fieldLabel[k]}</span>
                                <span style={S.diffOld}>{displayVal(k, original[k])}</span>
                                <span style={S.diffArrow}>→</span>
                                <span style={S.diffNew}>{displayVal(k, formData[k])}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── View mode: info cards ── */}
                {!isEditing && (
                    <>
                        {/* Info grid */}
                        <div style={S.card}>
                            <div style={S.cardHeader}>
                                <User size={14} color="#04CDCD" />
                                <span style={S.cardHeaderLabel}>Data Pelanggan</span>
                            </div>
                            <div style={S.infoGrid}>
                                <div style={S.infoCell}>
                                    <div style={S.infoLabel}><User size={9} /> Nama</div>
                                    <div style={S.infoVal}>{original.nama || '-'}</div>
                                </div>
                                <div style={S.infoCell}>
                                    <div style={S.infoLabel}><Phone size={9} /> No. HP</div>
                                    <div style={S.infoVal}>{original.no_hp || '-'}</div>
                                </div>
                            </div>
                        </div>

                        <div style={S.card}>
                            <div style={S.cardHeader}>
                                <CalendarDays size={14} color="#04CDCD" />
                                <span style={S.cardHeaderLabel}>Jadwal Kunjungan</span>
                            </div>
                            <div style={S.infoGrid}>
                                <div style={S.infoCell}>
                                    <div style={S.infoLabel}><CalendarDays size={9} /> Tanggal</div>
                                    <div style={S.infoVal}>{formatTanggal(original.tanggal)}</div>
                                </div>
                                <div style={S.infoCell}>
                                    <div style={S.infoLabel}><Clock size={9} /> Sesi</div>
                                    <div style={S.infoVal}>
                                        {original.sesi === 1 ? 'Sesi 1 · 09:00–11:00' : 'Sesi 2 · 13:00–15:00'}
                                    </div>
                                </div>
                            </div>
                            {original.maps_lokasi && (
                                <a
                                    href={original.maps_lokasi}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={S.mapsLink}
                                >
                                    <MapPin size={13} /> Buka di Google Maps
                                </a>
                            )}
                        </div>

                        {original.keterangan ? (
                            <div style={S.card}>
                                <div style={S.cardHeader}>
                                    <Edit3 size={14} color="#04CDCD" />
                                    <span style={S.cardHeaderLabel}>Keterangan</span>
                                </div>
                                <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6 }}>
                                    {original.keterangan}
                                </p>
                            </div>
                        ) : null}

                        {/* Action buttons */}
                        {canEditDelete && (
                            <div style={S.actionRow}>
                                <button onClick={() => setIsEditing(true)} style={S.editBtn}>
                                    <Edit3 size={15} />
                                    Edit Booking
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    style={{
                                        ...S.deleteBtn,
                                        background: confirmDelete ? '#ef4444' : '#fee2e2',
                                        color: confirmDelete ? '#fff' : '#ef4444',
                                    }}
                                >
                                    {deleting
                                        ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} />
                                        : <Trash2 size={15} />
                                    }
                                    {confirmDelete ? 'Yakin hapus?' : 'Hapus'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* ── Edit mode ── */}
                {isEditing && (
                    <>
                        {/* Card: Data Pelanggan */}
                        <div style={S.card}>
                            <div style={S.cardHeader}>
                                <User size={14} color="#04CDCD" />
                                <span style={S.cardHeaderLabel}>Data Pelanggan</span>
                            </div>
                            <FieldInput
                                label="Nama Customer"
                                icon={User}
                                value={formData.nama}
                                onChange={e => set('nama', e.target.value)}
                            />
                            <FieldInput
                                label="Nomor WhatsApp"
                                icon={Phone}
                                type="tel"
                                value={formData.no_hp}
                                onChange={e => set('no_hp', e.target.value)}
                            />
                        </div>

                        {/* Card: Jadwal */}
                        <div style={S.card}>
                            <div style={S.cardHeader}>
                                <CalendarDays size={14} color="#04CDCD" />
                                <span style={S.cardHeaderLabel}>Jadwal Kunjungan</span>
                            </div>

                            <div style={S.fieldWrap}>
                                <label style={S.fieldLabel}>Tanggal</label>
                                <input
                                    type="date"
                                    value={formData.tanggal}
                                    onChange={e => { set('tanggal', e.target.value); set('sesi', ''); }}
                                    style={S.dateInput}
                                />
                            </div>

                            <div style={S.fieldWrap}>
                                <label style={S.fieldLabel}>Sesi</label>
                                <div style={S.sesiGrid}>
                                    {[
                                        { val: 1, Icon: Sun, label: 'Sesi 1', time: '09:00–11:00', disabled: isSesi1Disabled() },
                                        { val: 2, Icon: Cloud, label: 'Sesi 2', time: '13:00–15:00', disabled: false },
                                    ].map(s => {
                                        const isSelected = formData.sesi === s.val;
                                        return (
                                            <div
                                                key={s.val}
                                                onClick={() => !s.disabled && set('sesi', s.val)}
                                                style={{
                                                    ...S.sesiCard,
                                                    border: isSelected ? '2px solid #04CDCD' : '1.5px solid #e2e8f0',
                                                    background: isSelected ? '#f0fefe' : '#fff',
                                                    opacity: s.disabled ? 0.4 : 1,
                                                    cursor: s.disabled ? 'not-allowed' : 'pointer',
                                                }}
                                            >
                                                <s.Icon size={20} color={isSelected ? '#04CDCD' : '#94a3b8'} />
                                                <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? '#028585' : '#1e293b', marginTop: 6 }}>
                                                    {s.label}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.time}</div>
                                                {isSelected && (
                                                    <CheckCircle size={14} color="#04CDCD" style={{ marginTop: 6 }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Card: Info Tambahan */}
                        <div style={S.card}>
                            <div style={S.cardHeader}>
                                <MapPin size={14} color="#04CDCD" />
                                <span style={S.cardHeaderLabel}>Informasi Tambahan</span>
                            </div>
                            <FieldInput
                                label="Link Google Maps"
                                icon={MapPin}
                                type="url"
                                value={formData.maps_lokasi}
                                onChange={e => set('maps_lokasi', e.target.value)}
                            />
                            <FieldTextarea
                                label="Keterangan (opsional)"
                                value={formData.keterangan}
                                onChange={e => set('keterangan', e.target.value)}
                            />
                        </div>

                        {/* Bottom actions */}
                        <div style={S.actionRow}>
                            <button
                                onClick={() => { setIsEditing(false); setFormData({
                                    nama: original.nama || '',
                                    no_hp: original.no_hp || '',
                                    tanggal: original.tanggal || '',
                                    sesi: Number(original.sesi) || '',
                                    maps_lokasi: original.maps_lokasi || '',
                                    keterangan: original.keterangan || '',
                                }); }}
                                style={S.cancelBtn}
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || saving}
                                style={{
                                    ...S.saveBtn,
                                    opacity: !hasChanges || saving ? 0.5 : 1,
                                }}
                            >
                                {saving
                                    ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Menyimpan...</>
                                    : <><CheckCircle size={14} /> Simpan{hasChanges ? ` (${changedFields.length})` : ''}</>
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

const S = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 40,
    },
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '20px 20px 24px',
    },
    heroInner: {
        maxWidth: 500,
        margin: '0 auto',
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: '1px solid #2C4A54',
        color: '#6B8894',
        padding: '5px 12px',
        borderRadius: 6,
        fontSize: 11,
        cursor: 'pointer',
        fontFamily: 'inherit',
        marginBottom: 16,
    },
    heroText: {},
    eyebrow: {
        fontSize: 10,
        color: '#6B8894',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        fontWeight: 600,
        marginBottom: 6,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: 800,
        color: '#fff',
        marginBottom: 4,
    },
    heroSub: {
        fontSize: 12,
        color: '#6B8894',
    },
    contentWrap: {
        maxWidth: 500,
        margin: '0 auto',
        padding: '16px 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    successBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#dcfce7',
        border: '1px solid #86efac',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 700,
        color: '#15803d',
    },
    diffBox: {
        background: '#fff7ed',
        border: '1.5px solid #fed7aa',
        borderRadius: 12,
        padding: '12px 14px',
    },
    diffTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 800,
        color: '#f97316',
        marginBottom: 10,
    },
    diffRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    diffKey: { fontWeight: 700, color: '#92400e', minWidth: 60 },
    diffOld: { color: '#ef4444', textDecoration: 'line-through' },
    diffArrow: { color: '#94a3b8' },
    diffNew: { color: '#15803d', fontWeight: 700 },
    card: {
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        border: '1px solid #e8edf2',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: '1px solid #f1f5f9',
    },
    cardHeaderLabel: {
        fontSize: 13,
        fontWeight: 800,
        color: '#1e293b',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
    },
    infoCell: {
        background: '#f8fafc',
        borderRadius: 8,
        padding: '8px 10px',
    },
    infoLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        marginBottom: 4,
    },
    infoVal: {
        fontSize: 13,
        fontWeight: 700,
        color: '#1e293b',
    },
    mapsLink: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        fontSize: 12,
        fontWeight: 700,
        color: '#04CDCD',
        textDecoration: 'none',
        background: '#f0fefe',
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid #04CDCD33',
    },
    actionRow: {
        display: 'flex',
        gap: 10,
    },
    editBtn: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '13px',
        background: 'linear-gradient(135deg, #04CDCD, #028585)',
        color: '#fff',
        border: 'none',
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    deleteBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '13px 18px',
        border: 'none',
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.2s',
        flexShrink: 0,
    },
    cancelBtn: {
        flex: 1,
        padding: '13px',
        background: '#f1f5f9',
        color: '#475569',
        border: 'none',
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    saveBtn: {
        flex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '13px',
        background: 'linear-gradient(135deg, #04CDCD, #028585)',
        color: '#fff',
        border: 'none',
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    // ── Form fields ──
    fieldWrap: {
        marginBottom: 12,
    },
    fieldLabel: {
        display: 'block',
        fontSize: 11,
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        marginBottom: 6,
    },
    fieldInner: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: 10,
        padding: '10px 12px',
    },
    fieldInput: {
        flex: 1,
        border: 'none',
        background: 'transparent',
        fontSize: 14,
        color: '#1e293b',
        fontFamily: 'inherit',
        outline: 'none',
    },
    fieldTextarea: {
        width: '100%',
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 14,
        color: '#1e293b',
        fontFamily: 'inherit',
        outline: 'none',
        resize: 'vertical',
        boxSizing: 'border-box',
    },
    dateInput: {
        width: '100%',
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 14,
        color: '#1e293b',
        fontFamily: 'inherit',
        outline: 'none',
        boxSizing: 'border-box',
    },
    sesiGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
    },
    sesiCard: {
        borderRadius: 12,
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'all 0.15s',
    },
    loadingWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'inherit',
    },
    spinner: {
        width: 32,
        height: 32,
        border: '3px solid #f1f5f9',
        borderTop: '3px solid #04CDCD',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
};