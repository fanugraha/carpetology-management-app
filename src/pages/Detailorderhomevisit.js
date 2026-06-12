import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import './Detailorderhomevisit.css';
import { useAuth } from '../context/AuthContext';

const BULAN_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatTanggal(str) {
    if (!str) return '-';
    const d = new Date(str + 'T00:00:00');
    return `${HARI_FULL[d.getDay()]}, ${d.getDate()} ${BULAN_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

export default function DetailOrderHomeVisit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const ref = doc(db, 'bookings', id);
        const unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setBooking({ id: snap.id, ...snap.data() });
            } else {
                setBooking(null);
            }
            setLoading(false);
        });
        return unsub;
    }, [id]);

    async function handleDelete() {
        setDeleting(true);
        try {
            await deleteDoc(doc(db, 'bookings', id));
            // UBAH BARIS INI:
            navigate('/admin/jadwal-home-visit');
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus data.');
            setDeleting(false);
        }
    }

    // ── Loading ──
    if (loading) return (
        <div className="dohv-loading">
            <div className="dohv-spinner" />
            <span className="dohv-loading__text">Memuat data...</span>
        </div>
    );

    // ── Not found ──
    if (!booking) return (
        <div className="dohv-notfound">
            <div className="dohv-notfound__emoji">🔍</div>
            <h2 className="dohv-notfound__title">Data tidak ditemukan</h2>
            <p className="dohv-notfound__sub">Booking mungkin sudah dihapus</p>
            <button className="dohv-btn dohv-btn--primary" style={{ marginTop: 16 }} onClick={() => navigate('/admin/jadwal-home-visit')}>
                Kembali
            </button>
        </div>
    );

    const sesiNum = Number(booking.sesi);
    const sesiIcon = sesiNum === 1 ? '🌅' : '🌤️';
    const sesiLabel = sesiNum === 1 ? 'Sesi 1' : 'Sesi 2';
    const sesiTime = sesiNum === 1 ? '09:00 – 11:00' : '13:00 – 15:00';

    const waHref = booking.no_hp
        ? `https://wa.me/${booking.no_hp
            .replace(/\D/g, '')      // hapus semua selain angka
            .replace(/^0/, '62')}`   // jika diawali 0, ubah jadi 62
        : null; const mapsHref = booking.maps_lokasi || null;

    return (
        <div className="dohv-root">

            {/* ── Hero ── */}
            <div className="dohv-hero">
                <button className="dohv-hero__back" onClick={() => navigate('/admin/jadwal-home-visit')}>← Kembali</button>
                <div className="dohv-hero__avatar">🧹</div>
                <h1 className="dohv-hero__name">{booking.nama}</h1>
                <div className="dohv-hero__sub">
                    <span>Home Visit</span>
                    <span>·</span>
                    <span className={`dohv-status ${booking.status === 'confirmed' ? 'dohv-status--confirmed' : 'dohv-status--pending'}`}>
                        ● {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                </div>
            </div>

            <div className="dohv-content">

                {/* ── Jadwal card ── */}
                <div className="dohv-card">
                    <div className="dohv-card__header">
                        <span className="dohv-card__header-label">Jadwal Kunjungan</span>
                    </div>

                    <div className="dohv-info-row">
                        <div className="dohv-info-row__icon">📅</div>
                        <div className="dohv-info-row__body">
                            <div className="dohv-info-row__label">Tanggal</div>
                            <div className="dohv-info-row__val">{formatTanggal(booking.tanggal)}</div>
                        </div>
                    </div>

                    <div className="dohv-sesi-badge">
                        <span className="dohv-sesi-badge__emoji">{sesiIcon}</span>
                        <span className="dohv-sesi-badge__label">{sesiLabel}</span>
                        <span className="dohv-sesi-badge__time">{sesiTime}</span>
                    </div>
                </div>

                {/* ── Kontak card ── */}
                <div className="dohv-card">
                    <div className="dohv-card__header">
                        <span className="dohv-card__header-label">Kontak Customer</span>
                    </div>

                    <div className="dohv-info-row">
                        <div className="dohv-info-row__icon">📱</div>
                        <div className="dohv-info-row__body">
                            <div className="dohv-info-row__label">WhatsApp</div>
                            <div className="dohv-info-row__val">{booking.no_hp || '-'}</div>
                        </div>
                        {waHref && (
                            <div className="dohv-info-row__action">
                                <a href={waHref} target="_blank" rel="noopener noreferrer" className="dohv-chip dohv-chip--wa">
                                    💬 Chat
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="dohv-info-row">
                        <div className="dohv-info-row__icon">📍</div>
                        <div className="dohv-info-row__body">
                            <div className="dohv-info-row__label">Lokasi</div>
                            <div className="dohv-info-row__val" style={{ fontSize: 12, wordBreak: 'break-all', color: mapsHref ? '#2563eb' : '#1e293b' }}>
                                {mapsHref ? 'Link tersedia' : 'Belum diisi'}
                            </div>
                        </div>
                        {mapsHref && (
                            <div className="dohv-info-row__action">
                                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="dohv-chip dohv-chip--maps">
                                    🗺️ Buka
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Keterangan ── */}
                {booking.keterangan && (
                    <div className="dohv-card">
                        <div className="dohv-card__header">
                            <span className="dohv-card__header-label">Keterangan</span>
                        </div>
                        <div className="dohv-note">{booking.keterangan}</div>
                    </div>
                )}

                {/* ── Meta ── */}
                <div className="dohv-card">
                    <div className="dohv-card__header">
                        <span className="dohv-card__header-label">Informasi Booking</span>
                    </div>
                    <div className="dohv-info-row">
                        <div className="dohv-info-row__icon">🆔</div>
                        <div className="dohv-info-row__body">
                            <div className="dohv-info-row__label">Booking ID</div>
                            <div className="dohv-info-row__val" style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                                {booking.id}
                            </div>
                        </div>
                    </div>
                    {booking.created_at && (
                        <div className="dohv-info-row">
                            <div className="dohv-info-row__icon">🕐</div>
                            <div className="dohv-info-row__body">
                                <div className="dohv-info-row__label">Dibuat</div>
                                <div className="dohv-info-row__val">
                                    {booking.created_at?.toDate
                                        ? booking.created_at.toDate().toLocaleString('id-ID')
                                        : '-'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* ── Bottom action bar ── */}
            {user?.role === 'admin' && (
                <div className="dohv-actions">
                    <button className="dohv-btn dohv-btn--danger" onClick={() => setShowDeleteModal(true)}>
                        🗑️ Hapus
                    </button>
                    <button className="dohv-btn dohv-btn--primary" onClick={() => navigate(`/admin/home-visit/${id}/ubah`)}>
                        ✏️ Ubah Data
                    </button>
                </div>
            )}

            {/* ── Delete confirm modal ── */}
            {showDeleteModal && (
                <div className="dohv-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="dohv-modal" onClick={e => e.stopPropagation()}>
                        <div className="dohv-modal__handle" />
                        <div className="dohv-modal__icon">🗑️</div>
                        <h2 className="dohv-modal__title">Hapus Booking?</h2>
                        <p className="dohv-modal__sub">
                            Data booking <strong>{booking.nama}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
                        </p>
                        <div className="dohv-modal__btns">
                            <button className="dohv-modal__btn-cancel" onClick={() => setShowDeleteModal(false)}>
                                Batal
                            </button>
                            <button className="dohv-modal__btn-delete" disabled={deleting} onClick={handleDelete}>
                                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}