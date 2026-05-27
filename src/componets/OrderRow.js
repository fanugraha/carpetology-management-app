import React from 'react';

function OrderRow({ order, onClick }) {
    const getTrackingSLA = (tanggalOrder, statusSekarang) => {
        if (statusSekarang === 'Ready Anter') return { text: '', color: 'transparent', isAlert: false };

        const formatTanggal = (tglStr) => {
            const bulanIndo = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
            const parts = tglStr.split(' ');
            if (parts.length < 3) return new Date();
            return new Date(parts[2], bulanIndo[parts[1]], parts[0]);
        };

        const tglPembuatan = formatTanggal(tanggalOrder);
        const selisihHari = Math.floor((new Date() - tglPembuatan) / (1000 * 60 * 60 * 24));

        if (selisihHari >= 5) {
            return { text: `⚠️ TELAT ${selisihHari - 5} HARI (Sudah ${selisihHari} hari)`, color: '#ef4444', isAlert: true };
        } else if (selisihHari === 4 || selisihHari === 3) {
            return { text: `⏳ Sisa ${5 - selisihHari} Hari Lagi`, color: '#f97316', isAlert: true };
        }
        return { text: `⏱️ Hari ke-${selisihHari}`, color: '#64748b', isAlert: false };
    };

    const sla = getTrackingSLA(order.tanggal, order.status);

    const getBadgeColor = (status) => {
        switch (status) {
            case 'Waiting List': return '#f43f5e';
            case 'Sudah Dicuci': return '#eab308';
            case 'Ready Anter': return '#22c55e';
            default: return '#94a3b8';
        }
    };

    return (
        <div
            style={{
                ...styles.orderRow,
                backgroundColor: sla.isAlert ? `${sla.color}08` : '#fff',
                borderLeft: sla.isAlert ? `4px solid ${sla.color}` : '4px solid transparent'
            }}
            onClick={() => onClick(order)}
        >
            <div style={{ flex: 1.6 }}>
                <div style={styles.customerName}>{order.nama}</div>
                <div style={styles.customerPhone}>{order.hp}</div>
                {sla.text && <div style={{ ...styles.slaText, color: sla.color }}>{sla.text}</div>}
                <div style={styles.itemSummary}>🧺 {order.total || "Tidak ada item"}</div>
            </div>

            <div style={{ flex: 1.2, paddingRight: '4px' }}>
                <div style={styles.timeText}>{order.waktu}</div>
                <div style={styles.dateText}>{order.tanggal}</div>
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
    orderRow: { display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' },
    customerName: { fontWeight: 'bold', fontSize: '14px', color: '#1e293b' },
    customerPhone: { fontSize: '12px', color: '#94a3b8', marginTop: '1px' },
    slaText: { fontSize: '11px', fontWeight: 'bold', marginTop: '3px' },
    itemSummary: { fontSize: '12px', color: '#475569', fontWeight: '500', marginTop: '5px', fontStyle: 'italic' },
    timeText: { fontSize: '12px', fontWeight: 'bold', color: '#1e293b', textAlign: 'right' },
    dateText: { fontSize: '11px', color: '#94a3b8', marginTop: '1px', textAlign: 'right' },
    badge: { color: '#fff', padding: '5px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', minWidth: '75px' }
};

export default OrderRow;