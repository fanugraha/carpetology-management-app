import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // Pastikan import ini ada

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* Aplikasi harus dibungkus AuthProvider */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);