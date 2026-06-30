import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import {
    ChevronLeft, ChevronRight, Plus,
    Sunrise, Sun, UserCircle,
    CalendarDays, CheckCircle, Clock, Layers,
    ArrowLeft, Calendar,
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const HARI       = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const HARI_FULL  = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_FULL = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];

function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatTanggalPanjang(d) {
    return `${HARI_FULL[d.getDay()]}, ${d.getDate()} ${BULAN_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

// Sen–Sab (6 hari)
function getWeekDays(anchor) {
    const day = anchor.getDay();
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function JadwalHomeVisit() {
    const navigate = useNavigate();
    const today    = new Date();
    const { user } = useAuth();
    const canAdd   = user?.role === 'admin' || user?.role === 'cs';

    const [anchor,       setAnchor]       = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [bookings,     setBookings]     = useState([]);
    const [loading,      setLoading]      = useState(true);
    const stripRef = useRef(null);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'bookings')), (snap) => {
            setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    const weekDays   = useMemo(() => getWeekDays(anchor), [anchor]);
    const selectedKey = toDateKey(selectedDate);
    const todayKey    = toDateKey(today);
    const weekKeys   = useMemo(() => new Set(weekDays.map(toDateKey)), [weekDays]);

    const dayBookings     = useMemo(() => bookings.filter(b => b.tanggal === selectedKey), [bookings, selectedKey]);
    const totalMingguIni  = bookings.filter(b => weekKeys.has(b.tanggal)).length;
    const sesi1           = dayBookings.filter(b => b.sesi == 1);
    const sesi2           = dayBookings.filter(b => b.sesi == 2);
    const slotKosong      = 2 - (sesi1.length > 0 ? 1 : 0) - (sesi2.length > 0 ? 1 : 0);
    const totalHariIni    = sesi1.length + sesi2.length;

    const prevWeek = () => { const d = new Date(anchor); d.setDate(d.getDate()-7); setAnchor(d); };
    const nextWeek = () => { const d = new Date(anchor); d.setDate(d.getDate()+7); setAnchor(d); };
    const goToday  = () => { const now = new Date(); setAnchor(now); setSelectedDate(now); };

    // auto-scroll strip ke hari terpilih
    useEffect(() => {
        if (!stripRef.current) return;
        const idx  = weekDays.findIndex(d => toDateKey(d) === selectedKey);
        if (idx < 0) return;
        const pills = stripRef.current.querySelectorAll('[data-pill]');
        pills[idx]?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }, [selectedKey, weekDays]);

    const weekLabel = (() => {
        const first = weekDays[0], last = weekDays[5];
        if (first.getMonth() === last.getMonth())
            return `${first.getDate()}–${last.getDate()} ${BULAN_FULL[first.getMonth()]} ${first.getFullYear()}`;
        return `${first.getDate()} ${BULAN_FULL[first.getMonth()]} – ${last.getDate()} ${BULAN_FULL[last.getMonth()]} ${last.getFullYear()}`;
    })();

    return (
        <div style={S.page}>

            {/* ── HEADER ── */}
            <div style={S.header}>
                <div style={S.headerInner}>
                    <button onClick={() => navigate(-1)} style={S.backBtn}>
                        <ArrowLeft size={16} color="#94a3b8" />
                    </button>
                    <div style={S.headerTitle}>
                        <div style={S.headerLabel}>Jadwal Home Visit</div>
                        <div style={S.headerSub}>Carpetology ID</div>
                    </div>
                    <button onClick={goToday} style={S.todayBtn} title="Ke hari ini">
                        <Calendar size={15} color="#04CDCD" />
                        <span>Hari ini</span>
                    </button>
                </div>

                {/* ── STAT PILLS ── */}
                <div style={S.statRow}>
                    <div style={S.statPill}>
                        <span style={S.statNum}>{totalMingguIni}</span>
                        <span style={S.statLbl}>Minggu ini</span>
                    </div>
                    <div style={S.statDivider} />
                    <div style={S.statPill}>
                        <span style={S.statNum}>{totalHariIni}</span>
                        <span style={S.statLbl}>Hari ini</span>
                    </div>
                    <div style={S.statDivider} />
                    <div style={S.statPill}>
                        <span style={{ ...S.statNum, color: slotKosong > 0 ? '#fbbf24' : '#86efac' }}>
                            {slotKosong}
                        </span>
                        <span style={S.statLbl}>Slot Kosong</span>
                    </div>
                </div>
            </div>

            {/* ── WEEK STRIP ── */}
            <div style={S.weekWrap}>
                <div style={S.weekNav}>
                    <button style={S.navBtn} onClick={prevWeek}><ChevronLeft size={15} /></button>
                    <span style={S.weekLabel}>{weekLabel}</span>
                    <button style={S.navBtn} onClick={nextWeek}><ChevronRight size={15} /></button>
                </div>
                <div style={S.stripScroll} ref={stripRef}>
                    {weekDays.map((d, i) => {
                        const key        = toDateKey(d);
                        const isToday    = key === todayKey;
                        const isSelected = key === selectedKey;
                        const count      = bookings.filter(b => b.tanggal === key).length;
                        return (
                            <button
                                key={i}
                                data-pill
                                onClick={() => setSelectedDate(new Date(d))}
                                style={{
                                    ...S.dayPill,
                                    background:   isSelected ? '#04CDCD' : 'transparent',
                                    color:        isSelected ? '#fff' : isToday ? '#04CDCD' : '#64748b',
                                    fontWeight:   isSelected || isToday ? 700 : 500,
                                    borderBottom: isSelected
                                        ? '2.5px solid transparent'
                                        : isToday
                                            ? '2.5px solid #04CDCD'
                                            : '2.5px solid transparent',
                                }}
                            >
                                <span style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {HARI[d.getDay()]}
                                </span>
                                <span style={{ fontSize: 18, lineHeight: 1.1 }}>{d.getDate()}</span>
                                {count > 0 ? (
                                    <span style={{
                                        ...S.dotCount,
                                        background: isSelected ? 'rgba(255,255,255,0.35)' : '#04CDCD',
                                        color: '#fff',
                                    }}>{count}</span>
                                ) : (
                                    <span style={{ height: 14 }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={S.content}>

                {/* Date label */}
                <div style={S.dateLabelRow}>
                    <CalendarDays size={14} color="#04CDCD" />
                    <span style={S.dateLabel}>{formatTanggalPanjang(selectedDate)}</span>
                </div>

                {loading ? (
                    <div style={S.loadingWrap}>
                        <div style={S.spinner} />
                        <span style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>Memuat data...</span>
                    </div>
                ) : (
                    <>
                        <SesiSection
                            icon={<Sunrise size={14} color="#f59e0b" />}
                            label="Sesi 1"
                            time="09:00 – 11:00"
                            colorAccent="#f59e0b"
                            items={sesi1}
                            onCardClick={(id) => navigate(`/admin/home-visit/${id}`)}
                        />
                        <SesiSection
                            icon={<Sun size={14} color="#0ea5e9" />}
                            label="Sesi 2"
                            time="13:00 – 15:00"
                            colorAccent="#0ea5e9"
                            items={sesi2}
                            onCardClick={(id) => navigate(`/admin/home-visit/${id}`)}
                        />
                    </>
                )}

                {/* Footer */}
                <div style={S.footer}>
                    <Layers size={12} color="#cbd5e1" />
                    <span>Carpetology ID Home Visit</span>
                </div>
            </div>

            {/* FAB tambah */}
            {canAdd && (
                <button style={S.fab} onClick={() => navigate('/admin/tambah-booking')}>
                    <Plus size={22} color="#fff" />
                </button>
            )}

            <style>{`
                @keyframes spin    { to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}

// ─── SESI SECTION ─────────────────────────────────────────────────────────────
function SesiSection({ icon, label, time, colorAccent, items, onCardClick }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={S.sesiHeader}>
                <div style={{ ...S.sesiPill, borderColor: colorAccent + '55', background: colorAccent + '11' }}>
                    {icon}
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{label}</span>
                    <span style={S.sesiTime}>{time}</span>
                </div>
            </div>

            {items.length > 0 ? (
                items.map(b => (
                    <BookingCard key={b.id} booking={b} onClick={() => onCardClick(b.id)} />
                ))
            ) : (
                <EmptySlot />
            )}
        </div>
    );
}

