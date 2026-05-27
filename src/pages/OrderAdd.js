import React, { useState } from 'react';
import { collection, addDoc } from "firebase/firestore";
import { db } from '../firebase';

function OrderAdd({ onBack }) {
    const [nama, setNama] = useState('');
    const [hp, setHp] = useState('');
    const [statusBayar, setStatusBayar] = useState('Belum Lunas');
    const [statusOrder, setStatusOrder] = useState('Waiting List');
    const [isLoading, setIsLoading] = useState(false);

    const [quantities, setQuantities] = useState({
        karpet: 0,
        springbed: 0,
        sofa: 0
    });

    const handleQtyChange = (item, type) => {
        setQuantities(prev => ({
            ...prev,
            [item]: type === 'inc' ? prev[item] + 1 : Math.max(0, prev[item] - 1)
        }));
    };

    const handleSubmit = async () => {
        if (!nama.trim() || !hp.trim()) {
            alert("Nama Pelanggan dan Nomor HP harus diisi!");
            return;
        }

        const itemsSelected = [];
        if (quantities.karpet > 0) itemsSelected.push({ nama: `${quantities.karpet} Karpet` });
        if (quantities.springbed > 0) itemsSelected.push({ nama: `${quantities.springbed} Springbed` });
        if (quantities.sofa > 0) itemsSelected.push({ nama: `${quantities.sofa} Sofa` });

        if (itemsSelected.length === 0) {
            alert("Pilih minimal 1 item laundry terlebih dahulu!");
            return;
        }

        const totalString = itemsSelected.map(i => i.nama).join(', ');

        try {
            setIsLoading(true);

            // --- SIMPAN KE FIRESTORE ---
            await addDoc(collection(db, "orders"), {
                nama: nama.trim(),
                hp: hp.trim(),
                status: statusOrder,
                statusBayar: statusBayar,
                total: totalString,
                items: itemsSelected,
                tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
                waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            });

            alert("🎉 Order baru berhasil disimpan ke Firebase!");
            onBack();
        } catch (error) {
            console.error("Gagal simpan:", error);
            alert("Gagal menyimpan ke Firebase: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#fff', height: '100%', boxSizing: 'border-box', overflowY: 'auto', position: 'relative' }}>
            
            {/* Animasi Loading */}
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            {isLoading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.8)', zIndex: 99, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }}></div>
                    <strong>Menyimpan ke Firebase...</strong>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', cursor: 'pointer', color: '#6366f1' }} onClick={onBack}>
                ⬅ <strong>Kembali</strong>
            </div>

            <h2 style={{ fontSize: '22px', marginBottom: '20px', color: '#1e293b' }}>Tambah Order Baru</h2>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Nama Customer</label>
                <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>Nomor Hp</label>
                <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>

            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Pilih Item</label>
            {['karpet', 'springbed', 'sofa'].map((item) => (
                <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #f1f5f9', borderRadius: '10px', marginBottom: '10px', backgroundColor: '#f8fafc' }}>
                    <strong style={{ textTransform: 'capitalize' }}>{item}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => handleQtyChange(item, 'dec')} style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', backgroundColor: '#6366f1', color: '#fff' }}>-</button>
                        <strong style={{ minWidth: '20px', textAlign: 'center' }}>{quantities[item]}</strong>
                        <button onClick={() => handleQtyChange(item, 'inc')} style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', backgroundColor: '#6366f1', color: '#fff' }}>+</button>
                    </div>
                </div>
            ))}

            <button onClick={handleSubmit} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: '#6366f1', color: '#fff', fontSize: '16px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' }}>
                Simpan Order
            </button>
        </div>
    );
}

export default OrderAdd;