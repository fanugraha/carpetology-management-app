import React, { useState, useEffect, useMemo, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
    ChevronLeft, ChevronRight, ArrowLeft, MessageCircle,
    Sun, Sunrise, Ban, CalendarDays, CheckCircle2,
    MapPin, Star, ChevronDown, ChevronUp, Share2,
    ShieldCheck, Wrench, Leaf, ThumbsUp,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const STEPS = [
    { num: "1", label: "Pilih tanggal", sub: "Cek slot tersedia di kalender" },
    { num: "2", label: "Chat admin", sub: "Hubungi via WhatsApp" },
    { num: "3", label: "Bayar DP", sub: "Booking dikonfirmasi setelah DP" },
];

const TRUST_BADGES = [
    { icon: <ShieldCheck size={14} color="#1D9E75" />, label: "1.000+ Pelanggan" },
    { icon: <Wrench size={14} color="#1D9E75" />, label: "Alat Profesional" },
    { icon: <Leaf size={14} color="#1D9E75" />, label: "Produk Aman" },
    { icon: <ThumbsUp size={14} color="#1D9E75" />, label: "Garansi Puas" },
];

const FAQS = [
    { q: "Berapa lama pengerjaan di rumah?", a: "Durasi tergantung jumlah item yang dicuci. Tim kami akan estimasikan saat konfirmasi booking via WhatsApp." },
    { q: "Apa yang perlu saya siapkan?", a: "Cukup pastikan ada akses listrik dan air di lokasi. Semua peralatan dan bahan pembersih dibawa oleh tim kami." },
    { q: "Bagaimana jika cuaca hujan?", a: "Kami menggunakan mesin pengering sehingga proses tidak bergantung pada cuaca. Jadwal tetap berjalan normal." },
    { q: "Apakah bisa request waktu spesifik?", a: "Tersedia 2 sesi: Sesi 1 pukul 09.00–11.00 dan Sesi 2 pukul 13.00–15.00 WIB. Pilih sesuai ketersediaan di kalender." },
    { q: "Berapa besar DP yang harus dibayar?", a: "Nominal DP akan diinformasikan admin saat konfirmasi. Pembayaran bisa via transfer bank atau dompet digital." },
];

const TESTIMONI = [
    { nama: "Rina S.", kota: "Sleman", bintang: 5, teks: "Sofa bersih banget, tim ramah dan rapi. Recommended!" },
    { nama: "Dwi P.", kota: "Bantul", bintang: 5, teks: "Springbed kayak baru lagi, prosesnya cepat dan bersih." },
    { nama: "Hendra K.", kota: "Kota Yogya", bintang: 5, teks: "Sudah 2x pakai, hasilnya selalu memuaskan. Pasti balik lagi." },
];

const LAYANAN_OPTIONS = ["Sofa", "Springbed", "Sofa & Springbed"];

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

    // Past dates: lebih jelas dengan warna berbeda, bukan hanya opacity
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
        // Past & sunday: warna lebih kontras (bukan sekadar opacity)
        ...((isPast || isSunday) && current ? { color: "#d1d5db" } : {}),
        ...(isToday && !isSelected ? { color: "#1D9E75", fontWeight: 700 } : {}),
    };

    return (
        <button
            style={cellStyle}
            disabled={!clickable}
            onClick={() => clickable && onSelect(isSelected ? null : key)}
            aria-label={key}
        >
            <span style={numStyle}>{day}</span>
            {current && !isSunday && !isPast && getDotColor() !== "transparent" && (
                <div style={{ ...S.dayDot, backgroundColor: getDotColor(), opacity: isSelected ? 0.7 : 1 }} />
            )}
        </button>
    );
}

function StarRow({ count }) {
    return (
        <div style={{ display: "flex", gap: 2 }}>
            {Array.from({ length: count }).map((_, i) => (
                <Star key={i} size={11} fill="#EF9F27" color="#EF9F27" />
            ))}
        </div>
    );
}

function FaqItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={S.faqItem}>
            <button style={S.faqQ} onClick={() => setOpen(v => !v)}>
                <span style={S.faqQText}>{q}</span>
                {open
                    ? <ChevronUp size={15} color="#94a3b8" style={{ flexShrink: 0 }} />
                    : <ChevronDown size={15} color="#94a3b8" style={{ flexShrink: 0 }} />
                }
            </button>
            {open && <div style={S.faqA}>{a}</div>}
        </div>
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
    const [showArea, setShowArea] = useState(false);
    // Default chip: "Sofa & Springbed"
    const [selectedLayanan, setSelectedLayanan] = useState("Sofa & Springbed");
    const [shareMsg, setShareMsg] = useState("");
    const detailRef = useRef(null);

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

    // Auto-scroll ke detail panel saat tanggal dipilih
    const handleSelectDate = (key) => {
        setSelected(key);
        if (key && detailRef.current) {
            setTimeout(() => {
                detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 80);
        }
    };

    const selectedData = selected ? dbBookings[selected] : null;
    const selectedDateObj = selected ? new Date(selected + "T00:00:00") : null;
    const isSundaySelected = selectedDateObj?.getDay() === 0;
    const isFullyBooked = selectedData
        ? [selectedData.sesi1, selectedData.sesi2].every(Boolean)
        : false;

    const selectedLabel = selectedDateObj
        ? selectedDateObj.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })
        : null;

    const SESI = [
        { key: "sesi1", label: "Sesi 1", time: "09.00 – 11.00 WIB", icon: <Sunrise size={18} color="#f59e0b" /> },
        { key: "sesi2", label: "Sesi 2", time: "13.00 – 15.00 WIB", icon: <Sun size={18} color="#0ea5e9" /> },
    ];

    // Pre-fill WA lebih personal dan lengkap
    const buildWaMessage = () => {
        if (!selected) return "https://wa.me/6282151154727";
        const availableSesi = SESI
            .filter(s => !selectedData?.[s.key])
            .map(s => s.label)
            .join(" atau ");
        const sesiText = availableSesi ? `%0ASesi yang diinginkan: ${availableSesi}` : "";
        const layananText = `%0ALayanan: ${selectedLayanan}`;
        const msg = `Halo Kak, saya tertarik booking Home Service 😊%0A%0ATanggal: ${selectedLabel}${sesiText}${layananText}%0A%0AMohon info lebih lanjutnya ya Kak, terima kasih!`;
        return `https://wa.me/6282151154727?text=${msg}`;
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try { await navigator.share({ title: "Jadwal Home Service", text: "Cek jadwal cuci sofa & springbed di sini!", url }); }
            catch (_) {}
        } else {
            await navigator.clipboard.writeText(url);
            setShareMsg("Link disalin!");
            setTimeout(() => setShareMsg(""), 2000);
        }
    };

    const waLink = buildWaMessage();
    const showFab = !selected;

    return (
        <div style={S.page}>
            {/* ── Header ── */}
            <div style={S.header}>
                <div style={S.headerInner}>
                    <button onClick={() => navigate("/")} style={S.backBtn}>
                        <ArrowLeft size={14} /> Kembali
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={S.headerTitle}>Jadwal Home Service</div>
                        <div style={S.headerSub}>Sofa &amp; Springbed — cuci di tempat</div>
                    </div>
                    <button style={S.shareBtn} onClick={handleShare} title="Bagikan halaman">
                        <Share2 size={14} color="#a0b8c0" />
                        {shareMsg && <span style={{ fontSize: 10, color: "#04CDCD" }}>{shareMsg}</span>}
                    </button>
                </div>

                <div style={{ ...S.headerInner, marginBottom: 0 }}>
                    <button style={S.areaPill} onClick={() => setShowArea(v => !v)}>
                        <MapPin size={12} color="#04CDCD" />
                        <span>Yogyakarta &amp; sekitarnya</span>
                        {showArea ? <ChevronUp size={12} color="#6B8894" /> : <ChevronDown size={12} color="#6B8894" />}
                    </button>
                </div>
                {showArea && (
                    <div style={S.areaBox}>
                        <div style={S.areaBoxInner}>
                            {["Kota Yogyakarta", "Sleman", "Bantul", "Kulon Progo", "Gunung Kidul"].map(a => (
                                <span key={a} style={S.areaChip}>{a}</span>
                            ))}
                        </div>
                        <div style={S.areaNote}>Tidak yakin areamu terjangkau? Tanya admin via WA.</div>
                    </div>
                )}
            </div>

            <div style={S.body}>

                {/* ── Trust Badges — horizontal scroll, compact ── */}
                <div style={S.trustScroll}>
                    {TRUST_BADGES.map((b, i) => (
                        <div key={i} style={S.trustPill}>
                            <div style={S.trustPillIcon}>{b.icon}</div>
                            <span style={S.trustPillLabel}>{b.label}</span>
                        </div>
                    ))}
                </div>

                {/* ── Cara Booking Steps ── */}
                <div style={S.sectionWrap}>
                    <div style={S.sectionLabel}>Cara booking</div>
                    <div style={S.stepsCard}>
                        <div style={S.stepsRow}>
                            {STEPS.map((s, i) => (
                                <React.Fragment key={s.num}>
                                    <div style={S.stepItem}>
                                        <div style={S.stepNum}>{s.num}</div>
                                        <div style={S.stepLabel}>{s.label}</div>
                                        <div style={S.stepSub}>{s.sub}</div>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div style={S.stepDivider}>
                                            <div style={S.stepDividerLine} />
                                            <ChevronRight size={12} color="#cbd5e1" />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Calendar Card ── */}
                <div style={S.sectionWrap}>
                    <div style={S.sectionLabel}>Pilih tanggal</div>
                    <div style={S.calCard}>
                        <div style={S.calNav}>
                            <button style={S.navBtn} onClick={prevMonth}>
                                <ChevronLeft size={18} color="#475569" />
                            </button>
                            <span style={S.calTitle}>{MONTHS[viewMonth].toUpperCase()} {viewYear}</span>
                            <button style={S.navBtn} onClick={nextMonth}>
                                <ChevronRight size={18} color="#475569" />
                            </button>
                        </div>
                        <div style={S.weekdayRow}>
                            {WEEKDAYS.map((wd, i) => (
                                <div key={wd} style={{ ...S.weekdayLabel, color: i === 6 ? "#e2e8f0" : undefined }}>
                                    {wd}
                                </div>
                            ))}
                        </div>
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
                                        onSelect={handleSelectDate}
                                        dbBookings={dbBookings}
                                        isPast={isPast}
                                    />
                                );
                            })}
                        </div>
                        {/* Legend — langsung di bawah grid, sebelum detail */}
                        <div style={S.legendRow}>
                            <LegendItem color="#EF9F27" label="1 sesi terisi" />
                            <LegendItem color="#E24B4A" label="Penuh" />
                            <LegendItem color="#e2e8f0" label="Tidak tersedia" />
                        </div>
                    </div>
                </div>

                {/* ── Detail Panel ── */}
                <div ref={detailRef} style={S.sectionWrap}>
                    <div style={S.sectionLabel}>Detail sesi</div>
                    <div style={S.detailPanel}>
                        {!selected ? (
                            <div style={S.emptyState}>
                                <CalendarDays size={32} color="#cbd5e1" style={{ marginBottom: 10 }} />
                                <div style={S.emptyTitle}>Pilih tanggal di atas</div>
                                <div style={S.emptySub}>untuk melihat ketersediaan sesi</div>
                            </div>
                        ) : isSundaySelected ? (
                            <div style={S.emptyState}>
                                <Ban size={32} color="#fca5a5" style={{ marginBottom: 10 }} />
                                <div style={S.emptyTitle}>Hari Minggu libur</div>
                                <div style={S.emptySub}>Pilih hari lain untuk booking</div>
                            </div>
                        ) : isFullyBooked ? (
                            <div style={S.fullBanner}>
                                <div style={S.fullBannerIcon}><Ban size={20} color="#A32D2D" /></div>
                                <div>
                                    <div style={S.fullBannerTitle}>Semua sesi terpesan</div>
                                    <div style={S.fullBannerSub}>Pilih tanggal lain yang masih tersedia.</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={S.detailDate}>{selectedLabel}</div>

                                {/* Chip layanan — default "Sofa & Springbed" */}
                                <div style={S.layananRow}>
                                    <div style={S.layananLabel}>Layanan:</div>
                                    <div style={S.layananChips}>
                                        {LAYANAN_OPTIONS.map(l => (
                                            <button
                                                key={l}
                                                style={{ ...S.layananChip, ...(selectedLayanan === l ? S.layananChipActive : {}) }}
                                                onClick={() => setSelectedLayanan(l)}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>

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
                                            <div style={{ ...S.sesiBadge, ...(booking ? S.sesiBadgeBooked : S.sesiBadgeAvail) }}>
                                                {!booking && <CheckCircle2 size={11} />}
                                                {booking ? "Terpesan" : "Tersedia"}
                                            </div>
                                        </div>
                                    );
                                })}

                                <a href={waLink} target="_blank" rel="noreferrer" style={S.ctaBtn}>
                                    <MessageCircle size={15} /> Hubungi Admin untuk Booking
                                </a>
                                <div style={S.responNote}>
                                    <CheckCircle2 size={11} color="#1D9E75" />
                                    Biasanya dibalas dalam 1 jam · Setiap hari kecuali Minggu
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ── FAQ ── */}
                <div style={S.sectionWrap}>
                    <div style={S.sectionLabel}>Pertanyaan umum</div>
                    <div style={S.faqCard}>
                        {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
                    </div>
                </div>

                {/* ── Testimoni ── */}
                <div style={S.sectionWrap}>
                    <div style={S.sectionLabel}>Yang mereka bilang</div>
                    {TESTIMONI.map((t, i) => (
                        <div key={i} style={S.testiCard}>
                            <div style={S.testiTop}>
                                <div style={S.testiAvatar}>{t.nama[0]}</div>
                                <div>
                                    <div style={S.testiNama}>{t.nama}</div>
                                    <div style={S.testiKota}>{t.kota}</div>
                                </div>
                                <div style={{ marginLeft: "auto" }}><StarRow count={t.bintang} /></div>
                            </div>
                            <div style={S.testiTeks}>"{t.teks}"</div>
                        </div>
                    ))}
                </div>

            </div>

            {/* ── FAB WA ── */}
            {showFab && (
                <a href="https://wa.me/6282151154727" target="_blank" rel="noreferrer" style={S.fab}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.67-1.613-.916-2.207-.242-.579-.487-.5-.67-.509-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.996c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.005 0C5.37 0 .002 5.368.002 12.006c0 2.094.547 4.136 1.587 5.932L0 24l6.33-1.662a11.785 11.785 0 005.675 1.444h.005c6.634 0 12.002-5.368 12.002-12.006 0-3.21-1.25-6.233-3.522-8.504" />
                    </svg>
                </a>
            )}
        </div>
    );
}

