import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TrackingPage from './pages/TrackingPage';
import { useAuth } from './context/AuthContext';
import DashboardWrapper from './componets/DashboardWrapper';

function App() {
  const { user } = useAuth();

  const AdminRoute = ({ children }) => {
    return user ? children : <Navigate to="/admin-login" />;
  };

  return (
    // Hapus style={styles.appContainer}
    <div className="app-container"> 
      <Router>
        <Routes>
          <Route path="/" element={<TrackingPage />} />
          <Route path="/admin-login" element={<Login />} />
          <Route path="/admin" element={
            <AdminRoute>
              <DashboardWrapper />
            </AdminRoute>
          } />
        </Routes>
      </Router>
    </div>
  );
}
export default App;