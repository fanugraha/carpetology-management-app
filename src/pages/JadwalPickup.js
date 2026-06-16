import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
    collection, onSnapshot, query,
    addDoc, doc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import {
    ChevronLeft, ChevronRight, Plus, X,
    Phone, MapPin, FileText, User,
    Send, Package, CheckCircle2, Circle,
    Layers, Truck, ClipboardList, AlertCircle,
    Trash2, Edit2, Calendar, ArrowLeft,
    CheckCheck, Clock, RotateCcw, PackageCheck,
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const HARI_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_RUTIN = new Set([2, 4, 6]); // Sel, Kam, Sab

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

function formatTanggalPanjang(d) {
    return `${HARI_FULL[d.getDay()]}, ${d.getDate()} ${BULAN_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function JadwalPickup() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const role = (user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isCS = role === 'cs';
    const isStaff = role === 'staff';
    const canAccess = isAdmin || isCS || isStaff;
    const canEdit = isAdmin || isCS;

    const [anchor, setAnchor] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [allItems, setAllItems] = useState([]); // semua pickup + delivery
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pickup'); // 'pickup' | 'delivery'
    const [showForm, setShowForm] = useState(false);
    const [detailItem, setDetailItem] = useState(null);
    const stripRef = useRef(null);

    useEffect(() => { if (!canAccess) navigate('/'); }, [canAccess, navigate]);

    // ── Realtime listener — koleksi tunggal "pickups" dengan field tipe ──
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'pickups')), snap => {
            setAllItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return unsub;
    }, []);

    const weekDays = useMemo(() => getWeekDays(anchor), [anchor]);
    const selectedKey = toDateKey(selectedDate);
    const todayKey = toDateKey(new Date());
    const weekKeys = useMemo(() => new Set(weekDays.map(toDateKey)), [weekDays]);

    // Filter berdasarkan tipe
    const pickupItems = useMemo(() => allItems.filter(p => (p.tipe || 'pickup') === 'pickup'), [allItems]);
    const deliveryItems = useMemo(() => allItems.filter(p => p.tipe === 'delivery'), [allItems]);
    const activeItems = activeTab === 'pickup' ? pickupItems : deliveryItems;

    // Stats hari ini (tab aktif)
    const dayItems = useMemo(() => activeItems.filter(p => p.tanggal === selectedKey), [activeItems, selectedKey]);
    const sudahSelesai = dayItems.filter(p => p.status === (activeTab === 'pickup' ? 'Sudah Dijemput' : 'Sudah Diantar')).length;
    const menunggu = dayItems.filter(p => p.status === 'Dijadwalkan').length;
    const total = dayItems.length;
    const progress = total > 0 ? Math.round((sudahSelesai / total) * 100) : 0;

    // Stats minggu ini (tab aktif)
    const totalMingguIni = activeItems.filter(p => weekKeys.has(p.tanggal)).length;

    // Dot di strip kalender = gabungan pickup + delivery
    const allDayItems = useMemo(() => allItems.filter(p => p.tanggal === selectedKey), [allItems, selectedKey]);
    const isRutin = HARI_RUTIN.has(selectedDate.getDay());

    const prevWeek = () => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); };
    const nextWeek = () => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); };
    const goToday = () => { const now = new Date(); setAnchor(now); setSelectedDate(now); };

    // auto-scroll strip
    useEffect(() => {
        if (!stripRef.current) return;
        const idx = weekDays.findIndex(d => toDateKey(d) === selectedKey);
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

    // ── WA Message — gabungan pickup + delivery hari ini ──
    const handleKirimWA = () => {
        const dayPickups = pickupItems.filter(p => p.tanggal === selectedKey);
        const dayDeliveries = deliveryItems.filter(p => p.tanggal === selectedKey);
        const totalAll = dayPickups.length + dayDeliveries.length;
        if (totalAll === 0) return;

        const tgl = formatTanggalPanjang(selectedDate);
        let pesan = `*Carpetology — Jadwal Hari Ini*\n${tgl}`;
        if (isRutin) pesan += `\n_(Jadwal Rutin)_`;
        pesan += `\n\n`;

        if (dayPickups.length > 0) {
            pesan += `🚚 *PICKUP (${dayPickups.length})*\n`;
            pesan += `${'─'.repeat(20)}\n`;
            dayPickups.forEach((p, i) => {
                const status = p.status === 'Sudah Dijemput' ? '✅' : '⏳';
                pesan += `${status} *${i + 1}. ${p.nama}*\n`;
                pesan += `   📞 ${p.no_hp}\n`;
                if (p.alamat) {
                    const isLink = p.alamat.startsWith('http');
                    pesan += `   📍 ${isLink ? p.alamat : p.alamat}\n`;
                }
                if (p.catatan) pesan += `   📦 ${p.catatan}\n`;
                pesan += `\n`;
            });
        }

        if (dayDeliveries.length > 0) {
            pesan += `📦 *DELIVERY (${dayDeliveries.length})*\n`;
            pesan += `${'─'.repeat(20)}\n`;
            dayDeliveries.forEach((p, i) => {
                const status = p.status === 'Sudah Diantar' ? '✅' : '⏳';
                pesan += `${status} *${i + 1}. ${p.nama}*\n`;
                pesan += `   📞 ${p.no_hp}\n`;
                if (p.alamat) {
                    const isLink = p.alamat.startsWith('http');
                    pesan += `   📍 ${isLink ? p.alamat : p.alamat}\n`;
                }
                if (p.catatan) pesan += `   📦 ${p.catatan}\n`;
                pesan += `\n`;
            });
        }

        pesan += `${'─'.repeat(20)}\n`;
        pesan += `Total: ${dayPickups.length} pickup, ${dayDeliveries.length} delivery\n`;
        pesan += `Mohon konfirmasi setelah selesai.`;

        window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, '_blank');
    };

    // Label status sesuai tipe
    const statusSelesai = activeTab === 'pickup' ? 'Sudah Dijemput' : 'Sudah Diantar';
    const iconTab = activeTab === 'pickup'
        ? <Truck size={13} />
        : <PackageCheck size={13} />;

    if (!canAccess) return null;

    return (
        <div style={S.page}>

            {/* ── HEADER ── */}
            <div style={S.header}>
                <div style={S.headerInner}>
                    <button onClick={() => navigate(-1)} style={S.backBtn}>
                        <ArrowLeft size={16} color="#94a3b8" />
                    </button>
                    <div style={S.headerTitle}>
                        <div style={S.headerLabel}>Jadwal Harian</div>
                        <div style={S.headerSub}>Carpetology</div>
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
                        <span style={S.statNum}>{total}</span>
                        <span style={S.statLbl}>Hari ini</span>
                    </div>
                    <div style={S.statDivider} />
                    <div style={S.statPill}>
                        <span style={{ ...S.statNum, color: menunggu > 0 ? '#fbbf24' : '#86efac' }}>{menunggu}</span>
                        <span style={S.statLbl}>Menunggu</span>
                    </div>
                    <div style={S.statDivider} />
                    <div style={S.statPill}>
                        <span style={{ ...S.statNum, color: '#86efac' }}>{sudahSelesai}</span>
                        <span style={S.statLbl}>Selesai</span>
                    </div>
                </div>

                {/* ── TAB SWITCHER ── */}
                <div style={S.tabRow}>
                    <button
                        onClick={() => setActiveTab('pickup')}
                        style={{
                            ...S.tabBtn,
                            background: activeTab === 'pickup' ? '#04CDCD' : 'rgba(255,255,255,0.07)',
                            color: activeTab === 'pickup' ? '#fff' : '#5a7c87',
                            border: activeTab === 'pickup' ? '1px solid #04CDCD' : '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <Truck size={13} />
                        <span>Pickup</span>
                        {pickupItems.filter(p => p.tanggal === selectedKey).length > 0 && (
                            <span style={{
                                ...S.tabBadge,
                                background: activeTab === 'pickup' ? 'rgba(255,255,255,0.25)' : '#04CDCD',
                            }}>
                                {pickupItems.filter(p => p.tanggal === selectedKey).length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('delivery')}
                        style={{
                            ...S.tabBtn,
                            background: activeTab === 'delivery' ? '#8b5cf6' : 'rgba(255,255,255,0.07)',
                            color: activeTab === 'delivery' ? '#fff' : '#5a7c87',
                            border: activeTab === 'delivery' ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <PackageCheck size={13} />
                        <span>Delivery</span>
                        {deliveryItems.filter(p => p.tanggal === selectedKey).length > 0 && (
                            <span style={{
                                ...S.tabBadge,
                                background: activeTab === 'delivery' ? 'rgba(255,255,255,0.25)' : '#8b5cf6',
                            }}>
                                {deliveryItems.filter(p => p.tanggal === selectedKey).length}
                            </span>
                        )}
                    </button>
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
                        const key = toDateKey(d);
                        const isToday = key === todayKey;
                        const isSelected = key === selectedKey;
                        const isRutinDay = HARI_RUTIN.has(d.getDay());
                        // Dot count berdasarkan tab aktif
                        const count = activeItems.filter(p => p.tanggal === key).length;
                        // Total gabungan untuk indicator
                        const countAll = allItems.filter(p => p.tanggal === key).length;
                        const tabColor = activeTab === 'pickup' ? '#04CDCD' : '#8b5cf6';
                        return (
                            <button
                                key={i}
                                data-pill
                                onClick={() => setSelectedDate(new Date(d))}
                                style={{
                                    ...S.dayPill,
                                    background: isSelected ? tabColor : 'transparent',
                                    color: isSelected ? '#fff' : isToday ? tabColor : '#64748b',
                                    fontWeight: isSelected || isToday ? 700 : 500,
                                    borderBottom: isSelected
                                        ? '2.5px solid transparent'
                                        : isToday
                                            ? `2.5px solid ${tabColor}`
                                            : '2.5px solid transparent',
                                }}
                            >
                                <span style={{ fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {HARI[d.getDay()]}
                                </span>
                                <span style={{ fontSize: 18, lineHeight: 1.1 }}>{d.getDate()}</span>
                                {isRutinDay && (
                                    <span style={{
                                        fontSize: 6, fontWeight: 800,
                                        color: isSelected ? 'rgba(255,255,255,0.85)' : tabColor,
                                        textTransform: 'uppercase', letterSpacing: '0.4px',
                                    }}>RUTIN</span>
                                )}
                                {countAll > 0 ? (
                                    <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                                        {/* Dot pickup */}
                                        {pickupItems.filter(p => p.tanggal === key).length > 0 && (
                                            <span style={{
                                                ...S.dotCount,
                                                background: isSelected ? 'rgba(255,255,255,0.35)' : '#04CDCD',
                                                color: '#fff',
                                                fontSize: 8,
                                                minWidth: 12, height: 12,
                                            }}>
                                                {pickupItems.filter(p => p.tanggal === key).length}
                                            </span>
                                        )}
                                        {/* Dot delivery */}
                                        {deliveryItems.filter(p => p.tanggal === key).length > 0 && (
                                            <span style={{
                                                ...S.dotCount,
                                                background: isSelected ? 'rgba(255,255,255,0.35)' : '#8b5cf6',
                                                color: '#fff',
                                                fontSize: 8,
                                                minWidth: 12, height: 12,
                                            }}>
                                                {deliveryItems.filter(p => p.tanggal === key).length}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span style={{ height: 14 }} />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div style={S.legendRow}>
                    <span style={{ ...S.legendDot, borderColor: '#04CDCD', background: '#e0fafa' }} />
                    <span style={S.legendText}>P: Pickup</span>
                    <span style={{ ...S.legendDot, borderColor: '#8b5cf6', background: '#ede9fe', marginLeft: 8 }} />
                    <span style={S.legendText}>D: Delivery</span>
                    <span style={S.legendText}>· Rutin: Sel, Kam, Sab</span>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={S.content}>

                {/* Date label + rutin badge */}
                <div style={S.dateLabelRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ClipboardList size={14} color={activeTab === 'pickup' ? '#04CDCD' : '#8b5cf6'} />
                        <span style={S.dateLabel}>{formatTanggalPanjang(selectedDate)}</span>
                    </div>
                    {isRutin && (
                        <span style={{
                            ...S.rutinBadge,
                            background: activeTab === 'pickup' ? '#e0fafa' : '#ede9fe',
                            color: activeTab === 'pickup' ? '#028585' : '#7c3aed',
                            border: `1px solid ${activeTab === 'pickup' ? '#99f6e4' : '#c4b5fd'}`,
                        }}>
                            {iconTab}
                            Rutin
                        </span>
                    )}
                </div>

                {/* Progress bar */}
                {total > 0 && (
                    <div style={S.progressCard}>
                        <div style={S.progressTop}>
                            <span style={S.progressLabel}>
                                Progress {activeTab === 'pickup' ? 'pickup' : 'delivery'} hari ini
                            </span>
                            <span style={{
                                ...S.progressCount,
                                color: progress === 100 ? '#22c55e' : activeTab === 'pickup' ? '#04CDCD' : '#8b5cf6',
                            }}>
                                {sudahSelesai}/{total} selesai
                            </span>
                        </div>
                        <div style={S.progressTrack}>
                            <div style={{
                                ...S.progressFill,
                                width: `${progress}%`,
                                background: progress === 100 ? '#22c55e' : activeTab === 'pickup' ? '#04CDCD' : '#8b5cf6',
                            }} />
                        </div>
                        {progress === 100 && (
                            <div style={S.allDoneRow}>
                                <CheckCheck size={13} color="#22c55e" />
                                <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>
                                    Semua {activeTab === 'pickup' ? 'pickup' : 'delivery'} selesai!
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Kirim WA Gabungan — hanya admin & cs */}
                {canEdit && (
                    <button
                        onClick={handleKirimWA}
                        disabled={allDayItems.length === 0}
                        style={{
                            ...S.waBtn,
                            opacity: allDayItems.length === 0 ? 0.4 : 1,
                            cursor: allDayItems.length === 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <div style={S.waBtnIcon}><Send size={15} color="#04CDCD" /></div>
                        <div>
                            <div style={S.waBtnTitle}>Kirim Jadwal ke Grup WA</div>
                            <div style={S.waBtnSub}>
                                {allDayItems.length > 0
                                    ? `${pickupItems.filter(p => p.tanggal === selectedKey).length} pickup · ${deliveryItems.filter(p => p.tanggal === selectedKey).length} delivery`
                                    : 'Belum ada jadwal hari ini'}
                            </div>
                        </div>
                        <ChevronRight size={15} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                    </button>
                )}

                {/* Hint untuk staff */}
                {isStaff && total > 0 && (
                    <div style={S.hintBox}>
                        <CheckCircle2 size={13} color={activeTab === 'pickup' ? '#04CDCD' : '#8b5cf6'} />
                        <span>Tap kartu untuk update status {activeTab === 'pickup' ? 'pickup' : 'delivery'}</span>
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div style={S.loadingWrap}>
                        <div style={S.spinner} />
                        <span style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>Memuat data...</span>
                    </div>
                ) : dayItems.length === 0 ? (
                    <EmptyDay canAdd={canEdit} tipe={activeTab} />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 100 }}>
                        {dayItems.map((p, idx) => (
                            <ItemCard
                                key={p.id}
                                item={p}
                                index={idx + 1}
                                canEdit={canEdit}
                                tipe={activeTab}
                                onToggle={async () => {
                                    await updateDoc(doc(db, 'pickups', p.id), {
                                        status: p.status === statusSelesai ? 'Dijadwalkan' : statusSelesai,
                                    });
                                }}
                                onDetail={() => setDetailItem(p)} />
                        ))}
                        <div style={S.footer}>
                            <Layers size={12} color="#cbd5e1" />
                            <span>Carpetology Pickup & Delivery System</span>
                        </div>
                    </div>
                )}
            </div>

            {/* FAB */}
            {canEdit && (
                <button
                    style={{
                        ...S.fab,
                        background: activeTab === 'pickup'
                            ? 'linear-gradient(135deg, #04CDCD, #028585)'
                            : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    }}
                    onClick={() => setShowForm(true)}
                >
                    <Plus size={22} color="#fff" />
                </button>
            )}

            {showForm && (
                <TambahItemModal
                    tanggal={selectedKey}
                    tipe={activeTab}
                    onClose={() => setShowForm(false)}
                />
            )}
            {detailItem && (
                <DetailItemModal
                    item={detailItem}
                    canEdit={canEdit}
                    onClose={() => setDetailItem(null)}
                />
            )}

            <style>{`
                @keyframes spin    { to { transform: rotate(360deg); } }
                @keyframes slideUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
                @keyframes pop     { 0%{transform:scale(1)} 45%{transform:scale(1.22)} 100%{transform:scale(1)} }
                @keyframes pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 60%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }
                ::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
}

