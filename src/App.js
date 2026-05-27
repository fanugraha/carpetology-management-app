import React, { useState, useEffect } from 'react';
import OrderList from './pages/OrderList';
import OrderAdd from './pages/OrderAdd';
import OrderDetail from './pages/OrderDetail';
import OrderEdit from './pages/OrderEdit';
import Login from './pages/Login';
import { useAuth } from './context/AuthContext';
import { db } from './firebase';
import { collection, onSnapshot, query, deleteDoc, doc } from "firebase/firestore";

function App() {
  const { user } = useAuth(); // Mengambil user dari AuthContext
  const [view, setView] = useState('list');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Semua');

  // --- LOGIKA DATA: Sinkronisasi real-time dengan Firestore ---
  useEffect(() => {
    // Pastikan data hanya diambil jika user sudah terautentikasi
    if (!user) {
      setOrders([]);
      return;
    }

    const q = query(collection(db, "orders"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersArray = [];
      querySnapshot.forEach((doc) => {
        ordersArray.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersArray);
    }, (error) => {
      console.error("Gagal sinkronisasi data: ", error);
    });
    
    return () => unsubscribe();
  }, [user]);

  // --- FUNGSI CRUD: Hapus Order ---
  const handleDeleteOrder = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
      try {
        await deleteDoc(doc(db, "orders", id));
        setView('list');
      } catch (error) {
        console.error("Gagal menghapus data:", error);
        alert("Gagal menghapus data.");
      }
    }
  };

  // --- GATE KEEPER: Jika belum login, tampilkan halaman Login ---
  if (!user) {
    return <Login />;
  }

  // --- RENDER APLIKASI ---
  return (
    <div style={styles.appContainer}>
      {view === 'list' && (
        <OrderList
          orders={orders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onOrderClick={(order) => { setSelectedOrder(order); setView('detail'); }}
          onAddClick={() => setView('add')}
        />
      )}

      {view === 'add' && (
        <OrderAdd
          onBack={() => setView('list')}
        />
      )}

      {view === 'detail' && (
        <OrderDetail
          order={selectedOrder}
          onBack={() => setView('list')}
          onEditClick={() => setView('edit')}
          onDeleteClick={() => handleDeleteOrder(selectedOrder.id)}
        />
      )}

      {view === 'edit' && (
        <OrderEdit
          order={selectedOrder}
          onBack={() => setView('detail')}
          onSaveSuccess={(updated) => { setSelectedOrder(updated); setView('detail'); }}
        />
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    maxWidth: '450px',
    margin: '0 auto',
    border: '1px solid #e2e8f0',
    height: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  }
};

export default App;