import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import {
    ChevronLeft, ChevronRight, Plus,
    Sunrise, Sun, UserCircle, Loader2,
    CalendarDays, CheckCircle, Clock, Layers,
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const HARI     = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const HARI_FULL = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Returns Mon–Sat (6 days) starting from the Monday of anchor's week
function getWeekDays(anchor) {
    const day = anchor.getDay(); // 0=Sun
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
    const navigate  = useNavigate();
    const today     = new Date();
    const { user }  = useAuth();
    const canAdd    = user?.role === 'admin' || user?.role === 'staff';

    const [anchor, setAnchor]         = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [bookings, setBookings]     = useState([]);
    const [loading, setLoading]       = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'bookings')), (snap) => {
            setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    const weekDays    = useMemo(() => getWeekDays(anchor), [anchor]);
    const selectedKey = toDateKey(selectedDate);

    const dayBookings = useMemo(
        () => bookings.filter(b => b.tanggal === selectedKey),
        [bookings, selectedKey]
    );

    const sesi1 = dayBookings.filter(b => b.sesi == 1);
    const sesi2 = dayBookings.filter(b => b.sesi == 2);

    const weekKeys       = useMemo(() => new Set(weekDays.map(toDateKey)), [weekDays]);
    const totalMingguIni = bookings.filter(b => weekKeys.has(b.tanggal)).length;
    const slotKosong     = 2 - (sesi1.length > 0 ? 1 : 0) - (sesi2.length > 0 ? 1 : 0);

    const prevWeek = () => { const d = new Date(anchor); d.setDate(d.getDate()-7); setAnchor(d); };
    const nextWeek = () => { const d = new Date(anchor); d.setDate(d.getDate()+7); setAnchor(d); };

    const todayKey = toDateKey(today);
    const weekLabel = (() => {
        const first = weekDays[0];
        const last  = weekDays[5];
        if (first.getMonth() === last.getMonth())
            return `${first.getDate()}–${last.getDate()} ${BULAN_FULL[first.getMonth()]} ${first.getFullYear()}`;
        return `${first.getDate()} ${BULAN_FULL[first.getMonth()]} – ${last.getDate()} ${BULAN_FULL[last.getMonth()]} ${last.getFullYear()}`;
    })();

    return (
        <div style={S.page}>

            {/* ── HERO HEADER ── */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    {/* Brand row */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 18 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={S.logoIconWrap}>
                                <Layers size={20} color="#04CDCD" />
                            </div>
                            <div>
                                <div style={S.brand}>Carpetology</div>
                                <div style={S.tagline}>Jadwal Home Visit</div>
                            </div>
                        </div>
                        <button onClick={() => navigate(-1)} style={S.backBtn}>‹ Kembali</button>
                    </div>

                    {/* Stats bar */}
                    <div style={S.statsRow}>
                        <div style={S.statChip}>
                            <div style={S.statNum}>{totalMingguIni}</div>
                            <div style={S.statLbl}>Minggu Ini</div>
                        </div>
                        <div style={S.statDivider} />
                        <div style={S.statChip}>
                            <div style={S.statNum}>{sesi1.length + sesi2.length}</div>
                            <div style={S.statLbl}>Hari Ini</div>
                        </div>
                        <div style={S.statDivider} />
                        <div style={S.statChip}>
                            <div style={{ ...S.statNum, color: slotKosong > 0 ? '#86efac' : '#f87171' }}>{slotKosong}</div>
                            <div style={S.statLbl}>Slot Kosong</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── WEEK STRIP ── */}
            <div style={S.weekWrap}>
                <div style={S.weekCard}>
                    {/* Week label + nav */}
                    <div style={S.weekNav}>
                        <button style={S.navBtn} onClick={prevWeek}>
                            <ChevronLeft size={16} color="#475569" />
                        </button>
                        <span style={S.weekLabel}>{weekLabel}</span>
                        <button style={S.navBtn} onClick={nextWeek}>
                            <ChevronRight size={16} color="#475569" />
                        </button>
                    </div>

                    {/* Day pills — scrollable so nothing gets clipped */}
                    <div style={S.daysScroll}>
                        <div style={S.daysRow}>
                            {weekDays.map((d, i) => {
                                const key        = toDateKey(d);
                                const isToday    = key === todayKey;
                                const isSelected = key === selectedKey;
                                const hasDot     = bookings.some(b => b.tanggal === key);

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDate(d)}
                                        style={{
                                            ...S.dayPill,
                                            background:   isSelected ? '#04CDCD' : isToday ? '#E0FAFA' : '#fff',
                                            border:       isSelected ? '2px solid #04CDCD' : isToday ? '2px solid #04CDCD' : '2px solid #e2e8f0',
                                            color:        isSelected ? '#fff' : isToday ? '#028585' : '#1e293b',
                                            boxShadow:    isSelected ? '0 4px 12px rgba(4,205,205,0.35)' : 'none',
                                        }}
                                    >
                                        <span style={{ fontSize: 9, fontWeight: 700, opacity: isSelected ? 0.85 : 0.6, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                                            {HARI[d.getDay()]}
                                        </span>
                                        <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>
                                            {d.getDate()}
                                        </span>
                                        {/* booking dot */}
                                        <span style={{
                                            width: 5, height: 5, borderRadius: '50%',
                                            background: isSelected ? 'rgba(255,255,255,0.7)' : '#04CDCD',
                                            visibility: hasDot ? 'visible' : 'hidden',
                                        }} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={S.contentWrap}>

                {/* Selected date label */}
                <div style={S.dateLabelRow}>
                    <CalendarDays size={14} color="#04CDCD" />
                    <span style={S.dateLabel}>
                        {HARI_FULL[selectedDate.getDay()]}, {selectedDate.getDate()} {BULAN_FULL[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                </div>

                {loading ? (
                    <div style={S.loadingWrap}>
                        <Loader2 size={28} color="#04CDCD" style={{ animation:'spin .8s linear infinite' }} />
                        <span style={{ color:'#94a3b8', fontSize:13, marginTop:12 }}>Memuat data...</span>
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
                    <div style={{ fontWeight:700, color:'#04CDCD', marginBottom:4, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        <Layers size={14} color="#04CDCD" /> Carpetology
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>Jasa Cuci Karpet & Laundry Professional</div>
                </div>
            </div>

            {/* FAB tambah */}
            {canAdd && (
                <button style={S.fab} onClick={() => navigate('/admin/tambah-booking')}>
                    <Plus size={24} color="#fff" />
                </button>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

// ─── SESI SECTION ─────────────────────────────────────────────────────────────
function SesiSection({ icon, label, time, colorAccent, items, onCardClick }) {
    return (
        <div style={{ marginBottom: 20 }}>
            {/* Section header */}
            <div style={S.sesiHeader}>
                <div style={{ ...S.sesiPill, borderColor: colorAccent + '55', background: colorAccent + '11' }}>
                    {icon}
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{label}</span>
                    <span style={S.sesiTime}>{time}</span>
                </div>
            </div>

            {/* Cards */}
            {items.length > 0 ? (
                items.map(b => <BookingCard key={b.id} booking={b} onClick={() => onCardClick(b.id)} />)
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
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={S.avatarWrap}>
                    <UserCircle size={22} color="#04CDCD" />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                    <div style={S.custName}>{booking.nama}</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{booking.no_hp || '—'}</div>
                    {booking.alamat && (
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {booking.alamat}
                        </div>
                    )}
                </div>
                <div style={S.confirmedBadge}>
                    <CheckCircle size={11} />
                    Terjadwal
                </div>
                <ChevronRight size={16} color="#cbd5e1" style={{ flexShrink:0 }} />
            </div>
        </div>
    );
}

// ─── EMPTY SLOT ───────────────────────────────────────────────────────────────
function EmptySlot() {
    return (
        <div style={S.emptySlot}>
            <Clock size={16} color="#cbd5e1" />
            <span style={{ fontSize:13, color:'#94a3b8', fontWeight:600 }}>Slot tersedia</span>
        </div>
    );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 100,
    },

    // Hero
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '20px 20px 0',
    },
    heroInner: {
        maxWidth: 500,
        margin: '0 auto',
    },
    logoIconWrap: {
        width: 36, height: 36,
        background: '#04CDCD22',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    brand: {
        fontSize: 20, fontWeight: 800, color: '#04CDCD', letterSpacing: '-0.3px',
    },
    tagline: {
        fontSize: 10, color: '#6B8894', marginTop: 1,
    },
    backBtn: {
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#a0b8c0',
        padding: '7px 12px', borderRadius: 10,
        fontSize: 12, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit',
        whiteSpace: 'nowrap',
    },
    statsRow: {
        display: 'flex',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px 12px 0 0',
        padding: '12px 20px',
    },
    statChip: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    },
    statNum: {
        fontSize: 20, fontWeight: 800, color: '#fff',
    },
    statLbl: {
        fontSize: 9, color: '#6B8894', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600,
    },
    statDivider: {
        width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 4px',
    },

    // Week strip
    weekWrap: {
        padding: '0 16px',
        background: '#0d2028', // continues hero background
    },
    weekCard: {
        background: '#fff',
        borderRadius: 14,
        padding: '12px 12px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: 500,
        margin: '0 auto',
        transform: 'translateY(0)',
    },
    weekNav: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        gap: 8,
    },
    navBtn: {
        width: 30, height: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: 8, cursor: 'pointer',
        flexShrink: 0,
    },
    weekLabel: {
        fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'center', flex: 1,
    },
    // Scrollable container so pills never get clipped
    daysScroll: {
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        // hide scrollbar visually
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
    },
    daysRow: {
        display: 'flex',
        gap: 6,
        // min-content so each pill keeps its natural size
        width: 'max-content',
        padding: '2px 2px 4px',
    },
    dayPill: {
        width: 46,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 3, padding: '8px 0',
        borderRadius: 12, cursor: 'pointer',
        transition: 'all .15s',
        fontFamily: 'inherit',
        flexShrink: 0,
    },

    // Content
    contentWrap: {
        maxWidth: 500, margin: '0 auto',
        padding: '20px 16px 0',
    },
    dateLabelRow: {
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 16,
    },
    dateLabel: {
        fontSize: 14, fontWeight: 700, color: '#1e293b',
    },

    // Sesi
    sesiHeader: {
        marginBottom: 10,
    },
    sesiPill: {
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '7px 14px', borderRadius: 20,
        border: '1.5px solid',
    },
    sesiTime: {
        fontSize: 11, color: '#64748b', fontWeight: 600,
        background: '#f1f5f9', padding: '2px 8px', borderRadius: 6,
        marginLeft: 2,
    },

    // Cards
    card: {
        background: '#fff', borderRadius: 14,
        padding: '14px 16px', marginBottom: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #f1f5f9',
        cursor: 'pointer',
        transition: 'all .15s',
    },
    avatarWrap: {
        width: 40, height: 40, borderRadius: '50%',
        background: '#E0FAFA',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    custName: {
        fontSize: 14, fontWeight: 800, color: '#1e293b',
    },
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

    loadingWrap: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '60px 20px',
    },
    footer: {
        textAlign: 'center', padding: '32px 20px 16px',
        color: '#94a3b8', fontSize: 12,
    },
    fab: {
        position: 'fixed', bottom: 24, right: 20,
        width: 52, height: 52, borderRadius: '50%',
        background: '#04CDCD',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(4,205,205,0.4)',
        border: 'none', cursor: 'pointer', zIndex: 100,
    },
};