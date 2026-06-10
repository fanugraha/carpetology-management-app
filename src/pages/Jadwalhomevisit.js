import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import './Jadwalhomevisit.css';
import { useAuth } from '../context/AuthContext';

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const HARI_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekDays(anchor) {
  // Senin s/d Sabtu dari anchor week
  const day = anchor.getDay(); // 0=Sun
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function JadwalHomeVisit() {
  const navigate = useNavigate();
  const today = new Date();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'Admin';

  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);


  // ── Fetch semua booking dari Firestore ──
  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const weekDays = useMemo(() => getWeekDays(anchor), [anchor]);

  // ── Bookings untuk tanggal terpilih ──
  const selectedKey = toDateKey(selectedDate);
  const dayBookings = useMemo(() => bookings.filter(b => b.tanggal === selectedKey), [bookings, selectedKey]);

  const sesi1 = dayBookings.filter(b => b.sesi === 1 || b.sesi === '1');
  const sesi2 = dayBookings.filter(b => b.sesi === 2 || b.sesi === '2');

  // ── Summary minggu ini ──
  const weekKeys = new Set(weekDays.map(toDateKey));
  const weekBookings = bookings.filter(b => weekKeys.has(b.tanggal));
  const totalMingguIni = weekBookings.length;
  const totalTerisi = weekBookings.length;

  function prevWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    setAnchor(d);
  }
  function nextWeek() {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    setAnchor(d);
  }

  function formatSelectedLabel() {
    return `${HARI_FULL[selectedDate.getDay()]}, ${selectedDate.getDate()} ${BULAN_FULL[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }

  // ── Render satu booking card ──
  function BookingCard({ booking }) {
    if (!booking) return (
      <div className="jhv-booking-card jhv-booking-card--empty">
        <div className="jhv-booking-card__avatar jhv-booking-card__avatar--empty">➕</div>
        <span className="jhv-booking-card__empty-text">Slot tersedia</span>
      </div>
    );
    return (
      <div className="jhv-booking-card" onClick={() => navigate(`/admin/home-visit/${booking.id}`)}>
        <div className="jhv-booking-card__avatar">🧹</div>
        <div className="jhv-booking-card__info">
          <div className="jhv-booking-card__name">{booking.nama}</div>
          <div className="jhv-booking-card__sub">{booking.no_hp || '-'}</div>
        </div>
        <div className="jhv-status-dot jhv-status-dot--confirmed" />
        <span className="jhv-booking-card__chevron">›</span>
      </div>
    );
  }

  // ── Render sesi section ──
  function SesiSection({ num, emoji, label, time, items }) {
    return (
      <div className="jhv-sesi-section">
        <div className="jhv-sesi-header">
          <div className="jhv-sesi-header__pill">
            <span className="jhv-sesi-header__emoji">{emoji}</span>
            <span className="jhv-sesi-header__label">{label}</span>
            <span className="jhv-sesi-header__time">{time}</span>
          </div>
          <div className="jhv-sesi-header__line" />
        </div>
        {items.length > 0
          ? items.map(b => <BookingCard key={b.id} booking={b} />)
          : <BookingCard booking={null} />
        }
      </div>
    );
  }

  return (
    <div className="jhv-root">

      {/* ── Header ── */}
      <div className="jhv-header">
        <button className="jhv-header__back" onClick={() => navigate(-1)}>
          ← Kembali
        </button>
        <p className="jhv-header__eyebrow">Carpetology</p>
        <h1 className="jhv-header__title">Jadwal Home Visit</h1>
      </div>

      {/* ── Week strip ── */}
      <div style={{ padding: '0 16px' }}>
        <div className="jhv-week-card">
          <button className="jhv-week-nav" onClick={prevWeek}>‹</button>

          <div className="jhv-week-days">
            {weekDays.map((d, i) => {
              const key = toDateKey(d);
              const isToday = toDateKey(d) === toDateKey(today);
              const isSelected = toDateKey(d) === toDateKey(selectedDate);
              const hasBooking = bookings.some(b => b.tanggal === key);
              return (
                <div
                  key={i}
                  className={[
                    'jhv-day-pill',
                    isSelected ? 'jhv-day-pill--active' : '',
                    isToday && !isSelected ? 'jhv-day-pill--today' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedDate(d)}
                >
                  <span className="jhv-day-pill__name">{HARI[d.getDay()]}</span>
                  <span className="jhv-day-pill__num">{d.getDate()}</span>
                  {hasBooking && !isSelected && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#04CDCD', marginTop: 2 }} />
                  )}
                </div>
              );
            })}
          </div>

          <button className="jhv-week-nav" onClick={nextWeek}>›</button>
        </div>
      </div>

      <div className="jhv-content">

        {/* Summary minggu */}
        <div className="jhv-summary">
          <div className="jhv-summary__item">
            <div className="jhv-summary__num">{totalMingguIni}</div>
            <div className="jhv-summary__label">Minggu ini</div>
          </div>
          <div className="jhv-divider" />
          <div className="jhv-summary__item">
            <div className="jhv-summary__num">{sesi1.length + sesi2.length}</div>
            <div className="jhv-summary__label">Hari ini</div>
          </div>
          <div className="jhv-divider" />
          <div className="jhv-summary__item">
            <div className="jhv-summary__num">{2 - (sesi1.length > 0 ? 1 : 0) - (sesi2.length > 0 ? 1 : 0)}</div>
            <div className="jhv-summary__label">Slot kosong</div>
          </div>
        </div>

        {/* Date label */}
        <p className="jhv-date-label">{formatSelectedLabel()}</p>

        {loading ? (
          <div className="jhv-loading">
            <div className="jhv-spinner" />
            <span className="jhv-loading__text">Memuat data...</span>
          </div>
        ) : (
          <>
            <SesiSection
              num={1} emoji="🌅" label="Sesi 1" time="09:00 – 11:00"
              items={sesi1}
            />
            <SesiSection
              num={2} emoji="🌤️" label="Sesi 2" time="13:00 – 15:00"
              items={sesi2}
            />
          </>
        )}
      </div>

      {/* FAB tambah */}
      {isAdmin && (
        <button className="jhv-fab" onClick={() => navigate('/tambah-booking')}>+</button>
      )}    </div>
  );
}