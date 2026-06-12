import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
    Mail, Lock, Eye, EyeOff, LogIn,
    ShieldAlert, AlertCircle, Layers, ChevronLeft,
} from 'lucide-react';

const loginAttempts = { count: 0, lockedUntil: 0 };

export default function Login() {
    const [email, setEmail]               = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    const [lockSeconds, setLockSeconds]   = useState(0);
    const navigate = useNavigate();

    const getErrorMessage = (code) => {
        switch (code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Email atau password salah. Periksa kembali.';
            case 'auth/too-many-requests':
                return 'Terlalu banyak percobaan. Tunggu beberapa menit.';
            case 'auth/network-request-failed':
                return 'Tidak ada koneksi. Periksa internet Anda.';
            default:
                return 'Login gagal. Coba lagi.';
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        const now = Date.now();
        if (loginAttempts.lockedUntil > now) {
            const sisa = Math.ceil((loginAttempts.lockedUntil - now) / 1000);
            setLockSeconds(sisa);
            const iv = setInterval(() => {
                const rem = Math.ceil((loginAttempts.lockedUntil - Date.now()) / 1000);
                if (rem <= 0) { clearInterval(iv); setLockSeconds(0); }
                else setLockSeconds(rem);
            }, 1000);
            return;
        }

        if (!email.trim()) { setError('Masukkan email Anda.'); return; }
        if (!password)     { setError('Masukkan password Anda.'); return; }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
            loginAttempts.count = 0;
            navigate('/admin');
        } catch (err) {
            loginAttempts.count += 1;
            if (loginAttempts.count >= 5) {
                loginAttempts.lockedUntil = Date.now() + 60000;
                loginAttempts.count = 0;
                setError('5 percobaan gagal. Coba lagi dalam 60 detik.');
            } else {
                setError(getErrorMessage(err.code));
            }
        } finally {
            setLoading(false);
        }
    };

    const isLocked = lockSeconds > 0;
    const canSubmit = email.trim().length > 0 && password.length > 0 && !loading && !isLocked;

    return (
        <div style={S.page}>

            {/* Back */}
            <a href="/" style={S.backLink}>
                <ChevronLeft size={16} />
                Tracking order
            </a>

            {/* Card */}
            <div style={S.card}>

                {/* Logo */}
                <div style={S.logoRow}>
                    <div style={S.logoIcon}>
                        <Layers size={20} color="#04CDCD" />
                    </div>
                    <span style={S.logoName}>Carpetology</span>
                </div>

                {/* Heading */}
                <div style={S.heading}>
                    <h1 style={S.title}>Masuk</h1>
                    <p style={S.subtitle}>Panel admin · Hanya untuk staf terdaftar</p>
                </div>

                {/* Error / lock banner */}
                {(error || isLocked) && (
                    <div style={isLocked ? S.lockBanner : S.errorBanner}>
                        {isLocked
                            ? <ShieldAlert size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                            : <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                        }
                        <div>
                            {isLocked
                                ? <><strong>Akun dikunci.</strong> Coba lagi dalam {lockSeconds} detik.</>
                                : error
                            }
                        </div>
                    </div>
                )}

                <form onSubmit={handleLogin} noValidate style={S.form}>

                    {/* Email */}
                    <div style={S.fieldGroup}>
                        <label style={S.label} htmlFor="email">Email</label>
                        <div style={S.inputBox} className="login-inputbox">
                            <Mail size={17} color="#94a3b8" style={S.inputIcon} />
                            <input
                                id="email"
                                type="email"
                                placeholder="admin@carpetology.id"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(''); }}
                                style={S.input}
                                autoComplete="email"
                                autoCapitalize="none"
                                inputMode="email"
                                disabled={loading || isLocked}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={S.fieldGroup}>
                        <label style={S.label} htmlFor="password">Password</label>
                        <div style={S.inputBox} className="login-inputbox">
                            <Lock size={17} color="#94a3b8" style={S.inputIcon} />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                style={{ ...S.input, paddingRight: 48 }}
                                autoComplete="current-password"
                                disabled={loading || isLocked}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                style={S.eyeBtn}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                            >
                                {showPassword
                                    ? <EyeOff size={17} color="#94a3b8" />
                                    : <Eye size={17} color="#94a3b8" />
                                }
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        style={{
                            ...S.submitBtn,
                            ...(!canSubmit ? S.submitBtnDisabled : {}),
                        }}
                        disabled={!canSubmit}
                    >
                        {loading ? (
                            <><span style={S.spinner} /> Memverifikasi...</>
                        ) : isLocked ? (
                            <><ShieldAlert size={17} /> Dikunci {lockSeconds}s</>
                        ) : (
                            <><LogIn size={17} /> Masuk</>
                        )}
                    </button>

                </form>
            </div>

            <style>{`
                @keyframes loginSpin { to { transform: rotate(360deg); } }
                @keyframes loginUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .login-inputbox:focus-within {
                    border-color: #04CDCD !important;
                    box-shadow: 0 0 0 3px rgba(4,205,205,0.15) !important;
                }
                #email, #password { outline: none; }
                input:disabled { color: #94a3b8 !important; }
            `}</style>
        </div>
    );
}

