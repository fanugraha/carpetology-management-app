import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { collection, onSnapshot, query, deleteDoc, doc } from "firebase/firestore";
import { db } from '../firebase';
import OrderList from '../pages/OrderList';
import OrderAdd from '../pages/OrderAdd';
import OrderDetail from '../pages/OrderDetail';
import OrderEdit from '../pages/OrderEdit';

function DashboardWrapper() {
    const [orders, setOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('Semua');
    const navigate = useNavigate();

    useEffect(() => {
        const q = query(collection(db, "orders"));
        return onSnapshot(q, (snapshot) => {
            const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // LOGIKA PRIORITAS OTOMATIS
            const sortedData = rawData.sort((a, b) => {
                const getScore = (order) => {
                    // Pastikan timestamp ada, jika tidak gunakan waktu sekarang
                    const tglMasuk = order.timestamp?.seconds
                        ? new Date(order.timestamp.seconds * 1000)
                        : (order.timestamp instanceof Date ? order.timestamp : new Date());

                    const diffDays = Math.floor((new Date() - tglMasuk) / (1000 * 60 * 60 * 24));

                    if (diffDays > 5) return 3; // Terlambat (>5 hari)
                    if (diffDays >= 2) return 2; // Warning (2-5 hari)
                    return 1; // Normal (<2 hari)
                };

                const scoreA = getScore(a);
                const scoreB = getScore(b);

                // Urutkan skor besar ke kecil
                if (scoreB !== scoreA) return scoreB - scoreA;

                // Jika skor sama, urutkan yang paling lama (FIFO)
                const dateA = a.timestamp?.seconds || 0;
                const dateB = b.timestamp?.seconds || 0;
                return dateA - dateB;
            });

            setOrders(sortedData);
        });
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Hapus transaksi ini?")) {
            await deleteDoc(doc(db, "orders", id));
            navigate('/admin');
        }
    };

    return (
        <Routes>
            <Route path="/" element={
                <OrderList orders={orders} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    activeFilter={activeFilter} setActiveFilter={setActiveFilter}
                    onOrderClick={(o) => navigate(`/admin/detail/${o.id}`)}
                    onAddClick={() => navigate('/admin/tambah')} />
            } />
            <Route path="/tambah" element={
                <OrderAdd
                    onBack={() => {
                        navigate('/admin', { replace: true });
                    }}
                />
            } />            <Route path="/detail/:id" element={<OrderDetailWrapper orders={orders} handleDelete={handleDelete} />} />
            <Route path="/edit/:id" element={<OrderEditWrapper orders={orders} />} />
        </Routes>
    );
}

// Wrapper tetap sama agar tidak merusak fungsionalitas lain
function OrderDetailWrapper({ orders, handleDelete }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const order = orders.find(o => o.id === id);
    if (!order) return <div>Memuat...</div>;
    return <OrderDetail
        order={order} onBack={() => navigate('/admin')}
        onEditClick={() => navigate(`/admin/edit/${id}`)}
        onDeleteClick={() => handleDelete(id)} />;
}

// Ubah bagian ini di DashboardWrapper.js
function OrderEditWrapper({ orders }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const order = orders.find(o => o.id === id);

    if (!order) return <div>Memuat...</div>;

    return (
        <OrderEdit
            order={order}
            onBack={() => navigate('/admin', { replace: true })}
            onSaveSuccess={() => navigate('/admin', { replace: true })}
        />
    );
}

export default DashboardWrapper;