import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try { await signInWithEmailAndPassword(auth, email, password); } 
        catch { alert('Login Gagal'); setLoading(false); }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={{ textAlign: 'center' }}>Carpetology</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
                    <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
                    <button type="submit" style={styles.button}>{loading ? '...' : 'Masuk'}</button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
    card: { width: '300px', backgroundColor: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc' },
    button: { padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#6366f1', color: '#fff', cursor: 'pointer' }
};
export default Login;