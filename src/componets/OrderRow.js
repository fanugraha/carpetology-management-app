import React, { useState } from 'react';
import {
    doc, updateDoc, collection, addDoc, query, where, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from '../firebase';
import {
    CheckCircle, Droplets, Clock, Banknote, QrCode, Building2,
    AlertTriangle, Package, EyeOff, Loader2, ChevronDown, X,
    Timer, Truck, Store,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   DELIVERY TYPE HELPERS
   ambil_sendiri : Waiting List → Sudah Dicuci → Siap Diambil (final)
   antar_jemput  : Waiting List → Sudah Dicuci → Siap Diantar → Sudah Diantar (final)
   'Ready Anter' tetap didukung sebagai status legacy = setara Siap Diambil
───────────────────────────────────────────── */
const getDeliveryType = (o) => (o?.delivery_type === 'antar_jemput' ? 'antar_jemput' : 'ambil_sendiri');
const FINAL_STATUS_BY_DELIVERY = { ambil_sendiri: 'Siap Diambil', antar_jemput: 'Sudah Diantar' };
const STATUS_FLOW_BY_DELIVERY = {
    ambil_sendiri: ['Waiting List', 'Sudah Dicuci', 'Siap Diambil'],
    antar_jemput: ['Waiting List', 'Sudah Dicuci', 'Siap Diantar', 'Sudah Diantar'],
};
const isFinalStatus = (o) => {
    const s = o.status_order || o.status;
    if (s === 'Ready Anter') return true; // kompatibilitas data lama
    return s === FINAL_STATUS_BY_DELIVERY[getDeliveryType(o)];
};
const STATUS_PICKER_CFG = {
    'Waiting List': { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', Icon: Clock },
    'Sudah Dicuci': { color: '#b45309', bg: '#fef3c7', border: '#fcd34d', Icon: Droplets },
    'Siap Diambil': { color: '#15803d', bg: '#dcfce7', border: '#86efac', Icon: CheckCircle },
    'Siap Diantar': { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', Icon: Truck },
    'Sudah Diantar': { color: '#15803d', bg: '#dcfce7', border: '#86efac', Icon: CheckCircle },
    'Ready Anter': { color: '#15803d', bg: '#dcfce7', border: '#86efac', Icon: CheckCircle },
};

/* ─────────────────────────────────────────────
   AUTO-JADWAL DELIVERY (integrasi ke pickups)
   Trigger: status order antar_jemput diubah ke 'Siap Diantar'
   Aturan tanggal rutin (Selasa/Kamis/Sabtu):
     - Senin  → Selasa (besok)
     - Selasa → hari itu juga
     - Rabu   → Kamis (besok)
     - Kamis  → hari itu juga
     - Jumat  → Sabtu (besok)
     - Sabtu  → lompat ke Selasa minggu depan (bukan hari itu juga)
     - Minggu → Selasa
───────────────────────────────────────────── */
function toDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNextDeliveryDateKey(from = new Date()) {
    const day = from.getDay(); // 0=Min ... 6=Sab
    const d = new Date(from);
    if (day === 2 || day === 4) {
        // Selasa / Kamis: hari itu juga, tidak diubah
    } else if (day === 6) {
        // Sabtu: lompat ke Selasa minggu depan (+3 hari)
        d.setDate(d.getDate() + 3);
    } else {
        // Senin→+1, Rabu→+1, Jumat→+1, Minggu→+2
        const diffMap = { 1: 1, 3: 1, 5: 1, 0: 2 };
        d.setDate(d.getDate() + diffMap[day]);
    }
    return toDateKey(d);
}

// Buat jadwal delivery otomatis untuk sebuah order, hanya jika belum ada
// entri delivery aktif (status !== 'Dibatalkan') untuk order_id yang sama.
async function jadwalkanDeliveryOtomatis(order) {
    try {
        const q = query(
            collection(db, 'pickups'),
            where('order_id', '==', order.id),
            where('tipe', '==', 'delivery'),
        );
        const snap = await getDocs(q);
        const sudahAdaAktif = snap.docs.some(d => d.data().status !== 'Dibatalkan');
        if (sudahAdaAktif) return; // cegah duplikat

        await addDoc(collection(db, 'pickups'), {
            nama: order.nama || '-',
            no_hp: order.hp || '-',
            alamat: '',     // dibiarkan kosong, diisi manual nanti
            catatan: '',    // dibiarkan kosong, diisi manual nanti
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

// Batalkan (soft-delete) jadwal delivery yang masih 'Dijadwalkan' untuk order
// tertentu — dipakai saat staff salah klik & membatalkan status 'Siap Diantar'.
// Delivery yang sudah ditandai 'Sudah Diantar' TIDAK disentuh.
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

function OrderRow({ order, onClick, isReady, isAdmin, canQuickUpdate, sisaHari }) {
    const [confirmHide, setConfirmHide] = useState(false);
    const [hiding, setHiding] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // ─────────────────────────────────────────────
    // HITUNG HARI KERJA + ESTIMASI SELESAI + SISA
    // ─────────────────────────────────────────────
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

        // Hitung sudah berapa hari kerja
        let hariKe = 0;
        let cursor = new Date(tglMasuk);
        while (cursor <= hariIni) {
            if (cursor.getDay() !== 0) hariKe++;
            cursor.setDate(cursor.getDate() + 1);
        }

        // Hitung tanggal selesai estimasi (5 hari kerja dari masuk)
        let hariKerjaDihitung = 0;
        let tglSelesai = new Date(tglMasuk);
        while (hariKerjaDihitung < 5) {
            if (tglSelesai.getDay() !== 0) hariKerjaDihitung++;
            if (hariKerjaDihitung < 5) tglSelesai.setDate(tglSelesai.getDate() + 1);
        }

        const formatSelesai = tglSelesai.toLocaleDateString('id-ID', {
            weekday: 'short', day: '2-digit', month: 'short'
        });

        // ── SISA HARI KERJA (baru) ──
        // Hitung berapa hari kerja tersisa hingga deadline
        let sisaHariKerja = 0;
        if (tglSelesai >= hariIni) {
            let cur = new Date(hariIni);
            // Mulai dari besok karena hari ini sudah jalan
            cur.setDate(cur.getDate() + 1);
            while (cur <= tglSelesai) {
                if (cur.getDay() !== 0) sisaHariKerja++;
                cur.setDate(cur.getDate() + 1);
            }
        }
        // Jika sudah lewat deadline, sisa = 0
        const sisaKerja = tglSelesai >= hariIni ? sisaHariKerja : 0;
        const sudahLewat = hariKe > 5;

        return { hariKe, tglSelesai: formatSelesai, sisaKerja, sudahLewat };
    };

    const getSLA = (hariKe, order) => {
        if (isFinalStatus(order)) {
            return { color: '#22c55e', bg: '#fff', borderColor: '#f1f5f9', text: '', isAlert: false, persen: 100 };
        }
        if (!hariKe) return { color: '#cbd5e1', bg: '#fff', borderColor: '#f1f5f9', text: '', isAlert: false, persen: 0 };
        const persen = Math.min(Math.round((hariKe / 5) * 100), 100);
        if (hariKe >= 6) return { color: '#ef4444', bg: '#fff', borderColor: '#ef4444', text: `EXPIRED: ${hariKe} HARI KERJA`, isAlert: true, level: 'danger', persen };
        if (hariKe === 5) return { color: '#ef4444', bg: '#fff', borderColor: '#ef4444', text: `HARI KE-5 — DEADLINE HARI INI`, isAlert: true, level: 'danger', persen };
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
        if (status === 'Ready Anter' || status === 'Siap Diambil') return {
            label: 'Siap Diambil', bg: '#dcfce7', color: '#15803d', border: '#86efac',
            Icon: CheckCircle,
        };
        if (status === 'Siap Diantar') return {
            label: 'Siap Diantar', bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd',
            Icon: Truck,
        };
        if (status === 'Sudah Diantar') return {
            label: 'Sudah Diantar', bg: '#dcfce7', color: '#15803d', border: '#86efac',
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

    const handleQuickStatus = (e) => {
        e.stopPropagation();
        setShowStatusPicker(prev => !prev);
    };

    const handlePilihStatus = async (e, newStatus) => {
        e.stopPropagation();
        if (newStatus === order.status) {
            setShowStatusPicker(false);
            return;
        }
        const statusSebelumnya = order.status_order || order.status;
        try {
            setUpdatingStatus(true);
            setShowStatusPicker(false);
            const updateData = {
                status_order: newStatus,
                status: newStatus,
            };
            if (newStatus === FINAL_STATUS_BY_DELIVERY[deliveryType] || newStatus === 'Ready Anter') {
                updateData.ready_at = new Date();
            }
            await updateDoc(doc(db, "transactions", order.id), updateData);

            // ── Integrasi otomatis ke jadwal delivery (khusus antar_jemput) ──
            if (deliveryType === 'antar_jemput') {
                if (newStatus === 'Siap Diantar') {
                    // Order siap diantar → otomatis terjadwal di delivery rutin
                    await jadwalkanDeliveryOtomatis(order);
                } else if (statusSebelumnya === 'Siap Diantar' && newStatus !== 'Sudah Diantar') {
                    // Salah klik / dikoreksi balik → batalkan jadwal yang masih pending
                    await batalkanJadwalDeliveryJikaPending(order.id);
                }
            }
        } catch (err) {
            alert("Gagal update status: " + err.message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const slaData = hitungHariKerja(order.tanggal);
    const sla = getSLA(slaData?.hariKe, order);
    const deliveryType = getDeliveryType(order);
    const statusFlow = STATUS_FLOW_BY_DELIVERY[deliveryType];
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

    // ─────────────────────────────────────────────
    // COUNTDOWN CHIP — sisa hari kerja
    // Tampil hanya untuk order aktif (bukan Ready Anter)
    // ─────────────────────────────────────────────
    const renderCountdown = () => {
        if (isReady || !slaData) return null;

        const { sisaKerja, sudahLewat, hariKe } = slaData;

        // Sudah lewat deadline
        if (sudahLewat) {
            return (
                <div style={{
                    ...S.countdownChip,
                    background: '#fee2e2',
                    color: '#ef4444',
                    border: '1px solid #fca5a5',
                    animation: 'pulse 1.5s ease-in-out infinite',
                }}>
                    <Timer size={11} style={{ flexShrink: 0 }} />
                    Lewat {hariKe - 5} hari kerja dari estimasi!
                </div>
            );
        }

        // Deadline hari ini (hari ke-5)
        if (hariKe === 5) {
            return (
                <div style={{
                    ...S.countdownChip,
                    background: '#fee2e2',
                    color: '#ef4444',
                    border: '1px solid #fca5a5',
                }}>
                    <Timer size={11} style={{ flexShrink: 0 }} />
                    Deadline hari ini — segera selesaikan!
                </div>
            );
        }

        // Mendekati deadline
        if (hariKe === 4) {
            return (
                <div style={{
                    ...S.countdownChip,
                    background: '#fff7ed',
                    color: '#ea580c',
                    border: '1px solid #fed7aa',
                }}>
                    <Timer size={11} style={{ flexShrink: 0 }} />
                    Sisa <strong style={{ fontWeight: 800 }}>1 hari kerja</strong> — deadline besok
                </div>
            );
        }

        // Normal — tampilkan sisa hari
        if (sisaKerja > 0) {
            const chipColor = sisaKerja <= 2
                ? { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' }
                : { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
            return (
                <div style={{
                    ...S.countdownChip,
                    background: chipColor.bg,
                    color: chipColor.color,
                    border: `1px solid ${chipColor.border}`,
                }}>
                    <Timer size={11} style={{ flexShrink: 0 }} />
                    Sisa <strong style={{ fontWeight: 800 }}>{sisaKerja} hari kerja</strong>
                </div>
            );
        }

        return null;
    };

    return (
        <div style={{ position: 'relative' }}>
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
                        {order.layanan_type !== 'homeservice' && (
                            <div style={S.deliveryTag}>
                                {deliveryType === 'antar_jemput'
                                    ? <><Truck size={9} /> Antar Jemput</>
                                    : <><Store size={9} /> Ambil Sendiri</>
                                }
                            </div>
                        )}
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

                {/* ── Banner aksi: order siap diantar, perlu dikirim kurir ── */}
                {(order.status_order || order.status) === 'Siap Diantar' && (
                    <div style={S.deliverAlert}>
                        <Truck size={12} style={{ flexShrink: 0 }} />
                        Siap diantar — jadwalkan pengiriman ke customer
                    </div>
                )}

                {/* ── COUNTDOWN CHIP ── */}
                {renderCountdown()}

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
                            {/* Label: hari ke-N / 5 */}
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

                {/* ── Quick Update Status Button ── */}
                {canQuickUpdate && (
                    <div style={S.quickUpdateWrap}>
                        <button
                            onClick={handleQuickStatus}
                            disabled={updatingStatus}
                            style={{
                                ...S.quickUpdateBtn,
                                opacity: updatingStatus ? 0.6 : 1,
                            }}
                        >
                            {updatingStatus ? (
                                <><Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} /> Menyimpan...</>
                            ) : (
                                <><ChevronDown size={11} /> Ubah Status</>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Status Picker Dropdown ── */}
            {showStatusPicker && (
                <div style={S.pickerOverlay} onClick={(e) => { e.stopPropagation(); setShowStatusPicker(false); }}>
                    <div style={S.picker} onClick={e => e.stopPropagation()}>
                        <div style={S.pickerHeader}>
                            <span style={S.pickerTitle}>Ubah Status Order</span>
                            <button onClick={(e) => { e.stopPropagation(); setShowStatusPicker(false); }} style={S.pickerClose}>
                                <X size={14} />
                            </button>
                        </div>
                        <div style={S.pickerName}>{order.nama}</div>
                        {statusFlow.map(status => {
                            const cfg = STATUS_PICKER_CFG[status];
                            const isActive = order.status === status;
                            return (
                                <button
                                    key={status}
                                    onClick={(e) => handlePilihStatus(e, status)}
                                    style={{
                                        ...S.pickerOption,
                                        background: isActive ? cfg.bg : '#f8fafc',
                                        border: `1.5px solid ${isActive ? cfg.border : '#e2e8f0'}`,
                                        color: isActive ? cfg.color : '#475569',
                                        fontWeight: isActive ? 800 : 600,
                                    }}
                                >
                                    <cfg.Icon size={14} />
                                    {status}
                                    {isActive && <span style={S.activeChip}>Aktif</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            `}</style>
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
    deliveryTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 9,
        fontWeight: 700,
        color: '#64748b',
        background: '#f1f5f9',
        padding: '2px 7px',
        borderRadius: 5,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
    },
    deliverAlert: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        color: '#1d4ed8',
        background: '#eff6ff',
        border: '1px solid #93c5fd',
        borderRadius: 8,
        padding: '7px 10px',
        marginBottom: 10,
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
    // ── Countdown chip (baru) ──
    countdownChip: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        padding: '6px 10px',
        borderRadius: 8,
        marginBottom: 10,
        lineHeight: 1.3,
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
        marginBottom: 10,
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
    quickUpdateWrap: {
        borderTop: '1px solid #f1f5f9',
        paddingTop: 10,
        marginTop: 2,
    },
    quickUpdateBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        color: '#475569',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
    },
    pickerOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    picker: {
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: '16px 16px 32px',
        width: '100%',
        maxWidth: 500,
    },
    pickerHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    pickerTitle: {
        fontSize: 13,
        fontWeight: 800,
        color: '#1e293b',
    },
    pickerClose: {
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '50%',
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#64748b',
    },
    pickerName: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 14,
    },
    pickerOption: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 14px',
        borderRadius: 12,
        cursor: 'pointer',
        fontSize: 14,
        fontFamily: 'inherit',
        marginBottom: 8,
        textAlign: 'left',
        transition: 'all 0.15s',
    },
    activeChip: {
        marginLeft: 'auto',
        fontSize: 10,
        background: 'rgba(0,0,0,0.08)',
        padding: '2px 8px',
        borderRadius: 10,
        fontWeight: 700,
    },
};

export default OrderRow;