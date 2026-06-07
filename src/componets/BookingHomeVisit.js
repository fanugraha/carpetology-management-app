import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; // Sesuaikan path ini dengan lokasi file firebase.js Anda
import "./BookingHomeVisit.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function toKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function LegendDot({ variant, label }) {
    return (
        <div className="legend-item">
            <div className={`legend-item__dot legend-item__dot--${variant}`} />
            <span className="legend-item__label">{label}</span>
        </div>
    );
}

function DayCell({ cell, viewYear, viewMonth, selected, today, onSelect, dbBookings }) {
    const isSunday = cell.col === 6;
    const key = cell.current ? toKey(viewYear, viewMonth, cell.day) : null;
    const isToday = key === toKey(today.getFullYear(), today.getMonth(), today.getDate());
    const isSelected = key === selected;

    // Logika Status dari Database
    const getStatus = (k) => {
        if (isSunday) return "libur";
        const d = dbBookings[k];
        if (!d) return "kosong";
        const filled = [d.sesi1, d.sesi2].filter(Boolean).length;
        if (filled === 2) return "penuh";
        if (filled === 1) return "sebagian";
        return "kosong";
    };

    const status = key ? getStatus(key) : "libur";
    const clickable = cell.current && !isSunday;

    const cellClass = ["day-cell", clickable ? "day-cell--clickable" : "", cell.current ? `day-cell--${status}` : "day-cell--outside", isSelected ? "day-cell--selected" : ""].filter(Boolean).join(" ");
    const numberClass = ["day-cell__number", isSelected ? "day-cell__number--selected" : !cell.current || isSunday ? "day-cell__number--outside" : isToday ? "day-cell__number--today" : ""].filter(Boolean).join(" ");

    return (
        <button disabled={!clickable} onClick={() => clickable && onSelect(isSelected ? null : key)} className={cellClass}>
            <span className={numberClass}>{cell.day}</span>
            {cell.current && !isSelected && (status === "sebagian" || status === "penuh") && (<div className={`day-cell__dot day-cell__dot--${status}`} />)}
            {isToday && !isSelected && (<div className="day-cell__today-ring" />)}
        </button>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BookingHomeVisit() {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selected, setSelected] = useState(null);
    const [dbBookings, setDbBookings] = useState({});

    // Realtime Sync Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
      const groupedData = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const dateKey = data.tanggal; // Mengambil string tanggal dari field "tanggal"
        
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = { sesi1: null, sesi2: null };
        }
        
        // Memasukkan data ke sesi yang sesuai
        if (data.sesi === 1) groupedData[dateKey].sesi1 = data;
        if (data.sesi === 2) groupedData[dateKey].sesi2 = data;
      });
      
      setDbBookings(groupedData);
    });
    return () => unsubscribe();
  }, []);

    const cells = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
        const grid = [];
        for (let i = offset - 1; i >= 0; i--) grid.push({ day: prevMonthDays - i, current: false, col: grid.length % 7 });
        for (let d = 1; d <= daysInMonth; d++) grid.push({ day: d, current: true, col: grid.length % 7 });
        while (grid.length % 7 !== 0) grid.push({ day: grid.length - daysInMonth - offset + 1, current: false, col: grid.length % 7 });
        return grid;
    }, [viewYear, viewMonth]);

    function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); setSelected(null); }
    function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); setSelected(null); }

    const selectedData = selected ? dbBookings[selected] : null;
    const isSunday = selected ? new Date(selected + "T00:00:00").getDay() === 0 : false;
    const selectedStatus = selected ? (isSunday ? "libur" : (!selectedData ? "kosong" : ([selectedData.sesi1, selectedData.sesi2].filter(Boolean).length === 2 ? "penuh" : "sebagian"))) : null;

    return (
        <div className="booking-root">
            <div className="booking-header">
                <p className="booking-header__brand">CARPETOLOGY</p>
                <h1 className="booking-header__title">Jadwal Home Visit</h1>
            </div>

            <div className="calendar-card">
                <div className="calendar-nav">
                    <button className="calendar-nav__btn" onClick={prevMonth}>‹</button>
                    <span className="calendar-nav__label">{MONTHS[viewMonth]} {viewYear}</span>
                    <button className="calendar-nav__btn" onClick={nextMonth}>›</button>
                </div>
                <div className="calendar-weekdays">{WEEKDAYS.map((wd, i) => <div key={wd} className={`calendar-weekday${i === 6 ? " calendar-weekday--sunday" : ""}`}>{wd}</div>)}</div>
                <div className="calendar-grid">
                    {cells.map((cell, idx) => (
                        <DayCell key={idx} cell={cell} viewYear={viewYear} viewMonth={viewMonth} selected={selected} today={today} onSelect={setSelected} dbBookings={dbBookings} />
                    ))}
                </div>
                <div className="calendar-legend">
                    <LegendDot variant="tersedia" label="Tersedia" />
                    <LegendDot variant="sebagian" label="1 sesi terisi" />
                    <LegendDot variant="penuh" label="Penuh" />
                    <LegendDot variant="libur" label="Libur" />
                </div>
            </div>

            <div className="detail-panel">
                {!selected ? (
                    <div className="detail-empty">
                        <div className="detail-empty__icon">📅</div>
                        <p className="detail-empty__text">Pilih tanggal untuk melihat detail booking</p>
                    </div>
                ) : (
                    <>
                        <div className="detail-header">
                            <p className="detail-header__date">{new Date(selected + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</p>
                        </div>
                        {[{ key: "sesi1", label: "Sesi 1", jam: "09:00 – 11:00", icon: "🌅" }, { key: "sesi2", label: "Sesi 2", jam: "13:00 – 15:00", icon: "🌤" }].map(({ key, label, jam, icon }) => {
                            const booking = selectedData?.[key];
                            return (
                                <div key={key} className={`sesi-card ${booking ? "sesi-card--booked" : "sesi-card--available"}`}>
                                    <div className="sesi-card__row">
                                        <div className="sesi-card__left">
                                            <div className={`sesi-card__icon`}>{icon}</div>
                                            <div><p className="sesi-card__label">{label}</p><p className="sesi-card__time">{jam}</p></div>
                                        </div>
                                        {booking ? <div className="sesi-card__right-booked"><p className="sesi-card__name">{booking.nama}</p></div> : <span className="sesi-card__available-tag">Tersedia</span>}
                                    </div>
                                </div>
                            );
                        })}
                        <a href="https://wa.me/6282151154727" target="_blank" rel="noopener noreferrer" className="detail-cta">Hubungi Admin untuk Booking</a>
                    </>
                )}
            </div>
        </div>
    );
}