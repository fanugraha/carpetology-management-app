import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TrackingPage from './pages/TrackingPage';
import { useAuth } from './context/AuthContext';
import DashboardWrapper from './componets/DashboardWrapper';
import BookingHomeVisit from './componets/BookingHomeVisit';
import AdminBookingForm from './componets/AdminBookingForm'; 
function App() {
  const { user } = useAuth();

  return (
    <div className="app-container">
      <Router>
        <Routes>
          {/* Halaman User: Tracking & Jadwal */}
          <Route path="/" element={<TrackingPage />} />
          <Route path="/jadwal" element={<BookingHomeVisit bookings={[]} />} /> 
          <Route path="/tambah-booking" element={<AdminBookingForm />} />
          {/* Halaman Login */}
          <Route path="/admin-login" element={<Login />} />

          {/* Halaman Admin: Menggunakan DashboardWrapper */}
          <Route path="/admin/*" element={
            user ? <DashboardWrapper /> : <Navigate to="/admin-login" />
          } />
        </Routes>
      </Router>
    </div>
  );
}

export default App;