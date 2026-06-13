import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../firebase';
import { useParams, useNavigate } from 'react-router-dom';
import {
    CheckCircle, Clock, WashingMachine, Package,
    FileText, CalendarDays, Timer, MessageCircle,
    Layers, ChevronLeft, AlertCircle
} from 'lucide-react';

function TrackingDetailPage() {
    const { notaId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const q = query(
                    collection(db, "transactions"),
                    where("notaId", "==", notaId)
                );
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setNotFound(true);
                } else {
                    const doc = snapshot.docs[0];
                    const d = doc.data();
                    setOrder({
                        id: doc.id,
                        nama: d.nama || '-',
                        hp: d.hp || '-',
                        status: d.status_order || d.status || 'Waiting List',
                        tanggal: d.tanggal || null,
                        catatan: d.catatan || '',
                        items: d.items || [],
                        notaId: d.notaId || doc.id,
                        layanan_type: d.layanan_type || 'laundry',
                    });
                }
            } catch (err) {
                console.error(err);
                setNotFound(true);
            } finally {
                setIsLoading(false);
            }
        };

        if (notaId) fetchOrder();
    }, [notaId]);

    const getEstimasiInfo = (tglMasukStr, status) => {
        if (!tglMasukStr) return { tgl: '-', info: '-' };
        const bulanIndo = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
            'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
        };
        const parts = tglMasukStr.split(' ');
        if (parts.length < 3) return { tgl: '-', info: '-' };
        const tglMasuk = new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));
        const tglSelesai = new Date(tglMasuk);
        tglSelesai.setDate(tglMasuk.getDate() + 5);

        const hariIni = new Date();
        const selisih = Math.ceil((tglSelesai - hariIni) / (1000 * 60 * 60 * 24));
        const tglSelesaiStr = tglSelesai.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        if (status === 'Ready Anter') return { tgl: tglSelesaiStr, info: 'Selesai ✓' };
        if (selisih > 0) return { tgl: tglSelesaiStr, info: `${selisih} hari lagi` };
        return { tgl: tglSelesaiStr, info: 'Sedang diselesaikan' };
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'Ready Anter':
                return {
                    label: 'Siap Diambil',
                    bg: '#dcfce7', text: '#15803d',
                    border: '#86efac',
                    icon: <CheckCircle size={14} />,
                    dotColor: '#22c55e',
                    step: 3,
                    heroGradient: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
                    accentColor: '#22c55e',
                    accentLight: '#dcfce7',
                    message: 'Laundry kamu sudah bersih & siap diambil! 🎉',
                };
            case 'Sudah Dicuci':
                return {
                    label: 'Sedang Diproses',
                    bg: '#fef3c7', text: '#b45309',
                    border: '#fcd34d',
                    icon: <WashingMachine size={14} />,
                    dotColor: '#f59e0b',
                    step: 2,
                    heroGradient: 'linear-gradient(135deg, #1A2E35 0%, #1c2f1e 100%)',
                    accentColor: '#f59e0b',
                    accentLight: '#fef3c7',
                    message: 'Laundry kamu sedang dalam proses pencucian.',
                };
            default:
                return {
                    label: 'Dalam Antrian',
                    bg: '#f1f5f9', text: '#475569',
                    border: '#cbd5e1',
                    icon: <Clock size={14} />,
                    dotColor: '#04CDCD',
                    step: 1,
                    heroGradient: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
                    accentColor: '#04CDCD',
                    accentLight: '#f0fefe',
                    message: 'Laundry kamu sudah diterima dan dalam antrian.',
                };
        }
    };

    const STEPS = [
        { label: 'Diterima', icon: <CheckCircle size={14} /> },
        { label: 'Dicuci', icon: <WashingMachine size={14} /> },
        { label: 'Siap Ambil', icon: <Package size={14} /> },
    ];

    // ── LOADING ──
    if (isLoading) {
        return (
            <div style={S.page}>
                <div style={S.loadingFull}>
                    <div style={S.spinner} />
                    <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 16 }}>Mencari order kamu...</div>
                </div>
            </div>
        );
    }

    // ── NOT FOUND ──
    if (notFound || !order) {
        return (
            <div style={S.page}>
                <div style={S.notFoundWrap}>
                    <div style={S.notFoundCard}>
                        <div style={S.notFoundIcon}>
                            <AlertCircle size={36} color="#ef4444" />
                        </div>
                        <div style={S.notFoundTitle}>Order Tidak Ditemukan</div>
                        <div style={S.notFoundSub}>
                            Nota <strong style={{ fontFamily: 'monospace', color: '#1e293b' }}>{notaId}</strong> tidak ada di sistem kami.
                        </div>
                        <div style={S.notFoundSub}>
                            Pastikan link yang kamu buka sudah benar, atau hubungi kami via WhatsApp.
                        </div>
                        <a
                            href="https://wa.me/6282151154727"
                            target="_blank"
                            rel="noreferrer"
                            style={{ ...S.waBtn, marginTop: 8 }}
                        >
                            <MessageCircle size={15} /> Tanya via WhatsApp
                        </a>
                        <button onClick={() => navigate('/')} style={S.backBtn}>
                            <ChevronLeft size={14} /> Cek Order Lain
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const statusCfg = getStatusConfig(order.status);
    const est = getEstimasiInfo(order.tanggal, order.status);
    const waLink = `https://wa.me/6282151154727?text=Halo Admin, saya ingin menanyakan progres order:%0ANama: ${encodeURIComponent(order.nama)}%0ATanggal Masuk: ${order.tanggal}%0ANota: ${order.notaId}`;

    return (
        <div style={S.page}>
            {/* ── HERO ── */}
            <div style={{ ...S.hero, background: statusCfg.heroGradient }}>
                <div style={S.heroInner}>
                    {/* Back button */}
                    <button onClick={() => navigate('/')} style={S.heroBack}>
                        <ChevronLeft size={16} color="#6B8894" />
                        <span>Semua Order</span>
                    </button>

                    {/* Brand */}
                    <div style={S.logoWrap}>
                        <div style={S.logoIconWrap}>
                            <Layers size={18} color="#04CDCD" />
                        </div>
                        <div style={S.brand}>Carpetology</div>
                    </div>
                </div>

                {/* Status Hero */}
                <div style={S.heroStatus}>
                    <div style={{
                        ...S.statusPill,
                        background: statusCfg.bg,
                        color: statusCfg.text,
                        border: `1px solid ${statusCfg.border}`,
                    }}>
                        {statusCfg.icon} {statusCfg.label}
                    </div>
                    <div style={S.heroName}>{order.nama}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#6B8894', marginBottom: 8 }}>
                        #{order.notaId}
                    </div>
                    <div style={{
                        fontSize: 13,
                        color: statusCfg.accentColor,
                        fontWeight: 500,
                        background: `${statusCfg.accentColor}15`,
                        padding: '8px 16px',
                        borderRadius: 20,
                        display: 'inline-block',
                    }}>
                        {statusCfg.message}
                    </div>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={S.contentWrap}>

                {/* Progress Steps */}
                <div style={S.card}>
                    <div style={S.cardLabel}>Progress Order</div>
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
                                            boxShadow: isActive ? `0 0 0 4px ${statusCfg.dotColor}28` : 'none',
                                            transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                        }}>
                                            {isDone
                                                ? <CheckCircle size={13} color="#fff" />
                                                : <span style={{ fontSize: 10, fontWeight: 800, color: isActive ? '#fff' : '#94a3b8' }}>{stepNum}</span>
                                            }
                                        </div>
                                        <div style={{
                                            ...S.stepLabel,
                                            color: isDone || isActive ? statusCfg.text : '#94a3b8',
                                            fontWeight: isActive ? 800 : 500,
                                        }}>
                                            {step.label}
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
                </div>

                {/* Info Grid */}
                <div style={S.infoGrid}>
                    <div style={S.infoCell}>
                        <div style={S.infoLabel}><CalendarDays size={11} /> Tanggal Masuk</div>
                        <div style={S.infoVal}>{order.tanggal || '-'}</div>
                    </div>
                    <div style={S.infoCell}>
                        <div style={S.infoLabel}><Timer size={11} /> Estimasi Selesai</div>
                        <div style={{ ...S.infoVal, color: order.status === 'Ready Anter' ? '#15803d' : '#1e293b' }}>
                            {est.tgl}
                            <span style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
                                {est.info}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Items */}
                {order.items.length > 0 && (
                    <div style={S.card}>
                        <div style={S.cardLabel}>Item Laundry</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {order.items.map((it, i) => (
                                <div key={i} style={S.itemRow}>
                                    <div style={S.itemDot} />
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                                            {it.qty}× {it.nama}
                                        </span>
                                        {it.satuan === 'meter' && it.luas ? (
                                            <span style={{ color: '#94a3b8', fontSize: 12 }}> — {Number(it.luas).toFixed(1)} m²</span>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Catatan */}
                {order.catatan && (
                    <div style={S.noteBox}>
                        <FileText size={13} style={{ flexShrink: 0, marginTop: 1, color: '#c2410c' }} />
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Catatan</div>
                            <div style={{ fontSize: 13, color: '#c2410c', lineHeight: 1.5 }}>{order.catatan}</div>
                        </div>
                    </div>
                )}

                {/* CTA */}
                <a href={waLink} target="_blank" rel="noreferrer" style={S.waBtn}>
                    <MessageCircle size={15} /> Tanya Progres ke Admin
                </a>

                {/* Footer */}
                <div style={S.footer}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700, color: '#04CDCD', marginBottom: 4 }}>
                        <Layers size={13} /> Carpetology
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Jasa Cuci Karpet & Laundry Professional</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Clock size={10} color="#94a3b8" /> Jam operasional: 08.00 – 16.00 WIB
                    </div>
                </div>
            </div>

            {/* FAB WA */}
            <a href="https://wa.me/6282151154727" target="_blank" rel="noreferrer" style={S.fab}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.67-1.613-.916-2.207-.242-.579-.487-.5-.67-.509-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.996c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.005 0C5.37 0 .002 5.368.002 12.006c0 2.094.547 4.136 1.587 5.932L0 24l6.33-1.662a11.785 11.785 0 005.675 1.444h.005c6.634 0 12.002-5.368 12.002-12.006 0-3.21-1.25-6.233-3.522-8.504" />
                </svg>
            </a>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
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
        padding: '20px 20px 28px',
    },
    heroInner: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: 500,
        margin: '0 auto 24px',
    },
    heroBack: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: '1px solid #2C4A54',
        color: '#6B8894',
        padding: '5px 12px',
        borderRadius: 8,
        fontSize: 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 600,
    },
    logoWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    logoIconWrap: {
        width: 32,
        height: 32,
        background: '#04CDCD22',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brand: {
        fontSize: 17,
        fontWeight: 800,
        color: '#04CDCD',
        letterSpacing: '-0.3px',
    },
    heroStatus: {
        maxWidth: 500,
        margin: '0 auto',
        textAlign: 'center',
    },
    statusPill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 12,
    },
    heroName: {
        fontSize: 26,
        fontWeight: 800,
        color: '#fff',
        marginBottom: 4,
        letterSpacing: '-0.5px',
    },
    contentWrap: {
        maxWidth: 500,
        margin: '0 auto',
        padding: '16px 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    card: {
        background: '#fff',
        borderRadius: 16,
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #f1f5f9',
    },
    cardLabel: {
        fontSize: 10,
        fontWeight: 700,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        marginBottom: 14,
    },
    stepsWrap: {
        display: 'flex',
        alignItems: 'center',
    },
    stepItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.25s',
    },
    stepLabel: {
        fontSize: 10,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
    },
    stepLine: {
        flex: 1,
        height: 2,
        borderRadius: 2,
        margin: '0 6px',
        marginBottom: 22,
        transition: 'background 0.25s',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
    },
    infoCell: {
        background: '#fff',
        borderRadius: 14,
        padding: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #f1f5f9',
    },
    infoLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        marginBottom: 6,
    },
    infoVal: {
        fontSize: 13,
        fontWeight: 800,
        color: '#1e293b',
        lineHeight: 1.3,
    },
    itemRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: '1px solid #f8fafc',
    },
    itemDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#04CDCD',
        flexShrink: 0,
    },
    noteBox: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: '#fff7ed',
        padding: '12px 14px',
        borderRadius: 14,
        border: '1px solid #fed7aa',
    },
    waBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '14px',
        borderRadius: 14,
        background: '#f0fefe',
        border: '1.5px solid #04CDCD',
        color: '#04CDCD',
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: 'pointer',
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: '100%',
        padding: '12px',
        borderRadius: 12,
        background: 'none',
        border: '1.5px solid #e2e8f0',
        color: '#64748b',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        marginTop: 8,
    },
    loadingFull: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    spinner: {
        width: 32,
        height: 32,
        border: '3px solid #f1f5f9',
        borderTop: '3px solid #04CDCD',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    notFoundWrap: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    notFoundCard: {
        background: '#fff',
        borderRadius: 20,
        padding: '32px 24px',
        textAlign: 'center',
        maxWidth: 360,
        width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
    },
    notFoundIcon: {
        width: 64,
        height: 64,
        background: '#fef2f2',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    notFoundTitle: {
        fontSize: 18,
        fontWeight: 800,
        color: '#1e293b',
    },
    notFoundSub: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 1.6,
    },
    footer: {
        textAlign: 'center',
        padding: '24px 20px 16px',
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

export default TrackingDetailPage;