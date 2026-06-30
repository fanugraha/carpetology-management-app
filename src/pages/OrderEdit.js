import React, { useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
    doc, updateDoc, serverTimestamp,
    collection, addDoc, query, where, getDocs,
} from 'firebase/firestore';
import {
    ArrowLeft, User, Package, CreditCard, Banknote,
    QrCode, Building2, Clock, WashingMachine, CheckCircle,
    FileText, Save, Ruler, AlertTriangle, Loader2, Truck
} from 'lucide-react';

/* ─────────────────────────────────────────────
   AUTO-JADWAL DELIVERY (sama persis seperti di OrderRow.jsx)
   Disalin agar konsisten — kalau status diubah lewat halaman Edit
   ini, behaviour-nya harus identik dengan quick-update di Order List.
───────────────────────────────────────────── */
function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNextDeliveryDateKey(from = new Date()) {
    const day = from.getDay(); // 0=Min ... 6=Sab
    const d = new Date(from);
    if (day === 2 || day === 4) {
        // Selasa / Kamis: hari itu juga
    } else if (day === 6) {
        // Sabtu: lompat ke Selasa minggu depan
        d.setDate(d.getDate() + 3);
    } else {
        const diffMap = { 1: 1, 3: 1, 5: 1, 0: 2 };
        d.setDate(d.getDate() + diffMap[day]);
    }
    return toDateKey(d);
}

async function jadwalkanDeliveryOtomatis(order) {
    try {
        const q = query(
            collection(db, 'pickups'),
            where('order_id', '==', order.id),
            where('tipe', '==', 'delivery'),
        );
        const snap = await getDocs(q);
        const sudahAdaAktif = snap.docs.some(d => d.data().status !== 'Dibatalkan');
        if (sudahAdaAktif) return;

        await addDoc(collection(db, 'pickups'), {
            nama: order.nama || '-',
            no_hp: order.hp || '-',
            alamat: '',
            catatan: '',
            tanggal: getNextDeliveryDateKey(new Date()),
            tipe: 'delivery',
            status: 'Dijadwalkan',
            order_id: order.id,
            created_at: serverTimestamp(),
        });
    } catch (err) {
        console.error('Gagal jadwalkan delivery otomatis:', err);
    }
}

async function batalkanJadwalDeliveryJikaPending(orderId) {
    try {
        const q = query(
            collection(db, 'pickups'),
            where('order_id', '==', orderId),
            where('tipe', '==', 'delivery'),
            where('status', '==', 'Dijadwalkan'),
        );
        const snap = await getDocs(q);
        await Promise.all(
            snap.docs.map(d => updateDoc(doc(db, 'pickups', d.id), { status: 'Dibatalkan' }))
        );
    } catch (err) {
        console.error('Gagal batalkan jadwal delivery:', err);
    }
}

