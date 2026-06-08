import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

function TrackingPage() {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();
    const [filter, setFilter] = useState("Semua");

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("tanggal", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const getEstimasiInfo = (tglMasukStr, status) => {
        if (!tglMasukStr) return { tgl: '-', info: '-' };
        const bulanIndo = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
        const parts = tglMasukStr.split(' ');
        const tglMasuk = new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));
        const tglSelesai = new Date(tglMasuk);
        tglSelesai.setDate(tglMasuk.getDate() + 5);

        const hariIni = new Date();
        const selisih = Math.ceil((tglSelesai - hariIni) / (1000 * 60 * 60 * 24));
        const tglSelesaiStr = tglSelesai.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

        if (status === 'Ready Anter') return { tgl: tglSelesaiStr, info: 'Selesai' };
        if (selisih > 0) return { tgl: tglSelesaiStr, info: `${selisih} hari lagi` };

        return { tgl: tglSelesaiStr, info: 'Sedang diselesaikan' };
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'Ready Anter': return { label: 'Ready', bg: '#dcfce7', text: '#15803d', icon: '✅' };
            case 'Sudah Dicuci': return { label: 'Sudah Dicuci', bg: '#fef3c7', text: '#b45309', icon: '🧼' };
            default: return { label: 'Waiting List', bg: '#f1f5f9', text: '#64748b', icon: '⏳' };
        }
    };

    const filteredOrders = orders.filter((o) => {
        // Fungsi untuk menormalisasi nomor HP menjadi angka saja
        const normalizePhone = (phone) => {
            if (!phone) return "";
            // Menghapus semua karakter non-angka, lalu mengubah '62' di depan menjadi '0'
            let clean = phone.replace(/\D/g, "");
            if (clean.startsWith("62")) {
                clean = "0" + clean.substring(2);
            }
            return clean;
        };

        const searchLower = searchTerm.toLowerCase();
        const searchPhone = normalizePhone(searchTerm);

        const matchesSearch =
            o.nama.toLowerCase().includes(searchLower) ||
            (o.hp && (o.hp.includes(searchTerm) || normalizePhone(o.hp).includes(searchPhone)));

        const matchesFilter = filter === "Semua" || (filter === "Proses" ? o.status !== "Ready Anter" : o.status === "Ready Anter");

        return matchesSearch && matchesFilter;
    });

    return (
        <div style={styles.webContainer}>
            <header style={styles.header}>
                <h1 style={styles.brand}>Carpetology</h1>
                <p style={styles.subBrand}>Lacak progres pencucian Anda dengan mudah.</p>

                <div style={styles.topInfo}>
                    <span style={styles.hours}>🕒 08.00 - 16.00 WIB</span>
                    <button onClick={() => navigate('/admin-login')} style={styles.adminBtn}>Admin Login</button>
                </div>
            </header>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => navigate('/jadwal')}
                    style={styles.homeVisitBtn}
                >
                    Jadwal Home Serfice Sofa & Springbed
                </button>
            </div>

            <div style={styles.mainWrapper}>
                <input
                    type="text"
                    placeholder="🔍 Cari nama atau nomor HP..."
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />

                <div style={styles.filterContainer}>
                    {["Semua", "Proses", "Ready"].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, backgroundColor: filter === f ? '#04CDCD' : '#fff', color: filter === f ? '#fff' : '#04CDCD' }}>
                            {f}
                        </button>
                    ))}
                </div>

                <div style={styles.cardList}>
                    {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                        const status = getStatusInfo(order.status);
                        const est = getEstimasiInfo(order.tanggal, order.status);
                        const waLink = `https://wa.me/6282151154727?text=Halo Admin, saya ingin menanyakan progres order:%0ANama : ${order.nama}%0ATanggal Masuk : ${order.tanggal}`;

                        return (
                            <div key={order.id} style={styles.orderCard}>
                                <div style={styles.cardHeader}>
                                    <span style={{ ...styles.custName, cursor: 'pointer' }}>
                                        {order.nama}
                                    </span>
                                    <span style={{ ...styles.badge, backgroundColor: status.bg, color: status.text }}>
                                        {status.icon} {status.label}
                                    </span>
                                </div>
                                <div style={styles.cardBody}>
                                    <div style={styles.infoRow}><small>Tgl Masuk:</small> <span>{order.tanggal}</span></div>
                                    <div style={styles.infoRow}><small>Estimasi:</small> <strong>{est.tgl} ({est.info})</strong></div>
                                    {order.catatan && <div style={styles.noteBox}>⚠️ {order.catatan}</div>}
                                </div>
                                <a href={waLink} target="_blank" rel="noreferrer" style={styles.softWaBtn}>
                                    Tanya Progres Order
                                </a>
                            </div>
                        );
                    }) : <div style={styles.emptyState}>Data tidak ditemukan. Silakan hubungi admin via WhatsApp untuk bantuan.</div>
                    }
                </div>
            </div>

            <a href="https://wa.me/6282151154727" style={styles.fab}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.67-1.613-.916-2.207-.242-.579-.487-.5-.67-.509-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.996c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.005 0C5.37 0 .002 5.368.002 12.006c0 2.094.547 4.136 1.587 5.932L0 24l6.33-1.662a11.785 11.785 0 005.675 1.444h.005c6.634 0 12.002-5.368 12.002-12.006 0-3.21-1.25-6.233-3.522-8.504" /></svg>
            </a>
        </div>
    );
}

