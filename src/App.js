import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TrackingPage from './pages/TrackingPage';
import { useAuth } from './context/AuthContext';
import DashboardWrapper from './componets/DashboardWrapper';

function App() {
  const { user } = useAuth();

  return (
    <div className="app-container">
      <Router>
        <Routes>
          <Route path="/" element={<TrackingPage />} />
          <Route path="/admin-login" element={<Login />} />

          {/* Wildcard * memastikan /admin/detail, /admin/tambah dll tercover */}
          <Route path="/admin/*" element={
            user ? <DashboardWrapper /> : <Navigate to="/admin-login" />
          } />
        </Routes>
      </Router>
    </div>
  );
}

export default App;