function LegendItem({ color, label }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: color }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{label}</span>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
    page: {
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 80,
    },
    header: {
        background: "linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)",
        padding: "20px 20px 16px",
    },
    headerInner: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        maxWidth: 500,
        margin: "0 auto",
        marginBottom: 10,
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
    headerTitle: { fontSize: 16, fontWeight: 800, color: "#fff" },
    headerSub: { fontSize: 11, color: "#6B8894", marginTop: 2 },
    shareBtn: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "7px 10px",
        cursor: "pointer",
        fontFamily: "inherit",
        flexShrink: 0,
    },
    areaPill: {
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(4,205,205,0.25)",
        borderRadius: 20,
        padding: "5px 12px",
        cursor: "pointer",
        fontFamily: "inherit",
        color: "#a0b8c0",
        fontSize: 11,
        fontWeight: 600,
    },
    areaBox: {
        maxWidth: 500,
        margin: "8px auto 0",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "12px 14px",
    },
    areaBoxInner: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 },
    areaChip: {
        background: "rgba(4,205,205,0.12)",
        border: "1px solid rgba(4,205,205,0.2)",
        color: "#04CDCD",
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 600,
    },
    areaNote: { fontSize: 11, color: "#6B8894" },
    body: { maxWidth: 500, margin: "0 auto", padding: "16px 16px 0" },

    // Section wrapper — spacing konsisten antar section
    sectionWrap: { marginBottom: 20 },
    sectionLabel: {
        fontSize: 10,
        fontWeight: 800,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        marginBottom: 8,
        paddingLeft: 2,
    },

    // Trust badges — horizontal pill row, tidak terpotong
    trustScroll: {
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 4,
        marginBottom: 20,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
    },
    trustPill: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: "7px 12px",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    trustPillIcon: {
        width: 22,
        height: 22,
        background: "#E1F5EE",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    trustPillLabel: { fontSize: 12, fontWeight: 700, color: "#1e293b" },

    // Steps
    stepsCard: {
        background: "#fff",
        borderRadius: 16,
        padding: "16px",
        border: "1px solid #e2e8f0",
    },
    stepsRow: { display: "flex", alignItems: "flex-start" },
    stepItem: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 4,
    },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#E1F5EE",
        color: "#1D9E75",
        fontSize: 12,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
        border: "2px solid #1D9E75",
    },
    stepLabel: { fontSize: 11, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 },
    stepSub: { fontSize: 10, color: "#94a3b8", lineHeight: 1.3 },
    stepDivider: {
        display: "flex",
        alignItems: "center",
        paddingTop: 12,
        gap: 0,
        flexShrink: 0,
    },
    stepDividerLine: {
        width: 12,
        height: 1,
        background: "#e2e8f0",
    },

    // Calendar
    calCard: {
        background: "#fff",
        borderRadius: 16,
        padding: "16px",
        border: "1px solid #e2e8f0",
    },
    calNav: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
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
    calTitle: { fontSize: 13, fontWeight: 800, color: "#1e293b", letterSpacing: "0.5px" },
    weekdayRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 },
    weekdayLabel: {
        textAlign: "center",
        fontSize: 10,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.4px",
        padding: "4px 0",
    },
    calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 },
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
    dayCellSelected: { background: "#1D9E75", borderRadius: 8 },
    dayCellToday: { background: "#E1F5EE" },
    dayCellOutside: { opacity: 0, pointerEvents: "none" },
    // Past dates: background berbeda agar jelas tidak bisa dipilih
    dayCellDisabled: { background: "#f8fafc", borderRadius: 8 },
    dayNum: { fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1 },
    // Dot lebih besar: 8px
    dayDot: { width: 8, height: 8, borderRadius: "50%" },
    legendRow: {
        display: "flex",
        gap: 14,
        marginTop: 14,
        paddingTop: 12,
        borderTop: "1px solid #f1f5f9",
        flexWrap: "wrap",
    },

    // Detail panel
    detailPanel: {
        background: "#fff",
        borderRadius: 16,
        padding: "16px",
        border: "1px solid #e2e8f0",
        minHeight: 140,
    },
    emptyState: {
        textAlign: "center",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    emptyTitle: { fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 },
    emptySub: { fontSize: 12, color: "#94a3b8" },
    fullBanner: {
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "#FCEBEB",
        border: "1px solid #F7C1C1",
        borderRadius: 12,
        padding: "14px",
    },
    fullBannerIcon: {
        width: 36, height: 36, background: "#fff", borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    fullBannerTitle: { fontSize: 13, fontWeight: 800, color: "#791F1F", marginBottom: 3 },
    fullBannerSub: { fontSize: 12, color: "#A32D2D", lineHeight: 1.5 },
    detailDate: { fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 12, textTransform: "capitalize" },
    layananRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" },
    layananLabel: { fontSize: 12, color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap" },
    layananChips: { display: "flex", gap: 6, flexWrap: "wrap" },
    layananChip: {
        padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
        border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b",
        cursor: "pointer", fontFamily: "inherit",
    },
    layananChipActive: { background: "#E1F5EE", border: "1px solid #1D9E75", color: "#0F6E56" },
    sesiCard: {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px", borderRadius: 12, background: "#f8fafc", marginBottom: 10, gap: 10,
    },
    sesiLeft: { display: "flex", alignItems: "center", gap: 10 },
    sesiIconWrap: {
        width: 36, height: 36, background: "#fff", borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid #e2e8f0", flexShrink: 0,
    },
    sesiLabel: { fontSize: 13, fontWeight: 700, color: "#1e293b" },
    sesiTime: { fontSize: 11, color: "#94a3b8", marginTop: 1 },
    sesiBadge: {
        display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
        borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
    },
    sesiBadgeAvail: { background: "#dcfce7", color: "#15803d" },
    sesiBadgeBooked: { background: "#FAEEDA", color: "#633806" },
    ctaBtn: {
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "13px", borderRadius: 12, background: "#04CDCD", color: "#fff",
        fontSize: 13, fontWeight: 700, textDecoration: "none", marginTop: 4, fontFamily: "inherit",
    },
    responNote: {
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 11, color: "#94a3b8", marginTop: 8, justifyContent: "center",
    },

    // FAQ
    faqCard: {
        background: "#fff", borderRadius: 16, padding: "4px 16px",
        border: "1px solid #e2e8f0",
    },
    faqItem: { borderBottom: "1px solid #f1f5f9" },
    faqQ: {
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, padding: "13px 0", background: "none", border: "none",
        cursor: "pointer", fontFamily: "inherit", textAlign: "left",
    },
    faqQText: { fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1.4 },
    faqA: { fontSize: 12, color: "#64748b", lineHeight: 1.6, paddingBottom: 12 },

    // Testimoni
    testiCard: {
        background: "#fff", borderRadius: 14, padding: "14px",
        border: "1px solid #e2e8f0", marginBottom: 10,
    },
    testiTop: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
    testiAvatar: {
        width: 34, height: 34, borderRadius: "50%", background: "#E1F5EE",
        color: "#0F6E56", fontSize: 13, fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    testiNama: { fontSize: 12, fontWeight: 700, color: "#1e293b" },
    testiKota: { fontSize: 11, color: "#94a3b8" },
    testiTeks: { fontSize: 12, color: "#475569", lineHeight: 1.6, fontStyle: "italic" },

    fab: {
        position: "fixed", bottom: 24, right: 20, backgroundColor: "#25D366",
        width: 52, height: 52, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(37,211,102,0.4)", zIndex: 100, textDecoration: "none",
    },
};