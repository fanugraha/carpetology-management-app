import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
    Search, X, Home, MessageCircle, Clock, CheckCircle,
    WashingMachine, Layers, CalendarDays, Timer, Package,
    FileText, ClipboardList, Settings, ChevronDown, ChevronUp,
} from 'lucide-react';

function OrderCard({ order, statusCfg, est, waLink, STEPS }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={S.card}>
            {/* ── Collapsed summary — selalu tampil ── */}
            <div style={S.cardTop}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.custName}>{order.nama}</div>
                    {/* Estimasi ringkas */}
                    <div style={S.estRow}>
                        <Timer size={10} color="#94a3b8" />
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>Estimasi:</span>
                        <span style={{ color: '#1e293b', fontSize: 11, fontWeight: 700 }}>{est.tgl}</span>
                        <span style={{
                            fontSize: 10,
                            color: order.status === 'Ready Anter' ? '#15803d' : '#64748b',
                            fontWeight: 600,
                        }}>
                            ({est.info})
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{
                        ...S.statusBadge,
                        background: statusCfg.bg,
                        color: statusCfg.text,
                        border: `1px solid ${statusCfg.border}`,
                    }}>
                        {statusCfg.icon} {statusCfg.label}
                    </div>
                    <button
                        onClick={() => setExpanded(e => !e)}
                        style={S.expandBtn}
                    >
                        {expanded
                            ? <><ChevronUp size={11} /> Tutup</>
                            : <><ChevronDown size={11} /> Detail</>
                        }
                    </button>
                </div>
            </div>

            {/* ── Detail — hanya saat expanded ── */}
            {expanded && (
                <>
                    {/* Progress steps */}
                    <div style={S.stepsWrap}>
                        {STEPS.map((step, i) => {
                            const stepNum = i + 1;
                            const isDone = statusCfg.step > stepNum;
                            const isActive = statusCfg.step === stepNum;
                            return (
                                <React.Fragment key={i}>
                                    <div style={S.stepItem}>
                                        <div style={{
                                            ...S.stepDot,
                                            background: isDone || isActive ? statusCfg.dotColor : '#e2e8f0',
                                            boxShadow: isActive ? `0 0 0 3px ${statusCfg.dotColor}33` : 'none',
                                        }}>
                                            {isDone
                                                ? <CheckCircle size={12} color="#fff" />
                                                : <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{stepNum}</span>
                                            }
                                        </div>
                                        <div style={{
                                            ...S.stepLabel,
                                            color: isDone || isActive ? statusCfg.text : '#94a3b8',
                                            fontWeight: isActive ? 700 : 500,
                                        }}>
                                            {step}
                                        </div>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div style={{
                                            ...S.stepLine,
                                            background: isDone ? statusCfg.dotColor : '#e2e8f0',
                                        }} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Info grid */}
                    <div style={S.infoGrid}>
                        <div style={S.infoCell}>
                            <div style={S.infoLabel}>
                                <CalendarDays size={9} /> Tgl Masuk
                            </div>
                            <div style={S.infoVal}>{order.tanggal || '-'}</div>
                        </div>
                        <div style={S.infoCell}>
                            <div style={S.infoLabel}>
                                <Timer size={9} /> Estimasi Selesai
                            </div>
                            <div style={{ ...S.infoVal, color: order.status === 'Ready Anter' ? '#15803d' : '#1e293b' }}>
                                {est.tgl} <span style={{ color: '#64748b', fontWeight: 500 }}>({est.info})</span>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    {order.items.length > 0 && (
                        <div style={S.itemsWrap}>
                            <Package size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>
                                {order.items.map((it, i) => (
                                    <span key={i}>
                                        {i > 0 && ', '}
                                        {it.qty}× {it.nama}
                                        {it.satuan === 'meter' && it.luas ? ` (${Number(it.luas).toFixed(1)}m²)` : ''}
                                    </span>
                                ))}
                            </span>
                        </div>
                    )}

                    {/* Catatan */}
                    {order.catatan && (
                        <div style={S.noteBox}>
                            <FileText size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{order.catatan}</span>
                        </div>
                    )}

                    {/* CTA */}
                    <a href={waLink} target="_blank" rel="noreferrer" style={S.waBtn}>
                        <MessageCircle size={14} /> Tanya Progres Order
                    </a>
                </>
            )}
        </div>
    );
}

function TrackingPage() {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("Semua");
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const q = query(collection(db, "transactions"), orderBy("created_at", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();

                const isAutoHidden = (() => {
                    if ((d.status_order || d.status) !== 'Ready Anter') return false;
                    const ts = d.ready_at || d.created_at;
                    if (!ts) return false;
                    const readyDate = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
                    return (new Date() - readyDate) / (1000 * 60 * 60 * 24) >= 7;
                })();

                return {
                    id: doc.id,
                    nama: d.nama || '-',
                    hp: d.hp || '-',
                    status: d.status_order || d.status || 'Waiting List',
                    tanggal: d.tanggal || null,
                    catatan: d.catatan || '',
                    items: d.items || [],
                    notaId: d.notaId || doc.id,
                    is_hidden: d.is_hidden || false,
                    layanan_type: d.layanan_type || 'laundry',
                    isAutoHidden,
                };
            }).filter(o => !o.is_hidden && !o.isAutoHidden && o.layanan_type !== "home_visit");

            setOrders(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getEstimasiInfo = (tglMasukStr, status) => {
        if (!tglMasukStr) return { tgl: '-', info: '-', persen: 0 };
        const bulanIndo = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
            'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
        };
        const parts = tglMasukStr.split(' ');
        if (parts.length < 3) return { tgl: '-', info: '-', persen: 0 };
        const tglMasuk = new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));
        const tglSelesai = new Date(tglMasuk);
        tglSelesai.setDate(tglMasuk.getDate() + 5);

        const hariIni = new Date();
        const totalDurasi = tglSelesai - tglMasuk;
        const sudahBerlalu = hariIni - tglMasuk;
        const persen = Math.min(Math.round((sudahBerlalu / totalDurasi) * 100), 100);
        const selisih = Math.ceil((tglSelesai - hariIni) / (1000 * 60 * 60 * 24));
        const tglSelesaiStr = tglSelesai.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

        if (status === 'Ready Anter') return { tgl: tglSelesaiStr, info: 'Selesai ✓', persen: 100 };
        if (selisih > 0) return { tgl: tglSelesaiStr, info: `${selisih} hari lagi`, persen };
        return { tgl: tglSelesaiStr, info: 'Sedang diselesaikan', persen: 90 };
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'Ready Anter':
                return {
                    label: 'Siap Diambil',
                    bg: '#dcfce7', text: '#15803d',
                    border: '#86efac',
                    icon: <CheckCircle size={12} />,
                    dotColor: '#22c55e',
                    progressColor: '#22c55e',
                    step: 3,
                };
            case 'Sudah Dicuci':
                return {
                    label: 'Sedang Diproses',
                    bg: '#fef3c7', text: '#b45309',
                    border: '#fcd34d',
                    icon: <WashingMachine size={12} />,
                    dotColor: '#f59e0b',
                    progressColor: '#f59e0b',
                    step: 2,
                };
            default:
                return {
                    label: 'Dalam Antrian',
                    bg: '#f1f5f9', text: '#475569',
                    border: '#cbd5e1',
                    icon: <Clock size={12} />,
                    dotColor: '#94a3b8',
                    progressColor: '#04CDCD',
                    step: 1,
                };
        }
    };

    const STEPS = ['Diterima', 'Dicuci', 'Siap Ambil'];

    const normalizePhone = (phone) => {
        if (!phone) return "";
        let clean = phone.replace(/\D/g, "");
        if (clean.startsWith("62")) clean = "0" + clean.substring(2);
        return clean;
    };

    const filteredOrders = orders.filter((o) => {
        const searchLower = searchTerm.toLowerCase().trim();
        const searchPhone = normalizePhone(searchTerm);

        const matchesSearch = !searchLower ||
            (o.nama || "").toLowerCase().includes(searchLower) ||
            (o.hp && (o.hp.includes(searchTerm) || normalizePhone(o.hp).includes(searchPhone)));

        const matchesFilter =
            filter === "Semua" ||
            (filter === "Proses" && o.status !== "Ready Anter") ||
            (filter === "Siap Ambil" && o.status === "Ready Anter");

        return matchesSearch && matchesFilter;
    });

    const countProses = orders.filter(o => o.status !== 'Ready Anter').length;
    const countReady = orders.filter(o => o.status === 'Ready Anter').length;

    return (
        <div style={S.page}>
            {/* ── HEADER ── */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <div style={S.logoWrap}>
                        <div style={S.logoIconWrap}>
                            <Layers size={20} color="#04CDCD" />
                        </div>
                        <div>
                            <div style={S.brand}>Carpetology</div>
                            <div style={S.tagline}>Cuci Karpet & Laundry Professional</div>
                        </div>
                    </div>
                    <div style={S.heroMeta}>
                        <div style={S.hours}>
                            <Clock size={11} color="#6B8894" />
                            08.00–16.00 WIB
                        </div>
                        <button onClick={() => navigate('/admin-login')} style={S.adminBtn}>
                            <Settings size={11} />
                            Admin
                        </button>
                    </div>
                </div>

                {/* Stats bar */}
                <div style={S.statsRow}>
                    <div style={S.statChip}>
                        <span style={S.statNum}>{countProses}</span>
                        <span style={S.statLbl}>Dalam Proses</span>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
                    <div style={S.statChip}>
                        <span style={{ ...S.statNum, color: '#86efac' }}>{countReady}</span>
                        <span style={S.statLbl}>Siap Diambil</span>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
                    <div style={S.statChip}>
                        <span style={S.statNum}>{orders.length}</span>
                        <span style={S.statLbl}>Total Order</span>
                    </div>
                </div>
            </div>

            {/* ── HOME VISIT BANNER ── */}
            <div style={S.contentWrap}>
                <button onClick={() => navigate('/jadwal')} style={S.homeVisitBtn}>
                    <Home size={20} color="#fff" />
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Jadwal Home Service</div>
                        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1 }}>Sofa & Springbed — cuci di tempat</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 18, opacity: 0.7 }}>›</span>
                </button>

                {/* ── SEARCH ── */}
                <div style={S.searchWrap}>
                    <span style={S.searchIcon}>
                        <Search size={16} color="#94a3b8" />
                    </span>
                    <input
                        type="text"
                        placeholder="Cari nama atau nomor HP..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={S.searchInput}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={S.searchClear}>
                            <X size={14} color="#64748b" />
                        </button>
                    )}
                </div>

                {/* ── FILTER CHIPS ── */}
                <div style={S.filterRow}>
                    {[
                        { id: 'Semua', label: `Semua (${orders.length})`, icon: <ClipboardList size={11} /> },
                        { id: 'Proses', label: `Proses (${countProses})`, icon: <Clock size={11} /> },
                        { id: 'Siap Ambil', label: `Siap (${countReady})`, icon: <CheckCircle size={11} /> },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            style={{
                                ...S.filterChip,
                                background: filter === f.id ? '#04CDCD' : '#fff',
                                color: filter === f.id ? '#fff' : '#475569',
                                borderColor: filter === f.id ? '#04CDCD' : '#e2e8f0',
                                fontWeight: filter === f.id ? 700 : 600,
                            }}
                        >
                            {f.icon} {f.label}
                        </button>
                    ))}
                </div>

                {/* ── ORDER LIST ── */}
                {isLoading ? (
                    <div style={S.loadingWrap}>
                        <div style={S.spinner} />
                        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>Memuat data...</div>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div style={S.emptyState}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                            {searchTerm
                                ? <Search size={40} color="#cbd5e1" />
                                : <ClipboardList size={40} color="#cbd5e1" />}
                        </div>
                        <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                            {searchTerm ? 'Tidak ditemukan' : 'Belum ada order'}
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                            {searchTerm
                                ? `Coba cek ejaan nama atau format nomor HP.`
                                : 'Data order akan muncul di sini setelah transaksi dibuat.'}
                        </div>
                        {searchTerm && (
                            <a
                                href="https://wa.me/6282151154727"
                                target="_blank"
                                rel="noreferrer"
                                style={{ ...S.waBtn, marginTop: 16, display: 'inline-flex' }}
                            >
                                <MessageCircle size={14} /> Tanya via WhatsApp
                            </a>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filteredOrders.map((order) => {
                            const statusCfg = getStatusConfig(order.status);
                            const est = getEstimasiInfo(order.tanggal, order.status);
                            // notaId tetap ada di link WA tapi tidak ditampilkan di card
                            const waLink = `https://wa.me/6282151154727?text=Halo Admin, saya ingin menanyakan progres order:%0ANama: ${encodeURIComponent(order.nama)}%0ATanggal Masuk: ${order.tanggal}%0ANota: ${order.notaId}`;

                            return (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    statusCfg={statusCfg}
                                    est={est}
                                    waLink={waLink}
                                    STEPS={STEPS}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                <div style={S.footer}>
                    <div style={{ fontWeight: 700, color: '#04CDCD', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Layers size={14} color="#04CDCD" /> Carpetology
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Jasa Cuci Karpet & Laundry Professional</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Clock size={10} color="#94a3b8" /> Jam operasional: 08.00 – 16.00 WIB
                    </div>
                </div>
            </div>

            {/* ── FAB WA ── */}
            <a href="https://wa.me/6282151154727" target="_blank" rel="noreferrer" style={S.fab}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.67-1.613-.916-2.207-.242-.579-.487-.5-.67-.509-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.996c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.005 0C5.37 0 .002 5.368.002 12.006c0 2.094.547 4.136 1.587 5.932L0 24l6.33-1.662a11.785 11.785 0 005.675 1.444h.005c6.634 0 12.002-5.368 12.002-12.006 0-3.21-1.25-6.233-3.522-8.504" />
                </svg>
            </a>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

const S = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 80,
    },
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '20px 20px 0',
    },
    heroInner: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        maxWidth: 500,
        margin: '0 auto 20px',
    },
    logoWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    logoIconWrap: {
        width: 36,
        height: 36,
        background: '#04CDCD22',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brand: {
        fontSize: 20,
        fontWeight: 800,
        color: '#04CDCD',
        letterSpacing: '-0.3px',
    },
    tagline: {
        fontSize: 10,
        color: '#6B8894',
        marginTop: 1,
    },
    heroMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingTop: 4,
    },
    hours: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: '#6B8894',
        fontWeight: 600,
    },
    adminBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'none',
        border: '1px solid #2C4A54',
        color: '#6B8894',
        padding: '4px 12px',
        borderRadius: 6,
        fontSize: 11,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    statsRow: {
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px 12px 0 0',
        padding: '12px 20px',
        maxWidth: 500,
        margin: '0 auto',
    },
    statChip: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
    },
    statNum: {
        fontSize: 20,
        fontWeight: 800,
        color: '#fff',
    },
    statLbl: {
        fontSize: 9,
        color: '#6B8894',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: 600,
    },
    contentWrap: {
        maxWidth: 500,
        margin: '0 auto',
        padding: '16px 16px 0',
    },
    homeVisitBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #04CDCD, #028585)',
        color: '#fff',
        border: 'none',
        borderRadius: 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(4,205,205,0.25)',
        boxSizing: 'border-box',
    },
    searchWrap: {
        position: 'relative',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 1,
    },
    searchInput: {
        width: '100%',
        padding: '12px 40px 12px 42px',
        borderRadius: 12,
        border: '1.5px solid #e2e8f0',
        fontSize: 14,
        fontFamily: 'inherit',
        outline: 'none',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        color: '#1e293b',
        transition: 'border-color 0.2s',
    },
    searchClear: {
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '50%',
        width: 24,
        height: 24,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    filterRow: {
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        overflowX: 'auto',
        paddingBottom: 2,
    },
    filterChip: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 14px',
        borderRadius: 20,
        border: '1.5px solid',
        fontSize: 12,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
        flexShrink: 0,
    },
    // ── Card styles ──
    card: {
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #f1f5f9',
    },
    cardTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
    },
    custName: {
        fontSize: 15,
        fontWeight: 800,
        color: '#1e293b',
        marginBottom: 4,
    },
    estRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
        whiteSpace: 'nowrap',
    },
    expandBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#64748b',
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
    },
    stepsWrap: {
        display: 'flex',
        alignItems: 'center',
        marginTop: 14,
        marginBottom: 14,
        padding: '10px 0',
        borderTop: '1px solid #f8fafc',
        borderBottom: '1px solid #f8fafc',
    },
    stepItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
    },
    stepLabel: {
        fontSize: 9,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
    },
    stepLine: {
        flex: 1,
        height: 2,
        borderRadius: 2,
        margin: '0 4px',
        marginBottom: 14,
        transition: 'background 0.2s',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 10,
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
        marginBottom: 2,
    },
    infoVal: {
        fontSize: 12,
        fontWeight: 700,
        color: '#1e293b',
    },
    itemsWrap: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        fontSize: 11,
        color: '#64748b',
        background: '#f8fafc',
        borderRadius: 8,
        padding: '8px 10px',
        marginBottom: 10,
        lineHeight: 1.5,
        fontStyle: 'italic',
    },
    noteBox: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        background: '#fff7ed',
        color: '#c2410c',
        fontSize: 11,
        padding: '8px 10px',
        borderRadius: 8,
        marginBottom: 10,
        border: '1px solid #fed7aa',
        lineHeight: 1.5,
    },
    waBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '10px',
        borderRadius: 10,
        border: '1.5px solid #e2e8f0',
        color: '#04CDCD',
        textDecoration: 'none',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'inherit',
        background: '#f0fefe',
        transition: 'all 0.15s',
        cursor: 'pointer',
    },
    loadingWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 20px',
    },
    spinner: {
        width: 32,
        height: 32,
        border: '3px solid #f1f5f9',
        borderTop: '3px solid #04CDCD',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    emptyState: {
        textAlign: 'center',
        padding: '48px 20px',
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #f1f5f9',
    },
    footer: {
        textAlign: 'center',
        padding: '32px 20px 16px',
        color: '#94a3b8',
        fontSize: 12,
    },
    fab: {
        position: 'fixed',
        bottom: 24,
        right: 20,
        backgroundColor: '#25D366',
        width: 52,
        height: 52,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
        zIndex: 100,
        textDecoration: 'none',
    },
};

export default TrackingPage;