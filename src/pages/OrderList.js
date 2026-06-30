import React, { useState, useEffect, useRef, useCallback } from 'react';
import OrderRow from '../componets/OrderRow';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import Navbar from '../componets/Navbar';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import {
    Search, X, Home, Flame, CheckCircle, Clock, Plus,
    Layers, AlarmClock, LayoutList, LogOut, Bell, AlertTriangle,
    ClipboardList, Volume2, Square,
    ShoppingBag, AlertOctagon, RefreshCw, Truck, Send,
} from 'lucide-react';

// ─────────────────────────────────────────────
// NOTIF TOAST COMPONENT
// ─────────────────────────────────────────────
function NotifToastIcon({ type }) {
    if (type === 'baru') return (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0fafa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingBag size={16} color="#04CDCD" strokeWidth={2.5} />
        </div>
    );
    if (type === 'kritis') return (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertOctagon size={16} color="#ef4444" strokeWidth={2.5} />
        </div>
    );
    return (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RefreshCw size={16} color="#f97316" strokeWidth={2.5} />
        </div>
    );
}

function NotifToast({ notifs, onDismiss }) {
    if (notifs.length === 0) return null;
    return (
        <div style={T.container}>
            {notifs.map((n) => (
                <div key={n.id} style={{
                    ...T.toast,
                    borderLeftColor: n.type === 'baru' ? '#04CDCD' : n.type === 'kritis' ? '#ef4444' : '#f97316',
                }}>
                    <NotifToastIcon type={n.type} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={T.toastTitle}>{n.judul}</div>
                        <div style={T.toastBody}>{n.pesan}</div>
                    </div>
                    <button onClick={() => onDismiss(n.id)} style={T.toastClose}>
                        <X size={14} color="#94a3b8" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────
// NOTIF SOUND
// ─────────────────────────────────────────────
function bunyiNotif(type = 'default') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'baru') {
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.setValueAtTime(780, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'kritis') {
            [0, 0.15, 0.3].forEach((t) => {
                const o2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                o2.connect(g2); g2.connect(ctx.destination);
                o2.frequency.value = 660;
                g2.gain.setValueAtTime(0.35, ctx.currentTime + t);
                g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
                o2.start(ctx.currentTime + t);
                o2.stop(ctx.currentTime + t + 0.12);
            });
        } else {
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) { /* browser blokir audio */ }
}

// ─────────────────────────────────────────────
// TTS HOOKS
// ─────────────────────────────────────────────
function getBestVoice() {
    const voices = window.speechSynthesis.getVoices();
    const priority = [
        v => v.lang === 'id-ID',
        v => v.lang.startsWith('id'),
        v => v.lang === 'en-US' && v.localService,
        v => v.default,
    ];
    for (const matcher of priority) {
        const found = voices.find(matcher);
        if (found) return found;
    }
    return voices[0] || null;
}

function useVoiceBriefing() {
    const synthRef = useRef(window.speechSynthesis);
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        const synth = synthRef.current;
        return () => { synth?.cancel(); };
    }, []);

    const berhenti = useCallback(() => {
        synthRef.current?.cancel();
        setIsSpeaking(false);
    }, []);

    const bicara = useCallback((teks, onSelesai) => {
        if (!window.speechSynthesis) return;
        synthRef.current.cancel();

        const ucapkan = () => {
            const utterance = new SpeechSynthesisUtterance(teks);
            const voice = getBestVoice();
            if (voice) utterance.voice = voice;
            utterance.lang = 'id-ID';
            utterance.rate = 0.92;
            utterance.pitch = 1.05;
            utterance.volume = 1;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => { setIsSpeaking(false); onSelesai?.(); };
            utterance.onerror = (e) => {
                if (e.error !== 'interrupted') console.error('TTS error:', e.error);
                setIsSpeaking(false);
            };
            synthRef.current.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.onvoiceschanged = null;
                ucapkan();
            };
        } else {
            ucapkan();
        }
    }, []);

    return { bicara, berhenti, isSpeaking };
}

function useNotifTTS() {
    const queueRef = useRef([]);
    const isBusyRef = useRef(false);
    const audioUnlockedRef = useRef(false);

    useEffect(() => {
        const unlock = () => { audioUnlockedRef.current = true; };
        window.addEventListener('touchstart', unlock, { once: true });
        window.addEventListener('click', unlock, { once: true });
        return () => {
            window.removeEventListener('touchstart', unlock);
            window.removeEventListener('click', unlock);
        };
    }, []);

    const proses = useCallback(() => {
        if (isBusyRef.current || queueRef.current.length === 0) return;
        if (!window.speechSynthesis) return;
        if (!audioUnlockedRef.current) {
            queueRef.current = [];
            return;
        }

        isBusyRef.current = true;
        const teks = queueRef.current.shift();

        const ucapkan = () => {
            const utterance = new SpeechSynthesisUtterance(teks);
            const voice = getBestVoice();
            if (voice) utterance.voice = voice;
            utterance.lang = 'id-ID';
            utterance.rate = 1.0;
            utterance.pitch = 1.1;
            utterance.volume = 1;

            utterance.onend = () => {
                isBusyRef.current = false;
                setTimeout(proses, 300);
            };
            utterance.onerror = (e) => {
                if (e.error !== 'interrupted') console.warn('[NotifTTS]', e.error);
                isBusyRef.current = false;
                setTimeout(proses, 300);
            };
            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.onvoiceschanged = null;
                ucapkan();
            };
        } else {
            ucapkan();
        }
    }, []);

    const antre = useCallback((teks) => {
        if (!audioUnlockedRef.current) return;
        if (queueRef.current.length < 3) {
            queueRef.current.push(teks);
        }
        proses();
    }, [proses]);

    return { antre };
}

