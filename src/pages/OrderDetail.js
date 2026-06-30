import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
    ArrowLeft, Phone, CheckCircle, Clock, WashingMachine,
    CreditCard, Package, FileText, Ruler, AlertTriangle,
    Trash2, Pencil, Truck
} from 'lucide-react';

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

    const getStatusConfig = (status) => {
        switch (status) {
            case 'Ready Anter':
            case 'Siap Diambil':
                return { label: 'Siap Diambil', icon: <CheckCircle size={11} />, bg: '#dcfce7', color: '#15803d', border: '#86efac' };
            case 'Siap Diantar':
                return { label: 'Siap Diantar', icon: <Truck size={11} />, bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' };
            case 'Sudah Diantar':
                return { label: 'Sudah Diantar', icon: <CheckCircle size={11} />, bg: '#dcfce7', color: '#15803d', border: '#86efac' };
            case 'Sudah Dicuci':
                return { label: 'Sudah Dicuci', icon: <WashingMachine size={11} />, bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
            default:
                return { label: 'Waiting List', icon: <Clock size={11} />, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
        }
    };

    const getPayBadge = (statusBayar) => statusBayar === 'Lunas'
        ? { label: 'Lunas', icon: <CheckCircle size={11} />, bg: '#dcfce7', color: '#15803d', border: '#86efac' }
        : { label: 'Belum Lunas', icon: <Clock size={11} />, bg: '#fef3c7', color: '#d97706', border: '#fcd34d' };

    const statusCfg = getStatusConfig(order.status_order || order.status);
    const payBadge = getPayBadge(order.statusBayar);

    return (
        <div style={S.page}>

            {/* ── Hero Header ── */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <div style={S.heroLeft}>
                        <button onClick={onBack} style={S.backBtn}>
                            <ArrowLeft size={14} /> Kembali
                        </button>
                        <div style={S.heroMeta}>
                            <div style={S.heroTitle}>Detail Order</div>
                            <div style={S.heroSub}>#{order.notaId || order.id}</div>
                        </div>
                    </div>
                    <div style={S.avatar}>
                        {(order.nama || '?').charAt(0).toUpperCase()}
                    </div>
                </div>

                {/* Customer info strip */}
                <div style={S.heroStrip}>
                    <div style={S.heroName}>{order.nama || '-'}</div>
                    <div style={S.heroPhone}>
                        <Phone size={11} color="#6B8894" /> {order.hp || '-'}
                    </div>
                    <div style={S.heroBadgeRow}>
                        <span style={{ ...S.heroBadge, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                            {statusCfg.icon} {statusCfg.label}
                        </span>
                        {isAdmin && (
                            <span style={{ ...S.heroBadge, background: payBadge.bg, color: payBadge.color, border: `1px solid ${payBadge.border}` }}>
                                {payBadge.icon} {payBadge.label}
                            </span>
                        )}
                        {isAdmin && order.metode_pembayaran && (
                            <span style={{ ...S.heroBadge, background: '#f0fefe', color: '#028585', border: '1px solid #B3F0F0' }}>
                                <CreditCard size={11} /> {order.metode_pembayaran}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Scroll area ── */}
            <div style={S.scrollArea}>

                {/* Info tanggal */}
                <div style={S.infoGrid}>
                    <div style={S.infoCell}>
                        <div style={S.infoLabel}>Tanggal Masuk</div>
                        <div style={S.infoVal}>{order.tanggal || '-'}</div>
                    </div>
                    <div style={S.infoCell}>
                        <div style={S.infoLabel}>Nota ID</div>
                        <div style={{ ...S.infoVal, fontFamily: 'monospace', fontSize: 11 }}>#{order.notaId || order.id}</div>
                    </div>
                </div>

                {/* Items */}
                <div style={S.card}>
                    <div style={S.sectionTitle}>
                        <Package size={11} /> Detail Item
                    </div>
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                        order.items.map((item, i) => {
                            const belumDiukur = item.satuan === 'meter' && (!item.luas || item.luas === 0);
                            return (
                                <div key={i} style={{
                                    ...S.itemRow,
                                    borderBottom: i < order.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                                }}>
                                    <div style={S.itemTop}>
                                        <span style={S.itemNama}>{item.nama}</span>
                                        {isAdmin && (
                                            <span style={S.itemSubtotal}>
                                                {belumDiukur ? '—' : rupiah(item.subtotal)}
                                            </span>
                                        )}
                                    </div>
                                    {belumDiukur ? (
                                        <div style={{ ...S.itemSub, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <AlertTriangle size={11} color="#d97706" /> Menunggu pengukuran
                                        </div>
                                    ) : item.satuan === 'meter' ? (
                                        <div style={{ ...S.itemSub, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Ruler size={11} /> {Number(item.luas || 0).toFixed(2)}m²
                                            {isAdmin && <> × {rupiah(item.harga)}/m²</>}
                                        </div>
                                    ) : (
                                        <div style={S.itemSub}>
                                            {item.qty} pcs{isAdmin && <> × {rupiah(item.harga)}</>}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ color: '#94a3b8', fontSize: 13, paddingTop: 8 }}>
                            Tidak ada detail item
                        </div>
                    )}
                </div>

                {/* Total — admin only */}
                {isAdmin && (
                    <div style={S.totalCard}>
                        {adaBelumDiukur ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, color: '#d97706' }}>Subtotal sementara</span>
                                    <span style={{ fontWeight: 700, color: '#d97706' }}>{rupiah(totalHarga)}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#d97706', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                    <AlertTriangle size={11} /> Total menyusul setelah pengukuran karpet
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
                {order.catatan && (
                    <div style={S.card}>
                        <div style={S.sectionTitle}>
                            <FileText size={11} /> Catatan
                        </div>
                        <div style={{ fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 1.6 }}>
                            {order.catatan}
                        </div>
                    </div>
                )}

                <div style={{ height: 140 }} />
            </div>

            {/* ── Action buttons ── */}
            <div style={S.actionBar}>
                {isAdmin && (
                    <button style={S.deleteBtn} onClick={onDeleteClick}>
                        <Trash2 size={14} /> Hapus Transaksi
                    </button>
                )}
                <button style={S.editBtn} onClick={onEditClick}>
                    <Pencil size={14} /> {isAdmin ? 'Edit Order' : 'Update Status'}
                </button>
            </div>
        </div>
    );
}

const S = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        position: 'relative',
        overflow: 'hidden',
    },
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '16px 20px 0',
        flexShrink: 0,
    },
    heroInner: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#a0b8c0',
        padding: '7px 12px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
    },
    heroMeta: {
        display: 'flex',
        flexDirection: 'column',
    },
    heroTitle: {
        fontSize: 15,
        fontWeight: 800,
        color: '#fff',
    },
    heroSub: {
        fontSize: 10,
        color: '#6B8894',
        marginTop: 1,
        fontFamily: 'monospace',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: '50%',
        backgroundColor: '#04CDCD',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        fontWeight: 800,
        flexShrink: 0,
    },
    heroStrip: {
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px 12px 0 0',
        padding: '14px 16px',
    },
    heroName: {
        fontSize: 16,
        fontWeight: 800,
        color: '#fff',
        marginBottom: 2,
    },
    heroPhone: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        color: '#6B8894',
        marginBottom: 10,
    },
    heroBadgeRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
    },
    heroBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
    },
    scrollArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px 0',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 10,
    },
    infoCell: {
        background: '#fff',
        borderRadius: 10,
        padding: '10px 12px',
        border: '1px solid #e8edf2',
    },
    infoLabel: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        marginBottom: 3,
    },
    infoVal: {
        fontSize: 13,
        fontWeight: 700,
        color: '#1e293b',
    },
    card: {
        background: '#fff',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 10,
        border: '1px solid #e8edf2',
    },
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.7px',
        marginBottom: 12,
    },
    itemRow: {
        paddingBottom: 10,
        marginBottom: 10,
    },
    itemTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemNama: {
        fontSize: 13,
        fontWeight: 600,
        color: '#1e293b',
    },
    itemSubtotal: {
        fontSize: 13,
        fontWeight: 700,
        color: '#1e293b',
    },
    itemSub: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 3,
    },
    totalCard: {
        backgroundColor: '#e0fafa',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 10,
        border: '1px solid #B3F0F0',
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 16px 24px',
        backgroundColor: '#fff',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    editBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '14px',
        backgroundColor: '#04CDCD',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontSize: 14,
        fontFamily: 'inherit',
    },
    deleteBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '11px',
        backgroundColor: '#fff',
        color: '#ef4444',
        border: '1px solid #fecaca',
        borderRadius: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'inherit',
    },
};

export default OrderDetail;