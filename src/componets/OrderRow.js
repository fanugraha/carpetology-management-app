import React from 'react';

function OrderRow({ order, onClick }) {
    // 1. Logika SLA tetap sama (dengan perbaikan pemanggilan tglSelesai)
    const getTrackingSLA = (tglMasukStr, statusSekarang) => {
        // Jika sudah Ready Anter, kembalikan warna hijau
        if (statusSekarang === 'Ready Anter') {
            return { text: '', color: '#22c55e', isAlert: false, tglSelesai: null };
        }

        const bulanIndo = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
        const parts = tglMasukStr.split(' ');
        const tglMasuk = new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));
        tglMasuk.setHours(0, 0, 0, 0);

        const tglSelesai = new Date(tglMasuk);
        tglSelesai.setDate(tglMasuk.getDate() + 5);
        const formatTglSelesai = tglSelesai.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        const hariIni = new Date();
        hariIni.setHours(0, 0, 0, 0);

        const selisihDariMasuk = Math.floor((hariIni - tglMasuk) / (1000 * 60 * 60 * 24));
        const selisihKeSelesai = Math.floor((tglSelesai - hariIni) / (1000 * 60 * 60 * 24));

        let result = { text: '', color: '', isAlert: false, tglSelesai: formatTglSelesai };

        if (hariIni > tglSelesai) {
            result = { ...result, text: `⚠️ TERLAMBAT ${Math.abs(selisihKeSelesai)} HARI`, color: '#ef4444', isAlert: true };
        } else if (hariIni.getTime() === tglSelesai.getTime()) {
            result = { ...result, text: `🚨 HARI INI: SEGERA PROSES`, color: '#ef4444', isAlert: true };
        } else if (selisihKeSelesai === 1) {
            result = { ...result, text: `⏳ H-1: SEGERA PROSES`, color: '#f59e0b', isAlert: true };
        } else if (selisihDariMasuk >= 2) {
            result = { ...result, text: `⚠️ PERINGATAN: 2 HARI BELUM DIPROSES`, color: '#f59e0b', isAlert: true };
        } else {
            result = { ...result, text: `⏱️ Hari ke-${selisihDariMasuk}`, color: '#64748b', isAlert: false };
        }
        return result;
    };

    const sla = getTrackingSLA(order.tanggal, order.status);

    // Update warna badge: Ready Anter selalu hijau
    const getBadgeColor = (status) => {
        if (status === 'Ready Anter') return '#22c55e'; // Hijau
        return sla.isAlert ? sla.color : '#94a3b8';
    };

    return (
        <div style={{ ...styles.orderRow, borderLeft: sla.isAlert ? `4px solid ${sla.color}` : '4px solid transparent' }} onClick={() => onClick(order)}>
            <div style={{ flex: 1.6 }}>
                <div style={styles.customerName}>{order.nama}</div>
                <div style={styles.customerPhone}>{order.hp}</div>
                {sla.text && <div style={{ ...styles.slaText, color: sla.color }}>{sla.text}</div>}
                <div style={styles.itemSummary}>🧺 {order.total || "Tidak ada item"}</div>
            </div>

            <div style={{ flex: 1.2, paddingRight: '4px', textAlign: 'right' }}>
                <div style={styles.dateText}>Masuk: {order.tanggal}</div>
                {/* Tampilan tanggal selesai dipastikan muncul */}
                {sla.tglSelesai && <div style={styles.deadlineText}>Selesai: {sla.tglSelesai}</div>}
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <span style={{ ...styles.badge, backgroundColor: getBadgeColor(order.status) }}>
                    {order.status}
                </span>
            </div>
        </div>
    );
}

const styles = {
    orderRow: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fff' },
    customerName: { fontWeight: 'bold', fontSize: '14px', color: '#1e293b' },
    customerPhone: { fontSize: '12px', color: '#94a3b8' },
    slaText: { fontSize: '11px', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' },
    itemSummary: { fontSize: '11px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' },
    dateText: { fontSize: '10px', color: '#94a3b8' },
    deadlineText: { fontSize: '10px', fontWeight: 'bold', color: '#475569', marginTop: '2px' },
    badge: { color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', minWidth: '70px' }
};

export default OrderRow;