// ─────────────────────────────────────────────
// DELIVERY TYPE HELPER
// ambil_sendiri : final = 'Siap Diambil'
// antar_jemput  : final = 'Sudah Diantar'
// 'Ready Anter' tetap didukung sebagai legacy
// ─────────────────────────────────────────────
const isFinalStatus = (order) => {
    const s = order.status_order || order.status;
    if (s === 'Ready Anter') return true;
    const deliveryType = order.delivery_type === 'antar_jemput' ? 'antar_jemput' : 'ambil_sendiri';
    return s === (deliveryType === 'antar_jemput' ? 'Sudah Diantar' : 'Siap Diambil');
};

// ─────────────────────────────────────────────
// STATIC HELPER
// ─────────────────────────────────────────────
function hitungHariKerjaStatic(tglStr) {
    if (!tglStr || typeof tglStr !== 'string') return 0;
    const bulanIndo = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
        'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
    };
    const parts = tglStr.split(' ');
    if (parts.length < 3) return 0;
    const tglMasuk = new Date(parts[2], bulanIndo[parts[1]], parseInt(parts[0]));
    tglMasuk.setHours(0, 0, 0, 0);
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);
    let hariKerja = 0;
    let cursor = new Date(tglMasuk);
    while (cursor <= hariIni) {
        if (cursor.getDay() !== 0) hariKerja++;
        cursor.setDate(cursor.getDate() + 1);
    }
    return hariKerja;
}

// ─────────────────────────────────────────────
// BUAT TEKS BRIEFING
// ─────────────────────────────────────────────
function buatTeksBriefing(orders) {
    if (!orders || orders.length === 0) {
        return 'Selamat pagi! Tidak ada order yang perlu perhatian hari ini. Semua aman! Semangat kerja!';
    }

    const kritis = orders.filter(o => hitungHariKerjaStatic(o.tanggal) >= 5);
    const mendekati = orders.filter(o => { const h = hitungHariKerjaStatic(o.tanggal); return h === 3 || h === 4; });
    const belumMulai = orders.filter(o => o.status === 'Waiting List');

    let teks = 'Selamat pagi! ';
    teks += `Hari ini ada ${orders.length} order yang perlu perhatian. `;

    if (kritis.length > 0) {
        teks += `${kritis.length} order sudah kritis. `;
        teks += kritis.slice(0, 3).map(o => `${o.nama}, sudah hari ke ${hitungHariKerjaStatic(o.tanggal)}`).join('. ');
        teks += '. ';
    }

    if (mendekati.length > 0) {
        teks += `${mendekati.length} order mendekati batas. `;
        teks += mendekati.slice(0, 2).map(o => `${o.nama}, hari ke ${hitungHariKerjaStatic(o.tanggal)}`).join(', ');
        teks += '. ';
    }

    if (belumMulai.length > 0) {
        teks += `${belumMulai.length} order masih waiting list, belum mulai dicuci. `;
    }

    teks += 'Semangat kerja!';
    return teks;
}

