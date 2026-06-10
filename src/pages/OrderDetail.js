import React from 'react';
import { useAuth } from '../context/AuthContext';

function OrderDetail({ order, onBack, onEditClick, onDeleteClick }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    if (!order) return null;

    const rupiah = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

    const totalHarga = Array.isArray(order.items)
        ? order.items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0)
        : Number(order.total_harga) || 0;

    const adaBelumDiukur = Array.isArray(order.items) &&
        order.items.some(it => it.satuan === 'meter' && (!it.luas || it.luas === 0));

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Ready Anter': return { label: '✅ Ready Anter', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
            case 'Sudah Dicuci': return { label: '🧼 Sudah Dicuci', bg: '#fef3c7', color: '#d97706', border: '#fcd34d' };
            default: return { label: '⏳ Waiting List', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
        }
    };

    const getPayBadge = (statusBayar) => {
        return statusBayar === 'Lunas'
            ? { label: '✅ Lunas', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
            : { label: '⏳ Belum Lunas', bg: '#fef3c7', color: '#d97706', border: '#fcd34d' };
    };

    const statusBadge = getStatusBadge(order.status);
    const payBadge = getPayBadge(order.statusBayar);

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.topBar}>
                <button onClick={onBack} style={styles.backBtn}>← Kembali</button>
                <span style={styles.topBarTitle}>Detail Order</span>
                <div style={{ width: 80 }} />
            </div>

            <div style={styles.scrollArea}>
                {/* Customer Card */}
                <div style={styles.customerCard}>
                    <div style={styles.avatar}>
                        {(order.nama || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={styles.customerName}>{order.nama || '-'}</div>
                        <div style={styles.customerPhone}>📱 {order.hp || '-'}</div>
                        <div style={styles.notaId}>#{order.notaId || order.id}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={styles.tanggalLabel}>Masuk</div>
                        <div style={styles.tanggalValue}>{order.tanggal || '-'}</div>
                    </div>
                </div>

                {/* Status Badges */}
                <div style={styles.badgeRow}>
                    {/* Staff tidak lihat badge status bayar & metode bayar */}
                    {isAdmin && (
                        <span style={{ ...styles.badge, backgroundColor: payBadge.bg, color: payBadge.color, border: `1px solid ${payBadge.border}` }}>
                            {payBadge.label}
                        </span>
                    )}
                    <span style={{ ...styles.badge, backgroundColor: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}` }}>
                        {statusBadge.label}
                    </span>
                    {isAdmin && order.metode_pembayaran && (
                        <span style={{ ...styles.badge, backgroundColor: '#f0fefe', color: '#028585', border: '1px solid #B3F0F0' }}>
                            💳 {order.metode_pembayaran}
                        </span>
                    )}
                </div>

                {/* Items */}
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>🧺 Detail Item</div>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                        order.items.map((item, i) => {
                            const belumDiukur = item.satuan === 'meter' && (!item.luas || item.luas === 0);
                            return (
                                <div key={i} style={styles.itemCard}>
                                    <div style={styles.itemTop}>
                                        <span style={styles.itemNama}>{item.nama}</span>
                                        {/* Subtotal — hanya admin */}
                                        {isAdmin && (
                                            <span style={styles.itemSubtotal}>
                                                {belumDiukur ? '—' : rupiah(item.subtotal)}
                                            </span>
                                        )}
                                    </div>

                                    {belumDiukur ? (
                                        <div style={styles.itemSub}>⚠️ Menunggu pengukuran</div>
                                    ) : item.satuan === 'meter' ? (
    <div style={styles.itemSub}>
        📐 {Number(item.luas || 0).toFixed(2)}m²
        {isAdmin && <> × {rupiah(item.harga)}/m²</>}
    </div>
                                    ) : (
                                        <div style={styles.itemSub}>
                                            {/* Jumlah pcs boleh dilihat staff, harga per pcs hanya admin */}
                                            {item.qty} pcs
                                            {isAdmin && <> × {rupiah(item.harga)}</>}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>
                            Tidak ada detail item
                        </div>
                    )}
                </div>

                {/* Total — hanya admin */}
                {isAdmin && (
                    <div style={styles.totalCard}>
                        {adaBelumDiukur ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, color: '#d97706' }}>Subtotal sementara</span>
                                    <span style={{ fontWeight: 700, color: '#d97706' }}>{rupiah(totalHarga)}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#d97706', textAlign: 'center' }}>
                                    ⚠️ Total menyusul setelah pengukuran karpet
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#028585' }}>Total</span>
                                <span style={{ fontSize: 20, fontWeight: 800, color: '#028585' }}>{rupiah(totalHarga)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Catatan */}
                {order.catatan ? (
                    <div style={styles.catatanBox}>
                        <div style={styles.sectionTitle}>📝 Catatan</div>
                        <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>{order.catatan}</div>
                    </div>
                ) : null}

                <div style={{ height: 140 }} />
            </div>

            {/* Action Buttons */}
            <div style={styles.actionContainer}>
                {/* Hapus — hanya admin */}
                {isAdmin && (
                    <button style={styles.deleteBtn} onClick={onDeleteClick}>
                        🗑️ Hapus Transaksi
                    </button>
                )}
                <button style={styles.editBtn} onClick={onEditClick}>
                    ✏️ {isAdmin ? 'Edit Order' : 'Update Status'}
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex', flexDirection: 'column',
        height: '100%', backgroundColor: '#f8fafc',
        fontFamily: 'Inter, sans-serif', position: 'relative',
        overflow: 'hidden',
    },
    topBar: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', backgroundColor: '#fff',
        borderBottom: '1px solid #f1f5f9', flexShrink: 0,
    },
    backBtn: {
        border: 'none', background: 'none', color: '#04CDCD',
        cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
        padding: 0, width: 80,
    },
    topBarTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b' },
    scrollArea: { flex: 1, overflowY: 'auto', padding: '16px 20px' },
    customerCard: {
        backgroundColor: '#fff', borderRadius: 16,
        padding: '16px', marginBottom: 12,
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
    },
    avatar: {
        width: 44, height: 44, borderRadius: '50%',
        backgroundColor: '#04CDCD', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, flexShrink: 0,
    },
    customerName: { fontSize: 16, fontWeight: 800, color: '#1e293b' },
    customerPhone: { fontSize: 12, color: '#64748b', marginTop: 2 },
    notaId: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
    tanggalLabel: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
    tanggalValue: { fontSize: 12, fontWeight: 700, color: '#475569', marginTop: 2 },
    badgeRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    badge: { padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
    section: {
        backgroundColor: '#fff', borderRadius: 16,
        padding: '16px', marginBottom: 12,
        border: '1px solid #f1f5f9',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    sectionTitle: {
        fontSize: 11, fontWeight: 700, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12,
    },
    itemCard: { borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 10 },
    itemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    itemNama: { fontSize: 13, fontWeight: 600, color: '#1e293b' },
    itemSubtotal: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
    itemSub: { fontSize: 11, color: '#64748b', marginTop: 3 },
    totalCard: {
        backgroundColor: '#e0fafa', borderRadius: 14,
        padding: '16px', marginBottom: 12,
        border: '1px solid #B3F0F0',
    },
    catatanBox: {
        backgroundColor: '#fff', borderRadius: 16,
        padding: '14px 16px', marginBottom: 12,
        border: '1px solid #f1f5f9',
    },
    actionContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 20px 24px', backgroundColor: '#fff',
        borderTop: '1px solid #f1f5f9',
        display: 'flex', flexDirection: 'column', gap: 10,
    },
    editBtn: {
        padding: '14px', backgroundColor: '#04CDCD', color: '#fff',
        border: 'none', borderRadius: 12, fontWeight: 'bold',
        cursor: 'pointer', fontSize: 15,
    },
    deleteBtn: {
        padding: '12px', backgroundColor: '#fff', color: '#ef4444',
        border: '1px solid #ef4444', borderRadius: 12,
        fontWeight: 'bold', cursor: 'pointer', fontSize: 13,
    },
};

export default OrderDetail;