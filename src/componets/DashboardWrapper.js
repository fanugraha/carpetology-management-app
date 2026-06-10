import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { collection, onSnapshot, query, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from '../firebase';
import OrderList from '../pages/OrderList';
import OrderDetail from '../pages/OrderDetail';
import OrderEdit from '../pages/OrderEdit';

function DashboardWrapper() {
    const [orders, setOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('Semua');
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Cache customers agar tidak fetch berulang
    const customerCache = React.useRef({});

    const fetchCustomer = async (customerRef) => {
        if (!customerRef) return { nama: '-', no_hp: '-' };
        const refPath = typeof customerRef === 'string' ? customerRef : customerRef.path;
        if (customerCache.current[refPath]) return customerCache.current[refPath];
        try {
            const customerDoc = await getDoc(
                typeof customerRef === 'string' ? doc(db, customerRef) : customerRef
            );
            const data = customerDoc.exists()
                ? { nama: customerDoc.data().nama || '-', no_hp: customerDoc.data().no_hp || '-' }
                : { nama: '-', no_hp: '-' };
            customerCache.current[refPath] = data;
            return data;
        } catch {
            return { nama: '-', no_hp: '-' };
        }
    };

    useEffect(() => {
        setIsLoading(true);
        const unsub = onSnapshot(query(collection(db, 'transactions')), async (snapshot) => {
            const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            const resolved = await Promise.all(
                raw.map(async (tx) => {
                    const customer = await fetchCustomer(tx.customer_id);
                    return {
                        ...tx,
                        nama: tx.nama || customer.nama,
                        hp: tx.hp || customer.no_hp,
                        // Normalize agar kompatibel dengan OrderList & OrderDetail
                        status: tx.status_order || tx.status || 'Waiting List',
                        statusBayar: tx.statusBayar || 'Belum Lunas',
                        metode_pembayaran: tx.metode_pembayaran || '',
                        tanggal: tx.tanggal || (tx.created_at?.seconds
                            ? new Date(tx.created_at.seconds * 1000).toLocaleDateString('id-ID', {
                                day: '2-digit', month: 'short', year: 'numeric'
                            })
                            : '-'),
                        total: Array.isArray(tx.items)
                            ? tx.items.map(it =>
                                it.satuan === 'meter' && it.luas
                                    ? `${it.qty}× ${it.nama} (${Number(it.luas).toFixed(2)}m²)`
                                    : `${it.qty}× ${it.nama}`
                            ).join(', ')
                            : '-',
                    };
                })
            );

            // Sort: urgent dulu (lama masuk), Ready Anter di bawah
            const sorted = resolved.sort((a, b) => {
                if (a.status === 'Ready Anter' && b.status !== 'Ready Anter') return 1;
                if (a.status !== 'Ready Anter' && b.status === 'Ready Anter') return -1;
                const tA = a.created_at?.seconds || 0;
                const tB = b.created_at?.seconds || 0;
                return tA - tB;
            });

            setOrders(sorted);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Hapus transaksi ini?")) {
            await deleteDoc(doc(db, "transactions", id));
            navigate('/admin');
        }
    };

    return (
        <Routes>
            <Route path="/" element={
                <OrderList
                    orders={orders}
                    isLoading={isLoading}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    onOrderClick={(o) => navigate(`/admin/detail/${o.id}`)}
                />
            } />
            <Route path="/detail/:id" element={
                <OrderDetailWrapper orders={orders} handleDelete={handleDelete} />
            } />
            <Route path="/edit/:id" element={
                <OrderEditWrapper orders={orders} />
            } />
        </Routes>
    );
}

function OrderDetailWrapper({ orders, handleDelete }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const order = orders.find(o => o.id === id);
    if (!order) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8', fontSize: 14 }}>
            Memuat data...
        </div>
    );
    return (
        <OrderDetail
            order={order}
            onBack={() => navigate('/admin')}
            onEditClick={() => navigate(`/admin/edit/${id}`)}
            onDeleteClick={() => handleDelete(id)}
        />
    );
}

function OrderEditWrapper({ orders }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const order = orders.find(o => o.id === id);
    if (!order) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8', fontSize: 14 }}>
            Memuat data...
        </div>
    );
    return (
        <OrderEdit
            order={order}
            onBack={() => navigate('/admin', { replace: true })}
            onSaveSuccess={() => navigate('/admin', { replace: true })}
        />
    );
}

export default DashboardWrapper;