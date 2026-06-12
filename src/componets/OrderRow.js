import React, { useState } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from '../firebase';
import {
    CheckCircle, Droplets, Clock, Banknote, QrCode, Building2,
    AlertTriangle, Package, EyeOff, Loader2,
} from 'lucide-react';

function OrderRow({ order, onClick, isReady, isAdmin, sisaHari }) {
    const [confirmHide, setConfirmHide] = useState(false);
    const [hiding, setHiding] = useState(false);

    const hitungHariKerja = (tglMasukStr) => {
        if (!tglMasukStr || typeof tglMasukStr !== 'string') return null;
        const bulanIndo = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
            'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
        };
        const parts = tglMasukStr.split(' ');
        if (parts.length < 3) return null;
        const tglMasuk = new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));
        tglMasuk.setHours(0, 0, 0, 0);
        const hariIni = new Date();
        hariIni.setHours(0, 0, 0, 0);
        let hariKerja = 0;
        let cursor = new Date(tglMasuk);
        while (cursor <= hariIni) {
            if (cursor.getDay() !== 0) hariKerja++;
            cursor.setDate(cursor.getDate() + 1);
        }
        let hariKerjaDihitung = 0;
        let tglSelesai = new Date(tglMasuk);
        while (hariKerjaDihitung < 5) {
            if (tglSelesai.getDay() !== 0) hariKerjaDihitung++;
            if (hariKerjaDihitung < 5) tglSelesai.setDate(tglSelesai.getDate() + 1);
        }
        const formatSelesai = tglSelesai.toLocaleDateString('id-ID', {
            weekday: 'short', day: '2-digit', month: 'short'
        });
        return { hariKe: hariKerja, tglSelesai: formatSelesai };
    };

    const getSLA = (hariKe, status) => {
        if (status === 'Ready Anter') {
            return { color: '#22c55e', bg: '#fff', borderColor: '#f1f5f9', text: '', isAlert: false, persen: 100 };
        }
        if (!hariKe) return { color: '#cbd5e1', bg: '#fff', borderColor: '#f1f5f9', text: '', isAlert: false, persen: 0 };
        const persen = Math.min(Math.round((hariKe / 5) * 100), 100);
        if (hariKe >= 6) return { color: '#ef4444', bg: '#fff', borderColor: '#ef4444', text: `EXPIRED: ${hariKe} HARI KERJA`, isAlert: true, level: 'danger', persen };
        if (hariKe === 5) return { color: '#ef4444', bg: '#fff', borderColor: '#ef4444', text: `HARI KE-5 / BATAS HARI INI`, isAlert: true, level: 'danger', persen };
        if (hariKe === 4) return { color: '#f97316', bg: '#fff', borderColor: '#f97316', text: `HARI KE-4 / 5 HARI KERJA`, isAlert: true, level: 'warning', persen };
        if (hariKe === 3) return { color: '#f59e0b', bg: '#fff', borderColor: '#f59e0b', text: `HARI KE-3 / 5 HARI KERJA`, isAlert: true, level: 'mild', persen };
        return { color: '#22c55e', bg: '#fff', borderColor: '#f1f5f9', text: '', isAlert: false, persen };
    };

    const getMetodeBadge = (metode) => {
        const m = (metode || '').toLowerCase();
        if (m === 'tunai') return { Icon: Banknote, label: 'Tunai', color: '#15803d', bg: '#dcfce7' };
        if (m === 'qris') return { Icon: QrCode, label: 'QRIS', color: '#1d4ed8', bg: '#dbeafe' };
        if (m === 'transfer') return { Icon: Building2, label: 'Transfer', color: '#7c3aed', bg: '#ede9fe' };
        return { Icon: Clock, label: 'Belum', color: '#d97706', bg: '#fef3c7' };
    };

    const getStatusConfig = (status) => {
        if (status === 'Ready Anter') return {
            label: 'Ready Anter', bg: '#dcfce7', color: '#15803d', border: '#86efac',
            Icon: CheckCircle,
        };
        if (status === 'Sudah Dicuci') return {
            label: 'Sudah Dicuci', bg: '#fef3c7', color: '#b45309', border: '#fcd34d',
            Icon: Droplets,
        };
        return {
            label: 'Waiting List', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1',
            Icon: Clock,
        };
    };

    const handleHide = async (e) => {
        e.stopPropagation();
        if (!confirmHide) {
            setConfirmHide(true);
            setTimeout(() => setConfirmHide(false), 3000);
            return;
        }
        try {
            setHiding(true);
            await updateDoc(doc(db, "transactions", order.id), { is_hidden: true });
        } catch (err) {
            alert("Gagal menyembunyikan order: " + err.message);
        } finally {
            setHiding(false);
            setConfirmHide(false);
        }
    };

    const slaData = hitungHariKerja(order.tanggal);
    const sla = getSLA(slaData?.hariKe, order.status);
    const metodeBadge = getMetodeBadge(order.metode_pembayaran);
    const statusCfg = getStatusConfig(order.status);
    const isLunas = order.statusBayar === 'Lunas';
    const { Icon: StatusIcon } = statusCfg;
    const { Icon: MetodeIcon } = metodeBadge;

    const getProgressColor = (persen) => {
        if (persen >= 100) return '#ef4444';
        if (persen >= 80) return '#f97316';
        if (persen >= 60) return '#f59e0b';
        return '#22c55e';
    };

    return (
        <div
            style={{
                ...S.card,
                borderLeft: `4px solid ${isReady ? '#cbd5e1' : (sla.borderColor || '#f1f5f9')}`,
                opacity: isReady ? 0.7 : 1,
            }}
            onClick={() => onClick(order)}
        >
            {/* ── Baris 1: Nama + Status badge ── */}
            <div style={S.cardTop}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.custName}>{order.nama || 'Tanpa Nama'}</div>
                    <div style={S.custPhone}>{order.hp || '-'}</div>
                </div>
                <div style={{
                    ...S.statusBadge,
                    background: statusCfg.bg,
                    color: statusCfg.color,
                    border: `1px solid ${statusCfg.border}`,
                }}>
                    <StatusIcon size={11} />
                    {statusCfg.label}
                </div>
            </div>

            {/* ── SLA Warning ── */}
            {sla.text && !isReady && (
                <div style={{ ...S.slaText, color: sla.color }}>
                    <AlertTriangle size={11} style={{ flexShrink: 0 }} />
                    {sla.text}
                </div>
            )}

            {/* ── Info grid ── */}
            <div style={S.infoGrid}>
                <div style={S.infoCell}>
                    <div style={S.infoLabel}>Tgl Masuk</div>
                    <div style={S.infoVal}>{order.tanggal || '-'}</div>
                </div>
                {!isReady && slaData?.tglSelesai && (
                    <div style={S.infoCell}>
                        <div style={S.infoLabel}>Estimasi Selesai</div>
                        <div style={{ ...S.infoVal, color: sla.color }}>{slaData.tglSelesai}</div>
                    </div>
                )}
            </div>

            {/* ── Item summary ── */}
            {Array.isArray(order.items) && order.items.length > 0 && (
                <div style={S.itemsWrap}>
                    <Package size={11} style={{ flexShrink: 0, marginTop: 1 }} />
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

            {/* ── Ready: sisa hari + tombol hide ── */}
            {isReady && (
                <div style={S.readyBar}>
                    <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        backgroundColor: sisaHari <= 2 ? '#fee2e2' : '#fef3c7',
                        color: sisaHari <= 2 ? '#ef4444' : '#d97706',
                    }}>
                        <Clock size={10} />
                        {sisaHari > 0 ? `${sisaHari} hari lagi (auto-hide)` : 'Akan segera tersembunyi'}
                    </span>
                    {isAdmin && (
                        <button
                            onClick={handleHide}
                            disabled={hiding}
                            style={{
                                ...S.hideBtn,
                                backgroundColor: confirmHide ? '#ef4444' : '#f1f5f9',
                                color: confirmHide ? '#fff' : '#64748b',
                            }}
                        >
                            {hiding
                                ? <Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} />
                                : confirmHide
                                    ? <><AlertTriangle size={11} /> Yakin hide?</>
                                    : <><EyeOff size={11} /> Hide</>
                            }
                        </button>
                    )}
                </div>
            )}

            {/* ── Progress bar + badges ── */}
            <div style={S.bottomRow}>
                {!isReady && slaData && (
                    <div style={S.progressWrap}>
                        <div style={S.progressTrack}>
                            <div style={{
                                ...S.progressFill,
                                width: `${sla.persen}%`,
                                backgroundColor: getProgressColor(sla.persen),
                            }} />
                        </div>
                        <span style={{ ...S.progressLabel, color: getProgressColor(sla.persen) }}>
                            {slaData.hariKe}/5
                        </span>
                    </div>
                )}
                <div style={S.badgeGroup}>
                    <span style={{ ...S.badge, backgroundColor: metodeBadge.bg, color: metodeBadge.color }}>
                        <MetodeIcon size={10} /> {metodeBadge.label}
                    </span>
                    <span style={{
                        ...S.badge,
                        backgroundColor: isLunas ? '#dcfce7' : '#fee2e2',
                        color: isLunas ? '#15803d' : '#ef4444',
                    }}>
                        {isLunas
                            ? <><CheckCircle size={10} /> Lunas</>
                            : <><Clock size={10} /> Belum</>
                        }
                    </span>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

const S = {
    card: {
        background: '#fff',
        borderRadius: 16,
        padding: '14px 16px',
        border: '1px solid #e8edf2',
        cursor: 'pointer',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        transition: 'box-shadow 0.15s',
    },
    cardTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 10,
    },
    custName: {
        fontSize: 15,
        fontWeight: 800,
        color: '#1e293b',
        marginBottom: 2,
    },
    custPhone: {
        fontSize: 11,
        color: '#94a3b8',
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
    slaText: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 800,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
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
    readyBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        gap: 8,
    },
    hideBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        border: 'none',
        borderRadius: 6,
        padding: '5px 10px',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.2s',
    },
    bottomRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    progressWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        maxWidth: 120,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 10,
        transition: 'width 0.3s',
    },
    progressLabel: {
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
    },
    badgeGroup: {
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
    },
    badge: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
    },
};

export default OrderRow;