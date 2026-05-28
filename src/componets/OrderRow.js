import React from 'react';

function OrderRow({ order, onClick }) {

    const getTrackingSLA = (tglMasukStr, statusSekarang) => {
        if (!tglMasukStr || typeof tglMasukStr !== 'string') {
            return { text: '', color: '#94a3b8', isAlert: false, sisa: null, tglSelesai: null };
        }

        if (statusSekarang === 'Ready Anter') {
            return { text: '', color: '#22c55e', isAlert: false, sisa: null, tglSelesai: null };
        }

        const bulanIndo = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
        const parts = tglMasukStr.split(' ');

        if (parts.length < 3) return { text: '', color: '#94a3b8', isAlert: false, sisa: null, tglSelesai: null };

        const tglMasuk = new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));

        const tglSelesaiObj = new Date(tglMasuk);
        tglSelesaiObj.setDate(tglMasuk.getDate() + 5);
        const formatTglSelesai = tglSelesaiObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

        const hariIni = new Date();
        hariIni.setHours(0, 0, 0, 0);
        tglMasuk.setHours(0, 0, 0, 0);

        const selisihHari = Math.floor((hariIni - tglMasuk) / (1000 * 60 * 60 * 24)) + 1;
        const sisaHari = 5 - selisihHari;

        let result = { text: '', color: '', isAlert: false, sisa: sisaHari, tglSelesai: formatTglSelesai };

        if (selisihHari >= 5) {
            result = { ...result, text: `🚨 EXPIRED: ${selisihHari} HARI`, color: '#ef4444', isAlert: true };
        } else if (selisihHari > 3) {
            result = { ...result, text: `⚠️ WARNING: HARI KE-${selisihHari}`, color: '#ef4444', isAlert: true };
        }
        else if (selisihHari > 2) {
            result = { ...result, text: `⚠️ WARNING: HARI KE-${selisihHari}`, color: '#f59e0b', isAlert: true };
        }
        return result;
    };

    const sla = getTrackingSLA(order.tanggal, order.status);

    // 2. Logika Badge Status
    const getStatusInfo = (status) => {
        switch (status) {
            case 'Ready Anter': return { label: 'Ready', color: '#22c55e' };
            case 'Sudah Dicuci': return { label: 'Sudah Dicuci', color: '#f59e0b' };
            case 'Waiting List': return { label: 'Waiting List', color: '#94a3b8' };
            default: return { label: status, color: '#94a3b8' };
        }
    };

    const statusInfo = getStatusInfo(order.status);

    const containerStyle = {
        ...styles.orderRow,
        borderLeft: sla.isAlert ? `6px solid ${sla.color}` : '6px solid transparent',
        backgroundColor: sla.isAlert ? `${sla.color}08` : '#fff'
    };

    // Ganti bagian return <div style={containerStyle} ... > dengan ini:
    return (
        <div style={containerStyle} onClick={() => onClick(order)}>
            <div style={{ flex: 1.6 }}>
                <div style={styles.customerName}>{order.nama || "Tanpa Nama"}</div>
                <div style={styles.customerPhone}>{order.hp || "-"}</div>
                {sla.text && <div style={{ ...styles.slaText, color: sla.color }}>{sla.text}</div>}
                <div style={styles.itemSummary}>🧺 {order.total || "Tidak ada item"}</div>
            </div>

            <div style={{ flex: 1.2, paddingRight: '4px', textAlign: 'right' }}>
                {/* Pastikan hanya merender string, bukan objek */}
                <div style={styles.dateText}>Masuk: {typeof order.tanggal === 'string' ? order.tanggal : 'Data tidak valid'}</div>
                {sla.tglSelesai && <div style={styles.deadlineText}>Selesai: {sla.tglSelesai}</div>}
            </div>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <span style={{ ...styles.badge, backgroundColor: statusInfo.color }}>
                    {statusInfo.label}
                </span>
            </div>
        </div>
    );
}

const styles = {
    orderRow: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' },
    customerName: { fontWeight: 'bold', fontSize: '14px', color: '#1e293b' },
    customerPhone: { fontSize: '12px', color: '#94a3b8' },
    slaText: { fontSize: '11px', fontWeight: '800', marginTop: '4px', textTransform: 'uppercase' },
    itemSummary: { fontSize: '11px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' },
    dateText: { fontSize: '10px', color: '#94a3b8' },
    deadlineText: { fontSize: '10px', fontWeight: 'bold', color: '#475569', marginTop: '2px' },
    badge: { color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', textAlign: 'center', minWidth: '70px' }
};

export default OrderRow;