import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Tambahkan ini
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // Inisialisasi navigate

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/admin'); // Redirect ke dashboard admin setelah login sukses
        }
        catch {
            alert('Login Gagal, periksa email/password Anda');
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={{ textAlign: 'center', color: '#6366f1' }}>Carpetology</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
                    <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? 'Memproses...' : 'Masuk Admin'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px' },
    card: { width: '100%', maxWidth: '300px', backgroundColor: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' },
    button: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }
};

export default Login;