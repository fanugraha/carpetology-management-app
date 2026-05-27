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

  // 3. State Utama untuk Loading
  const [isLoading, setIsLoading] = useState(false);

  // 4. Fungsi mengurai ringkasan string total item
  const parseInitialQty = (itemNama) => {
    if (!order?.total) return 0;
    const match = order.total.toLowerCase().match(new RegExp(`(\\d+)\\s*${itemNama}`));
    return match ? parseInt(match[1]) : 0;
  };

  // 5. State Kuantitas Item
  const [quantities, setQuantities] = useState({
    karpet: parseInitialQty('karpet'),
    springbed: parseInitialQty('springbed'),
    sofa: parseInitialQty('sofa')
  });

  const handleQtyChange = (item, type) => {
    setQuantities(prev => ({
      ...prev,
      [item]: type === 'inc' ? prev[item] + 1 : Math.max(0, prev[item] - 1)
    }));
  };

  // 6. Fungsi Menyimpan ke Firebase
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

    // Konfirmasi sebelum update
    if (!window.confirm("Simpan perubahan pada order ini?")) return;

    const totalString = itemsSelected.map(i => i.nama).join(', ');

    try {
      setIsLoading(true);
      const orderRef = doc(db, "orders", order.id);

      await updateDoc(orderRef, {
        nama: nama.trim(),
        hp: hp.trim(),
        status: statusOrder,
        statusBayar: statusBayar,
        total: totalString,
        items: itemsSelected
      });

      alert("✅ Data berhasil diperbarui!");

      onSaveSuccess({
        ...order,
        nama: nama.trim(),
        hp: hp.trim(),
        status: statusOrder,
        statusBayar: statusBayar,
        total: totalString,
        items: itemsSelected
      });
      onBack();
    } catch (error) {
      console.error("Error updating:", error);
      alert("Gagal memperbarui data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {isLoading && (
        <div style={styles.overlay}>
          <div style={styles.spinner}></div>
          <p>Menyimpan ke database...</p>
        </div>
      )}

      <div style={styles.backBtn} onClick={onBack}>⬅ Kembali</div>

      <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>Edit Order</h2>

      <div style={styles.inputGroup}>
        <label>Nama Customer</label>
        <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} style={styles.input} />
      </div>

      <div style={styles.inputGroup}>
        <label>Nomor Hp</label>
        <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} style={styles.input} />
      </div>

      <label style={{ fontWeight: '600' }}>Koreksi Item</label>
      {['karpet', 'springbed', 'sofa'].map((item) => (
        <div key={item} style={styles.qtyRow}>
          <strong style={{ textTransform: 'capitalize' }}>{item}</strong>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => handleQtyChange(item, 'dec')} style={styles.qtyBtn}>-</button>
            <span style={{ width: '20px', textAlign: 'center' }}>{quantities[item]}</span>
            <button onClick={() => handleQtyChange(item, 'inc')} style={styles.qtyBtn}>+</button>
          </div>
        </div>
      ))}

      <div style={styles.inputGroup}>
        <label>Status Pembayaran</label>
        <select value={statusBayar} onChange={(e) => setStatusBayar(e.target.value)} style={styles.input}>
          <option value="Belum Lunas">Belum Lunas</option>
          <option value="Lunas">Lunas</option>
        </select>
      </div>

      <div style={styles.inputGroup}>
        <label>Progres Laundry</label>
        <select value={statusOrder} onChange={(e) => setStatusOrder(e.target.value)} style={styles.input}>
          <option value="Waiting List">Waiting List</option>
          <option value="Sudah Dicuci">Sudah Dicuci</option>
          <option value="Ready Anter">Ready Anter</option>
        </select>
      </div>

      <button onClick={handleSimpanPerubahan} style={styles.saveBtn}>Simpan Perubahan</button>
    </div>
  );
}

const styles = {
  container: { padding: '20px', height: '100%', overflowY: 'auto' },
  backBtn: { cursor: 'pointer', color: '#6366f1', marginBottom: '20px', fontWeight: 'bold' },
  inputGroup: { marginBottom: '15px' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' },
  qtyRow: { display: 'flex', justifyContent: 'space-between', padding: '10px', border: '1px solid #f1f5f9', borderRadius: '8px', marginBottom: '8px', backgroundColor: '#f8fafc' },
  qtyBtn: { width: '30px', borderRadius: '6px', border: 'none', backgroundColor: '#6366f1', color: '#fff', cursor: 'pointer' },
  saveBtn: { width: '100%', padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: '#22c55e', color: '#fff', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  spinner: { width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }
};

export default OrderEdit;