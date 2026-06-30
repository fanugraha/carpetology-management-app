import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import {
    User, Phone, MapPin, Sunrise, Sun,
    Check, Save, Loader2, CheckCircle, Layers,
    CalendarDays, Clock, Home,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
    primary: '#04CDCD',
    primary600: '#03A8A8',
    primary700: '#028585',
    primary100: '#E0FAFA',
    primary50: '#F0FEFE',
    dark: '#1A2E35',
    darkMid: '#0d2028',
    muted: '#6B8894',
    border: '#e2e8f0',
    surface: '#f8fafc',
    white: '#FFFFFF',
    success: '#22C55E',
    successBg: '#dcfce7',
    danger: '#EF4444',
    dangerBg: '#fee2e2',
};

// ─── PHONE VALIDATION ─────────────────────────────────────────────────────────
// Aturan: hanya angka (boleh diawali +62 / 62 / 0), dinormalisasi ke awalan 0,
// lalu harus diawali "08" dengan total panjang 10–14 digit (pola umum nomor seluler ID).
function isValidPhone(val) {
    if (!val) return false;
    const cleaned = val.trim().replace(/[\s-]/g, '');
    if (!/^\+?\d+$/.test(cleaned)) return false;

    let digits = cleaned;
    if (digits.startsWith('+62')) {
        digits = '0' + digits.slice(3);
    } else if (digits.startsWith('62')) {
        digits = '0' + digits.slice(2);
    }

    return /^08\d{8,12}$/.test(digits);
}

