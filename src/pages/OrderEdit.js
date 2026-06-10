import React, { useState } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

function OrderEdit({ order, onBack, onSaveSuccess }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [nama, setNama] = useState(order?.nama || '');
  const [hp, setHp] = useState(order?.hp || '');
  const [statusBayar, setStatusBayar] = useState(order?.statusBayar || 'Belum Lunas');
  const [statusOrder, setStatusOrder] = useState(order?.status || 'Waiting List');
  const [isLoading, setIsLoading] = useState(false);
  const [metode, setMetode] = useState(order?.metode_pembayaran || 'Belum Payment');

  const buildInitialItems = () => {
    if (order?.items && Array.isArray(order.items) && order.items.length > 0) {
      return order.items.map((it) => ({
        produkId: it.produkId || it.nama,
        nama: it.nama || "",
        satuan: it.satuan || "satuan",
        qty: Number(it.qty) || 1,
        harga: Number(it.harga) || 0,
        panjang: it.panjang != null ? Number(it.panjang) : null,
        lebar: it.lebar != null ? Number(it.lebar) : null,
        luas: it.luas != null ? Number(it.luas) : null,
        subtotal: Number(it.subtotal) || 0,
      }));
    }
    return [];
  };

  const [items, setItems] = useState(buildInitialItems);

  const toTitleCase = (str) =>
    str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const rupiah = (n) => "Rp " + (n || 0).toLocaleString("id-ID");

  const updateQty = (idx, val) => {
    const qty = Math.max(0, val);
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const luas = it.satuan === "meter" ? (it.panjang || 0) * (it.lebar || 0) : 1;
      return { ...it, qty, subtotal: it.harga * qty * luas };
    }));
  };

  const updateMeter = (idx, field, val) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: parseFloat(val) || 0 };
      const luas = (updated.panjang || 0) * (updated.lebar || 0);
      return { ...updated, luas, subtotal: updated.harga * updated.qty * luas };
    }));
  };

  const updateHarga = (idx, val) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const harga = parseFloat(val) || 0;
      const luas = it.satuan === "meter" ? (it.panjang || 0) * (it.lebar || 0) : 1;
      return { ...it, harga, subtotal: harga * it.qty * luas };
    }));
  };

  const totalHarga = items.reduce((s, it) => s + (it.subtotal || 0), 0);

  const handleSimpan = async () => {
    if (isAdmin && (!nama.trim() || !hp.trim())) {
      alert("Nama dan Nomor HP tidak boleh kosong!");
      return;
    }
    if (!window.confirm("Simpan perubahan pada order ini?")) return;

    try {
      setIsLoading(true);

      if (isAdmin) {
        // Admin: update semua field
        const formattedNama = toTitleCase(nama.trim());
        const itemsPayload = items.map((it) => ({
          produkId: it.produkId || it.nama,
          nama: it.nama,
          satuan: it.satuan,
          qty: it.qty,
          harga: it.harga,
          panjang: it.satuan === "meter" ? (it.panjang || 0) : null,
          lebar: it.satuan === "meter" ? (it.lebar || 0) : null,
          luas: it.satuan === "meter" ? (it.luas || 0) : null,
          subtotal: it.subtotal,
        }));
        await updateDoc(doc(db, "transactions", order.id), {
          nama: formattedNama,
          hp: hp.trim(),
          status_order: statusOrder,
          statusBayar: statusBayar,
          metode_pembayaran: metode,
          items: itemsPayload,
          total_harga: totalHarga,
        });
      } else {
        // Staff: HANYA update status_order — sesuai Firestore Rules
        await updateDoc(doc(db, "transactions", order.id), {
          status_order: statusOrder,
        });
      }

      alert("✅ Data berhasil diperbarui!");
      if (typeof onSaveSuccess === 'function') onSaveSuccess();
    } catch (error) {
      alert("Gagal memperbarui data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {isLoading && (
        <div style={styles.overlay}>
          <div style={styles.spinner} />
          <p>Menyimpan ke database...</p>
        </div>
      )}

      <div style={styles.backBtn} onClick={onBack}>⬅ Kembali</div>

      <h2 style={{ fontSize: 22, marginBottom: 20, color: '#04CDCD' }}>
        {isAdmin ? 'Edit Order' : 'Update Status Laundry'}
      </h2>

      {/* ── Nama Customer ── */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>Nama Customer</label>
        {isAdmin ? (
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            style={styles.input}
          />
        ) : (
          <div style={styles.readOnly}>{nama}</div>
        )}
      </div>

      {/* ── Nomor HP ── */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>Nomor HP</label>
        {isAdmin ? (
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            style={styles.input}
          />
        ) : (
          <div style={styles.readOnly}>{hp}</div>
        )}
      </div>

      {/* ── Detail Item ── */}
      <label style={{ fontWeight: 600, marginBottom: 10, display: 'block', color: '#475569' }}>
        Detail Item
      </label>

      {items.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Tidak ada item.</div>
      )}

      {items.map((item, idx) => (
        <div key={idx} style={styles.itemCard}>

          {/* Nama item — semua bisa lihat */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
              {item.nama}
            </span>

            {/* Kontrol qty — hanya admin */}
            {isAdmin ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => updateQty(idx, item.qty - 1)} style={styles.qtyBtn}>−</button>
                <span style={{ width: 24, textAlign: 'center', fontWeight: 700 }}>{item.qty}</span>
                <button onClick={() => updateQty(idx, item.qty + 1)} style={styles.qtyBtn}>+</button>
              </div>
            ) : (
              // Staff hanya lihat qty, tidak bisa ubah
              <span style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>
                {item.qty}×
              </span>
            )}
          </div>

          {/* Field harga & ukuran — hanya admin */}
          {isAdmin && (
            <>
              <div style={styles.fieldRow}>
                <label style={styles.fieldLabel}>Harga {item.satuan === "meter" ? "/m²" : "/pcs"}</label>
                <input
                  type="number"
                  value={item.harga}
                  onChange={(e) => updateHarga(idx, e.target.value)}
                  style={{ ...styles.input, marginBottom: 0 }}
                  placeholder="0"
                />
              </div>

              {item.satuan === "meter" && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <div>
                    <label style={styles.fieldLabel}>Panjang (m)</label>
                    <input
                      type="number" step="0.1" min="0"
                      value={item.panjang ?? 0}
                      onChange={(e) => updateMeter(idx, "panjang", e.target.value)}
                      style={{ ...styles.input, marginBottom: 0 }}
                    />
                  </div>
                  <div>
                    <label style={styles.fieldLabel}>Lebar (m)</label>
                    <input
                      type="number" step="0.1" min="0"
                      value={item.lebar ?? 0}
                      onChange={(e) => updateMeter(idx, "lebar", e.target.value)}
                      style={{ ...styles.input, marginBottom: 0 }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Ringkasan luas/subtotal — hanya admin */}
          {isAdmin && item.satuan === "meter" && (
            <div style={styles.luasBox}>
              <span>
                📐 {(item.panjang || 0).toFixed(1)}m × {(item.lebar || 0).toFixed(1)}m
                = <strong>{(item.luas || 0).toFixed(2)} m²</strong>
              </span>
              <span style={{ fontWeight: 700, color: '#04CDCD' }}>{rupiah(item.subtotal)}</span>
            </div>
          )}

          {isAdmin && item.satuan !== "meter" && (
            <div style={{ ...styles.luasBox, marginTop: 8 }}>
              <span>{item.qty} pcs × {rupiah(item.harga)}</span>
              <span style={{ fontWeight: 700, color: '#04CDCD' }}>{rupiah(item.subtotal)}</span>
            </div>
          )}

          {/* Staff: hanya tampilkan ukuran karpet tanpa nominal */}
          {!isAdmin && item.satuan === "meter" && item.luas > 0 && (
            <div style={styles.luasBoxStaff}>
              📐 {(item.panjang || 0).toFixed(1)}m × {(item.lebar || 0).toFixed(1)}m
              = <strong>{(item.luas || 0).toFixed(2)} m²</strong>
            </div>
          )}

        </div>
      ))}

      {/* Total — hanya admin */}
      {isAdmin && (
        <div style={styles.totalBox}>
          <span>Total</span>
          <strong style={{ color: '#04CDCD', fontSize: 16 }}>{rupiah(totalHarga)}</strong>
        </div>
      )}

      {/* Status Pembayaran & Metode — hanya admin */}
      {isAdmin && (
        <>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Status Pembayaran</label>
            <select
              value={statusBayar}
              onChange={(e) => setStatusBayar(e.target.value)}
              style={styles.input}
            >
              <option value="Belum Lunas">Belum Lunas</option>
              <option value="Lunas">Lunas</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Metode Pembayaran</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { id: 'Tunai', icon: '💵' },
                { id: 'QRIS', icon: '📲' },
                { id: 'Transfer', icon: '🏦' },
                { id: 'Belum Payment', icon: '⏳' },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setMetode(m.id)}
                  style={{
                    border: `2px solid ${metode === m.id ? '#04CDCD' : '#e2e8f0'}`,
                    borderRadius: 10, padding: '10px', cursor: 'pointer',
                    textAlign: 'center',
                    background: metode === m.id ? '#e0fafa' : '#fff',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: metode === m.id ? '#028585' : '#64748b' }}>
                    {m.id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Progres Laundry — semua role bisa edit ── */}
      <div style={styles.inputGroup}>
        <label style={styles.label}>Progres Laundry</label>
        <select
          value={statusOrder}
          onChange={(e) => setStatusOrder(e.target.value)}
          style={styles.input}
        >
          <option value="Waiting List">Waiting List</option>
          <option value="Sudah Dicuci">Sudah Dicuci</option>
          <option value="Ready Anter">Ready</option>
        </select>
      </div>

      <button onClick={handleSimpan} style={styles.saveBtn}>Simpan Perubahan</button>
      <div style={{ height: 40 }} />
    </div>
  );
}

const styles = {
  container: {
    padding: '20px', height: '100%', overflowY: 'auto',
    fontFamily: 'Inter, sans-serif', position: 'relative',
  },
  backBtn: { cursor: 'pointer', color: '#04CDCD', marginBottom: '20px', fontWeight: 'bold' },
  inputGroup: { marginBottom: '15px' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 },
  input: {
    width: '100%', padding: '12px', borderRadius: '10px',
    border: '2px solid #e2e8f0', boxSizing: 'border-box',
    outlineColor: '#04CDCD', fontSize: 14,
  },
  // Field read-only untuk staff (tidak bisa diedit)
  readOnly: {
    width: '100%', padding: '12px', borderRadius: '10px',
    border: '2px solid #f1f5f9', boxSizing: 'border-box',
    backgroundColor: '#f8fafc', color: '#64748b',
    fontSize: 14,
  },
  fieldRow: { marginTop: 8 },
  fieldLabel: {
    fontSize: 11, fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.4px',
    display: 'block', marginBottom: 4,
  },
  qtyBtn: {
    width: 32, height: 32, borderRadius: '8px', border: 'none',
    backgroundColor: '#04CDCD', color: '#fff', cursor: 'pointer',
    fontWeight: 'bold', fontSize: 16,
  },
  itemCard: {
    border: '1.5px solid #e2e8f0', borderRadius: 12,
    padding: '14px', marginBottom: 12, backgroundColor: '#f8fafc',
  },
  luasBox: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#e0fafa', borderRadius: 8, padding: '8px 12px',
    marginTop: 8, fontSize: 13, color: '#0F6E56',
  },
  // Versi luasBox untuk staff — tanpa nominal harga
  luasBoxStaff: {
    background: '#f0fdf4', borderRadius: 8, padding: '8px 12px',
    marginTop: 8, fontSize: 13, color: '#166534',
    border: '1px solid #bbf7d0',
  },
  totalBox: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#e0fafa', borderRadius: 10, padding: '12px 16px',
    marginBottom: 16, fontSize: 14,
  },
  saveBtn: {
    width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
    backgroundColor: '#04CDCD', color: '#fff', fontWeight: 'bold',
    marginTop: '10px', cursor: 'pointer', fontSize: 15,
  },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  spinner: {
    width: '40px', height: '40px',
    border: '4px solid #f3f3f3', borderTop: '4px solid #04CDCD',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
};

export default OrderEdit;