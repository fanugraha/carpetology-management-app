import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Rate limiting sederhana di client side
const loginAttempts = { count: 0, lastAttempt: 0, lockedUntil: 0 };

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lockSeconds, setLockSeconds] = useState(0);
    const navigate = useNavigate();

    const getErrorMessage = (code) => {
        switch (code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Email atau password salah.';
            case 'auth/too-many-requests':
                return 'Terlalu banyak percobaan. Coba lagi beberapa menit.';
            case 'auth/network-request-failed':
                return 'Gagal terhubung. Periksa koneksi internet.';
            default:
                return 'Login gagal. Coba lagi.';
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        // Cek lockout
        const now = Date.now();
        if (loginAttempts.lockedUntil > now) {
            const sisa = Math.ceil((loginAttempts.lockedUntil - now) / 1000);
            setLockSeconds(sisa);
            const interval = setInterval(() => {
                const remaining = Math.ceil((loginAttempts.lockedUntil - Date.now()) / 1000);
                if (remaining <= 0) {
                    clearInterval(interval);
                    setLockSeconds(0);
                } else {
                    setLockSeconds(remaining);
                }
            }, 1000);
            return;
        }

        // Validasi basic
        if (!email.trim() || !password) {
            setError('Email dan password wajib diisi.');
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
            loginAttempts.count = 0;
            navigate('/admin');
        } catch (err) {
            loginAttempts.count += 1;
            loginAttempts.lastAttempt = Date.now();

            // Lock 60 detik setelah 5 gagal
            if (loginAttempts.count >= 5) {
                loginAttempts.lockedUntil = Date.now() + 60000;
                loginAttempts.count = 0;
                setError('5 percobaan gagal. Akun dikunci 60 detik.');
            } else {
                setError(getErrorMessage(err.code));
            }
        } finally {
            setLoading(false);
        }
    };

    const isLocked = lockSeconds > 0;

    return (
        <div style={S.page}>
            {/* Background decoration */}
            <div style={S.bgDeco1} />
            <div style={S.bgDeco2} />

            <div style={S.card}>
                {/* Logo */}
                <div style={S.logoWrap}>
                    <div style={S.logoIcon}>🧺</div>
                    <div style={S.logoText}>Carpetology</div>
                    <div style={S.logoSub}>Panel Admin</div>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={S.form} noValidate>

                    {/* Error banner */}
                    {error && (
                        <div style={S.errorBanner}>
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Lock countdown */}
                    {isLocked && (
                        <div style={S.lockBanner}>
                            <span style={{ fontSize: 18 }}>🔒</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Akun sementara dikunci</div>
                                <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
                                    Coba lagi dalam <strong>{lockSeconds}</strong> detik
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email */}
                    <div style={S.fieldWrap}>
                        <label style={S.label}>Email</label>
                        <div style={S.inputWrap}>
                            <span style={S.inputIcon}>✉️</span>
                            <input
                                type="email"
                                placeholder="admin@carpetology.id"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                style={S.input}
                                autoComplete="email"
                                disabled={loading || isLocked}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={S.fieldWrap}>
                        <label style={S.label}>Password</label>
                        <div style={S.inputWrap}>
                            <span style={S.inputIcon}>🔑</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                style={{ ...S.input, paddingRight: 44 }}
                                autoComplete="current-password"
                                disabled={loading || isLocked}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                style={S.eyeBtn}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        style={{
                            ...S.submitBtn,
                            opacity: loading || isLocked ? 0.6 : 1,
                            cursor: loading || isLocked ? 'not-allowed' : 'pointer',
                        }}
                        disabled={loading || isLocked}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                <span style={S.spinner} /> Memverifikasi...
                            </span>
                        ) : isLocked ? (
                            `🔒 Tunggu ${lockSeconds}s`
                        ) : (
                            'Masuk →'
                        )}
                    </button>
                </form>

                {/* Back to tracking */}
                <div style={S.footer}>
                    <a href="/" style={S.backLink}>← Kembali ke halaman tracking</a>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                input:focus { border-color: #04CDCD !important; box-shadow: 0 0 0 3px rgba(4,205,205,0.15) !important; outline: none; }
                input:disabled { background: #f8fafc; color: #94a3b8; }
            `}</style>
        </div>
    );
}

const S = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fefe',
        padding: '20px',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        position: 'relative',
        overflow: 'hidden',
    },

    // Background decorations
    bgDeco1: {
        position: 'fixed',
        top: -120,
        right: -120,
        width: 360,
        height: 360,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(4,205,205,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    bgDeco2: {
        position: 'fixed',
        bottom: -80,
        left: -80,
        width: 280,
        height: 280,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(4,205,205,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
    },

    // Card
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: '32px 28px 24px',
        boxShadow: '0 8px 40px rgba(4,205,205,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        position: 'relative',
        animation: 'fadeIn 0.3s ease-out',
    },

    // Logo
    logoWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 28,
    },
    logoIcon: {
        fontSize: 40,
        marginBottom: 8,
        background: '#e0fafa',
        borderRadius: 16,
        padding: '8px 14px',
    },
    logoText: {
        fontSize: 22,
        fontWeight: 800,
        color: '#04CDCD',
        letterSpacing: '-0.5px',
    },
    logoSub: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },

    // Form
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },

    // Error / lock banners
    errorBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 10,
        fontSize: 13,
        color: '#dc2626',
        fontWeight: 500,
        animation: 'fadeIn 0.2s ease-out',
    },
    lockBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: '#fff7ed',
        border: '1px solid #fed7aa',
        borderRadius: 10,
        color: '#c2410c',
        animation: 'fadeIn 0.2s ease-out',
    },

    // Fields
    fieldWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: 700,
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    inputWrap: {
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 15,
        pointerEvents: 'none',
    },
    input: {
        width: '100%',
        padding: '12px 14px 12px 40px',
        borderRadius: 10,
        border: '1.5px solid #e2e8f0',
        fontSize: 14,
        fontFamily: 'inherit',
        color: '#1e293b',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        background: '#fff',
    },
    eyeBtn: {
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 16,
        padding: 4,
        borderRadius: 6,
        lineHeight: 1,
    },

    // Submit button
    submitBtn: {
        padding: '14px',
        borderRadius: 12,
        border: 'none',
        background: 'linear-gradient(135deg, #04CDCD, #028585)',
        color: '#fff',
        fontWeight: 800,
        fontSize: 15,
        fontFamily: 'inherit',
        marginTop: 4,
        transition: 'all 0.2s',
        boxShadow: '0 4px 16px rgba(4,205,205,0.3)',
        letterSpacing: '0.2px',
    },

    spinner: {
        display: 'inline-block',
        width: 16,
        height: 16,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTop: '2px solid #fff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
    },

    // Footer
    footer: {
        textAlign: 'center',
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid #f1f5f9',
    },
    backLink: {
        fontSize: 12,
        color: '#94a3b8',
        textDecoration: 'none',
        fontWeight: 500,
    },
};

export default Login;