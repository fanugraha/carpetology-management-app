import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

function TrackingPage() {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("tanggal", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // Fungsi menghitung estimasi selesai
    const calculateEstimasi = (tglMasukStr) => {
        if (!tglMasukStr) return '-';
        const bulanIndo = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
        const parts = tglMasukStr.split(' ');
        const tglMasuk = new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));
        
        const tglSelesai = new Date(tglMasuk);
        tglSelesai.setDate(tglMasuk.getDate() + 5);
        return tglSelesai.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Fungsi untuk memproses label status
    const formatStatus = (status) => {
        return status === 'Ready Anter' ? 'Ready' : status;
    };

    // Fungsi warna status sesuai permintaan
    const getStatusStyles = (status) => {
        switch (status) {
            case 'Ready Anter': return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }; // Hijau
            case 'Sudah Dicuci': return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }; // Kuning
            case 'Waiting List': return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' }; // Abu
            default: return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
        }
    };

    const filteredOrders = orders.filter((order) =>
        order.nama.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={styles.webContainer}>
            <header style={styles.header}>
                <h1 style={styles.brand}>Carpetology</h1>
                <p style={styles.subBrand}>Lacak progres pencucian karpet Anda dengan mudah, kapan saja dan di mana saja.</p>
            </header>

            <div style={styles.mainWrapper}>
                <input 
                    type="text" 
                    placeholder="🔍 Cari nama pelanggan..." 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />

                <div style={styles.tableCard}>
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.trHead}>
                                    <th style={styles.th}>NAMA</th>
                                    <th style={styles.th}>TGL MASUK</th>
                                    <th style={styles.th}>ESTIMASI SELESAI</th>
                                    <th style={styles.th}>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => {
                                    const s = getStatusStyles(order.status);
                                    const estimasi = calculateEstimasi(order.tanggal);
                                    return (
                                        <tr key={order.id} style={styles.trBody}>
                                            <td style={styles.tdName}>{order.nama}</td>
                                            <td style={styles.td}>{order.tanggal || '-'}</td>
                                            <td style={styles.td}>{estimasi}</td>
                                            <td style={styles.td}>
                                                <span style={{...styles.badge, backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`}}>
                                                    {formatStatus(order.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={styles.footerContainer}>
                    <button onClick={() => navigate('/admin-login')} style={styles.adminBtn}>
                        Admin Login
                    </button>
                    <p style={styles.helpText}>
                        Ada kendala? <a href="https://wa.me/6282151154727" style={styles.waLink}>Hubungi via WhatsApp</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

const styles = {
    webContainer: { minHeight: '100vh', backgroundColor: '#f8fafc', padding: '30px 15px', fontFamily: 'Inter, sans-serif' },
    header: { textAlign: 'center', marginBottom: '30px' },
    brand: { fontSize: '36px', color: '#04CDCD', fontWeight: '800', margin: '0' },
    subBrand: { color: '#64748b', fontSize: '14px', marginTop: '10px', maxWidth: '500px', marginInline: 'auto' },
    mainWrapper: { maxWidth: '900px', margin: '0 auto' },
    searchInput: { width: '100%', padding: '14px 18px', marginBottom: '25px', borderRadius: '12px', border: '2px solid #04CDCD', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    tableCard: { backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', overflow: 'hidden' },
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' },
    trHead: { backgroundColor: '#F0FDFD', borderBottom: '2px solid #04CDCD' },
    th: { padding: '15px 12px', textAlign: 'left', color: '#0f766e', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' },
    trBody: { borderBottom: '1px solid #f1f5f9' },
    td: { padding: '16px 12px', color: '#334155', fontSize: '13px' },
    tdName: { padding: '16px 12px', color: '#1e293b', fontWeight: '600', fontSize: '13px' },
    badge: { padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' },
    footerContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', gap: '15px' },
    adminBtn: { padding: '12px 40px', backgroundColor: '#04CDCD', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 6px rgba(4, 205, 205, 0.2)' },
    helpText: { color: '#64748b', fontSize: '12px', margin: 0 },
    waLink: { color: '#04CDCD', fontWeight: 'bold', textDecoration: 'none' }
};

export default TrackingPage;