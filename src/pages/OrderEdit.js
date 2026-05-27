import React, { useState } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from '../firebase';

function OrderEdit({ order, onBack, onSaveSuccess }) {
  // 1. State Identitas Pelanggan
  const [nama, setNama] = useState(order?.nama || '');
  const [hp, setHp] = useState(order?.hp || '');

  // 2. State Dropdown Status & Pembayaran
  const [statusBayar, setStatusBayar] = useState(order?.statusBayar || 'Belum Lunas');
  const [statusOrder, setStatusOrder] = useState(order?.status || 'Waiting List');

  // --- STATE UTAMA UNTUK LOADING ---
  const [isLoading, setIsLoading] = useState(false);

  // 3. Fungsi mengurai ringkasan string total item
  const parseInitialQty = (itemNama) => {
    if (!order?.total) return 0;
    const match = order.total.toLowerCase().match(new RegExp(`(\\d+)\\s*${itemNama}`));
    return match ? parseInt(match[1]) : 0;
  };

  // 4. State Kuantitas Item Laundry
  const [quantities, setQuantities] = useState({
    karpet: parseInitialQty('karpet'),
    springbed: parseInitialQty('springbed'),
    sofa: parseInitialQty('sofa')
  });

  // 5. Fungsi Mengubah Jumlah Kuantitas (+ / -)
  const handleQtyChange = (item, type) => {
    setQuantities(prev => ({
      ...prev,
      [item]: type === 'inc' ? prev[item] + 1 : Math.max(0, prev[item] - 1)
    }));
  };

  // 6. Fungsi Menyimpan Hasil Edit (Update) Ke Firebase
  const handleSimpanPerubahan = async () => {
    if (!nama.trim() || !hp.trim()) {
      alert("Nama Pelanggan dan Nomor HP tidak boleh kosong!");
      return;
    }

    const itemsSelected = [];
    if (quantities.karpet > 0) itemsSelected.push({ nama: `${quantities.karpet} Karpet` });
    if (quantities.springbed > 0) itemsSelected.push({ nama: `${quantities.springbed} Springbed` });
    if (quantities.sofa > 0) itemsSelected.push({ nama: `${quantities.sofa} Sofa` });

    if (itemsSelected.length === 0) {
      alert("Harus ada minimal satu item laundry!");
      return;
    }

    const totalString = itemsSelected.map(i => i.nama).join(', ');

    try {
      setIsLoading(true);

      // --- KONEKSI KE FIRESTORE ---
      // Update dokumen spesifik berdasarkan ID dari props 'order'
      const orderRef = doc(db, "orders", order.id);

      await updateDoc(orderRef, {
        nama: nama.trim(),
        hp: hp.trim(),
        status: statusOrder,
        statusBayar: statusBayar,
        total: totalString,
        items: itemsSelected
      });

      alert("🎉 Perubahan data berhasil disimpan ke Firebase!");

      // Update UI lokal
      const updatedOrderData = {
        ...order,
        nama: nama.trim(),
        hp: hp.trim(),
        status: statusOrder,
        statusBayar: statusBayar,
        total: totalString,
        items: itemsSelected
      };

      onSaveSuccess(updatedOrderData);
      onBack();

    } catch (error) {
      console.error("Error updating order:", error);
      alert("Gagal memperbarui data di Firebase: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff', height: '100%', boxSizing: 'border-box', overflowY: 'auto', position: 'relative' }}>

      {/* --- CSS INLINE ANIMASI BULAT BERPUTAR --- */}
      <style>{`
          @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
          }
      `}</style>

      {/* --- ELEMEN LOADING SCREEN BULAT OVERLAY --- */}
      {isLoading && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)', zIndex: 99,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            width: '40px', height: '40px',
            border: '4px solid #f3f3f3', borderTop: '4px solid #22c55e',
            borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px'
          }}></div>
          <strong style={{ color: '#475569', fontSize: '14px' }}>Menyimpan ke Firebase...</strong>
        </div>
      )}

      {/* Tombol Kembali */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', cursor: 'pointer', color: '#6366f1' }} onClick={onBack}>
        <span style={{ marginRight: '8px', fontSize: '18px' }}>⬅</span> <strong>Kembali</strong>
      </div>

      <h2 style={{ fontSize: '22px', marginBottom: '20px', color: '#1e293b' }}>Edit Order</h2>

      {/* Input Nama & HP */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>Nama Customer</label>
        <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>Nomor Hp</label>
        <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' }} />
      </div>

      {/* Input Item */}
      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#475569' }}>Koreksi Item & Jumlah</label>
      {['karpet', 'springbed', 'sofa'].map((item) => (
        <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: '10px', marginBottom: '10px', backgroundColor: '#f8fafc' }}>
          <strong style={{ fontSize: '15px', textTransform: 'capitalize' }}>{item}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => handleQtyChange(item, 'dec')} style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', backgroundColor: '#6366f1', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
            <strong style={{ minWidth: '16px', textAlign: 'center' }}>{quantities[item]}</strong>
            <button onClick={() => handleQtyChange(item, 'inc')} style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', backgroundColor: '#6366f1', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
          </div>
        </div>
      ))}

      {/* Dropdown Status */}
      <div style={{ marginBottom: '16px', marginTop: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>Status Pembayaran</label>
        <select value={statusBayar} onChange={(e) => setStatusBayar(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '15px' }}>
          <option value="Belum Lunas">Belum Lunas</option>
          <option value="Lunas">Lunas</option>
        </select>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#475569' }}>Progres Laundry</label>
        <select value={statusOrder} onChange={(e) => setStatusOrder(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '15px' }}>
          <option value="Waiting List">Waiting List</option>
          <option value="Sudah Dicuci">Sudah Dicuci</option>
          <option value="Ready Anter">Ready Anter</option>
        </select>
      </div>

      <button
        onClick={handleSimpanPerubahan}
        style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: '#22c55e', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)' }}
      >
        Simpan Perubahan
      </button>
    </div>
  );
}

export default OrderEdit;