const styles = {
    webContainer: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px 15px', fontFamily: 'Inter, sans-serif' },
    header: { textAlign: 'center', marginBottom: '25px' },
    brand: { fontSize: '32px', color: '#04CDCD', fontWeight: '800', margin: '0' },
    subBrand: { color: '#64748b', fontSize: '13px', marginTop: '5px' },
    topInfo: { display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px', alignItems: 'center' },
    hours: { fontSize: '12px', color: '#04CDCD', fontWeight: '600' },
    adminBtn: { background: 'none', border: '1px solid #04CDCD', color: '#04CDCD', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
    mainWrapper: { maxWidth: '500px', margin: '0 auto' },
    searchInput: { width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '12px', border: '2px solid #04CDCD', boxSizing: 'border-box', outline: 'none' },
    cardList: { display: 'flex', flexDirection: 'column', gap: '12px' },
    orderCard: { backgroundColor: '#fff', padding: '16px', borderRadius: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    custName: { fontWeight: 'bold', color: '#1e293b' },
    badge: { padding: '4px 10px', borderRadius: '15px', fontSize: '10px', fontWeight: 'bold' },
    cardBody: { fontSize: '13px', color: '#64748b' },
    infoRow: { display: 'flex', justifyContent: 'space-between', marginTop: '4px' },
    filterContainer: { display: 'flex', gap: '10px', marginBottom: '15px' },
    homeVisitBtn: {
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto 20px auto',
        padding: '14px 20px',
        background: 'linear-gradient(135deg, #04CDCD, #00B8D4)',
        color: '#fff',
        border: 'none',
        borderRadius: '16px',
        fontSize: '15px',
        fontWeight: '700',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: '0 8px 24px rgba(4, 205, 205, 0.35)',
        transition: 'all 0.2s ease',
        letterSpacing: '0.3px'
    },
    filterBtn: { padding: '8px 16px', borderRadius: '20px', border: '1px solid #04CDCD', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
    emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' },
    fab: { position: 'fixed', bottom: '25px', right: '25px', backgroundColor: '#25D366', color: '#fff', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)', zIndex: 1000 },
    noteBox: { backgroundColor: '#fff7ed', color: '#c2410c', fontSize: '11px', padding: '6px', borderRadius: '6px', marginTop: '8px', border: '1px solid #fed7aa' },
    softWaBtn: { display: 'block', textAlign: 'center', marginTop: '12px', padding: '6px', fontSize: '11px', color: '#04CDCD', textDecoration: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'transparent' }
};

export default TrackingPage;