const S = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #edfafa 0%, #f0fefe 50%, #f8fafc 100%)',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        padding: '24px 16px',
        position: 'relative',
    },

    backLink: {
        position: 'absolute',
        top: 20,
        left: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        fontSize: 13,
        fontWeight: 600,
        color: '#94a3b8',
        textDecoration: 'none',
    },

    card: {
        width: '100%',
        maxWidth: 400,
        background: '#fff',
        borderRadius: 24,
        padding: '36px 32px 32px',
        boxShadow: '0 2px 4px rgba(15,23,42,0.04), 0 8px 32px rgba(15,23,42,0.08)',
        border: '1px solid #f1f5f9',
        animation: 'loginUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
    },

    logoRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        marginBottom: 28,
    },
    logoIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'rgba(4,205,205,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoName: {
        fontSize: 16,
        fontWeight: 800,
        color: '#0f172a',
        letterSpacing: '-0.3px',
    },

    heading: {
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: 900,
        color: '#0f172a',
        letterSpacing: '-0.5px',
        marginBottom: 5,
        lineHeight: 1.1,
    },
    subtitle: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: 400,
    },

    errorBanner: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 12,
        fontSize: 13,
        color: '#dc2626',
        fontWeight: 500,
        marginBottom: 20,
        lineHeight: 1.5,
    },
    lockBanner: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        background: '#fff7ed',
        border: '1px solid #fed7aa',
        borderRadius: 12,
        fontSize: 13,
        color: '#c2410c',
        fontWeight: 500,
        marginBottom: 20,
        lineHeight: 1.5,
    },

    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
    },

    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
    },
    label: {
        fontSize: 13,
        fontWeight: 700,
        color: '#374151',
    },
    inputBox: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        border: '1.5px solid #e2e8f0',
        borderRadius: 12,
        background: '#fff',
        transition: 'border-color 0.15s, box-shadow 0.15s',
    },
    inputIcon: {
        position: 'absolute',
        left: 14,
        pointerEvents: 'none',
        flexShrink: 0,
    },
    input: {
        flex: 1,
        padding: '14px 14px 14px 46px',
        border: 'none',
        background: 'transparent',
        fontSize: 15,
        fontFamily: 'inherit',
        color: '#0f172a',
        borderRadius: 12,
        width: '100%',
        boxSizing: 'border-box',
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
        borderRadius: 8,
    },

    submitBtn: {
        marginTop: 4,
        width: '100%',
        padding: '15px',
        borderRadius: 14,
        border: 'none',
        background: '#04CDCD',
        color: '#fff',
        fontWeight: 800,
        fontSize: 15,
        fontFamily: 'inherit',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        boxShadow: '0 4px 20px rgba(4,205,205,0.3)',
        transition: 'opacity 0.15s',
        letterSpacing: '0.1px',
    },
    submitBtnDisabled: {
        opacity: 0.35,
        cursor: 'not-allowed',
        boxShadow: 'none',
    },

    spinner: {
        display: 'inline-block',
        width: 16,
        height: 16,
        border: '2px solid rgba(255,255,255,0.35)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'loginSpin 0.7s linear infinite',
    },
};