// ─── FIELD INPUT ──────────────────────────────────────────────────────────────
function Field({ label, icon: Icon, type = 'text', value, onChange, onBlur, error, errorMessage, required = true, ...rest }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={S.fieldLabel}>
                {label} {required && <span style={{ color: C.danger }}>*</span>}
            </div>
            <div style={{ position: 'relative' }}>
                {Icon && (
                    <span style={S.fieldIconBox}>
                        <Icon size={15} color={C.muted} />
                    </span>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    style={{
                        ...S.input,
                        paddingLeft: Icon ? 40 : 14,
                        borderColor: error ? C.danger : C.border,
                    }}
                    {...rest}
                />
            </div>
            {error && <div style={S.errorText}>{errorMessage || 'Wajib diisi'}</div>}
        </div>
    );
}

function TextareaField({ label, value, onChange, onBlur, rows = 3, error, errorMessage, placeholder, required = true }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={S.fieldLabel}>
                {label} {required && <span style={{ color: C.danger }}>*</span>}
            </div>
            <textarea
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                rows={rows}
                placeholder={placeholder}
                style={{
                    ...S.textarea,
                    borderColor: error ? C.danger : C.border,
                }}
            />
            {error && <div style={S.errorText}>{errorMessage || 'Wajib diisi'}</div>}
        </div>
    );
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
function StepBar({ current }) {
    const steps = ['Pelanggan', 'Jadwal', 'Detail'];
    return (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            {steps.map((label, i) => {
                const num = i + 1;
                const isDone = current > num;
                const isAct = current === num;
                return (
                    <React.Fragment key={i}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 800,
                                background: isDone || isAct ? C.primary : C.border,
                                color: isDone || isAct ? '#fff' : C.muted,
                                boxShadow: isAct ? `0 0 0 4px ${C.primary100}` : 'none',
                                transition: 'all .2s',
                            }}>
                                {isDone ? <Check size={14} strokeWidth={3} /> : num}
                            </div>
                            <span style={{
                                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: isAct ? C.primary700 : isDone ? C.primary : C.muted,
                            }}>
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, margin: '0 6px', marginBottom: 16,
                                background: current > num + 1 ? C.primary : isDone ? C.primary : C.border,
                                transition: 'background .2s',
                            }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminBookingForm() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        nama: '',
        no_hp: '',
        alamat: '',
        maps_lokasi: '',
        tanggal: '',
        sesi: '',
        keterangan: '',
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [existing, setExisting] = useState([]);
    const [touched, setTouched] = useState({});
    const { user } = useAuth();

    useEffect(() => {
        if (user && user.role !== 'admin' && user.role !== 'cs') {
            navigate('/');
        }
    }, [user]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'bookings'), (snap) => {
            setExisting(snap.docs.map(d => d.data()));
        });
        return unsub;
    }, []);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const markTouched = (k) => setTouched(p => ({ ...p, [k]: true }));

    const isSesiBooked = (tgl, sesi) => existing.some(b => b.tanggal === tgl && b.sesi == sesi);

    // ── Validation ──
    const step1Errors = {
        nama: !form.nama.trim(),
        no_hp: !isValidPhone(form.no_hp),
        alamat: !form.alamat.trim(),
    };
    const step1Valid = !Object.values(step1Errors).some(Boolean);

    const step2Errors = {
        tanggal: !form.tanggal,
        sesi: !form.sesi,
    };
    const step2Valid = !Object.values(step2Errors).some(Boolean);

    const step3Errors = {
        keterangan: !form.keterangan.trim(),
    };
    const step3Valid = !Object.values(step3Errors).some(Boolean);

    const touchAllStep1 = () => setTouched(p => ({ ...p, nama: true, no_hp: true, alamat: true }));
    const touchAllStep2 = () => setTouched(p => ({ ...p, tanggal: true, sesi: true }));
    const touchAllStep3 = () => setTouched(p => ({ ...p, keterangan: true }));

    const handleNextFromStep1 = () => {
        touchAllStep1();
        if (step1Valid) setStep(2);
    };

    const handleNextFromStep2 = () => {
        touchAllStep2();
        if (step2Valid) setStep(3);
    };

    const handleSubmit = async () => {
        touchAllStep3();
        if (!step3Valid) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'bookings'), {
                ...form,
                status: 'confirmed',
                created_at: new Date(),
            });
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                setStep(1);
                setTouched({});
                setForm({
                    nama: '', no_hp: '', alamat: '', maps_lokasi: '',
                    tanggal: '', sesi: '', keterangan: '',
                });
            }, 2400);
        } catch (e) {
            console.error(e);
            alert('Gagal menyimpan booking.');
        } finally {
            setLoading(false);
        }
    };

    const formatTanggal = (t) => {
        if (!t) return '-';
        return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
    };

    const SESI = [
        { val: 1, label: 'Sesi 1', time: '09:00 – 11:00', Icon: Sunrise, color: '#f59e0b', bg: '#fff7ed' },
        { val: 2, label: 'Sesi 2', time: '13:00 – 15:00', Icon: Sun, color: '#0ea5e9', bg: '#f0f9ff' },
    ];

    // ── Success screen ──
    if (saved) {
        return (
            <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '40px 24px', animation: 'fadeUp .3s ease-out' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <CheckCircle size={40} color={C.success} />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.dark, marginBottom: 8 }}>Booking Tersimpan!</div>
                    <div style={{ fontSize: 14, color: C.muted }}>Data berhasil ditambahkan ke sistem</div>
                </div>
                <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>
            </div>
        );
    }

    return (
        <div style={S.page}>

            {/* ── HERO HEADER ── */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={S.logoIconWrap}>
                            <Layers size={20} color={C.primary} />
                        </div>
                        <div>
                            <div style={S.brand}>Carpetology ID</div>
                            <div style={S.tagline}>Tambah Booking Home Visit</div>
                        </div>
                    </div>
                    <button onClick={() => navigate(-1)} style={S.backBtn}>‹ Kembali</button>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={S.contentWrap}>
                <StepBar current={step} />

                {/* ── STEP 1: Pelanggan ── */}
                {step === 1 && (
                    <div style={{ animation: 'fadeUp .25s ease-out' }}>
                        <div style={S.sectionLabel}>Data Pelanggan</div>
                        <div style={S.card}>
                            <Field
                                label="Nama Customer"
                                icon={User}
                                value={form.nama}
                                onChange={e => set('nama', e.target.value)}
                                onBlur={() => markTouched('nama')}
                                error={touched.nama && step1Errors.nama}
                                placeholder="Masukkan nama lengkap"
                                autoFocus
                            />
                            <Field
                                label="Nomor WhatsApp"
                                icon={Phone}
                                type="tel"
                                value={form.no_hp}
                                onChange={e => set('no_hp', e.target.value.replace(/[^\d+\s-]/g, ''))}
                                onBlur={() => markTouched('no_hp')}
                                error={touched.no_hp && step1Errors.no_hp}
                                errorMessage={
                                    !form.no_hp.trim()
                                        ? 'Wajib diisi'
                                        : 'Format nomor HP tidak valid (contoh: 08xxxxxxxxxx)'
                                }
                                placeholder="08xxxxxxxxxx atau +62xxxxxxxxxx"
                                inputMode="tel"
                                maxLength={16}
                            />
                            <TextareaField
                                label="Alamat"
                                value={form.alamat}
                                onChange={e => set('alamat', e.target.value)}
                                onBlur={() => markTouched('alamat')}
                                error={touched.alamat && step1Errors.alamat}
                                placeholder="Alamat lengkap lokasi kunjungan"
                                rows={2}
                            />
                            <Field
                                label="Link Google Maps"
                                icon={MapPin}
                                type="url"
                                value={form.maps_lokasi}
                                onChange={e => set('maps_lokasi', e.target.value)}
                                placeholder="https://maps.google.com/... (opsional)"
                                required={false}
                            />
                        </div>
                        <button
                            style={{ ...S.btnPrimary, ...(step1Valid ? {} : S.btnDisabled) }}
                            onClick={handleNextFromStep1}
                        >
                            Lanjut ke Jadwal →
                        </button>
                    </div>
                )}

                {/* ── STEP 2: Jadwal ── */}
                {step === 2 && (
                    <div style={{ animation: 'fadeUp .25s ease-out' }}>
                        <div style={S.sectionLabel}>Jadwal Kunjungan</div>
                        <div style={S.card}>
                            {/* Date picker */}
                            <div style={{ marginBottom: 18 }}>
                                <div style={S.fieldLabel}>
                                    Tanggal Kunjungan <span style={{ color: C.danger }}>*</span>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <span style={S.fieldIconBox}><CalendarDays size={15} color={C.muted} /></span>
                                    <input
                                        type="date"
                                        value={form.tanggal}
                                        onChange={e => { set('tanggal', e.target.value); set('sesi', ''); }}
                                        onBlur={() => markTouched('tanggal')}
                                        style={{
                                            ...S.input, paddingLeft: 40,
                                            borderColor: touched.tanggal && step2Errors.tanggal ? C.danger : C.border,
                                        }}
                                    />
                                </div>
                                {touched.tanggal && step2Errors.tanggal && (
                                    <div style={S.errorText}>Wajib diisi</div>
                                )}
                            </div>

                            {/* Sesi picker */}
                            <div style={S.fieldLabel}>
                                Pilih Sesi <span style={{ color: C.danger }}>*</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {SESI.map(s => {
                                    const booked = isSesiBooked(form.tanggal, s.val);
                                    const selected = form.sesi == s.val;
                                    const Icon = s.Icon;
                                    return (
                                        <div
                                            key={s.val}
                                            onClick={() => {
                                                if (booked) return;
                                                set('sesi', s.val);
                                                markTouched('sesi');
                                            }}
                                            style={{
                                                border: `2px solid ${selected ? C.primary : booked ? '#fecaca' : C.border}`,
                                                borderRadius: 14,
                                                padding: '14px 12px',
                                                cursor: booked ? 'not-allowed' : 'pointer',
                                                background: selected ? C.primary100 : booked ? '#fef2f2' : C.white,
                                                textAlign: 'center',
                                                position: 'relative',
                                                transition: 'all .15s',
                                                opacity: booked ? 0.6 : 1,
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                                                <Icon size={22} color={selected ? C.primary700 : s.color} />
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: selected ? C.primary700 : C.dark }}>
                                                {s.label}
                                            </div>
                                            <div style={{
                                                fontSize: 11, color: selected ? C.primary700 : C.muted,
                                                background: selected ? C.primary50 : C.surface,
                                                borderRadius: 6, padding: '2px 6px', marginTop: 4,
                                                display: 'inline-block', fontWeight: 600,
                                            }}>
                                                {s.time}
                                            </div>
                                            {selected && (
                                                <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Check size={11} color="#fff" strokeWidth={3} />
                                                </div>
                                            )}
                                            {booked && (
                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>
                                                    Terisi
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {touched.sesi && step2Errors.sesi && (
                                <div style={S.errorText}>Pilih salah satu sesi</div>
                            )}

                            {form.tanggal && (
                                <div style={{ marginTop: 12, background: C.primary50, border: `1px solid ${C.primary100}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: C.primary700, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CalendarDays size={13} /> {formatTanggal(form.tanggal)}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button style={{ ...S.btnSecondary, width: 90 }} onClick={() => setStep(1)}>← Back</button>
                            <button
                                style={{ ...S.btnPrimary, flex: 1, ...(step2Valid ? {} : S.btnDisabled) }}
                                onClick={handleNextFromStep2}
                            >
                                Lanjut ke Detail →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Detail & Konfirmasi ── */}
                {step === 3 && (
                    <div style={{ animation: 'fadeUp .25s ease-out' }}>
                        {/* Summary card */}
                        <div style={S.sectionLabel}>Ringkasan Booking</div>
                        <div style={{ ...S.card, marginBottom: 14 }}>
                            {[
                                { label: 'Pelanggan', val: form.nama, Icon: User },
                                { label: 'WhatsApp', val: form.no_hp, Icon: Phone },
                                { label: 'Alamat', val: form.alamat, Icon: Home },
                                { label: 'Tanggal', val: formatTanggal(form.tanggal), Icon: CalendarDays },
                                { label: 'Sesi', val: form.sesi == 1 ? 'Sesi 1 — 09:00–11:00' : 'Sesi 2 — 13:00–15:00', Icon: Clock },
                            ].map((r, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                    padding: '10px 0',
                                    borderBottom: i < 4 ? `1px solid ${C.border}` : 'none',
                                }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.primary50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <r.Icon size={14} color={C.primary700} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{r.label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{r.val}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Keterangan / Detail item */}
                        <div style={S.sectionLabel}>Detail Pekerjaan</div>
                        <div style={{ ...S.card, marginBottom: 14 }}>
                            <TextareaField
                                label="Keterangan"
                                value={form.keterangan}
                                onChange={e => set('keterangan', e.target.value)}
                                onBlur={() => markTouched('keterangan')}
                                error={touched.keterangan && step3Errors.keterangan}
                                placeholder="Contoh: Cuci karpet 2 buah ukuran 2x3m, sofa 3 dudukan, kondisi banyak noda kopi..."
                                rows={4}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button style={{ ...S.btnSecondary, width: 90 }} onClick={() => setStep(2)}>← Back</button>
                            <button
                                style={{ ...S.btnPrimary, flex: 1, ...((loading || !step3Valid) ? S.btnDisabled : {}) }}
                                disabled={loading}
                                onClick={handleSubmit}
                            >
                                {loading
                                    ? <><Loader2 size={15} style={{ animation: 'spin .7s linear infinite' }} /> Menyimpan...</>
                                    : <><Save size={15} /> Simpan Booking</>
                                }
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={S.footer}>
                    <Layers size={13} color={C.primary} />
                    <span style={{ color: C.primary, fontWeight: 700 }}>Carpetology ID</span>
                    <span style={{ color: C.muted }}>· Jasa Cuci Karpet & Laundry</span>
                </div>
            </div>

            <style>{`
                @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin   { to{transform:rotate(360deg)} }
                input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
            `}</style>
        </div>
    );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
    page: {
        minHeight: '100vh',
        background: C.surface,
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 60,
    },
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '20px 20px 24px',
    },
    heroInner: {
        maxWidth: 500, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    logoIconWrap: {
        width: 36, height: 36, background: '#04CDCD22',
        borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    brand: {
        fontSize: 20, fontWeight: 800, color: '#04CDCD', letterSpacing: '-0.3px',
    },
    tagline: {
        fontSize: 10, color: '#6B8894', marginTop: 1,
    },
    backBtn: {
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#a0b8c0',
        padding: '7px 14px', borderRadius: 10,
        fontSize: 12, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
    },
    contentWrap: {
        maxWidth: 500, margin: '0 auto',
        padding: '24px 16px 0',
    },
    sectionLabel: {
        fontSize: 11, fontWeight: 700, color: C.muted,
        textTransform: 'uppercase', letterSpacing: '0.7px',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
    },
    card: {
        background: C.white, borderRadius: 16,
        padding: '16px', marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: `1px solid ${C.border}`,
    },
    fieldLabel: {
        fontSize: 11, fontWeight: 700, color: C.muted,
        textTransform: 'uppercase', letterSpacing: '0.5px',
        marginBottom: 6,
    },
    fieldIconBox: {
        position: 'absolute', left: 12, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center',
        pointerEvents: 'none', zIndex: 1,
    },
    input: {
        width: '100%', padding: '11px 14px',
        border: `1.5px solid ${C.border}`, borderRadius: 10,
        fontSize: 14, fontFamily: 'inherit', color: C.dark,
        background: C.white, outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color .2s',
    },
    textarea: {
        width: '100%', padding: '11px 14px',
        border: `1.5px solid ${C.border}`, borderRadius: 10,
        fontSize: 14, fontFamily: 'inherit', color: C.dark,
        background: C.white, outline: 'none', resize: 'vertical',
        boxSizing: 'border-box',
    },
    errorText: {
        fontSize: 11, color: C.danger, marginTop: 4, fontWeight: 600,
    },
    btnPrimary: {
        width: '100%', padding: '14px 20px',
        borderRadius: 12, border: 'none',
        background: C.primary, color: '#fff',
        fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all .15s',
        marginBottom: 8,
    },
    btnSecondary: {
        padding: '14px 16px', borderRadius: 12,
        border: `1.5px solid ${C.border}`,
        background: C.white, color: C.dark,
        fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    btnDisabled: {
        opacity: 0.4, cursor: 'not-allowed',
    },
    footer: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '28px 0 8px', fontSize: 12,
    },
};