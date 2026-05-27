import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc } from "firebase/firestore";
import { db } from '../firebase';
import OrderList from '../pages/OrderList';
import OrderAdd from '../pages/OrderAdd';
import OrderDetail from '../pages/OrderDetail';
import OrderEdit from '../pages/OrderEdit';

function DashboardWrapper() {
    const [view, setView] = useState('list');
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('Semua');

    useEffect(() => {
        const q = query(collection(db, "orders"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(data);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Hapus transaksi ini?")) {
            await deleteDoc(doc(db, "orders", id));
            setView('list');
        }
    };

    if (view === 'add') return <OrderAdd onBack={() => setView('list')} />;
    if (view === 'detail') return <OrderDetail order={selectedOrder} onBack={() => setView('list')} onEditClick={() => setView('edit')} onDeleteClick={() => handleDelete(selectedOrder.id)} />;
    if (view === 'edit') return <OrderEdit order={selectedOrder} onBack={() => setView('detail')} onSaveSuccess={(u) => { setSelectedOrder(u); setView('detail'); }} />;

    return <OrderList orders={orders} searchQuery={searchQuery} setSearchQuery={setSearchQuery} activeFilter={activeFilter} setActiveFilter={setActiveFilter} onOrderClick={(o) => { setSelectedOrder(o); setView('detail'); }} onAddClick={() => setView('add')} />;
}

export default DashboardWrapper;