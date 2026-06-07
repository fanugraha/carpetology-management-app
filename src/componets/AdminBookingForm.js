import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore'; // Tambahkan onSnapshot
import './Adminbookingform.css';

// ── Floating-label input ──────────────────────────────────────────────────
function FloatInput({ label, icon, type = 'text', value, onChange, ...rest }) {
    const raised = value && value.length > 0;
    return (
        <div className="abf-field">
            {icon && <span className="abf-field__icon">{icon}</span>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder=" "
                className={`abf-input${icon ? '' : ' abf-input--no-icon'}`}
                {...rest}
            />
            <label className={`abf-label${icon ? '' : ' abf-label--no-icon'}${raised ? ' abf-label--raised' : ''}`}>
                {label}
            </label>
        </div>
    );
}

// ── Floating-label textarea ───────────────────────────────────────────────
function FloatTextarea({ label, value, onChange, rows = 3 }) {
    const raised = value && value.length > 0;
    return (
        <div className="abf-field">
            <textarea
                value={value}
                onChange={onChange}
                placeholder=" "
                rows={rows}
                className="abf-textarea"
            />
            <label className={`abf-textarea-label${raised ? ' abf-textarea-label--raised' : ''}`}>
                {label}
            </label>
        </div>
    );
}

// ── Step bubble ───────────────────────────────────────────────────────────
function Step({ num, label, active, done }) {
    const cls = active ? 'abf-step abf-step--active' : done ? 'abf-step abf-step--done' : 'abf-step';
    return (
        <div className={cls}>
            <div className="abf-step__bubble">{done ? '✓' : num}</div>
            <span className="abf-step__label">{label}</span>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────
const AdminBookingForm = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        nama: '', no_hp: '', maps_lokasi: '', tanggal: '', sesi: '', keterangan: ''
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [existingBookings, setExistingBookings] = useState([]); // State untuk data booking

    // Fetch data booking dari Firebase untuk validasi
    useEffect(() => {
        const q = collection(db, 'bookings');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data());
            setExistingBookings(data);
        });
        return () => unsubscribe();
    }, []);

    const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

    const isSesi1Disabled = () => {
        // if (!formData.tanggal) return false;
        // const day = new Date(formData.tanggal).getDay();
        // return [2, 4, 6].includes(day);
        return false;
    };

    // Fungsi cek apakah sesi sudah ada di database
    const isSesiBooked = (tanggal, sesi) => {
        return existingBookings.some(b => b.tanggal === tanggal && b.sesi === sesi);
    };

    const step1Valid = formData.nama.trim() && formData.no_hp.trim();
    const step2Valid = formData.tanggal && formData.sesi;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await addDoc(collection(db, 'bookings'), {
                ...formData,
                status: 'confirmed',
                created_at: new Date()
            });
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                setStep(1);
                setFormData({ nama: '', no_hp: '', maps_lokasi: '', tanggal: '', sesi: '', keterangan: '' });
            }, 2200);
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan booking.');
        } finally {
            setLoading(false);
        }
    };

    const formatTanggal = (t) => {
        if (!t) return '-';
        return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    if (saved) {
        return (
            <div className="abf-success">
                <div className="abf-success__inner">
                    <div className="abf-success__icon">✓</div>
                    <h2 className="abf-success__title">Booking Tersimpan!</h2>
                    <p className="abf-success__sub">Data berhasil ditambahkan ke sistem</p>
                </div>
            </div>
        );
    }

    return (
        <div className="abf-root">
            <div className="abf-topbar">
                <a href="/admin" className="abf-back">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    Kembali
                </a>
                <span className="abf-brand">Carpetology</span>
                <div className="abf-topbar-spacer" />
            </div>

            <div className="abf-page">
                <p className="abf-eyebrow">Home Visit</p>
                <h1 className="abf-title">Tambah Booking</h1>

                <div className="abf-steps">
                    <Step num={1} label="Pelanggan" active={step === 1} done={step > 1} />
                    <div className={`abf-step-line${step > 1 ? ' abf-step-line--done' : ''}`} />
                    <Step num={2} label="Jadwal" active={step === 2} done={step > 2} />
                    <div className={`abf-step-line${step > 2 ? ' abf-step-line--done' : ''}`} />
                    <Step num={3} label="Detail" active={step === 3} done={step > 3} />
                </div>

                {step === 1 && (
                    <div className="abf-panel">
                        <div className="abf-card">
                            <div className="abf-card__header"><p className="abf-card__header-label">Data Pelanggan</p></div>
                            <div className="abf-card__body">
                                <FloatInput label="Nama Customer" icon="👤" value={formData.nama} onChange={e => set('nama', e.target.value)} required />
                                <FloatInput label="Nomor WhatsApp" icon="📱" type="tel" value={formData.no_hp} onChange={e => set('no_hp', e.target.value)} />
                            </div>
                        </div>
                        <div className="abf-btn-row abf-btn-row--single">
                            <button className="abf-btn abf-btn--primary" disabled={!step1Valid} onClick={() => step1Valid && setStep(2)}>Lanjut →</button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="abf-panel">
                        <div className="abf-card">
                            <div className="abf-card__header"><p className="abf-card__header-label">Jadwal Kunjungan</p></div>
                            <div className="abf-card__body">
                                <div>
                                    <p className="abf-section-label">Tanggal</p>
                                    <input type="date" value={formData.tanggal} onChange={e => { set('tanggal', e.target.value); set('sesi', ''); }} className="abf-date" />
                                </div>
                                <div>
                                    <p className="abf-section-label">Pilih Sesi</p>
                                    <div className="abf-sesi-grid">
                                        {[
                                            { val: 1, label: 'Sesi 1', time: '09:00 – 11:00', emoji: '🌅', disabled: isSesi1Disabled() || isSesiBooked(formData.tanggal, 1) },
                                            { val: 2, label: 'Sesi 2', time: '13:00 – 15:00', emoji: '🌤️', disabled: isSesiBooked(formData.tanggal, 2) },
                                        ].map(s => {
                                            const cls = ['abf-sesi-card', formData.sesi === s.val ? 'abf-sesi-card--selected' : '', s.disabled ? 'abf-sesi-card--disabled' : ''].filter(Boolean).join(' ');
                                            return (
                                                <div key={s.val} className={cls} onClick={() => s.disabled ? alert("Maaf, sesi ini sudah terisi penuh.") : set('sesi', s.val)}>
                                                    <span className="abf-sesi-card__emoji">{s.emoji}</span>
                                                    <span className="abf-sesi-card__name">{s.label}</span>
                                                    <span className="abf-sesi-card__time">{s.time}</span>
                                                    {formData.sesi === s.val && <span className="abf-sesi-card__check">✓</span>}
                                                    {s.disabled && <span className="abf-sesi-card__na">N/A</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="abf-btn-row">
                            <button className="abf-btn abf-btn--secondary" onClick={() => setStep(1)}>← Kembali</button>
                            <button className="abf-btn abf-btn--primary" disabled={!step2Valid} onClick={() => step2Valid && setStep(3)}>Lanjut →</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="abf-panel">
                        <div className="abf-card">
                            <div className="abf-card__header"><p className="abf-card__header-label">Ringkasan Booking</p>
                            </div>
                            {[{ key: 'Pelanggan', val: formData.nama }, { key: 'WhatsApp', val: formData.no_hp }, { key: 'Tanggal', val: formatTanggal(formData.tanggal) }, { key: 'Sesi', val: formData.sesi === 1 ? 'Sesi 1 — 09:00–11:00' : 'Sesi 2 — 13:00–15:00' }].map(r => (
                                <div key={r.key} className="abf-review-row">
                                    <span className="abf-review-row__key">{r.key}</span>
                                    <span className="abf-review-row__val">{r.val}</span>
                                </div>
                            ))}
                        </div>
                        <div className="abf-card">
                            <div className="abf-card__header"><p className="abf-card__header-label">Informasi Tambahan</p></div>
                            <div className="abf-card__body">
                                <FloatInput label="Link Google Maps" icon="📍" type="url" value={formData.maps_lokasi} onChange={e => set('maps_lokasi', e.target.value)} />
                                <FloatTextarea label="Keterangan (opsional)" value={formData.keterangan} onChange={e => set('keterangan', e.target.value)} />
                            </div>
                        </div>
                        <div className="abf-btn-row">
                            <button className="abf-btn abf-btn--secondary" onClick={() => setStep(2)}>← Kembali</button>
                            <button className="abf-btn abf-btn--primary" disabled={loading} onClick={handleSubmit}>{loading ? <><span className="abf-spinner" />Menyimpan...</> : '💾 Simpan'}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminBookingForm;