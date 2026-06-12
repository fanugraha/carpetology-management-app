import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc} from 'firebase/firestore';
import './Ubahorderhomevisit.css';
import {
    User, Phone, MapPin, AlignLeft, ArrowLeft,
    CheckCircle, AlertTriangle, Sun, Cloud,
    Loader2,
} from 'lucide-react';

const BULAN_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatTanggal(str) {
    if (!str) return '-';
    const d = new Date(str + 'T00:00:00');
    return `${HARI_FULL[d.getDay()]}, ${d.getDate()} ${BULAN_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Floating label input ──────────────────────────────────────────────────
function FloatInput({ label, icon, type = 'text', value, onChange }) {
    const raised = value && value.length > 0;
    return (
        <div className="uohv-field">
            {icon && <span className="uohv-field__icon">{icon}</span>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder=" "
                className={`uohv-input${icon ? '' : ' uohv-input--no-icon'}`}
            />
            <label className={[
                'uohv-label',
                icon ? '' : 'uohv-label--no-icon',
                raised ? 'uohv-label--raised' : '',
            ].filter(Boolean).join(' ')}>
                {label}
            </label>
        </div>
    );
}

// ── Floating label textarea ───────────────────────────────────────────────
function FloatTextarea({ label, value, onChange, rows = 3 }) {
    const raised = value && value.length > 0;
    return (
        <div className="uohv-field">
            <textarea
                value={value}
                onChange={onChange}
                placeholder=" "
                rows={rows}
                className="uohv-textarea"
            />
            <label className={`uohv-textarea-label${raised ? ' uohv-textarea-label--raised' : ''}`}>
                {label}
            </label>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function UbahOrderHomeVisit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [original, setOriginal] = useState(null);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // ── Fetch data asli ──
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

    // ── Deteksi field yang berubah ──
    const changedFields = useMemo(() => {
        if (!original || !formData) return [];
        const keys = ['nama', 'no_hp', 'tanggal', 'sesi', 'maps_lokasi', 'keterangan'];
        return keys.filter(k => String(formData[k]) !== String(original[k] ?? ''));
    }, [original, formData]);

    const hasChanges = changedFields.length > 0;

    // ── Label display ──
    const fieldLabel = {
        nama: 'Nama', no_hp: 'No. HP', tanggal: 'Tanggal',
        sesi: 'Sesi', maps_lokasi: 'Maps', keterangan: 'Keterangan',
    };

    const displayVal = (key, val) => {
        if (key === 'sesi') return val === 1 ? 'Sesi 1 (09:00–11:00)' : 'Sesi 2 (13:00–15:00)';
        if (key === 'tanggal') return formatTanggal(val);
        return val || '-';
    };

    // ── Save ──
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
            setTimeout(() => navigate('/admin/jadwal-home-visit'), 1800);
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan perubahan.');
        } finally {
            setSaving(false);
        }
    }

    // ── Loading ──
    if (loading || !formData) return (
        <div className="uohv-loading">
            <div className="uohv-spinner" />
            <span className="uohv-loading__text">Memuat data...</span>
        </div>
    );

    return (
        <div className="uohv-root">

            {/* ── Header ── */}
            <div className="uohv-header">
                <button className="uohv-header__back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    Kembali
                </button>
                <p className="uohv-header__eyebrow">Home Visit · Edit</p>
                <h1 className="uohv-header__title">Ubah Data Booking</h1>
                <p className="uohv-header__sub">{original?.nama}</p>
            </div>

            <div className="uohv-content">

                {/* ── Diff preview ── */}
                {hasChanges && (
                    <div className="uohv-diff">
                        <p className="uohv-diff__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={14} /> Perubahan belum disimpan
                        </p>
                        {changedFields.map(k => (
                            <div key={k} className="uohv-diff__row">
                                <span className="uohv-diff__key">{fieldLabel[k]}</span>
                                <span className="uohv-diff__old">{displayVal(k, original[k])}</span>
                                <span className="uohv-diff__arrow">→</span>
                                <span className="uohv-diff__new">{displayVal(k, formData[k])}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Card: Data Pelanggan ── */}
                <div className="uohv-card">
                    <div className="uohv-card__header">
                        <span className="uohv-card__header-label">
                            Data Pelanggan
                            {(changedFields.includes('nama') || changedFields.includes('no_hp')) && (
                                <span className="uohv-changed-dot" />
                            )}
                        </span>
                    </div>
                    <div className="uohv-card__body">
                        <FloatInput
                            label="Nama Customer"
                            icon={<User size={16} />}
                            value={formData.nama}
                            onChange={e => set('nama', e.target.value)}
                        />
                        <FloatInput
                            label="Nomor WhatsApp"
                            icon={<Phone size={16} />}
                            type="tel"
                            value={formData.no_hp}
                            onChange={e => set('no_hp', e.target.value)}
                        />
                    </div>
                </div>

                {/* ── Card: Jadwal ── */}
                <div className="uohv-card">
                    <div className="uohv-card__header">
                        <span className="uohv-card__header-label">
                            Jadwal Kunjungan
                            {(changedFields.includes('tanggal') || changedFields.includes('sesi')) && (
                                <span className="uohv-changed-dot" />
                            )}
                        </span>
                    </div>
                    <div className="uohv-card__body">

                        {/* Tanggal */}
                        <div>
                            <p className="uohv-section-label">Tanggal</p>
                            <input
                                type="date"
                                value={formData.tanggal}
                                onChange={e => { set('tanggal', e.target.value); set('sesi', ''); }}
                                className="uohv-date"
                            />
                        </div>

                        {/* Sesi */}
                        <div>
                            <p className="uohv-section-label">Sesi</p>
                            <div className="uohv-sesi-grid">
                                {[
                                    { val: 1, icon: <Sun size={18} />, label: 'Sesi 1', time: '09:00 – 11:00', disabled: isSesi1Disabled() },
                                    { val: 2, icon: <Cloud size={18} />, label: 'Sesi 2', time: '13:00 – 15:00', disabled: false },
                                ].map(s => (
                                    <div
                                        key={s.val}
                                        className={[
                                            'uohv-sesi-card',
                                            formData.sesi === s.val ? 'uohv-sesi-card--selected' : '',
                                            s.disabled ? 'uohv-sesi-card--disabled' : '',
                                        ].filter(Boolean).join(' ')}
                                        onClick={() => !s.disabled && set('sesi', s.val)}
                                    >
                                        <span className="uohv-sesi-card__emoji">{s.icon}</span>
                                        <span className="uohv-sesi-card__name">{s.label}</span>
                                        <span className="uohv-sesi-card__time">{s.time}</span>
                                        {formData.sesi === s.val && (
                                            <span className="uohv-sesi-card__check">
                                                <CheckCircle size={14} />
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── Card: Info Tambahan ── */}
                <div className="uohv-card">
                    <div className="uohv-card__header">
                        <span className="uohv-card__header-label">
                            Informasi Tambahan
                            {(changedFields.includes('maps_lokasi') || changedFields.includes('keterangan')) && (
                                <span className="uohv-changed-dot" />
                            )}
                        </span>
                    </div>
                    <div className="uohv-card__body">
                        <FloatInput
                            label="Link Google Maps"
                            icon={<MapPin size={16} />}
                            type="url"
                            value={formData.maps_lokasi}
                            onChange={e => set('maps_lokasi', e.target.value)}
                        />
                        <FloatTextarea
                            label="Keterangan (opsional)"
                            value={formData.keterangan}
                            onChange={e => set('keterangan', e.target.value)}
                        />
                    </div>
                </div>

            </div>

            {/* ── Bottom bar ── */}
            <div className="uohv-actions">
                <button className="uohv-btn uohv-btn--secondary" onClick={() => navigate(-1)}>
                    Batal
                </button>
                <button
                    className="uohv-btn uohv-btn--primary"
                    disabled={!hasChanges || saving}
                    onClick={handleSave}
                >
                    {saving ? (
                        <>
                            <Loader2
                                size={14}
                                style={{ animation: 'uohvSpin 0.7s linear infinite', display: 'inline-block' }}
                            />
                            Menyimpan...
                        </>
                    ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={15} />
                            Simpan{hasChanges ? ` (${changedFields.length})` : ''}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Success overlay ── */}
            {success && (
                <div className="uohv-success-overlay">
                    <div className="uohv-success-box">
                        <div className="uohv-success-box__icon">
                            <CheckCircle size={40} color="#22c55e" />
                        </div>
                        <h2 className="uohv-success-box__title">Berhasil Disimpan!</h2>
                        <p className="uohv-success-box__sub">Data booking telah diperbarui</p>
                    </div>
                </div>
            )}

        </div>
    );
}