// ─────────────────────────────────────────────
// CHECK-IN MODAL
// ─────────────────────────────────────────────
function CheckInModal({ orders, onClose }) {
    const { bicara, berhenti, isSpeaking } = useVoiceBriefing();
    const [sudahDibacakan, setSudahDibacakan] = useState(false);
    const hasSpokenRef = useRef(false);

    const tugasHariIni = orders.filter(o => {
        const h = hitungHariKerjaStatic(o.tanggal);
        return h >= 3 || o.status === 'Waiting List';
    }).slice(0, 10);

    const teksBriefing = buatTeksBriefing(tugasHariIni);

    const mulaiSpeech = useCallback(() => {
        if (hasSpokenRef.current) return;
        hasSpokenRef.current = true;
        bicara(teksBriefing, () => setSudahDibacakan(true));
    }, [bicara, teksBriefing]);

    useEffect(() => {
        const sudahUnlock = sessionStorage.getItem('audioUnlocked') === 'true';
        if (sudahUnlock) {
            const timer = setTimeout(() => mulaiSpeech(), 600);
            return () => clearTimeout(timer);
        } else {
            const handler = () => mulaiSpeech();
            window.addEventListener('touchstart', handler, { once: true });
            window.addEventListener('mousedown', handler, { once: true });
            return () => {
                window.removeEventListener('touchstart', handler);
                window.removeEventListener('mousedown', handler);
            };
        }
    }, [mulaiSpeech]);

    const handleTombolPlay = () => {
        if (isSpeaking) {
            berhenti();
        } else {
            hasSpokenRef.current = false;
            mulaiSpeech();
        }
    };

    const handleClose = () => {
        sessionStorage.removeItem('audioUnlocked');
        berhenti();
        onClose();
    };

    return (
        <div style={M.overlay}>
            <div style={M.sheet}>
                <div style={M.sheetHandle} />
                <div style={M.sheetHeader}>
                    <div style={M.sheetIconWrap}>
                        <ClipboardList size={22} color="#04CDCD" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={M.sheetTitle}>Selamat Pagi!</div>
                        <div style={M.sheetSubtitle}>Ini order yang perlu kamu perhatikan hari ini</div>
                    </div>
                    <button
                        onClick={handleTombolPlay}
                        style={{
                            ...M.voiceBtn,
                            background: isSpeaking ? '#fee2e2' : '#f0fffe',
                            borderColor: isSpeaking ? '#fca5a5' : '#99f6e4',
                        }}
                        title={isSpeaking ? 'Hentikan' : 'Dengarkan briefing'}
                    >
                        {isSpeaking ? (
                            <Square size={14} color="#ef4444" fill="#ef4444" />
                        ) : (
                            <Volume2 size={14} color="#04CDCD" />
                        )}
                        <span style={{ fontSize: 10, fontWeight: 700, color: isSpeaking ? '#ef4444' : '#04CDCD', marginTop: 2 }}>
                            {isSpeaking ? 'Stop' : sudahDibacakan ? 'Ulang' : 'Play'}
                        </span>
                    </button>
                </div>

                <div style={{
                    ...M.briefingBanner,
                    borderColor: isSpeaking ? '#04CDCD' : '#e2e8f0',
                    background: isSpeaking ? '#f0fffe' : '#f8fafc',
                }}>
                    {isSpeaking && (
                        <div style={M.waveWrap}>
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} style={{ ...M.waveBar, animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                    )}
                    <p style={{ ...M.briefingText, color: isSpeaking ? '#0f766e' : '#64748b' }}>
                        {teksBriefing}
                    </p>
                </div>

                {tugasHariIni.length === 0 ? (
                    <div style={M.emptyBox}>
                        <CheckCircle size={32} color="#22c55e" />
                        <div style={{ fontWeight: 700, color: '#15803d', marginTop: 8 }}>Semua aman!</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Tidak ada order mendesak hari ini.</div>
                    </div>
                ) : (
                    <div style={M.taskList}>
                        {tugasHariIni.map(o => {
                            const h = hitungHariKerjaStatic(o.tanggal);
                            const isKritis = h >= 5;
                            const isMendekati = h === 3 || h === 4;
                            return (
                                <div key={o.id} style={{
                                    ...M.taskItem,
                                    borderLeftColor: isKritis ? '#ef4444' : isMendekati ? '#f97316' : '#f59e0b',
                                }}>
                                    <div style={M.taskName}>{o.nama}</div>
                                    <div style={M.taskMeta}>
                                        <span style={{
                                            ...M.taskBadge,
                                            background: isKritis ? '#fee2e2' : isMendekati ? '#fff7ed' : '#fef9c3',
                                            color: isKritis ? '#ef4444' : isMendekati ? '#f97316' : '#ca8a04',
                                        }}>
                                            {o.status === 'Waiting List' && h < 3 ? 'Belum mulai' : `Hari ke-${h}`}
                                        </span>
                                        <span style={M.taskStatus}>{o.status}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <button onClick={handleClose} style={M.ctaBtn}>
                    Oke, Siap Kerja!
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// TIER PRIORITY HELPER
// ─────────────────────────────────────────────
function getTier(order) {
    const h = hitungHariKerjaStatic(order.tanggal);
    if (h >= 5) return 0;
    if (h === 4) return 1;
    if (h === 3) return 2;
    if (order.status === 'Waiting List') return 3;
    return 4;
}

// ─────────────────────────────────────────────
// QUICK ACTION SHORTCUT BAR
// ─────────────────────────────────────────────
function QuickActions({ onHomeVisit, onReminder, onPickup }) {
    const actions = [
        {
            label: 'Home Visit',
            icon: <Home size={18} color="#028585" />,
            iconBg: '#e0fafa',
            onClick: onHomeVisit,
        },
        {
            label: 'Reminder WA',
            icon: <Send size={18} color="#15803d" />,
            iconBg: '#f0fdf4',
            onClick: onReminder,
        },
        {
            label: 'Pickup',
            icon: <Truck size={18} color="#028585" />,
            iconBg: '#e0fafa',
            onClick: onPickup,
        },
    ].filter(a => a.onClick !== null);

    return (
        <div style={{
            ...S.quickActionsWrap,
            gridTemplateColumns: `repeat(${actions.length}, 1fr)`,
        }}>
            {actions.map((a) => (
                <button key={a.label} onClick={a.onClick} style={S.quickActionItem}>
                    <div style={{ ...S.quickActionIcon, background: a.iconBg }}>
                        {a.icon}
                    </div>
                    <span style={S.quickActionLabel}>{a.label}</span>
                </button>
            ))}
        </div>
    );
}

function OrderList({ searchQuery, setSearchQuery, activeFilter, setActiveFilter, onOrderClick }) {
    const { user } = useAuth();
    const [sortBy, setSortBy] = useState('urgent');
    const [transactions, setTransactions] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const navigate = useNavigate();
    const customerCache = useRef({});

    const [notifs, setNotifs] = useState([]);
    const prevTransactionsRef = useRef(null);
    const isFirstLoadRef = useRef(true);
    const loadNotifShownRef = useRef(false);
    const { antre: antreTTS } = useNotifTTS();

    const tambahNotif = useCallback((judul, pesan, type = 'default') => {
        const id = Date.now() + Math.random();
        setNotifs(prev => [...prev.slice(-2), { id, judul, pesan, type }]);
        bunyiNotif(type);
        const teksNotif = type === 'baru'
            ? `Order baru masuk. ${pesan.replace(' — ', ', ')}`
            : type === 'kritis'
                ? `Perhatian! ${pesan}`
                : `Update order. ${pesan}`;
        antreTTS(teksNotif);
        setTimeout(() => {
            setNotifs(prev => prev.filter(n => n.id !== id));
        }, 6000);
    }, [antreTTS]);

    const dismissNotif = useCallback((id) => {
        setNotifs(prev => prev.filter(n => n.id !== id));
    }, []);

    const role = (user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isCS = role === 'cs';
    const isStaff = !isAdmin && !isCS;

    const getReadyTimestamp = (order) => {
        const ts = order.ready_at || order.created_at;
        if (!ts) return null;
        return ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    };

    // ── isAutoHidden: pakai isFinalStatus bukan hardcode 'Ready Anter' ──
    const isAutoHidden = (order) => {
        if (!isFinalStatus(order)) return false;
        const readyDate = getReadyTimestamp(order);
        if (!readyDate) return false;
        return (new Date() - readyDate) / (1000 * 60 * 60 * 24) >= 7;
    };

    const sisaHariReady = (order) => {
        const readyDate = getReadyTimestamp(order);
        if (!readyDate) return 7;
        return Math.max(0, Math.ceil(7 - (new Date() - readyDate) / (1000 * 60 * 60 * 24)));
    };

    const hitungHariKerja = hitungHariKerjaStatic;

    const fetchCustomer = async (customerRef) => {
        if (!customerRef) return { nama: '-', no_hp: '-' };
        const refPath = typeof customerRef === 'string' ? customerRef : customerRef.path;
        if (customerCache.current[refPath]) return customerCache.current[refPath];
        try {
            const customerDoc = await getDoc(
                typeof customerRef === 'string' ? doc(db, customerRef) : customerRef
            );
            const data = customerDoc.exists()
                ? { nama: customerDoc.data().nama || '-', no_hp: customerDoc.data().no_hp || '-' }
                : { nama: '-', no_hp: '-' };
            customerCache.current[refPath] = data;
            return data;
        } catch { return { nama: '-', no_hp: '-' }; }
    };

    useEffect(() => {
        setIsLoading(true);
        let snapshotSeq = 0;

        const unsub = onSnapshot(collection(db, 'transactions'), async (snapshot) => {
            const thisSeq = ++snapshotSeq;
            const isFirst = isFirstLoadRef.current;
            const changes = isFirst ? [] : snapshot.docChanges();
            const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const resolved = await Promise.all(
                raw.map(async (tx) => {
                    const customer = await fetchCustomer(tx.customer_id);
                    return {
                        ...tx,
                        ready_at: tx.ready_at || null,
                        created_at: tx.created_at || null,
                        is_hidden: tx.is_hidden || false,
                        nama: tx.nama || tx.customerNama || customer.nama || '-',
                        hp: tx.hp || tx.customerHp || tx.no_hp || customer.no_hp || '-',
                        status: tx.status_order || tx.status || 'Waiting List',
                        statusBayar: tx.statusBayar || 'Belum Lunas',
                        metode_pembayaran: tx.metode_pembayaran || tx.metode || '',
                        delivery_type: tx.delivery_type || 'ambil_sendiri',
                        tanggal: tx.tanggal || (tx.created_at?.seconds
                            ? new Date(tx.created_at.seconds * 1000).toLocaleDateString('id-ID', {
                                day: '2-digit', month: 'short', year: 'numeric'
                            }) : '-'),
                        total: Array.isArray(tx.items)
                            ? tx.items.map(it =>
                                it.satuan === 'meter' && it.luas
                                    ? `${it.qty}× ${it.nama} (${Number(it.luas).toFixed(2)}m²)`
                                    : `${it.qty}× ${it.nama}`
                            ).join(', ')
                            : '-',
                    };
                })
            );

            if (thisSeq !== snapshotSeq) return;
            setTransactions(resolved);
            setIsLoading(false);

            if (isFirst) {
                isFirstLoadRef.current = false;
                prevTransactionsRef.current = resolved;
                return;
            }

            changes.forEach((change) => {
                const d = change.doc.data();
                if (d.layanan_type === 'home_visit') return;
                if (d.is_hidden) return;
                const nama = d.nama || d.customerNama || '-';
                const statusBaru = d.status_order || d.status || 'Waiting List';
                if (change.type === 'added') {
                    const itemLabel = Array.isArray(d.items) && d.items.length > 0
                        ? d.items.slice(0, 2).map(it => it.nama).join(', ') +
                        (d.items.length > 2 ? ` +${d.items.length - 2} lagi` : '')
                        : statusBaru;
                    tambahNotif('Order Baru Masuk', `${nama} — ${itemLabel}`, 'baru');
                } else if (change.type === 'modified') {
                    const sebelumnya = prevTransactionsRef.current?.find(p => p.id === change.doc.id);
                    const statusLama = sebelumnya?.status;
                    if (statusLama && statusLama !== statusBaru) {
                        const hariKe = hitungHariKerjaStatic(d.tanggal || '');
                        const isKritis = hariKe >= 5;
                        tambahNotif(
                            isKritis ? 'Order Kritis' : 'Status Berubah',
                            `${nama}: ${statusLama} → ${statusBaru}`,
                            isKritis ? 'kritis' : 'default'
                        );
                    }
                }
            });

            prevTransactionsRef.current = resolved;
        });
        return () => unsub();
    }, [tambahNotif]);

    useEffect(() => {
        if (isLoading || loadNotifShownRef.current) return;
        loadNotifShownRef.current = true;

        // ── pakai isFinalStatus bukan hardcode 'Ready Anter' ──
        const aktif = transactions.filter(
            o => !o.is_hidden && !isAutoHidden(o) &&
                o.layanan_type !== 'home_visit' &&
                !isFinalStatus(o)
        );

        const kritis = aktif.filter(o => hitungHariKerjaStatic(o.tanggal) >= 5);
        const mendekati = aktif.filter(o => hitungHariKerjaStatic(o.tanggal) === 4);

        if (kritis.length > 0) {
            const namaList = kritis.slice(0, 2).map(o => o.nama).join(', ');
            const lebih = kritis.length > 2 ? ` +${kritis.length - 2} lagi` : '';
            tambahNotif(`🚨 ${kritis.length} Order Kritis!`, `${namaList}${lebih} — sudah ≥5 hari kerja`, 'kritis');
        } else if (mendekati.length > 0) {
            const namaList = mendekati.slice(0, 2).map(o => o.nama).join(', ');
            const lebih = mendekati.length > 2 ? ` +${mendekati.length - 2}` : '';
            tambahNotif(`⚠️ ${mendekati.length} Order Mendekati Batas`, `${namaList}${lebih} — hari ke-4`, 'default');
        }
    }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'bookings'), (snapshot) => {
            setBookings(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // ── MODAL "SELAMAT PAGI" (CheckInModal) — DINONAKTIFKAN SEMENTARA ──
    const [showCheckIn, setShowCheckIn] = useState(false);
    // useEffect(() => {
    //     if (!isLoading && (isAdmin || isStaff)) setShowCheckIn(true);
    // }, [isLoading, isAdmin, isStaff]);

    const handleCloseCheckIn = () => setShowCheckIn(false);

    const visibleTransactions = transactions.filter(
        o => !o.is_hidden && !isAutoHidden(o) && o.layanan_type !== 'home_visit'
    );

    // ── getCount: support filter 'Final' untuk semua status selesai ──
    const getCount = (status) => {
        if (status === 'Semua') return visibleTransactions.length;
        if (status === 'Final') return visibleTransactions.filter(o => isFinalStatus(o)).length;
        return visibleTransactions.filter(o => o.status === status).length;
    };

    // ── applyFilter: 'Final' menggantikan 'Ready Anter' ──
    const applyFilter = (list) => list.filter(o => {
        if (o.is_hidden || isAutoHidden(o)) return false;
        const q = (searchQuery || '').toLowerCase();
        return (
            ((o?.nama || '').toLowerCase().includes(q) || (o?.hp || '').toString().includes(q)) &&
            (activeFilter === 'Semua' ||
                (activeFilter === 'Final' ? isFinalStatus(o) : o.status === activeFilter))
        );
    });

    const sortList = (list) => [...list].sort((a, b) => {
        if (sortBy === 'urgent') {
            const tierA = getTier(a);
            const tierB = getTier(b);
            if (tierA !== tierB) return tierA - tierB;
            return hitungHariKerja(b.tanggal) - hitungHariKerja(a.tanggal);
        }
        return (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0);
    });

    const filtered = applyFilter(visibleTransactions);

    // ── split aktif vs selesai pakai isFinalStatus ──
    const orderAktif = sortList(filtered.filter(o => !isFinalStatus(o)));
    const orderReady = sortList(filtered.filter(o => isFinalStatus(o)));

    // ── totalAktif pakai isFinalStatus ──
    const totalAktif = visibleTransactions.filter(o => !isFinalStatus(o)).length;

    // // ── aktifSemua untuk tugas hari ini ──    dd
    // const aktifSemua = visibleTransactions.filter(o => !isFinalStatus(o));
    // const tugasKritis = aktifSemua.filter(o => hitungHariKerja(o.tanggal) >= 5);
    // const tugasMendekati = aktifSemua.filter(o => hitungHariKerja(o.tanggal) === 4);
    // const tugasPerlu = aktifSemua.filter(o => hitungHariKerja(o.tanggal) === 3);
    // const tugasWaiting = aktifSemua.filter(o => o.status === 'Waiting List' && hitungHariKerja(o.tanggal) < 3);
    // const tugasHariIni = [...tugasKritis, ...tugasMendekati, ...tugasPerlu, ...tugasWaiting];

    const generateReminderText = () => {
        const now = new Date();
        const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const tglStr = `${namaHari[now.getDay()]}, ${now.getDate()} ${namaBulan[now.getMonth()]} ${now.getFullYear()}`;
        const hariIniStr = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
        ].join('-');
        const sesiLabel = (sesi) => Number(sesi) === 1 ? 'Sesi 1 (09:00-11:00)' : 'Sesi 2 (13:00-15:00)';
        const homeVisitHariIni = bookings.filter(b => b.status === 'confirmed' && b.tanggal === hariIniStr);
        const aktif = visibleTransactions.filter(o => !isFinalStatus(o));
        const lewatBatas = aktif.filter(o => hitungHariKerja(o.tanggal) > 5);
        const mendekati = aktif.filter(o => { const h = hitungHariKerja(o.tanggal); return h === 4 || h === 5; });
        const waiting = aktif.filter(o => o.status === 'Waiting List');
        const formatBaris = (o) => `- ${o.nama} — ${o.tanggal} (hari ke-${hitungHariKerja(o.tanggal)})\n  ${o.hp}`;

        let pesan = `*Carpetology ID Daily Update*\n${tglStr}\n\n`;
        pesan += `*JADWAL HOME VISIT — HARI INI*\n`;
        pesan += homeVisitHariIni.length > 0
            ? homeVisitHariIni.map(b => {
                let baris = `- ${b.nama} — ${sesiLabel(b.sesi)}\n  ${b.no_hp || '-'}`;
                if (b.maps_lokasi) baris += `\n  ${b.maps_lokasi}`;
                return baris;
            }).join('\n') + '\n\n'
            : `Tidak ada jadwal home visit hari ini.\n\n`;
        pesan += `*STATUS ORDER CUCI*\n`;
        if (lewatBatas.length > 0) pesan += `\nLEWAT ESTIMASI:\n` + lewatBatas.map(formatBaris).join('\n') + '\n';
        if (mendekati.length > 0) pesan += `\nMENDEKATI BATAS (hari ke-4/5):\n` + mendekati.map(formatBaris).join('\n') + '\n';
        if (waiting.length > 0) pesan += `\nWAITING LIST — belum mulai dicuci:\n` + waiting.map(o => `- ${o.nama} — ${o.tanggal}\n  ${o.hp}`).join('\n') + '\n';
        if (!lewatBatas.length && !mendekati.length && !waiting.length) pesan += `Semua order cuci dalam kondisi aman.\n`;
        pesan += `\nMohon update status di app ya.`;
        return pesan;
    };

    const handleKirimReminder = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(generateReminderText())}`, '_blank');
    };

    return (
        <div style={S.page}>

            {/* ── MODAL "SELAMAT PAGI" — DINONAKTIFKAN SEMENTARA ── */}
            {/* {showCheckIn && (isAdmin || isStaff) && (
                <CheckInModal orders={visibleTransactions} onClose={handleCloseCheckIn} />
            )} */}

            <NotifToast notifs={notifs} onDismiss={dismissNotif} />

            <div style={S.hero}>
                <div style={S.heroInner}>
                    <div style={S.logoWrap}>
                        <div style={S.logoIconWrap}>
                            <Layers size={20} color="#04CDCD" />
                        </div>
                        <div>
                            <div style={S.brand}>Carpetology ID</div>
                            <div style={S.tagline}>
                                {isAdmin ? 'Admin Dashboard' : isCS ? 'CS Dashboard' : 'Staff Dashboard'}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => signOut(auth)} style={S.logoutBtn}>
                        <LogOut size={12} />
                        Logout
                    </button>
                </div>

                <div style={S.statsRow}>
                    <div style={S.statChip}>
                        <span style={S.statNum}>{totalAktif}</span>
                        <span style={S.statLbl}>Order Aktif</span>
                    </div>
                    <div style={S.statDivider} />
                    {/* ── label & count pakai isFinalStatus via getCount('Final') ── */}
                    <div style={S.statChip}>
                        <span style={{ ...S.statNum, color: '#86efac' }}>{getCount('Final')}</span>
                        <span style={S.statLbl}>Selesai</span>
                    </div>
                    {isAdmin && (
                        <>
                            <div style={S.statDivider} />
                            <div style={S.statChip}>
                                <span style={S.statNum}>{visibleTransactions.length}</span>
                                <span style={S.statLbl}>Total Order</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div style={S.contentWrap}>
                <div style={S.searchWrap}>
                    <span style={S.searchIconWrap}><Search size={16} color="#94a3b8" /></span>
                    <input
                        type="text"
                        placeholder="Cari nama atau nomor HP..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={S.searchInput}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={S.searchClear}>
                            <X size={14} color="#64748b" />
                        </button>
                    )}
                </div>

                {/* ── Filter chips: 'Ready Anter' → 'Final' ── */}
                <div style={S.filterRow}>
                    {[
                        { id: 'Semua', label: `Semua (${getCount('Semua')})`, icon: <LayoutList size={11} /> },
                        { id: 'Waiting List', label: `Waiting (${getCount('Waiting List')})`, icon: <Clock size={11} /> },
                        { id: 'Sudah Dicuci', label: `Dicuci (${getCount('Sudah Dicuci')})`, icon: <CheckCircle size={11} /> },
                        { id: 'Final', label: `Selesai (${getCount('Final')})`, icon: <CheckCircle size={11} /> },
                    ].map((item) => (
                        <button
                            key={item.id}
                            style={{
                                ...S.filterChip,
                                background: activeFilter === item.id ? '#04CDCD' : '#fff',
                                color: activeFilter === item.id ? '#fff' : '#475569',
                                borderColor: activeFilter === item.id ? '#04CDCD' : '#e2e8f0',
                                fontWeight: activeFilter === item.id ? 700 : 600,
                            }}
                            onClick={() => setActiveFilter(item.id)}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>

                {/* ── QUICK ACTIONS ── */}
                {(isAdmin || isCS || isStaff) && (
                    <QuickActions
                        onHomeVisit={isAdmin || isCS || isStaff ? () => navigate('/admin/jadwal-home-visit') : null}
                        onReminder={isAdmin || isCS ? handleKirimReminder : null}
                        onPickup={() => navigate('/admin/jadwal-pickup')}
                    />
                )}

                {/* ── TUGAS HARI INI — DINONAKTIFKAN SEMENTARA ── */}
                {/* {(isAdmin || isStaff) && !isLoading && tugasHariIni.length > 0 && (
                    <div style={S.tugasWrap}>
                        <div style={S.tugasHeader}>
                            <AlertTriangle size={13} color="#f97316" />
                            Tugas Hari Ini
                            <span style={S.tugasCount}>{tugasHariIni.length}</span>
                        </div>
                        <div style={S.tugasList}>
                            {tugasHariIni.map(o => {
                                const h = hitungHariKerja(o.tanggal);
                                const isKritis = h >= 5;
                                const isMendekati = h === 4;
                                const isPerlu = h === 3;
                                const isWaiting = o.status === 'Waiting List' && h < 3;

                                const borderColor = isKritis ? '#ef4444' : isMendekati ? '#f97316' : isPerlu ? '#f59e0b' : '#94a3b8';
                                const badgeBg = isKritis ? '#fee2e2' : isMendekati ? '#fff7ed' : isPerlu ? '#fef9c3' : '#f1f5f9';
                                const badgeColor = isKritis ? '#ef4444' : isMendekati ? '#f97316' : isPerlu ? '#ca8a04' : '#64748b';
                                const badgeLabel = isWaiting ? 'Belum mulai' : isKritis ? `Kritis — hari ke-${h}` : `Hari ke-${h}`;

                                return (
                                    <div
                                        key={o.id}
                                        style={{ ...S.tugasItem, borderLeftColor: borderColor }}
                                        onClick={() => onOrderClick(o)}
                                    >
                                        <div style={S.tugasNama}>{o.nama}</div>
                                        <div style={S.tugasMeta}>
                                            <span style={{ ...S.tugasBadge, background: badgeBg, color: badgeColor }}>
                                                {badgeLabel}
                                            </span>
                                            <span style={S.tugasStatus}>{o.status}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )} */}

                <div style={S.sortRow}>
                    <span style={S.sortLabel}>Urutkan:</span>
                    <div style={S.toggleGroup}>
                        <button
                            onClick={() => setSortBy('urgent')}
                            style={{ ...S.toggleBtn, ...(sortBy === 'urgent' ? S.toggleActive : {}) }}
                        >
                            <Flame size={11} /> Paling Kritis
                        </button>
                        <button
                            onClick={() => setSortBy('terbaru')}
                            style={{ ...S.toggleBtn, ...(sortBy === 'terbaru' ? S.toggleActive : {}) }}
                        >
                            <AlarmClock size={11} /> Terbaru
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div style={S.loadingWrap}>
                        <div style={S.spinner} />
                        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>Memuat data...</div>
                    </div>
                ) : (
                    <>
                        {orderAktif.length > 0 && (
                            <>
                                <div style={S.sectionHeader}>
                                    <Flame size={13} color="#ef4444" />
                                    Order Aktif
                                    <span style={S.sectionCount}>{orderAktif.length}</span>
                                </div>
                                <div style={S.cardList}>
                                    {orderAktif.map((order) => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                            onClick={onOrderClick}
                                            isReady={false}
                                            isAdmin={isAdmin}
                                            canQuickUpdate={isAdmin || isStaff}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── Section selesai: label diperbarui ── */}
                        {orderReady.length > 0 && (
                            <>
                                <div style={{ ...S.sectionHeader, color: '#15803d', borderLeftColor: '#22c55e' }}>
                                    <CheckCircle size={13} color="#22c55e" />
                                    Siap / Selesai
                                    <span style={{ ...S.sectionCount, backgroundColor: '#dcfce7', color: '#15803d' }}>
                                        {orderReady.length}
                                    </span>
                                </div>
                                <div style={S.cardList}>
                                    {orderReady.map((order) => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                            onClick={onOrderClick}
                                            isReady={true}
                                            isAdmin={isAdmin}
                                            canQuickUpdate={isAdmin || isStaff}
                                            sisaHari={sisaHariReady(order)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {orderAktif.length === 0 && orderReady.length === 0 && (
                            <div style={S.emptyState}>
                                <LayoutList size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                                    {searchQuery ? 'Tidak ditemukan' : 'Belum ada order'}
                                </div>
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                    {searchQuery ? 'Coba cek ejaan nama atau nomor HP.' : 'Data order akan muncul di sini.'}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {isAdmin && (
                <button className="fixed-fab" style={S.fab} onClick={() => navigate('/admin/kasir')}>
                    <Plus size={28} color="#fff" />
                </button>
            )}

            {isAdmin && (
                <div className="fixed-bottom-bar" style={S.navbarInner}>
                    <Navbar />
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes wave {
                    0%, 100% { height: 4px; }
                    50%       { height: 16px; }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────
// STYLES — Modal
// ─────────────────────────────────────────────
const M = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
    sheet: { backgroundColor: '#fff', borderRadius: '24px 24px 0 0', padding: '12px 20px 36px', width: '100%', maxWidth: 500, maxHeight: '80vh', overflowY: 'auto' },
    sheetHandle: { width: 40, height: 4, background: '#e2e8f0', borderRadius: 10, margin: '0 auto 20px' },
    sheetHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
    sheetIconWrap: { width: 44, height: 44, background: '#04CDCD15', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    sheetTitle: { fontSize: 18, fontWeight: 800, color: '#1e293b' },
    sheetSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
    voiceBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, border: '1.5px solid', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', gap: 2 },
    briefingBanner: { borderRadius: 12, border: '1.5px solid', padding: '10px 14px', marginBottom: 14, transition: 'all 0.3s' },
    waveWrap: { display: 'flex', alignItems: 'center', gap: 3, marginBottom: 8, height: 20 },
    waveBar: { width: 3, height: 4, background: '#04CDCD', borderRadius: 4, animation: 'wave 0.8s ease-in-out infinite' },
    briefingText: { fontSize: 12, lineHeight: 1.6, margin: 0, transition: 'color 0.3s' },
    emptyBox: { textAlign: 'center', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    taskList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
    taskItem: { padding: '12px 14px', borderRadius: 10, borderLeft: '4px solid', background: '#f8fafc' },
    taskName: { fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 6 },
    taskMeta: { display: 'flex', alignItems: 'center', gap: 8 },
    taskBadge: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 },
    taskStatus: { fontSize: 11, color: '#94a3b8' },
    ctaBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #04CDCD, #028585)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
};

// ─────────────────────────────────────────────
// STYLES — Page
// ─────────────────────────────────────────────
const S = {
    page: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", paddingBottom: 130 },
    hero: { background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)', padding: '20px 20px 0' },
    heroInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', maxWidth: 500, margin: '0 auto 20px' },
    logoWrap: { display: 'flex', alignItems: 'center', gap: 10 },
    logoIconWrap: { width: 36, height: 36, background: '#04CDCD22', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    brand: { fontSize: 20, fontWeight: 800, color: '#04CDCD', letterSpacing: '-0.3px' },
    tagline: { fontSize: 10, color: '#6B8894', marginTop: 1 },
    logoutBtn: { display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #2C4A54', color: '#6B8894', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' },
    statsRow: { display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px 12px 0 0', padding: '12px 20px', maxWidth: 500, margin: '0 auto' },
    statChip: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
    statNum: { fontSize: 20, fontWeight: 800, color: '#fff' },
    statLbl: { fontSize: 9, color: '#6B8894', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 },
    statDivider: { width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 4px' },
    contentWrap: { maxWidth: 500, margin: '0 auto', padding: '16px 16px 0' },
    searchWrap: { position: 'relative', marginBottom: 12, display: 'flex', alignItems: 'center' },
    searchIconWrap: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1 },
    searchInput: { width: '100%', padding: '12px 40px 12px 42px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff', color: '#1e293b' },
    searchClear: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    filterRow: { display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 },
    filterChip: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 20, border: '1.5px solid', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s' },
    quickActionsWrap: {
        display: 'grid',
        gap: 8,
        marginBottom: 14,
        background: '#fff',
        borderRadius: 14,
        border: '1.5px solid #e2e8f0',
        padding: '12px 10px',
    },
    quickActionItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        padding: '10px 6px',
        borderRadius: 10,
        border: '1px solid #f1f5f9',
        background: '#f8fafc',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
    },
    quickActionIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    quickActionLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: '#1e293b',
        textAlign: 'center',
        lineHeight: 1.3,
    },
    tugasWrap: { background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', marginBottom: 16, overflow: 'hidden' },
    tugasHeader: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#fff7ed', fontSize: 11, fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #fed7aa' },
    tugasCount: { background: '#f97316', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, marginLeft: 2 },
    tugasList: { display: 'flex', flexDirection: 'column', gap: 0 },
    tugasItem: { padding: '12px 14px', borderLeft: '4px solid', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' },
    tugasNama: { fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 5 },
    tugasMeta: { display: 'flex', alignItems: 'center', gap: 8 },
    tugasBadge: { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5 },
    tugasStatus: { fontSize: 10, color: '#94a3b8' },
    sortRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', marginBottom: 12 },
    sortLabel: { fontSize: 12, color: '#64748b' },
    toggleGroup: { display: 'flex', gap: 4 },
    toggleBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: '#fff', fontFamily: 'inherit', color: '#64748b' },
    toggleActive: { backgroundColor: '#1e293b', color: '#fff', borderColor: '#1e293b' },
    sectionHeader: { fontSize: 11, fontWeight: 800, color: '#ef4444', borderLeft: '3px solid #ef4444', padding: '6px 12px', backgroundColor: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, marginBottom: 10 },
    sectionCount: { backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 10, padding: '1px 8px', fontSize: 11 },
    cardList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 },
    loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px' },
    spinner: { width: 32, height: 32, border: '3px solid #f1f5f9', borderTop: '3px solid #04CDCD', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
    emptyState: { textAlign: 'center', padding: '48px 20px', background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    fab: { width: 56, height: 56, borderRadius: '50%', backgroundColor: '#04CDCD', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(4,205,205,0.25)', cursor: 'pointer' },
    navbarInner: { borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' },
};

// ─────────────────────────────────────────────
// STYLES — Toast Notifikasi
// ─────────────────────────────────────────────
const T = {
    container: { position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 460, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' },
    toast: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 14, borderLeft: '4px solid', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', pointerEvents: 'all', animation: 'slideDown 0.25s ease' },
    toastIcon: { flexShrink: 0 },
    toastTitle: { fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 2 },
    toastBody: { fontSize: 12, color: '#64748b', lineHeight: 1.4 },
    toastClose: { background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0, marginTop: 1 },
};

export default OrderList;