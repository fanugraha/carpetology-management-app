import React, { useState } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from '../firebase';

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
            return { color: '#22c55e', bg: 'transparent', text: '', isAlert: false, persen: 100 };
        }
        if (!hariKe) return { color: '#cbd5e1', bg: 'transparent', text: '', isAlert: false, persen: 0 };
        const persen = Math.min(Math.round((hariKe / 5) * 100), 100);
        if (hariKe >= 6) return { color: '#ef4444', bg: '#fef2f2', borderColor: '#ef4444', text: `🚨 EXPIRED: ${hariKe} HARI KERJA`, isAlert: true, persen };
        if (hariKe === 5) return { color: '#ef4444', bg: '#fef2f2', borderColor: '#ef4444', text: `🚨 HARI KE-5 / BATAS HARI INI`, isAlert: true, persen };
        if (hariKe === 4) return { color: '#f97316', bg: '#fff7ed', borderColor: '#f97316', text: `⚠️ HARI KE-4 / 5 HARI KERJA`, isAlert: true, persen };
        if (hariKe === 3) return { color: '#f59e0b', bg: '#fffbeb', borderColor: '#f59e0b', text: `⚠️ HARI KE-3 / 5 HARI KERJA`, isAlert: true, persen };
        return { color: '#22c55e', bg: '#fff', borderColor: 'transparent', text: '', isAlert: false, persen };
    };

    const getMetodeBadge = (metode) => {
        const m = (metode || '').toLowerCase();
        if (m === 'tunai') return { icon: '💵', label: 'Tunai', color: '#15803d', bg: '#dcfce7' };
        if (m === 'qris') return { icon: '📲', label: 'QRIS', color: '#1d4ed8', bg: '#dbeafe' };
        if (m === 'transfer') return { icon: '🏦', label: 'Transfer', color: '#7c3aed', bg: '#ede9fe' };
        return { icon: '⏳', label: 'Belum', color: '#d97706', bg: '#fef3c7' };
    };

    // Handle hide manual oleh admin
    const handleHide = async (e) => {
        e.stopPropagation();
        if (!confirmHide) {
            setConfirmHide(true);
            // Auto-reset konfirmasi setelah 3 detik
            setTimeout(() => setConfirmHide(false), 3000);
            return;
        }
        try {
            setHiding(true);
            await updateDoc(doc(db, "transactions", order.id), {
                is_hidden: true,
            });
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
    const isLunas = order.statusBayar === 'Lunas';

    const getProgressColor = (persen) => {
        if (persen >= 100) return '#ef4444';
        if (persen >= 80) return '#f97316';
        if (persen >= 60) return '#f59e0b';
        return '#22c55e';
    };

    const containerStyle = {
        ...styles.orderRow,
        borderLeft: `5px solid ${isReady ? '#cbd5e1' : (sla.borderColor || 'transparent')}`,
        backgroundColor: isReady ? '#f8fafc' : (sla.bg || '#fff'),
        opacity: isReady ? 0.65 : 1,
    };

    return (
        <div style={containerStyle} onClick={() => onClick(order)}>
            {/* Baris 1: Nama + Tanggal */}
            <div style={styles.row}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={styles.customerName}>{order.nama || 'Tanpa Nama'}</span>
                    </div>
                    <div style={styles.customerPhone}>{order.hp || '-'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={styles.dateText}>Masuk: {order.tanggal || '-'}</div>
                    {slaData?.tglSelesai && !isReady && (
                        <div style={{ ...styles.deadlineText, color: sla.color }}>
                            Selesai: {slaData.tglSelesai}
                        </div>
                    )}
                </div>
            </div>

            {/* Baris 2: SLA Warning */}
            {sla.text && !isReady && (
                <div style={{ ...styles.slaText, color: sla.color }}>{sla.text}</div>
            )}

            {/* Baris 3: Item summary */}
            <div style={styles.itemSummary}>
                🧺 {Array.isArray(order.items) && order.items.length > 0
                    ? order.items.map(it => `${it.qty}× ${it.nama}`).join(', ')
                    : order.total || 'Tidak ada item'}
            </div>

            {/* Baris 4: Sisa hari + tombol hide (hanya untuk Ready) */}
            {isReady && (
                <div style={styles.readyBar}>
                    {/* Badge sisa hari */}
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        backgroundColor: sisaHari <= 2 ? '#fee2e2' : '#fef3c7',
                        color: sisaHari <= 2 ? '#ef4444' : '#d97706',
                    }}>
                        🕐 {sisaHari > 0 ? `${sisaHari} hr lagi (auto-hide)` : 'Akan segera tersembunyi'}
                    </span>

                    {/* Tombol hide manual — hanya admin */}
                    {isAdmin && (
                        <button
                            onClick={handleHide}
                            disabled={hiding}
                            style={{
                                ...styles.hideBtn,
                                backgroundColor: confirmHide ? '#ef4444' : '#f1f5f9',
                                color: confirmHide ? '#fff' : '#64748b',
                                transform: confirmHide ? 'scale(1.05)' : 'scale(1)',
                            }}
                        >
                            {hiding ? '...' : confirmHide ? '⚠️ Yakin hide?' : '🙈 Hide'}
                        </button>
                    )}
                </div>
            )}

            {/* Baris 5: Progress bar + Badges */}
            <div style={styles.bottomRow}>
                {!isReady && slaData && (
                    <div style={styles.progressWrap}>
                        <div style={styles.progressTrack}>
                            <div style={{
                                ...styles.progressFill,
                                width: `${sla.persen}%`,
                                backgroundColor: getProgressColor(sla.persen),
                            }} />
                        </div>
                        <span style={{ ...styles.progressLabel, color: getProgressColor(sla.persen) }}>
                            {slaData.hariKe}/5
                        </span>
                    </div>
                )}

                <div style={styles.badgeGroup}>
                    <span style={{ ...styles.smallBadge, backgroundColor: metodeBadge.bg, color: metodeBadge.color }}>
                        {metodeBadge.icon} {metodeBadge.label}
                    </span>
                    <span style={{
                        ...styles.smallBadge,
                        backgroundColor: isLunas ? '#dcfce7' : '#fee2e2',
                        color: isLunas ? '#15803d' : '#ef4444',
                    }}>
                        {isLunas ? '✅ Lunas' : '🔴 Belum'}
                    </span>
                    <span style={{
                        ...styles.smallBadge,
                        backgroundColor: order.status === 'Ready Anter' ? '#dcfce7'
                            : order.status === 'Sudah Dicuci' ? '#fef3c7' : '#f1f5f9',
                        color: order.status === 'Ready Anter' ? '#15803d'
                            : order.status === 'Sudah Dicuci' ? '#d97706' : '#64748b',
                    }}>
                        {order.status === 'Ready Anter' ? '✅ Ready'
                            : order.status === 'Sudah Dicuci' ? '🧼 Dicuci' : '⏳ Waiting'}
                    </span>
                </div>
            </div>
        </div>
    );
}

