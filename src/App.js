import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TrackingPage from './pages/TrackingPage';
import { useAuth } from './context/AuthContext';
import DashboardWrapper from './componets/DashboardWrapper';
import BookingHomeVisit from './componets/BookingHomeVisit';
import AdminBookingForm from './componets/AdminBookingForm';
import JadwalHomeVisit from './pages/Jadwalhomevisit';
import JadwalPickup from './pages/JadwalPickup';
import DetailOrderHomeVisit from './pages/Detailorderhomevisit';
import UbahOrderHomeVisit from './pages/Ubahorderhomevisit';
import ProductPage from './pages/ProductPage';
import DetailProduk from './pages/DetailProduk';
import KasirPage from './pages/kasir-system/KasirPage';
import NotaPublicPage from './pages/NotaPublicPage';
import TrackingDetailPage from './pages/TrackingDetailPage';
import CustomerPage from './pages/CustomerPage';
import './global.css';
import './index.css';

// ── Admin only ───────────────────────────────────────────────────────────────
const AdminRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/admin-login" />;
    if (user.role !== 'admin') return <Navigate to="/admin" />;
    return children;
};

// ── Admin + CS only ──────────────────────────────────────────────────────────
const CSAdminRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/admin-login" />;
    const role = (user.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'cs') return <Navigate to="/admin" />;
    return children;
};

// ── Semua yang login (admin, cs, staff) ──────────────────────────────────────
const StaffRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/admin-login" />;
    return children;
};

function App() {
    const { user, loading } = useAuth();

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#04CDCD' }}>
            Memuat sistem...
        </div>
    );

    return (
        <div className="app-container">
            <Router>
                <Routes>
                    {/* ── Public ── */}
                    <Route path="/" element={<TrackingPage />} />
                    <Route path="/nota/:notaId" element={<NotaPublicPage />} />
                    <Route path="/jadwal" element={<BookingHomeVisit bookings={[]} />} />
                    <Route path="/track/:notaId" element={<TrackingDetailPage />} />
                    <Route path="/admin-login" element={
                        user ? <Navigate to="/admin" /> : <Login />
                    } />

                    {/* ── Admin only ── */}
                    <Route path="/admin/kasir" element={
                        <AdminRoute><KasirPage /></AdminRoute>
                    } />
                    <Route path="/admin/customers" element={
                        <AdminRoute><CustomerPage /></AdminRoute>
                    } />
                    <Route path="/admin/products" element={
                        <AdminRoute><ProductPage /></AdminRoute>
                    } />
                    <Route path="/admin/tambah-produk" element={
                        <AdminRoute><DetailProduk /></AdminRoute>
                    } />
                    <Route path="/admin/produk/:id" element={
                        <AdminRoute><DetailProduk /></AdminRoute>
                    } />

                    {/* ── Admin + CS only ── */}
                    <Route path="/admin/jadwal-home-visit" element={
                        <CSAdminRoute><JadwalHomeVisit /></CSAdminRoute>
                    } />

                    {/* ── Semua yang login (admin, cs, staff) ── */}
                    <Route path="/admin/jadwal-pickup" element={
                        <StaffRoute><JadwalPickup /></StaffRoute>
                    } />
                    <Route path="/admin/tambah-booking" element={
                        <StaffRoute><AdminBookingForm /></StaffRoute>
                    } />
                    <Route path="/admin/home-visit/:id" element={
                        <StaffRoute><DetailOrderHomeVisit /></StaffRoute>
                    } />
                    <Route path="/admin/home-visit/:id/ubah" element={
                        <StaffRoute><UbahOrderHomeVisit /></StaffRoute>
                    } />
                    <Route path="/admin/*" element={
                        <StaffRoute><DashboardWrapper /></StaffRoute>
                    } />
                </Routes>
            </Router>
        </div>
    );
}

export default App;