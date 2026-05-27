import React, { useState } from 'react';
import { collection, addDoc } from "firebase/firestore";
import { db } from '../firebase';

function OrderAdd({ onBack }) {
    const getTodayDate = () => new Date().toISOString().split('T')[0];

    const [nama, setNama] = useState('');
    const [hp, setHp] = useState('');
    const [statusBayar, setStatusBayar] = useState('Belum Lunas');
    const [statusOrder, setStatusOrder] = useState('Waiting List');
    const [tanggal, setTanggal] = useState(getTodayDate());
    const [isLoading, setIsLoading] = useState(false);
    const [quantities, setQuantities] = useState({ karpet: 0, springbed: 0, sofa: 0 });

    const handleQtyChange = (item, type) => {
        setQuantities(prev => ({
            ...prev,
            [item]: type === 'inc' ? prev[item] + 1 : Math.max(0, prev[item] - 1)
        }));
    };

    const handleDateChange = (e) => {
        const selected = e.target.value;
        const today = getTodayDate();
        if (selected > today) {
            alert("⚠️ Tanggal tidak boleh di masa depan!");
            setTanggal(today);
        } else {
            setTanggal(selected);
        }
    };

    const handleSubmit = async () => {
        if (!nama.trim() || !hp.trim()) return alert("Nama dan HP wajib diisi!");

        const itemsSelected = [];
        if (quantities.karpet > 0) itemsSelected.push({ nama: `${quantities.karpet} Karpet` });
        if (quantities.springbed > 0) itemsSelected.push({ nama: `${quantities.springbed} Springbed` });
        if (quantities.sofa > 0) itemsSelected.push({ nama: `${quantities.sofa} Sofa` });

        if (itemsSelected.length === 0) return alert("Pilih minimal 1 item!");

        const [tahun, bulan, hari] = tanggal.split('-').map(Number);
        const cleanDate = new Date(tahun, bulan - 1, hari);
        const formattedDate = cleanDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        try {
            setIsLoading(true);
            await addDoc(collection(db, "orders"), {
                nama: nama.trim(),
                hp: hp.trim(),
                status: statusOrder,
                statusBayar: statusBayar,
                total: itemsSelected.map(i => i.nama).join(', '),
                items: itemsSelected,
                tanggal: formattedDate,
                timestamp: cleanDate
            });
            alert("🎉 Order berhasil disimpan!");
            onBack();
        } catch (error) {
            alert("Gagal: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div onClick={onBack} style={styles.backBtn}>⬅ <strong>Kembali</strong></div>
            <h2 style={{ fontSize: '22px', marginBottom: '20px', color: '#04CDCD' }}>Tambah Order Baru</h2>

            <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Nama Customer</label>
                <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} style={styles.input} />
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Nomor Hp</label>
                <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} style={styles.input} />
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={styles.label}>Tanggal Masuk</label>
                <input type="date" value={tanggal} onChange={handleDateChange} max={getTodayDate()} style={styles.input} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Status Bayar</label>
                    <select value={statusBayar} onChange={(e) => setStatusBayar(e.target.value)} style={styles.input}>
                        <option value="Belum Lunas">Belum Lunas</option>
                        <option value="Lunas">Lunas</option>
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Status Order</label>
                    <select value={statusOrder} onChange={(e) => setStatusOrder(e.target.value)} style={styles.input}>
                        <option value="Waiting List">Waiting List</option>
                        <option value="Sudah Dicuci">Sudah Dicuci</option>
                        <option value="Ready Anter">Ready</option>
                    </select>
                </div>
            </div>

            {['karpet', 'springbed', 'sofa'].map((item) => (
                <div key={item} style={styles.itemRow}>
                    <strong style={{ textTransform: 'capitalize' }}>{item}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => handleQtyChange(item, 'dec')} style={styles.btn}>-</button>
                        <strong style={{ minWidth: '20px', textAlign: 'center' }}>{quantities[item]}</strong>
                        <button onClick={() => handleQtyChange(item, 'inc')} style={styles.btn}>+</button>
                    </div>
                </div>
            ))}

            <button onClick={handleSubmit} disabled={isLoading} style={styles.saveBtn}>
                {isLoading ? "Menyimpan..." : "Simpan Order"}
            </button>
        </div>
    );
}

const styles = {
    container: { padding: '20px', backgroundColor: '#fff', height: '100%', boxSizing: 'border-box', overflowY: 'auto', fontFamily: 'Inter, sans-serif' },
    backBtn: { cursor: 'pointer', color: '#04CDCD', marginBottom: '20px' },
    input: { width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0', boxSizing: 'border-box', fontSize: '15px', height: '48px', outlineColor: '#04CDCD' },
    label: { display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#475569' },
    itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #f1f5f9', borderRadius: '10px', marginBottom: '10px', backgroundColor: '#f8fafc' },
    btn: { width: '35px', height: '35px', borderRadius: '8px', border: 'none', backgroundColor: '#04CDCD', color: '#fff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' },
    saveBtn: { width: '100%', padding: '16px', borderRadius: '10px', border: 'none', backgroundColor: '#04CDCD', color: '#fff', fontSize: '16px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(4, 205, 205, 0.2)' }
};

export default OrderAdd;