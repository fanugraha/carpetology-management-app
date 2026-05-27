import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/admin'); 
        }
        catch {
            alert('Login Gagal, periksa email/password Anda');
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>Carpetology</h2>
                <p style={styles.subTitle}>Admin Login</p>
                <form onSubmit={handleLogin} style={styles.form}>
                    <input 
                        type="email" 
                        placeholder="Email" 
                        onChange={(e) => setEmail(e.target.value)} 
                        style={styles.input} 
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        onChange={(e) => setPassword(e.target.value)} 
                        style={styles.input} 
                        required 
                    />
                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? 'Memproses...' : 'Masuk Sekarang'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: { 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#f8fafc', 
        padding: '20px',
        fontFamily: 'Inter, sans-serif' 
    },
    card: { 
        width: '100%', 
        maxWidth: '320px', 
        backgroundColor: '#fff', 
        padding: '30px', 
        borderRadius: '20px', 
        boxShadow: '0 10px 25px rgba(4, 205, 205, 0.15)' 
    },
    title: { textAlign: 'center', color: '#04CDCD', fontWeight: '800', margin: '0 0 5px 0' },
    subTitle: { textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '25px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { 
        padding: '12px 15px', 
        borderRadius: '10px', 
        border: '2px solid #e2e8f0', 
        width: '100%', 
        boxSizing: 'border-box',
        outlineColor: '#04CDCD'
    },
    button: { 
        padding: '12px', 
        borderRadius: '10px', 
        border: 'none', 
        backgroundColor: '#04CDCD', 
        color: '#fff', 
        cursor: 'pointer', 
        fontWeight: 'bold',
        fontSize: '15px',
        marginTop: '10px'
    }
};

export default Login;