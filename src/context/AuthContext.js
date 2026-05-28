import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let timeout;

        const performLogout = async () => {
            await signOut(auth);
            setUser(null);
        };

        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(performLogout, 1800000); // 30 menit
        };

        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                window.addEventListener('mousemove', resetTimer);
                window.addEventListener('keypress', resetTimer);
                resetTimer();

                try {
                    const userDoc = await getDoc(doc(db, "user", currentUser.uid));
                    const role = userDoc.exists() ? userDoc.data().role : 'staff';
                    setUser({ ...currentUser, role: role });
                } catch (e) {
                    setUser({ ...currentUser, role: 'staff' });
                }
            } else {
                window.removeEventListener('mousemove', resetTimer);
                window.removeEventListener('keypress', resetTimer);
                clearTimeout(timeout);
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keypress', resetTimer);
            clearTimeout(timeout);
            unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {/* Tampilkan overlay loading tanpa menghapus children */}
            {loading ? (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Memuat sistem...
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);