// ─── BOOKING CARD ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onClick }) {
    return (
        <div style={S.card} onClick={onClick}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={S.avatarWrap}>
                    <UserCircle size={22} color="#04CDCD" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.custName}>{booking.nama}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{booking.no_hp || '—'}</div>
                    {booking.alamat && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {booking.alamat}
                        </div>
                    )}
                </div>
                <div style={S.confirmedBadge}>
                    <CheckCircle size={11} />
                    Terjadwal
                </div>
                <ChevronRight size={16} color="#cbd5e1" style={{ flexShrink: 0 }} />
            </div>
        </div>
    );
}

// ─── EMPTY SLOT ───────────────────────────────────────────────────────────────
function EmptySlot() {
    return (
        <div style={S.emptySlot}>
            <Clock size={16} color="#cbd5e1" />
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Slot tersedia</span>
        </div>
    );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 100,
    },

    // Header — sama persis dengan JadwalPickup
    header: {
        background: 'linear-gradient(160deg, #0f2027 0%, #1A2E35 100%)',
        padding: '0 0 0',
    },
    headerInner: {
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 16px 12px', maxWidth: 500, margin: '0 auto',
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
    },
    headerTitle: { flex: 1 },
    headerLabel: { fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' },
    headerSub:   { fontSize: 10, color: '#04CDCD', fontWeight: 600, marginTop: 1 },
    todayBtn: {
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(4,205,205,0.12)',
        border: '1px solid rgba(4,205,205,0.25)',
        color: '#04CDCD', padding: '7px 11px', borderRadius: 10,
        fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        whiteSpace: 'nowrap',
    },
    statRow: {
        display: 'flex', alignItems: 'center',
        padding: '10px 16px 14px', maxWidth: 500, margin: '0 auto',
        gap: 4,
    },
    statPill:    { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
    statNum:     { fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1 },
    statLbl:     { fontSize: 9, color: '#5a7c87', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 },
    statDivider: { width: 1, height: 28, background: 'rgba(255,255,255,0.1)', flexShrink: 0 },

    // Week strip — sticky, putih, border-bottom
    weekWrap: {
        background: '#fff',
        borderBottom: '1px solid #e8edf3',
        padding: '12px 0 8px',
        position: 'sticky', top: 0, zIndex: 10,
    },
    weekNav: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', maxWidth: 500, margin: '0 auto 10px',
    },
    navBtn: {
        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer',
        color: '#64748b',
    },
    weekLabel: { fontSize: 12, fontWeight: 600, color: '#475569' },
    stripScroll: {
        display: 'flex', gap: 2, overflowX: 'auto',
        padding: '0 12px', scrollbarWidth: 'none',
        maxWidth: 500, margin: '0 auto',
        WebkitOverflowScrolling: 'touch',
        justifyContent: 'space-between',
    },
    dayPill: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 3, padding: '8px 6px', borderRadius: 10, minWidth: 44,
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        transition: 'all .15s', border: 'none', flex: 1,
    },
    dotCount: {
        fontSize: 9, fontWeight: 800,
        minWidth: 14, height: 14, borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 4px',
    },

    // Content
    content: { maxWidth: 500, margin: '0 auto', padding: '16px 14px 0' },
    dateLabelRow: {
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 16,
    },
    dateLabel: { fontSize: 13, fontWeight: 700, color: '#1e293b' },

    // Sesi
    sesiHeader: { marginBottom: 10 },
    sesiPill: {
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '7px 14px', borderRadius: 20,
        border: '1.5px solid',
    },
    sesiTime: {
        fontSize: 11, color: '#64748b', fontWeight: 600,
        background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, marginLeft: 2,
    },

    // Cards
    card: {
        background: '#fff', borderRadius: 14,
        padding: '13px 13px', marginBottom: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        border: '1px solid #e8edf3',
        cursor: 'pointer',
        transition: 'all .15s',
    },
    avatarWrap: {
        width: 40, height: 40, borderRadius: '50%',
        background: '#E0FAFA',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    custName: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
    confirmedBadge: {
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 20,
        background: '#dcfce7', color: '#15803d',
        fontSize: 11, fontWeight: 700, flexShrink: 0,
    },
    emptySlot: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f8fafc',
        border: '1.5px dashed #e2e8f0',
        borderRadius: 14, padding: '16px',
        marginBottom: 10,
    },

    // Loading
    loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' },
    spinner: {
        width: 26, height: 26,
        border: '2.5px solid #f1f5f9',
        borderTop: '2.5px solid #04CDCD',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    },

    // Footer
    footer: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, fontSize: 11, color: '#cbd5e1',
        padding: '24px 0 8px',
    },

    // FAB
    fab: {
        position: 'fixed', bottom: 28, right: 20,
        width: 52, height: 52, borderRadius: '50%',
        background: 'linear-gradient(135deg, #04CDCD, #028585)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 18px rgba(4,205,205,0.4)',
        border: 'none', cursor: 'pointer', zIndex: 100,
    },
};