function OrderEdit({ order, onBack, onSaveSuccess }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [nama, setNama] = useState(order?.nama || '');
    const [hp, setHp] = useState(order?.hp || '');
    const [statusBayar, setStatusBayar] = useState(order?.statusBayar || 'Belum Lunas');
    const [statusOrder, setStatusOrder] = useState(order?.status_order || order?.status || 'Waiting List');
    const [isLoading, setIsLoading] = useState(false);
    const [metode, setMetode] = useState(order?.metode_pembayaran || 'Belum Payment');
    const [catatan, setCatatan] = useState(order?.catatan || '');
    const deliveryType = order?.delivery_type === 'antar_jemput' ? 'antar_jemput' : 'ambil_sendiri';


    const buildInitialItems = () => {
        if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
            return order.items.map((it) => ({
                produkId: it.produkId || it.nama,
                nama: it.nama || '',
                satuan: it.satuan || 'satuan',
                qty: Number(it.qty) || 1,
                harga: Number(it.harga) || 0,
                luas: it.luas != null ? Number(it.luas) : null,
                subtotal: Number(it.subtotal) || 0,
            }));
        }
        return [];
    };

    const [items, setItems] = useState(buildInitialItems);

    const toTitleCase = (str) =>
        str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const rupiah = (n) => 'Rp ' + (n || 0).toLocaleString('id-ID');

    const updateHarga = (idx, val) => {
        setItems(prev => prev.map((it, i) => {
            if (i !== idx) return it;
            const harga = parseFloat(val) || 0;
            const base = it.satuan === 'meter' ? (it.luas || 0) : 1;
            return { ...it, harga, subtotal: harga * it.qty * base };
        }));
    };

    const updateLuas = (idx, luas) => {
        setItems(prev => prev.map((it, i) => {
            if (i !== idx) return it;
            return { ...it, luas, subtotal: it.harga * it.qty * luas };
        }));
    };

    const stepLuas = (idx, delta) => {
        const item = items[idx];
        if (!item) return;
        const newLuas = Math.max(0, parseFloat(((item.luas || 0) + delta).toFixed(2)));
        updateLuas(idx, newLuas);
    };

    const totalHarga = items.reduce((s, it) => s + (it.subtotal || 0), 0);

    const handleSimpan = async () => {
        if (isAdmin && (!nama.trim() || !hp.trim())) {
            alert('Nama dan Nomor HP tidak boleh kosong!');
            return;
        }
        if (!window.confirm('Simpan perubahan pada order ini?')) return;

        try {
            setIsLoading(true);
            const statusSebelumnya = order?.status_order || order?.status;
            const wasReady = statusSebelumnya === 'Ready Anter';
            const isNowReady = statusOrder === 'Ready Anter';
            const readyAtPayload = isNowReady && !wasReady
                ? { ready_at: serverTimestamp() }
                : !isNowReady && wasReady
                    ? { ready_at: null }
                    : {};

            if (isAdmin) {
                const formattedNama = toTitleCase(nama.trim());
                const itemsPayload = items.map((it) => ({
                    produkId: it.produkId || it.nama,
                    nama: it.nama,
                    satuan: it.satuan,
                    qty: it.qty,
                    harga: it.harga,
                    panjang: null,
                    lebar: null,
                    luas: it.satuan === 'meter' ? (it.luas || 0) : null,
                    subtotal: it.subtotal,
                }));
                await updateDoc(doc(db, 'transactions', order.id), {
                    nama: formattedNama,
                    hp: hp.trim(),
                    status_order: statusOrder,
                    statusBayar,
                    metode_pembayaran: metode,
                    items: itemsPayload,
                    catatan,
                    total_harga: totalHarga,
                    ...readyAtPayload,
                });
            } else {
                await updateDoc(doc(db, 'transactions', order.id), {
                    status_order: statusOrder,
                    ...readyAtPayload,
                });
            }

            // ── Integrasi otomatis ke jadwal delivery (khusus antar_jemput) ──
            // Sama seperti di OrderRow.jsx, supaya update status lewat halaman
            // Edit Order ini juga ikut memicu/membatalkan jadwal delivery.
            if (deliveryType === 'antar_jemput' && statusSebelumnya !== statusOrder) {
                if (statusOrder === 'Siap Diantar') {
                    await jadwalkanDeliveryOtomatis({ id: order.id, nama: isAdmin ? toTitleCase(nama.trim()) : order.nama, hp: isAdmin ? hp.trim() : order.hp });
                } else if (statusSebelumnya === 'Siap Diantar' && statusOrder !== 'Sudah Diantar') {
                    await batalkanJadwalDeliveryJikaPending(order.id);
                }
            }

            alert('Data berhasil diperbarui!');
            if (typeof onSaveSuccess === 'function') onSaveSuccess();
        } catch (error) {
            alert('Gagal memperbarui data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const METODE_OPTIONS = [
        { id: 'Tunai', label: 'Tunai', icon: <Banknote size={18} color="#16a34a" /> },
        { id: 'QRIS', label: 'QRIS', icon: <QrCode size={18} color="#7c3aed" /> },
        { id: 'Transfer', label: 'Transfer', icon: <Building2 size={18} color="#0284c7" /> },
        { id: 'Belum Payment', label: 'Belum Payment', icon: <Clock size={18} color="#d97706" /> },
    ];


    const STATUS_OPTIONS = deliveryType === 'antar_jemput'
        ? [
            { val: 'Waiting List', icon: <Clock size={14} color="#94a3b8" />, label: 'Waiting List', desc: 'Order diterima, menunggu antrian' },
            { val: 'Sudah Dicuci', icon: <WashingMachine size={14} color="#f59e0b" />, label: 'Sudah Dicuci', desc: 'Proses cuci selesai' },
            { val: 'Siap Diantar', icon: <Truck size={14} color="#1d4ed8" />, label: 'Siap Diantar', desc: 'Menunggu dijemput kurir' },
            { val: 'Sudah Diantar', icon: <CheckCircle size={14} color="#22c55e" />, label: 'Sudah Diantar', desc: 'Sudah sampai ke customer' },
        ]
        : [
            { val: 'Waiting List', icon: <Clock size={14} color="#94a3b8" />, label: 'Waiting List', desc: 'Order diterima, menunggu antrian' },
            { val: 'Sudah Dicuci', icon: <WashingMachine size={14} color="#f59e0b" />, label: 'Sudah Dicuci', desc: 'Proses cuci selesai' },
            { val: 'Siap Diambil', icon: <CheckCircle size={14} color="#22c55e" />, label: 'Siap Diambil', desc: 'Siap diambil customer ke toko' },
        ];

    return (
        <div style={S.page}>

            {/* ── Loading overlay ── */}
            {isLoading && (
                <div style={S.overlay}>
                    <Loader2 size={36} color="#04CDCD" style={{ animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ color: '#64748b', fontSize: 13, marginTop: 12 }}>Menyimpan ke database...</p>
                </div>
            )}

            {/* ── Sticky top bar ── */}
            <div style={S.topBar}>
                <button onClick={onBack} style={S.backBtn}>
                    <ArrowLeft size={14} /> Kembali
                </button>
                <div style={S.topBarCenter}>
                    <div style={S.topBarTitle}>{isAdmin ? 'Edit Order' : 'Update Status'}</div>
                    <div style={S.topBarSub}>{order?.nama || '-'}</div>
                </div>
                <button onClick={handleSimpan} style={S.saveTopBtn}>Simpan</button>
            </div>

            {/* ── Scroll content ── */}
            <div style={S.scrollArea}>

                {/* Data Customer */}
                <div style={S.section}>
                    <div style={S.sectionTitle}>
                        <User size={11} /> Data Customer
                    </div>
                    <div style={S.inputGroup}>
                        <label style={S.label}>Nama Customer</label>
                        {isAdmin ? (
                            <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} style={S.input} />
                        ) : (
                            <div style={S.readOnly}>{nama}</div>
                        )}
                    </div>
                    <div style={S.inputGroup}>
                        <label style={S.label}>Nomor HP</label>
                        {isAdmin ? (
                            <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} style={S.input} />
                        ) : (
                            <div style={S.readOnly}>{hp}</div>
                        )}
                    </div>
                </div>

                {/* Items */}
                {items.length > 0 && (
                    <div style={S.section}>
                        <div style={S.sectionTitle}>
                            <Package size={11} /> Detail Item
                        </div>
                        {items.map((item, idx) => (
                            <div key={idx} style={{
                                ...S.itemCard,
                                borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                                paddingBottom: idx < items.length - 1 ? 14 : 0,
                                marginBottom: idx < items.length - 1 ? 14 : 0,
                            }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 10 }}>
                                    {item.nama}
                                </div>

                                {isAdmin && (
                                    <>
                                        <div style={S.inputGroup}>
                                            <label style={S.label}>
                                                Harga {item.satuan === 'meter' ? '/m²' : '/pcs'}
                                            </label>
                                            <input
                                                type="number"
                                                value={item.harga}
                                                onChange={(e) => updateHarga(idx, e.target.value)}
                                                style={S.input}
                                                placeholder="0"
                                            />
                                        </div>

                                        {item.satuan === 'meter' && (
                                            <div style={S.inputGroup}>
                                                <label style={S.label}>Luas (m²)</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <button onClick={() => stepLuas(idx, -0.1)} style={S.stepBtn}>−</button>
                                                    <input
                                                        type="number" step="0.1" min="0"
                                                        value={item.luas ?? ''}
                                                        onChange={(e) => updateLuas(idx, parseFloat(e.target.value) || 0)}
                                                        style={{ ...S.input, textAlign: 'center', fontWeight: 700, flex: 1 }}
                                                        placeholder="0.00"
                                                    />
                                                    <button onClick={() => stepLuas(idx, 0.1)} style={S.stepBtn}>+</button>
                                                </div>
                                            </div>
                                        )}

                                        <div style={S.subtotalBox}>
                                            <span style={{ fontSize: 12, color: '#0F6E56', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {item.satuan === 'meter'
                                                    ? <><Ruler size={11} /> {(item.luas || 0).toFixed(2)} m²</>
                                                    : `${item.qty} pcs × ${rupiah(item.harga)}`}
                                            </span>
                                            <span style={{ fontWeight: 700, color: '#028585', fontSize: 13 }}>
                                                {rupiah(item.subtotal)}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {!isAdmin && item.satuan === 'meter' && (item.luas || 0) > 0 && (
                                    <div style={S.luasStaff}>
                                        <Ruler size={12} color="#166534" /> <strong>{(item.luas || 0).toFixed(2)} m²</strong>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Total — admin only */}
                {isAdmin && (
                    <div style={S.totalCard}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#028585' }}>Total</span>
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#028585' }}>{rupiah(totalHarga)}</span>
                    </div>
                )}

                {/* Pembayaran — admin only */}
                {isAdmin && (
                    <div style={S.section}>
                        <div style={S.sectionTitle}>
                            <CreditCard size={11} /> Pembayaran
                        </div>
                        <div style={S.inputGroup}>
                            <label style={S.label}>Status Pembayaran</label>
                            <select value={statusBayar} onChange={(e) => setStatusBayar(e.target.value)} style={S.input}>
                                <option value="Belum Lunas">Belum Lunas</option>
                                <option value="Lunas">Lunas</option>
                            </select>
                        </div>
                        <div style={S.inputGroup}>
                            <label style={S.label}>Metode Pembayaran</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {METODE_OPTIONS.map((m) => (
                                    <div
                                        key={m.id}
                                        onClick={() => setMetode(m.id)}
                                        style={{
                                            border: `2px solid ${metode === m.id ? '#04CDCD' : '#e2e8f0'}`,
                                            borderRadius: 10,
                                            padding: '10px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            background: metode === m.id ? '#e0fafa' : '#fff',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}>{m.icon}</div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: metode === m.id ? '#028585' : '#64748b' }}>
                                            {m.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Status laundry */}
                <div style={S.section}>
                    <div style={S.sectionTitle}>
                        <Package size={11} /> Progres Laundry
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {STATUS_OPTIONS.map((opt) => (
                            <div
                                key={opt.val}
                                onClick={() => setStatusOrder(opt.val)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '12px 14px',
                                    borderRadius: 12,
                                    border: `2px solid ${statusOrder === opt.val ? '#04CDCD' : '#e2e8f0'}`,
                                    background: statusOrder === opt.val ? '#e0fafa' : '#fff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border: `2px solid ${statusOrder === opt.val ? '#04CDCD' : '#cbd5e1'}`,
                                    background: statusOrder === opt.val ? '#04CDCD' : '#fff',
                                    flexShrink: 0,
                                }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {opt.icon}
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: statusOrder === opt.val ? '#028585' : '#1e293b' }}>
                                            {opt.label}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{opt.desc}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Catatan */}
                <div style={S.section}>
                    <div style={S.sectionTitle}>
                        <FileText size={11} /> Catatan
                    </div>
                    <input
                        type="text"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        style={S.input}
                        placeholder="Contoh: Titipan di rumah sebelah..."
                    />
                </div>

                {/* Simpan bottom */}
                <button onClick={handleSimpan} style={S.saveBtn}>
                    <Save size={15} /> Simpan Perubahan
                </button>

                <div style={{ height: 40 }} />
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
    topBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        flexShrink: 0,
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
    topBarCenter: {
        flex: 1,
        textAlign: 'center',
    },
    topBarTitle: {
        fontSize: 14,
        fontWeight: 800,
        color: '#fff',
    },
    topBarSub: {
        fontSize: 10,
        color: '#6B8894',
        marginTop: 1,
    },
    saveTopBtn: {
        background: '#04CDCD',
        border: 'none',
        color: '#fff',
        padding: '7px 14px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        flexShrink: 0,
    },
    scrollArea: {
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px 0',
    },
    section: {
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
    inputGroup: {
        marginBottom: 12,
    },
    label: {
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        marginBottom: 6,
    },
    input: {
        width: '100%',
        padding: '11px 14px',
        borderRadius: 10,
        border: '1.5px solid #e2e8f0',
        boxSizing: 'border-box',
        fontSize: 14,
        fontFamily: 'inherit',
        outline: 'none',
        color: '#1e293b',
        backgroundColor: '#fff',
    },
    readOnly: {
        width: '100%',
        padding: '11px 14px',
        borderRadius: 10,
        border: '1.5px solid #f1f5f9',
        boxSizing: 'border-box',
        backgroundColor: '#f8fafc',
        color: '#64748b',
        fontSize: 14,
    },
    stepBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        border: 'none',
        backgroundColor: '#04CDCD',
        color: '#fff',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 20,
        flexShrink: 0,
        fontFamily: 'inherit',
    },
    itemCard: {},
    subtotalBox: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#e0fafa',
        borderRadius: 8,
        padding: '8px 12px',
        marginTop: 8,
    },
    luasStaff: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: '#f0fdf4',
        borderRadius: 8,
        padding: '8px 12px',
        marginTop: 8,
        fontSize: 13,
        color: '#166534',
        border: '1px solid #bbf7d0',
    },
    totalCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#e0fafa',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 10,
        border: '1px solid #B3F0F0',
    },
    saveBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        padding: '14px',
        borderRadius: 12,
        border: 'none',
        backgroundColor: '#04CDCD',
        color: '#fff',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
        fontFamily: 'inherit',
        marginBottom: 10,
        boxSizing: 'border-box',
    },
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
    },
};

export default OrderEdit;