const styles = {
    orderRow: {
        padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer', transition: 'all 0.2s',
    },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    customerName: { fontWeight: 'bold', fontSize: '14px', color: '#1e293b' },
    customerPhone: { fontSize: '12px', color: '#94a3b8', marginTop: 1 },
    slaText: { fontSize: '11px', fontWeight: '800', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' },
    itemSummary: { fontSize: '11px', color: '#64748b', marginBottom: 8, fontStyle: 'italic' },
    dateText: { fontSize: '10px', color: '#94a3b8' },
    deadlineText: { fontSize: '10px', fontWeight: 'bold', marginTop: 2 },
    readyBar: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, gap: 8,
    },
    hideBtn: {
        border: 'none', borderRadius: 6, padding: '4px 10px',
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.2s', flexShrink: 0,
    },
    bottomRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    progressWrap: { display: 'flex', alignItems: 'center', gap: 6, flex: 1, maxWidth: 120 },
    progressTrack: { flex: 1, height: 6, backgroundColor: '#f1f5f9', borderRadius: 10, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 10, transition: 'width 0.3s' },
    progressLabel: { fontSize: 10, fontWeight: 700, flexShrink: 0 },
    badgeGroup: { display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
    smallBadge: { padding: '3px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700 },
};

export default OrderRow;