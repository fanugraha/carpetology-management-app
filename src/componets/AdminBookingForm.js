import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import {
    ArrowLeft, User, Phone, MapPin, Sunrise, Sun,
    Check, Save, Loader2, CheckCircle, Layers,
    FileText, CalendarDays, Clock,
} from 'lucide-react';

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
    primary:    '#04CDCD',
    primary600: '#03A8A8',
    primary700: '#028585',
    primary100: '#E0FAFA',
    primary50:  '#F0FEFE',
    dark:       '#1A2E35',
    darkMid:    '#0d2028',
    muted:      '#6B8894',
    border:     '#e2e8f0',
    surface:    '#f8fafc',
    white:      '#FFFFFF',
    success:    '#22C55E',
    successBg:  '#dcfce7',
    danger:     '#EF4444',
    dangerBg:   '#fee2e2',
};

// ─── FIELD INPUT ──────────────────────────────────────────────────────────────
function Field({ label, icon: Icon, type = 'text', value, onChange, ...rest }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={S.fieldLabel}>{label}</div>
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
                    style={{
                        ...S.input,
                        paddingLeft: Icon ? 40 : 14,
                    }}
                    {...rest}
                />
            </div>
        </div>
    );
}

function TextareaField({ label, value, onChange, rows = 3 }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={S.fieldLabel}>{label}</div>
            <textarea
                value={value}
                onChange={onChange}
                rows={rows}
                style={S.textarea}
            />
        </div>
    );
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
function StepBar({ current }) {
    const steps = ['Pelanggan', 'Jadwal', 'Detail'];
    return (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            {steps.map((label, i) => {
                const num    = i + 1;
                const isDone = current > num;
                const isAct  = current === num;
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
    const [step, setStep]   = useState(1);
    const [form, setForm]   = useState({ nama: '', no_hp: '', maps_lokasi: '', tanggal: '', sesi: '', keterangan: '' });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [existing, setExisting] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'bookings'), (snap) => {
            setExisting(snap.docs.map(d => d.data()));
        });
        return unsub;
    }, []);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const isSesiBooked = (tgl, sesi) => existing.some(b => b.tanggal === tgl && b.sesi == sesi);

    const step1Valid = form.nama.trim() && form.no_hp.trim();
    const step2Valid = form.tanggal && form.sesi;

    const handleSubmit = async () => {
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
                setForm({ nama: '', no_hp: '', maps_lokasi: '', tanggal: '', sesi: '', keterangan: '' });
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
        { val: 2, label: 'Sesi 2', time: '13:00 – 15:00', Icon: Sun,     color: '#0ea5e9', bg: '#f0f9ff' },
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
                            <div style={S.brand}>Carpetology</div>
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
                                placeholder="Masukkan nama lengkap"
                                autoFocus
                            />
                            <Field
                                label="Nomor WhatsApp"
                                icon={Phone}
                                type="tel"
                                value={form.no_hp}
                                onChange={e => set('no_hp', e.target.value)}
                                placeholder="08xxxxxxxxxx"
                            />
                        </div>
                        <button
                            style={{ ...S.btnPrimary, ...(step1Valid ? {} : S.btnDisabled) }}
                            disabled={!step1Valid}
                            onClick={() => setStep(2)}
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
                                <div style={S.fieldLabel}>Tanggal Kunjungan</div>
                                <div style={{ position: 'relative' }}>
                                    <span style={S.fieldIconBox}><CalendarDays size={15} color={C.muted} /></span>
                                    <input
                                        type="date"
                                        value={form.tanggal}
                                        onChange={e => { set('tanggal', e.target.value); set('sesi', ''); }}
                                        style={{ ...S.input, paddingLeft: 40 }}
                                    />
                                </div>
                            </div>

                            {/* Sesi picker */}
                            <div style={S.fieldLabel}>Pilih Sesi</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {SESI.map(s => {
                                    const booked   = isSesiBooked(form.tanggal, s.val);
                                    const selected = form.sesi == s.val;
                                    const Icon     = s.Icon;
                                    return (
                                        <div
                                            key={s.val}
                                            onClick={() => {
                                                if (booked) return;
                                                set('sesi', s.val);
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
                                disabled={!step2Valid}
                                onClick={() => setStep(3)}
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
                                { label: 'WhatsApp',  val: form.no_hp, Icon: Phone },
                                { label: 'Tanggal',   val: formatTanggal(form.tanggal), Icon: CalendarDays },
                                { label: 'Sesi',      val: form.sesi == 1 ? 'Sesi 1 — 09:00–11:00' : 'Sesi 2 — 13:00–15:00', Icon: Clock },
                            ].map((r, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                    padding: '10px 0',
                                    borderBottom: i < 3 ? `1px solid ${C.border}` : 'none',
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

                        {/* Extra fields */}
                        <div style={S.sectionLabel}>Informasi Tambahan</div>
                        <div style={{ ...S.card, marginBottom: 14 }}>
                            <Field
                                label="Link Google Maps (opsional)"
                                icon={MapPin}
                                type="url"
                                value={form.maps_lokasi}
                                onChange={e => set('maps_lokasi', e.target.value)}
                                placeholder="https://maps.google.com/..."
                            />
                            <TextareaField
                                label="Keterangan (opsional)"
                                value={form.keterangan}
                                onChange={e => set('keterangan', e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button style={{ ...S.btnSecondary, width: 90 }} onClick={() => setStep(2)}>← Back</button>
                            <button
                                style={{ ...S.btnPrimary, flex: 1, ...(loading ? S.btnDisabled : {}) }}
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
                    <span style={{ color: C.primary, fontWeight: 700 }}>Carpetology</span>
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

    // Hero
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

    // Content
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

    // Fields
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

    // Buttons
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