// ─── ITEM CARD ──────────────────────────────────────────────────────────────
// ─── ITEM CARD ──────────────────────────────────────────────────────────────
// Ganti seluruh fungsi ItemCard di JadwalPickup.js dengan kode ini

function ItemCard({ item, index, canEdit, tipe, onToggle, onDetail }) {
    const statusSelesai = tipe === 'pickup' ? 'Sudah Dijemput' : 'Sudah Diantar';
    const isDone = item.status === statusSelesai;
    const isMapLink = item.alamat?.startsWith('http');
    const [busy, setBusy] = useState(false);
    const [popped, setPopped] = useState(false);
    const [localStatus, setLocalStatus] = useState(isDone);
    const accentColor = tipe === 'pickup' ? '#04CDCD' : '#8b5cf6';

    useEffect(() => { setLocalStatus(isDone); }, [isDone]);

    const handleToggle = async (e) => {
        e?.stopPropagation();
        if (busy) return;
        setBusy(true);
        setPopped(true);
        setLocalStatus(s => !s);
        setTimeout(() => setPopped(false), 400);
        try { await onToggle(); }
        catch { setLocalStatus(s => !s); }
        finally { setBusy(false); }
    };

    const handleCardClick = () => {
        if (!canEdit && onDetail) onDetail();
    };

    const mapsLinkStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 500,
        color: tipe === 'pickup' ? '#028585' : '#7c3aed',
        background: tipe === 'pickup' ? '#e0fafa' : '#ede9fe',
        border: '1px solid ' + (tipe === 'pickup' ? '#99f6e4' : '#ddd6fe'),
        padding: '3px 8px',
        borderRadius: 20,
        textDecoration: 'none',
        maxWidth: '100%',
        overflow: 'hidden',
    };

    return (
        <div
            onClick={handleCardClick}
            style={{
                ...S.card,
                opacity: localStatus ? 0.72 : 1,
                background: localStatus ? (tipe === 'pickup' ? '#f0fdf4' : '#faf5ff') : '#fff',
                borderColor: localStatus ? (tipe === 'pickup' ? '#bbf7d0' : '#ddd6fe') : '#e8edf3',
                cursor: canEdit ? 'default' : 'pointer',
            }}
        >
            <div style={{
                position: 'absolute', left: 0, top: 12, bottom: 12,
                width: 3, borderRadius: '0 2px 2px 0',
                background: accentColor,
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 8 }}>

                {/* Check button — admin/cs pakai <button>, staff pakai <div> dengan onClick */}
                {canEdit ? (
                    <button
                        onClick={handleToggle}
                        disabled={busy}
                        style={{
                            ...S.checkBtn,
                            background: localStatus ? '#22c55e' : '#f8fafc',
                            border: localStatus ? '2px solid #86efac' : '2px dashed #cbd5e1',
                            animation: popped ? 'pop .4s ease' : localStatus ? 'pulse 1.2s ease' : 'none',
                        }}
                    >
                        {localStatus
                            ? <CheckCircle2 size={17} color="#fff" />
                            : <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>{index}</span>
                        }
                    </button>
                ) : (
                    <div
        onClick={(e) => { e.stopPropagation(); handleToggle(e); }}
        style={{
            ...S.checkBtn,
            background: localStatus ? '#22c55e' : '#f8fafc',
            border: localStatus ? '2px solid #86efac' : '2px dashed #cbd5e1',
            animation: popped ? 'pop .4s ease' : localStatus ? 'pulse 1.2s ease' : 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            flexShrink: 0,
        }}
    >
        {localStatus
            ? <CheckCircle2 size={17} color="#fff" />
            : <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>{index}</span>
        }
    </div>
                )}

                {/* Info */}
                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        cursor: canEdit && onDetail ? 'pointer' : 'default',
                    }}
                    onClick={canEdit && onDetail ? (e) => { e.stopPropagation(); onDetail(); } : undefined}
                >
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 8, marginBottom: 5,
                    }}>
                        <span style={{
                            ...S.custName,
                            textDecoration: localStatus ? 'line-through' : 'none',
                            color: localStatus ? '#94a3b8' : '#0f172a',
                        }}>
                            {item.nama}
                        </span>
                        {localStatus
                            ? <span style={S.donePill}><CheckCheck size={9} /> Selesai</span>
                            : <span style={S.pendingPill}><Clock size={9} /> Menunggu</span>
                        }
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        <span style={S.chip}>
                            <Phone size={9} color="#64748b" />
                            {item.no_hp}
                        </span>

                        {item.alamat && isMapLink && (
                            <a
                                href={item.alamat}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={mapsLinkStyle}
                            >
                                <MapPin size={9} color={tipe === 'pickup' ? '#028585' : '#7c3aed'} />
                                Maps
                            </a>
                        )}

                        {item.alamat && !isMapLink && (
                            <span style={{ ...S.chip, maxWidth: 150 }}>
                                <MapPin size={9} color="#64748b" />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.alamat}
                                </span>
                            </span>
                        )}

                        {item.catatan && (
                            <span style={S.chip}>
                                <FileText size={9} color="#94a3b8" />
                                {item.catatan}
                            </span>
                        )}
                    </div>
                </div>

                {/* Chevron detail — hanya admin/cs */}
                {canEdit && onDetail && (
                    <ChevronRight
                        size={14}
                        color="#cbd5e1"
                        style={{ flexShrink: 0 }}
                        onClick={e => { e.stopPropagation(); onDetail(); }}
                    />
                )}
            </div>
        </div>
    );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
