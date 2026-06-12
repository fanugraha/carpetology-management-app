import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft, ChevronRight, ArrowLeft, MessageCircle,
    Sun, Sunrise, Ban, CalendarDays, CheckCircle2,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function toKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DayCell({ day, current, col, viewYear, viewMonth, selected, today, onSelect, dbBookings, isPast }) {
    const isSunday = col === 6;
    const key = current ? toKey(viewYear, viewMonth, day) : null;
    const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());
    const isToday = key === todayKey;
    const isSelected = key === selected;

    const getStatus = (k) => {
        if (isSunday || !k) return "libur";
        const d = dbBookings[k];
        if (!d) return "kosong";
        const filled = [d.sesi1, d.sesi2].filter(Boolean).length;
        if (filled === 2) return "penuh";
        if (filled === 1) return "sebagian";
        return "kosong";
    };

    const status = key ? getStatus(key) : "outside";
    const clickable = current && !isSunday && !isPast;

    const getDotColor = () => {
        if (status === "penuh") return "#E24B4A";
        if (status === "sebagian") return "#EF9F27";
        return "transparent";
    };

    const cellStyle = {
        ...S.dayCell,
        ...(isSelected ? S.dayCellSelected : {}),
        ...(isToday && !isSelected ? S.dayCellToday : {}),
        ...(!current ? S.dayCellOutside : {}),
        ...((isPast || isSunday) && current ? S.dayCellDisabled : {}),
        cursor: clickable ? "pointer" : "default",
    };

    const numStyle = {
        ...S.dayNum,
        ...(isSelected ? { color: "#fff" } : {}),
        ...(!current || isSunday || isPast ? { color: "#c8d0d8" } : {}),
        ...(isToday && !isSelected ? { color: "#1D9E75", fontWeight: 700 } : {}),
    };

    return (
        <button
            style={cellStyle}
            disabled={!clickable}
            onClick={() => clickable && onSelect(isSelected ? null : key)}
        >
            <span style={numStyle}>{day}</span>
            {current && !isSunday && !isPast && (
                <div style={{
                    ...S.dayDot,
                    backgroundColor: getDotColor(),
                    opacity: isSelected ? 0.7 : 1,
                }} />
            )}
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BookingHomeVisit() {
    const today = new Date();
    const navigate = useNavigate();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selected, setSelected] = useState(null);
    const [dbBookings, setDbBookings] = useState({});

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
            const grouped = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                const key = data.tanggal;
                if (!grouped[key]) grouped[key] = { sesi1: null, sesi2: null };
                if (data.sesi === 1) grouped[key].sesi1 = data;
                if (data.sesi === 2) grouped[key].sesi2 = data;
            });
            setDbBookings(grouped);
        });
        return () => unsubscribe();
    }, []);

    const cells = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const prevDays = new Date(viewYear, viewMonth, 0).getDate();
        const grid = [];
        for (let i = offset - 1; i >= 0; i--)
            grid.push({ day: prevDays - i, current: false, col: grid.length % 7 });
        for (let d = 1; d <= daysInMonth; d++)
            grid.push({ day: d, current: true, col: grid.length % 7 });
        while (grid.length % 7 !== 0)
            grid.push({ day: grid.length - daysInMonth - offset + 1, current: false, col: grid.length % 7 });
        return grid;
    }, [viewYear, viewMonth]);

    const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
        setSelected(null);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
        setSelected(null);
    }

    const selectedData = selected ? dbBookings[selected] : null;
    const selectedDateObj = selected ? new Date(selected + "T00:00:00") : null;
    const isSundaySelected = selectedDateObj?.getDay() === 0;

    const selectedLabel = selectedDateObj
        ? selectedDateObj.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })
        : null;

    const SESI = [
        { key: "sesi1", label: "Sesi 1", time: "09.00 – 11.00 WIB", icon: <Sunrise size={18} color="#f59e0b" /> },
        { key: "sesi2", label: "Sesi 2", time: "13.00 – 15.00 WIB", icon: <Sun size={18} color="#0ea5e9" /> },
    ];

    const waLink = selected
        ? `https://wa.me/6282151154727?text=Halo Admin, saya ingin booking Home Service:%0ATanggal: ${selectedLabel}`
        : "https://wa.me/6282151154727";

    return (
        <div style={S.page}>
            {/* ── Header ── */}
            <div style={S.header}>
                <div style={S.headerInner}>
                    <button onClick={() => navigate("/")} style={S.backBtn}>
                        <ArrowLeft size={14} /> Kembali
                    </button>
                    <div>
                        <div style={S.headerTitle}>Jadwal Home Service</div>
                        <div style={S.headerSub}>Sofa &amp; Springbed — cuci di tempat</div>
                    </div>
                </div>
            </div>

            <div style={S.body}>
                {/* ── Calendar Card ── */}
                <div style={S.calCard}>
                    {/* Month nav */}
                    <div style={S.calNav}>
                        <button style={S.navBtn} onClick={prevMonth}>
                            <ChevronLeft size={18} color="#475569" />
                        </button>
                        <span style={S.calTitle}>{MONTHS[viewMonth].toUpperCase()} {viewYear}</span>
                        <button style={S.navBtn} onClick={nextMonth}>
                            <ChevronRight size={18} color="#475569" />
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div style={S.weekdayRow}>
                        {WEEKDAYS.map((wd, i) => (
                            <div key={wd} style={{ ...S.weekdayLabel, color: i === 6 ? "#d1d5db" : undefined }}>
                                {wd}
                            </div>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div style={S.calGrid}>
                        {cells.map((cell, idx) => {
                            const key = cell.current ? toKey(viewYear, viewMonth, cell.day) : null;
                            const isPast = key ? key < todayKey : false;
                            return (
                                <DayCell
                                    key={idx}
                                    {...cell}
                                    viewYear={viewYear}
                                    viewMonth={viewMonth}
                                    selected={selected}
                                    today={today}
                                    onSelect={setSelected}
                                    dbBookings={dbBookings}
                                    isPast={isPast}
                                />
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div style={S.legendRow}>
                        <LegendItem color="#EF9F27" label="1 sesi terisi" />
                        <LegendItem color="#E24B4A" label="Penuh" />
                        <LegendItem color="#c8d0d8" label="Libur" />
                    </div>
                </div>

                {/* ── Detail Panel ── */}
                <div style={S.detailPanel}>
                    {!selected ? (
                        <div style={S.emptyState}>
                            <CalendarDays size={32} color="#cbd5e1" style={{ marginBottom: 10 }} />
                            <div style={S.emptyTitle}>Pilih tanggal di atas</div>
                            <div style={S.emptySub}>untuk melihat detail booking</div>
                        </div>
                    ) : isSundaySelected ? (
                        <div style={S.emptyState}>
                            <Ban size={32} color="#fca5a5" style={{ marginBottom: 10 }} />
                            <div style={S.emptyTitle}>Hari Minggu libur</div>
                            <div style={S.emptySub}>Pilih hari lain untuk booking</div>
                        </div>
                    ) : (
                        <>
                            <div style={S.detailDate}>{selectedLabel}</div>
                            {SESI.map(({ key, label, time, icon }) => {
                                const booking = selectedData?.[key];
                                return (
                                    <div key={key} style={S.sesiCard}>
                                        <div style={S.sesiLeft}>
                                            <div style={S.sesiIconWrap}>{icon}</div>
                                            <div>
                                                <div style={S.sesiLabel}>{label}</div>
                                                <div style={S.sesiTime}>{time}</div>
                                            </div>
                                        </div>
                                        <div style={{
                                            ...S.sesiBadge,
                                            ...(booking ? S.sesiBadgeBooked : S.sesiBadgeAvail),
                                        }}>
                                            {!booking && <CheckCircle2 size={11} />}
                                            {booking ? "Terpesan" : "Tersedia"}
                                        </div>
                                    </div>
                                );
                            })}

                            <a href={waLink} target="_blank" rel="noreferrer" style={S.ctaBtn}>
                                <MessageCircle size={15} /> Hubungi Admin untuk Booking
                            </a>
                        </>
                    )}
                </div>
            </div>

            {/* ── FAB WA ── */}
            <a href="https://wa.me/6282151154727" target="_blank" rel="noreferrer" style={S.fab}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.67-1.613-.916-2.207-.242-.579-.487-.5-.67-.509-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.996c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.005 0C5.37 0 .002 5.368.002 12.006c0 2.094.547 4.136 1.587 5.932L0 24l6.33-1.662a11.785 11.785 0 005.675 1.444h.005c6.634 0 12.002-5.368 12.002-12.006 0-3.21-1.25-6.233-3.522-8.504" />
                </svg>
            </a>
        </div>
    );
}

function LegendItem({ color, label }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{label}</span>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
    page: {
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 80,
    },
    header: {
        background: "linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)",
        padding: "20px 20px 28px",
    },
    headerInner: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        maxWidth: 500,
        margin: "0 auto",
    },
    backBtn: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#a0b8c0",
        padding: "7px 12px",
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 800,
        color: "#fff",
    },
    headerSub: {
        fontSize: 11,
        color: "#6B8894",
        marginTop: 2,
    },
    body: {
        maxWidth: 500,
        margin: "0 auto",
        padding: "16px 16px 0",
    },
    calCard: {
        background: "#fff",
        borderRadius: 16,
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #f1f5f9",
        marginBottom: 14,
    },
    calNav: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    navBtn: {
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        width: 32,
        height: 32,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
    },
    calTitle: {
        fontSize: 13,
        fontWeight: 800,
        color: "#1e293b",
        letterSpacing: "0.5px",
    },
    weekdayRow: {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        marginBottom: 6,
    },
    weekdayLabel: {
        textAlign: "center",
        fontSize: 10,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.4px",
        padding: "4px 0",
    },
    calGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 3,
    },
    dayCell: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "7px 2px 5px",
        borderRadius: 8,
        border: "none",
        background: "none",
        fontFamily: "inherit",
        gap: 3,
        minHeight: 42,
    },
    dayCellSelected: {
        background: "#1D9E75",
        borderRadius: 8,
    },
    dayCellToday: {
        background: "#E1F5EE",
    },
    dayCellOutside: {
        opacity: 0,
        pointerEvents: "none",
    },
    dayCellDisabled: {
        opacity: 0.35,
    },
    dayNum: {
        fontSize: 13,
        fontWeight: 600,
        color: "#1e293b",
        lineHeight: 1,
    },
    dayDot: {
        width: 5,
        height: 5,
        borderRadius: "50%",
    },
    legendRow: {
        display: "flex",
        gap: 16,
        marginTop: 14,
        paddingTop: 12,
        borderTop: "1px solid #f1f5f9",
        flexWrap: "wrap",
    },
    detailPanel: {
        background: "#fff",
        borderRadius: 16,
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #f1f5f9",
        minHeight: 160,
    },
    emptyState: {
        textAlign: "center",
        padding: "24px 20px",
        color: "#94a3b8",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: 700,
        color: "#1e293b",
        marginBottom: 4,
    },
    emptySub: {
        fontSize: 12,
        color: "#94a3b8",
    },
    detailDate: {
        fontSize: 14,
        fontWeight: 800,
        color: "#1e293b",
        marginBottom: 14,
        textTransform: "capitalize",
    },
    sesiCard: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px",
        borderRadius: 12,
        background: "#f8fafc",
        marginBottom: 10,
        gap: 10,
    },
    sesiLeft: {
        display: "flex",
        alignItems: "center",
        gap: 10,
    },
    sesiIconWrap: {
        width: 36,
        height: 36,
        background: "#fff",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #e2e8f0",
        flexShrink: 0,
    },
    sesiLabel: {
        fontSize: 13,
        fontWeight: 700,
        color: "#1e293b",
    },
    sesiTime: {
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 1,
    },
    sesiBadge: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "5px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    sesiBadgeAvail: {
        background: "#dcfce7",
        color: "#15803d",
    },
    sesiBadgeBooked: {
        background: "#f1f5f9",
        color: "#94a3b8",
    },
    ctaBtn: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "12px",
        borderRadius: 12,
        background: "#04CDCD",
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        textDecoration: "none",
        marginTop: 4,
        fontFamily: "inherit",
    },
    fab: {
        position: "fixed",
        bottom: 24,
        right: 20,
        backgroundColor: "#25D366",
        width: 52,
        height: 52,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 16px rgba(37,211,102,0.4)",
        zIndex: 100,
        textDecoration: "none",
    },
};