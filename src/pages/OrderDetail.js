import React from 'react';

function OrderDetail({ order, onBack, onEditClick, onDeleteClick }) {
    if (!order) return null;

    // Fungsi untuk memastikan tanggal selalu berupa string
    const formatTimestamp = (val) => {
        if (!val) return "-";
        if (typeof val === 'object' && val.seconds) {
            return new Date(val.seconds * 1000).toLocaleDateString('id-ID', { 
                day: '2-digit', month: 'short', year: 'numeric' 
            });
        }
        return val;
    };

    const getBadgeColor = (status) => {
        if (status === 'Ready Anter') return '#22c55e';
        if (status === 'Sudah Dicuci') return '#f59e0b';
        return '#94a3b8';
    };

    return (
        <div style={styles.container}>
            <button onClick={onBack} style={styles.backBtn}>⬅ Kembali</button>

            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <div>
                        <h3 style={styles.customerName}>{order.nama}</h3>
                        <small style={styles.customerPhone}>{order.hp}</small>
                    </div>
                    <div style={styles.dateWrapper}>
                        <small style={styles.timeText}>{formatTimestamp(order.waktu)}</small>
                        <small style={styles.dateText}>{formatTimestamp(order.tanggal)}</small>
                    </div>
                </div>

                <div style={styles.itemSection}>
                    <p style={styles.sectionTitle}>Detail Item</p>
                    {order.items && order.items.map((item, i) => (
                        <div key={i} style={styles.itemRow}>🧺 {item.nama}</div>
                    ))}
                </div>

                <div style={styles.cardFooter}>
                    <div style={styles.totalRow}>
                        <span>Ringkasan:</span>
                        <span style={styles.totalText}>{order.total}</span>
                    </div>
                    <div style={styles.badgeGroup}>
                        <span style={{ ...styles.badge, backgroundColor: order.statusBayar === 'Lunas' ? '#22c55e' : '#ef4444' }}>
                            {order.statusBayar || 'Belum Lunas'}
                        </span>
                        <span style={{ ...styles.badge, backgroundColor: getBadgeColor(order.status) }}>
                            {order.status === 'Ready Anter' ? 'Ready' : order.status}
                        </span>
                    </div>
                </div>
            </div>

            <div style={styles.actionContainer}>
                <button style={styles.deleteBtn} onClick={onDeleteClick}>🗑️ Hapus Transaksi</button>
                <button style={styles.editBtn} onClick={onEditClick}>Edit Status Order</button>
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '20px', backgroundColor: '#f8fafc', height: '100%', position: 'relative', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },
    backBtn: { border: 'none', background: 'none', color: '#04CDCD', cursor: 'pointer', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold', padding: 0 },
    card: { backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '14px' },
    customerName: { margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' },
    customerPhone: { color: '#64748b', fontSize: '13px', display: 'block', marginTop: '2px' },
    dateWrapper: { textAlign: 'right', flex: 1 },
    timeText: { display: 'block', fontWeight: 'bold', color: '#1e293b', fontSize: '13px' },
    dateText: { color: '#64748b', fontSize: '11px', display: 'block', marginTop: '2px' },
    itemSection: { borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '14px' },
    sectionTitle: { fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 10px 0' },
    itemRow: { margin: '8px 0', fontSize: '15px', color: '#334155', fontWeight: '500' },
    cardFooter: { display: 'flex', flexDirection: 'column', gap: '14px' },
    totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#64748b' },
    totalText: { fontWeight: 'bold', color: '#1e293b', textAlign: 'right' },
    badgeGroup: { display: 'flex', gap: '8px' },
    badge: { color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
    actionContainer: { position: 'absolute', bottom: '20px', left: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
    editBtn: { padding: '15px', backgroundColor: '#04CDCD', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' },
    deleteBtn: { padding: '12px', backgroundColor: '#fff', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }
};

export default OrderDetail;