function EmptyDay({ canAdd, tipe }) {
    return (
        <div style={S.emptyWrap}>
            <div style={S.emptyIcon}>
                {tipe === 'pickup' ? <Truck size={28} color="#94a3b8" /> : <PackageCheck size={28} color="#94a3b8" />}
            </div>
            <div style={S.emptyTitle}>Belum ada {tipe === 'pickup' ? 'pickup' : 'delivery'}</div>
            <div style={S.emptySub}>
                {canAdd
                    ? `Tap tombol + untuk menambah jadwal ${tipe === 'pickup' ? 'pickup' : 'delivery'}.`
                    : `Tidak ada jadwal ${tipe === 'pickup' ? 'pickup' : 'delivery'} hari ini.`}
            </div>
        </div>
    );
}

// ─── FORM FIELD ──────────────────────────────────────────────────────────────
function FormField({ icon, label, children, required }) {
    return (
        <div>
            <div style={Mo.fieldLabel}>
                {icon}
                <span>{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</span>
            </div>
            {children}
        </div>
    );
}

// ─── MODAL TAMBAH ────────────────────────────────────────────────────────────
function TambahItemModal({ tanggal, tipe, onClose }) {
    const [form, setForm] = useState({ nama: '', no_hp: '', alamat: '', catatan: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const isPickup = tipe === 'pickup';
    const accentColor = isPickup ? '#04CDCD' : '#8b5cf6';

    const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSimpan = async () => {
        if (!form.nama.trim()) return setError('Nama pelanggan wajib diisi.');
        if (!form.no_hp.trim()) return setError('Nomor HP wajib diisi.');
        if (!form.alamat.trim()) return setError('Lokasi wajib diisi.');
        setError('');
        setSaving(true);
        try {
            await addDoc(collection(db, 'pickups'), {
                nama: form.nama.trim(),
                no_hp: form.no_hp.trim(),
                alamat: form.alamat.trim(),
                catatan: form.catatan.trim(),
                tanggal,
                tipe,
                status: 'Dijadwalkan',
                created_at: serverTimestamp(),
            });
            onClose();
        } catch {
            setError('Gagal menyimpan. Coba lagi.');
            setSaving(false);
        }
    };

    return (
        <div style={Mo.overlay} onClick={onClose}>
            <div style={Mo.sheet} onClick={e => e.stopPropagation()}>
                <div style={Mo.handle} />
                <div style={Mo.header}>
                    <div style={{ ...Mo.iconWrap, background: isPickup ? '#e0fafa' : '#ede9fe' }}>
                        {isPickup
                            ? <Truck size={18} color={accentColor} />
                            : <PackageCheck size={18} color={accentColor} />
                        }
                    </div>
                    <div>
                        <div style={Mo.title}>Tambah {isPickup ? 'Pickup' : 'Delivery'}</div>
                        <div style={Mo.sub}>
                            {isPickup ? 'Isi data pelanggan yang akan dijemput' : 'Isi data pelanggan yang akan diantarkan'}
                        </div>
                    </div>
                    <button onClick={onClose} style={Mo.closeBtn}><X size={15} color="#64748b" /></button>
                </div>

                {error && (
                    <div style={Mo.errorBox}>
                        <AlertCircle size={13} color="#ef4444" />
                        <span>{error}</span>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <FormField icon={<User size={13} color="#94a3b8" />} label="Nama pelanggan" required>
                        <input placeholder="Budi Santoso" value={form.nama} onChange={set('nama')} style={Mo.input} />
                    </FormField>
                    <FormField icon={<Phone size={13} color="#94a3b8" />} label="Nomor HP" required>
                        <input placeholder="08123456789" value={form.no_hp} onChange={set('no_hp')} style={Mo.input} type="tel" />
                    </FormField>
                    <FormField
                        icon={<MapPin size={13} color="#94a3b8" />}
                        label={isPickup ? 'Lokasi penjemputan / Share link Maps' : 'Alamat pengiriman / Share link Maps'}
                        required
                    >
                        <textarea
                            placeholder="Paste link Google Maps atau tulis alamat..."
                            value={form.alamat}
                            onChange={set('alamat')}
                            style={{ ...Mo.input, minHeight: 70, resize: 'vertical' }}
                        />
                    </FormField>
                    <FormField icon={<FileText size={13} color="#94a3b8" />} label="Catatan item">
                        <input
                            placeholder={isPickup ? 'Contoh: 2 karpet besar, 1 sofa' : 'Contoh: 2 karpet sudah cuci, 1 sofa'}
                            value={form.catatan}
                            onChange={set('catatan')}
                            style={Mo.input}
                        />
                    </FormField>
                </div>

                <button
                    onClick={handleSimpan}
                    disabled={saving}
                    style={{
                        ...Mo.ctaBtn,
                        background: isPickup
                            ? 'linear-gradient(135deg, #04CDCD, #028585)'
                            : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                        opacity: saving ? 0.7 : 1,
                    }}
                >
                    {saving ? 'Menyimpan...' : `Simpan ${isPickup ? 'Pickup' : 'Delivery'}`}
                </button>
            </div>
        </div>
    );
}

// ─── MODAL DETAIL ────────────────────────────────────────────────────────────
function DetailItemModal({ item, onClose, canEdit }) {
    const isPickup = (item.tipe || 'pickup') === 'pickup';
    const statusSelesai = isPickup ? 'Sudah Dijemput' : 'Sudah Diantar';
    const accentColor = isPickup ? '#04CDCD' : '#8b5cf6';

    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({
        nama: item.nama, no_hp: item.no_hp,
        alamat: item.alamat || '', catatan: item.catatan || '',
    });

    const isDone = item.status === statusSelesai;
    const isMapLink = item.alamat?.startsWith('http');
    const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSimpanEdit = async () => {
        if (!form.nama.trim() || !form.no_hp.trim()) return;
        setUpdating(true);
        try {
            await updateDoc(doc(db, 'pickups', item.id), {
                nama: form.nama.trim(), no_hp: form.no_hp.trim(),
                alamat: form.alamat.trim(), catatan: form.catatan.trim(),
            });
            setEditMode(false);
        } finally { setUpdating(false); }
    };

    const handleToggleStatus = async () => {
        setUpdating(true);
        try {
            await updateDoc(doc(db, 'pickups', item.id), {
                status: isDone ? 'Dijadwalkan' : statusSelesai,
            });
            onClose();
        } catch { setUpdating(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Hapus ${isPickup ? 'pickup' : 'delivery'} "${item.nama}"?`)) return;
        setDeleting(true);
        try { await deleteDoc(doc(db, 'pickups', item.id)); onClose(); }
        catch { setDeleting(false); }
    };

    const handleBukaWA = () => {
        const nomor = item.no_hp.replace(/[^0-9]/g, '').replace(/^0/, '62');
        const pesan = isPickup
            ? `Halo ${item.nama}, kami dari Carpetology akan segera menjemput karpet/laundry Anda. Terima kasih!`
            : `Halo ${item.nama}, kami dari Carpetology akan segera mengantarkan karpet/laundry Anda. Terima kasih!`;
        window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`, '_blank');
    };

    return (
        <div style={Mo.overlay} onClick={onClose}>
            <div style={Mo.sheet} onClick={e => e.stopPropagation()}>
                <div style={Mo.handle} />

                {/* Tipe badge */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 700,
                        background: isPickup ? '#e0fafa' : '#ede9fe',
                        color: accentColor,
                        padding: '4px 12px', borderRadius: 20,
                        border: `1px solid ${isPickup ? '#99f6e4' : '#ddd6fe'}`,
                    }}>
                        {isPickup ? <Truck size={11} /> : <PackageCheck size={11} />}
                        {isPickup ? 'Pickup' : 'Delivery'}
                    </span>
                </div>

                <div style={Mo.header}>
                    <div style={{ ...Mo.iconWrap, background: isDone ? '#dcfce7' : isPickup ? '#e0fafa' : '#ede9fe' }}>
                        {isDone
                            ? <CheckCircle2 size={18} color="#15803d" />
                            : isPickup
                                ? <Truck size={18} color={accentColor} />
                                : <PackageCheck size={18} color={accentColor} />
                        }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={Mo.title}>{item.nama}</div>
                        <div style={{ ...Mo.sub, color: isDone ? '#15803d' : '#f59e0b', fontWeight: 700 }}>
                            {item.status}
                        </div>
                    </div>
                    <button onClick={onClose} style={Mo.closeBtn} aria-label="Tutup">
                        <X size={15} color="#64748b" />
                    </button>
                </div>

                {/* Edit mode — hanya admin/cs */}
                {editMode && canEdit ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
                        <FormField icon={<User size={13} color="#94a3b8" />} label="Nama pelanggan">
                            <input value={form.nama} onChange={set('nama')} style={Mo.input} />
                        </FormField>
                        <FormField icon={<Phone size={13} color="#94a3b8" />} label="Nomor HP">
                            <input value={form.no_hp} onChange={set('no_hp')} style={Mo.input} type="tel" />
                        </FormField>
                        <FormField icon={<MapPin size={13} color="#94a3b8" />} label={isPickup ? 'Lokasi / Share link Maps' : 'Alamat pengiriman / Share link Maps'}>
                            <textarea value={form.alamat} onChange={set('alamat')}
                                style={{ ...Mo.input, minHeight: 64, resize: 'vertical' }} />
                        </FormField>
                        <FormField icon={<FileText size={13} color="#94a3b8" />} label="Catatan item">
                            <input value={form.catatan} onChange={set('catatan')} style={Mo.input} />
                        </FormField>
                        <button onClick={handleSimpanEdit} disabled={updating}
                            style={{
                                ...Mo.ctaBtn,
                                background: isPickup
                                    ? 'linear-gradient(135deg,#04CDCD,#028585)'
                                    : 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                                opacity: updating ? 0.7 : 1, marginTop: 0,
                            }}>
                            {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                        <button onClick={() => setEditMode(false)} style={Mo.cancelBtn}>Batal</button>
                    </div>
                ) : (
                    <>
                        {/* Detail info */}
                        <div style={Mo.detailBox}>
                            <div style={Mo.detailRow}>
                                <Phone size={14} color={accentColor} style={{ flexShrink: 0, marginTop: 1 }} />
                                <div>
                                    <div style={Mo.detailLabel}>Nomor HP</div>
                                    <div style={Mo.detailVal}>{item.no_hp}</div>
                                </div>
                            </div>
                            {item.alamat && (
                                <div style={Mo.detailRow}>
                                    <MapPin size={14} color={accentColor} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <div>
                                        <div style={Mo.detailLabel}>{isPickup ? 'Lokasi Penjemputan' : 'Alamat Pengiriman'}</div>
                                        {isMapLink
                                            ? <a href={item.alamat} target="_blank" rel="noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    ...Mo.mapsBtn,
                                                    background: isPickup ? '#e0fafa' : '#ede9fe',
                                                    color: isPickup ? '#028585' : '#7c3aed',
                                                    border: `1px solid ${isPickup ? '#99f6e4' : '#ddd6fe'}`,
                                                }}>
                                                <MapPin size={11} color={accentColor} /> Buka Google Maps
                                            </a>
                                            : <div style={Mo.detailVal}>{item.alamat}</div>
                                        }
                                    </div>
                                </div>
                            )}
                            {item.catatan && (
                                <div style={Mo.detailRow}>
                                    <FileText size={14} color={accentColor} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <div>
                                        <div style={Mo.detailLabel}>Catatan item</div>
                                        <div style={Mo.detailVal}>{item.catatan}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Toggle status — semua role */}
                        <button onClick={handleToggleStatus} disabled={updating} style={{
                            ...Mo.ctaBtn,
                            background: isDone
                                ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                                : 'linear-gradient(135deg,#22c55e,#15803d)',
                            opacity: updating ? 0.7 : 1,
                        }}>
                            {isDone ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
                            {updating
                                ? 'Memperbarui...'
                                : isDone
                                    ? `Tandai Belum ${isPickup ? 'Dijemput' : 'Diantar'}`
                                    : `Tandai Sudah ${isPickup ? 'Dijemput' : 'Diantar'}`
                            }
                        </button>

                        {/* Hubungi WA — semua role */}
                        <button onClick={handleBukaWA} style={Mo.waBtn}>
                            <Phone size={14} color="#15803d" /> Hubungi via WA
                        </button>

                        {/* Edit & Hapus — hanya admin/cs */}
                        {canEdit && (
                            <div style={Mo.actionRow}>
                                <button onClick={() => setEditMode(true)} style={Mo.editBtn}>
                                    <Edit2 size={14} color={accentColor} /> Edit
                                </button>
                                <button onClick={handleDelete} disabled={deleting}
                                    style={{ ...Mo.deleteBtn, opacity: deleting ? 0.7 : 1 }}>
                                    <Trash2 size={14} color="#dc2626" />
                                    {deleting ? 'Menghapus...' : 'Hapus'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
    },

    // Header
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
    headerSub: { fontSize: 10, color: '#04CDCD', fontWeight: 600, marginTop: 1 },
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
        padding: '10px 16px 0', maxWidth: 500, margin: '0 auto',
        gap: 4,
    },
    statPill: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
    statNum: { fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1 },
    statLbl: { fontSize: 9, color: '#5a7c87', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 },
    statDivider: { width: 1, height: 28, background: 'rgba(255,255,255,0.1)', flexShrink: 0 },

    // Tab switcher
    tabRow: {
        display: 'flex', gap: 8,
        padding: '12px 16px 14px', maxWidth: 500, margin: '0 auto',
    },
    tabBtn: {
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 12px', borderRadius: 10,
        fontSize: 13, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'all .2s',
    },
    tabBadge: {
        fontSize: 10, fontWeight: 800, color: '#fff',
        minWidth: 16, height: 16, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 4px',
    },

    // Week strip
    weekWrap: {
        background: '#fff',
        borderBottom: '1px solid #e8edf3',
        padding: '12px 0 8px',
        position: 'sticky', top: 0, zIndex: 10,
    },
    weekNav: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', marginBottom: 10, maxWidth: 500, margin: '0 auto 10px',
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
    legendRow: {
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 16px 0', maxWidth: 500, margin: '0 auto',
        borderTop: '1px solid #f1f5f9', flexWrap: 'wrap',
    },
    legendDot: {
        width: 8, height: 8, borderRadius: 2,
        border: '1.5px solid #04CDCD', flexShrink: 0,
    },
    legendText: { fontSize: 10, color: '#94a3b8', fontWeight: 500 },

    // Content
    content: { maxWidth: 500, margin: '0 auto', padding: '16px 14px 0' },
    dateLabelRow: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
    },
    dateLabel: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
    rutinBadge: {
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, padding: '3px 9px',
        borderRadius: 20,
    },

    // Progress
    progressCard: {
        background: '#fff', borderRadius: 14,
        padding: '13px 14px', marginBottom: 10,
        border: '1px solid #e8edf3',
    },
    progressTop: {
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 8,
    },
    progressLabel: { fontSize: 11, fontWeight: 600, color: '#64748b' },
    progressCount: { fontSize: 12, fontWeight: 800 },
    progressTrack: {
        height: 5, background: '#f1f5f9',
        borderRadius: 99, overflow: 'hidden',
    },
    progressFill: {
        height: '100%', borderRadius: 99,
        transition: 'width .5s ease',
    },
    allDoneRow: {
        display: 'flex', alignItems: 'center', gap: 5,
        marginTop: 8,
    },

    // WA button
    waBtn: {
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 14px', background: '#fff', color: '#1e293b',
        border: '1px solid #e8edf3', borderRadius: 14,
        fontFamily: 'inherit', boxSizing: 'border-box',
        marginBottom: 12, cursor: 'pointer',
    },
    waBtnIcon: {
        width: 36, height: 36, borderRadius: 10,
        background: '#e0fafa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    waBtnTitle: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
    waBtnSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },

    // Hint
    hintBox: {
        display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 11, color: '#64748b', fontWeight: 600,
        marginBottom: 12, padding: '9px 12px',
        background: '#f0fdf4', borderRadius: 10,
        border: '1px solid #bbf7d0',
    },

    // Card
    card: {
        background: '#fff', borderRadius: 14, padding: '13px 13px',
        border: '1px solid #e8edf3',
        transition: 'background .2s, border-color .2s, opacity .2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        position: 'relative', overflow: 'hidden',
    },
    checkBtn: {
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all .2s', border: 'none',
    },
    custName: {
        fontSize: 14, fontWeight: 700,
        transition: 'color .2s, text-decoration .2s',
    },
    donePill: {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, color: '#15803d',
        background: '#dcfce7', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
    },
    pendingPill: {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, color: '#b45309',
        background: '#fef3c7', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
    },
    chip: {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, fontWeight: 500, color: '#64748b',
        background: '#f1f5f9', border: '1px solid #e2e8f0',
        padding: '3px 8px', borderRadius: 20, maxWidth: '100%', overflow: 'hidden',
    },

    // Empty
    emptyWrap: {
        textAlign: 'center', padding: '48px 20px',
        background: '#fff', borderRadius: 16,
        border: '1.5px dashed #e2e8f0',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
    },
    emptyIcon: {
        width: 56, height: 56, borderRadius: 16,
        background: '#f8fafc', border: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: { fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 },
    emptySub: { fontSize: 13, color: '#94a3b8' },

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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 18px rgba(4,205,205,0.35)',
        border: 'none', cursor: 'pointer', zIndex: 100,
    },
};

const Mo = {
    overlay: {
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center',
    },
    sheet: {
        backgroundColor: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: '10px 18px 40px',
        width: '100%', maxWidth: 500,
        maxHeight: '90vh', overflowY: 'auto',
        animation: 'slideUp 0.25s ease',
    },
    handle: {
        width: 36, height: 4,
        background: '#e2e8f0', borderRadius: 10,
        margin: '0 auto 18px',
    },
    header: {
        display: 'flex', alignItems: 'center',
        gap: 12, marginBottom: 18,
    },
    iconWrap: {
        width: 42, height: 42,
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    title: { fontSize: 16, fontWeight: 800, color: '#0f172a' },
    sub: { fontSize: 12, color: '#64748b', marginTop: 2 },
    closeBtn: {
        background: '#f1f5f9', border: 'none',
        borderRadius: '50%', width: 30, height: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', marginLeft: 'auto', flexShrink: 0, padding: 0,
    },
    fieldLabel: {
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 700, color: '#475569',
        marginBottom: 6,
    },
    input: {
        width: '100%', padding: '11px 13px',
        border: '1.5px solid #e2e8f0', borderRadius: 10,
        fontSize: 14, fontFamily: 'inherit',
        outline: 'none', color: '#0f172a',
        boxSizing: 'border-box', background: '#f8fafc',
    },
    errorBox: {
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#fee2e2', borderRadius: 10,
        padding: '10px 13px', marginBottom: 14,
        fontSize: 13, color: '#ef4444', fontWeight: 600,
    },
    ctaBtn: {
        width: '100%', padding: '14px',
        color: '#fff', border: 'none', borderRadius: 14,
        fontSize: 15, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
        marginTop: 14, display: 'flex',
        alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    waBtn: {
        width: '100%', padding: '13px',
        background: '#f0fdf4', color: '#15803d',
        border: '1.5px solid #bbf7d0', borderRadius: 14,
        fontSize: 14, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginTop: 8,
    },
    detailBox: {
        background: '#f8fafc', borderRadius: 12,
        padding: '13px 15px', marginBottom: 14,
        display: 'flex', flexDirection: 'column', gap: 12,
        border: '1px solid #e8edf3',
    },
    detailRow: { display: 'flex', gap: 10, alignItems: 'flex-start' },
    detailLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 },
    detailVal: { fontSize: 13, color: '#0f172a', fontWeight: 600, wordBreak: 'break-word' },
    mapsBtn: {
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 12, fontWeight: 700,
        padding: '5px 11px', borderRadius: 20,
        textDecoration: 'none',
    },
    actionRow: {
        borderTop: '1px solid #f1f5f9', paddingTop: 12,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, marginTop: 8,
    },
    editBtn: {
        padding: '11px 8px', borderRadius: 10,
        border: '1px solid #e2e8f0', background: '#f0fdfc',
        fontSize: 13, fontWeight: 600, color: '#0f172a',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    deleteBtn: {
        padding: '11px 8px', borderRadius: 10,
        border: '1px solid #fca5a5', background: '#fff5f5',
        fontSize: 13, fontWeight: 600, color: '#dc2626',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    },
    cancelBtn: {
        width: '100%', padding: '12px 16px',
        border: '1px solid #e2e8f0', borderRadius: 10,
        background: '#f8fafc', fontSize: 14,
        fontWeight: 500, color: '#64748b',
        cursor: 'pointer', marginTop: 4,
    },
};