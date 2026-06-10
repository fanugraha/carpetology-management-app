import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TrackingPage from './pages/TrackingPage';
import { useAuth } from './context/AuthContext';
import DashboardWrapper from './componets/DashboardWrapper';
import BookingHomeVisit from './componets/BookingHomeVisit';
import AdminBookingForm from './componets/AdminBookingForm';
import JadwalHomeVisit from './pages/Jadwalhomevisit';
import DetailOrderHomeVisit from './pages/Detailorderhomevisit';
import UbahOrderHomeVisit from './pages/Ubahorderhomevisit';
import ProductPage from './pages/ProductPage';
import DetailProduk from './pages/DetailProduk';
import KasirPage from './pages/kasir-system/KasirPage';

function App() {
    const { user, loading } = useAuth(); // ← tambah loading

    // Jangan render apapun sampai auth selesai check
    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#04CDCD' }}>
            Memuat sistem...
        </div>
    );

    return (
        <div className="app-container">
            <Router>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<TrackingPage />} />
                    <Route path="/jadwal" element={<BookingHomeVisit bookings={[]} />} />
                    <Route path="/tambah-booking" element={<AdminBookingForm />} />
                    <Route path="/tambah-produk" element={<DetailProduk />} />
                    <Route path="/produk/:id" element={<DetailProduk />} />
                    <Route path="/admin-login" element={
                        user ? <Navigate to="/admin" /> : <Login />  // ← kalau sudah login, skip login page
                    } />

                    {/* Admin routes — semua wajib login */}
                    <Route path="/admin/kasir" element={
                        user ? <KasirPage /> : <Navigate to="/admin-login" />
                    } />
                    <Route path="/admin/products" element={
                        user ? <ProductPage /> : <Navigate to="/admin-login" />
                    } />
                    <Route path="/admin/jadwal-home-visit" element={
                        user ? <JadwalHomeVisit /> : <Navigate to="/admin-login" />
                    } />
                    <Route path="/admin/home-visit/:id" element={
                        user ? <DetailOrderHomeVisit /> : <Navigate to="/admin-login" />
                    } />
                    <Route path="/admin/home-visit/:id/ubah" element={
                        user ? <UbahOrderHomeVisit /> : <Navigate to="/admin-login" />
                    } />
                    <Route path="/admin/*" element={
                        user ? <DashboardWrapper /> : <Navigate to="/admin-login" />
                    } />
                </Routes>
            </Router>
        </div>
    );
}

export default App;