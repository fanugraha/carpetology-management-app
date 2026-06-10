import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
import './DetailProduk.css';

// ── Pilihan satuan ────────────────────────────────────────────────────────
const SATUAN_OPTIONS = ['pcs', 'm²', 'meter', 'unit', 'kg', 'set'];

// ── Floating label input ──────────────────────────────────────────────────
function FloatInput({ label, icon, type = 'text', value, onChange, prefix }) {
  const raised = value !== '' && value !== undefined && value !== null;
  return (
    <div className="dp-field">
      {icon && <span className="dp-field__icon">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder=" "
        className={`dp-input${icon ? '' : ' dp-input--no-icon'}`}
      />
      <label className={[
        'dp-label',
        icon ? '' : 'dp-label--no-icon',
        raised ? 'dp-label--raised' : '',
      ].filter(Boolean).join(' ')}>
        {label}
      </label>
    </div>
  );
}

// ── Floating label select ─────────────────────────────────────────────────
function FloatSelect({ label, icon, value, onChange, options }) {
  const raised = !!value;
  return (
    <div className="dp-field">
      {icon && <span className="dp-field__icon">{icon}</span>}
      <select
        value={value}
        onChange={onChange}
        className={`dp-select${icon ? '' : ' dp-select--no-icon'}`}
      >
        <option value="" disabled hidden> </option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <label className={[
        'dp-label',
        icon ? '' : 'dp-label--no-icon',
        raised ? 'dp-label--raised' : '',
      ].filter(Boolean).join(' ')}>
        {label}
      </label>
      <span className="dp-select-arrow">▾</span>
    </div>
  );
}

// ── Icon produk ───────────────────────────────────────────────────────────
function productIcon(nama = '') {
  const n = nama.toLowerCase();
  if (n.includes('karpet'))  return '🟫';
  if (n.includes('spring'))  return '🛏️';
  if (n.includes('sofa'))    return '🛋️';
  if (n.includes('tikar'))   return '🟩';
  if (n.includes('bantal'))  return '🪑';
  return '🧹';
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function DetailProduk() {
  const { id } = useParams();       // undefined = mode tambah baru
  const navigate = useNavigate();
  const isNew = !id;

  const [original, setOriginal]     = useState(null);
  const [formData, setFormData]     = useState({ nama_produk: '', harga_jual: '', satuan: '' });
  const [tab, setTab]               = useState('lihat'); // 'lihat' | 'edit'  (hanya mode edit)
  const [loading, setLoading]       = useState(!isNew);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [success, setSuccess]       = useState(null); // 'saved' | 'deleted'

  const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  // ── Fetch (mode edit) ──
  useEffect(() => {
    if (isNew) return;
    const unsub = onSnapshot(doc(db, 'products', id), (snap) => {
      if (snap.exists()) {
        const d = { id: snap.id, ...snap.data() };
        setOriginal(d);
        setFormData({
          nama_produk: d.nama_produk || '',
          harga_jual:  d.harga_jual  !== undefined ? String(d.harga_jual) : '',
          satuan:      d.satuan      || '',
        });
      }
      setLoading(false);
    });
    return unsub;
  }, [id, isNew]);

  // ── Deteksi perubahan ──
  const hasChanges = !isNew && original && (
    formData.nama_produk !== (original.nama_produk || '') ||
    String(formData.harga_jual) !== String(original.harga_jual ?? '') ||
    formData.satuan !== (original.satuan || '')
  );

  const isFormValid = formData.nama_produk.trim() && formData.harga_jual && formData.satuan;

  // ── Save ──
  async function handleSave() {
    if (!isFormValid || saving) return;
    setSaving(true);
    const payload = {
      nama_produk: formData.nama_produk.trim(),
      harga_jual:  Number(formData.harga_jual),
      satuan:      formData.satuan,
    };
    try {
      if (isNew) {
        await addDoc(collection(db, 'products'), { ...payload, created_at: serverTimestamp() });
      } else {
        await updateDoc(doc(db, 'products', id), { ...payload, updated_at: serverTimestamp() });
      }
      setSuccess('saved');
      setTimeout(() => navigate(-1), 1800);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan produk.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──
  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'products', id));
      setShowDelete(false);
      setSuccess('deleted');
      setTimeout(() => navigate(-1), 1800);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus produk.');
    } finally {
      setDeleting(false);
    }
  }

  // ── Loading ──
  if (loading) return (
    <div className="dp-loading">
      <div className="dp-spinner" />
      <span className="dp-loading__text">Memuat produk...</span>
    </div>
  );

  const displayTitle = isNew ? 'Produk Baru' : (original?.nama_produk || 'Detail Produk');
  const icon = productIcon(formData.nama_produk);
  const hargaFormatted = Number(formData.harga_jual).toLocaleString('id-ID');

  return (
    <div className="dp-root">

      {/* ── Header ── */}
      <div className="dp-header">
        <button className="dp-header__back" onClick={() => navigate(-1)}>← Kembali</button>
        <div className="dp-header__icon">{icon}</div>
        <p className="dp-header__eyebrow">Carpetology · Produk</p>
        <h1 className="dp-header__title">{displayTitle}</h1>
        <span className={`dp-header__mode-badge ${isNew ? 'dp-header__mode-badge--new' : 'dp-header__mode-badge--edit'}`}>
          {isNew ? '✨ Tambah Baru' : '✏️ Mode Edit'}
        </span>
      </div>

      <div className="dp-content">

        {/* ── Tab toggle (mode edit saja) ── */}
        {!isNew && (
          <div className="dp-tabs">
            <button
              className={`dp-tab${tab === 'lihat' ? ' dp-tab--active' : ''}`}
              onClick={() => setTab('lihat')}
            >
              👁 Lihat
            </button>
            <button
              className={`dp-tab${tab === 'edit' ? ' dp-tab--active' : ''}`}
              onClick={() => setTab('edit')}
            >
              ✏️ Edit
            </button>
          </div>
        )}

        {/* ══════════ MODE LIHAT ══════════ */}
        {!isNew && tab === 'lihat' && original && (
          <div className="dp-card">
            <div className="dp-card__header">
              <span className="dp-card__header-label">Informasi Produk</span>
            </div>

            <div className="dp-preview">
              <div className="dp-preview__icon-wrap">🏷️</div>
              <div className="dp-preview__body">
                <div className="dp-preview__label">Nama Produk</div>
                <div className="dp-preview__val">{original.nama_produk}</div>
              </div>
            </div>

            <div className="dp-preview">
              <div className="dp-preview__icon-wrap">💰</div>
              <div className="dp-preview__body">
                <div className="dp-preview__label">Harga Jual</div>
                <div className="dp-preview__val dp-preview__val--price">
                  Rp {Number(original.harga_jual).toLocaleString('id-ID')}
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginLeft: 4 }}>
                    / {original.satuan}
                  </span>
                </div>
              </div>
            </div>

            <div className="dp-preview">
              <div className="dp-preview__icon-wrap">📦</div>
              <div className="dp-preview__body">
                <div className="dp-preview__label">Satuan</div>
                <div className="dp-preview__val">{original.satuan}</div>
              </div>
            </div>

            {original.updated_at && (
              <div className="dp-preview">
                <div className="dp-preview__icon-wrap">🕐</div>
                <div className="dp-preview__body">
                  <div className="dp-preview__label">Terakhir diubah</div>
                  <div className="dp-preview__val" style={{ fontSize: 13, color: '#64748b' }}>
                    {original.updated_at?.toDate?.().toLocaleString('id-ID') || '-'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ MODE FORM (tambah baru / edit) ══════════ */}
        {(isNew || tab === 'edit') && (
          <div className="dp-card">
            <div className="dp-card__header">
              <span className="dp-card__header-label">
                {isNew ? 'Data Produk Baru' : 'Ubah Data Produk'}
                {hasChanges && (
                  <span style={{
                    display: 'inline-block', width: 6, height: 6,
                    borderRadius: '50%', background: '#f59e0b',
                    marginLeft: 7, verticalAlign: 'middle',
                  }} />
                )}
              </span>
            </div>

            <div className="dp-card__body">

              {/* Nama produk */}
              <FloatInput
                label="Nama Produk"
                icon="🏷️"
                value={formData.nama_produk}
                onChange={e => set('nama_produk', e.target.value)}
              />

              {/* Harga jual */}
              <FloatInput
                label="Harga Jual (Rp)"
                icon="💰"
                type="number"
                value={formData.harga_jual}
                onChange={e => set('harga_jual', e.target.value)}
              />

              {/* Preview harga */}
              {formData.harga_jual && Number(formData.harga_jual) > 0 && (
                <div style={{
                  background: 'rgba(4,205,205,0.07)',
                  border: '1.5px solid rgba(4,205,205,0.2)',
                  borderRadius: 12, padding: '10px 14px',
                  fontSize: 13, color: '#04CDCD', fontWeight: 700,
                }}>
                  💵 Rp {Number(formData.harga_jual).toLocaleString('id-ID')}
                  {formData.satuan && ` / ${formData.satuan}`}
                </div>
              )}

              {/* Satuan */}
              <FloatSelect
                label="Satuan"
                icon="📦"
                value={formData.satuan}
                onChange={e => set('satuan', e.target.value)}
                options={SATUAN_OPTIONS}
              />

            </div>
          </div>
        )}

      </div>

      {/* ── Bottom action bar ── */}
      <div className={`dp-actions ${isNew ? 'dp-actions--new' : 'dp-actions--edit'}`}>

        {/* Mode edit: tombol Hapus */}
        {!isNew && (
          <button className="dp-btn dp-btn--danger" onClick={() => setShowDelete(true)}>
            🗑️ Hapus
          </button>
        )}

        {/* Tombol simpan */}
        {(isNew || tab === 'edit') && (
          <button
            className="dp-btn dp-btn--primary"
            disabled={!isFormValid || saving || (!isNew && !hasChanges)}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <span style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'dpSpin 0.7s linear infinite',
                  display: 'inline-block',
                }} />
                Menyimpan...
              </>
            ) : isNew ? '💾 Simpan Produk' : `✅ Simpan${hasChanges ? ' Perubahan' : ''}`}
          </button>
        )}

        {/* Mode lihat: tombol edit */}
        {!isNew && tab === 'lihat' && (
          <button className="dp-btn dp-btn--primary" onClick={() => setTab('edit')}>
            ✏️ Ubah Data
          </button>
        )}

      </div>

      {/* ── Delete modal ── */}
      {showDelete && (
        <div className="dp-modal-overlay" onClick={() => !deleting && setShowDelete(false)}>
          <div className="dp-modal" onClick={e => e.stopPropagation()}>
            <div className="dp-modal__handle" />
            <div className="dp-modal__icon">🗑️</div>
            <h2 className="dp-modal__title">Hapus Produk?</h2>
            <p className="dp-modal__sub">
              <strong>{original?.nama_produk}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
            </p>
            <div className="dp-modal__btns">
              <button className="dp-modal__cancel" onClick={() => setShowDelete(false)} disabled={deleting}>
                Batal
              </button>
              <button className="dp-modal__confirm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success overlay ── */}
      {success && (
        <div className="dp-success-overlay">
          <div className="dp-success-box">
            <div className="dp-success-box__icon">
              {success === 'saved' ? '✅' : '🗑️'}
            </div>
            <h2 className="dp-success-box__title">
              {success === 'saved' ? 'Berhasil Disimpan!' : 'Produk Dihapus'}
            </h2>
            <p className="dp-success-box__sub">
              {success === 'saved' ? 'Data produk telah diperbarui' : 'Produk berhasil dihapus dari sistem'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}