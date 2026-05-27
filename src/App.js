import React, { useState, useEffect } from 'react';
import OrderList from './pages/OrderList';
import OrderAdd from './pages/OrderAdd';
import OrderDetail from './pages/OrderDetail';
import OrderEdit from './pages/OrderEdit';

// 1. Import koneksi Firebase yang sudah kita buat
import { db } from './firebase'; 
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from "firebase/firestore";

function App() {
  const [view, setView] = useState('list');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Semua');

  // 2. Mengambil data dari Firestore secara Real-time
  useEffect(() => {
    const q = query(collection(db, "orders")); // Tambahkan orderBy('tanggal', 'desc') jika ingin urutan terbaru
    
    // onSnapshot akan terus memantau perubahan database secara otomatis
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersArray = [];
      querySnapshot.forEach((doc) => {
        ordersArray.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersArray);
    });

    return () => unsubscribe(); // Cleanup listener saat komponen di-unmount
  }, []);

  // 3. Logika Menghapus Transaksi (Firebase)
  const handleDeleteOrder = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
      try {
        await deleteDoc(doc(db, "orders", id));
        setView('list'); // Kembali ke list setelah hapus
      } catch (error) {
        console.error("Gagal menghapus data:", error);
        alert("Gagal menghapus data.");
      }
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '0 auto', border: '1px solid #e2e8f0', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      
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

export default App;