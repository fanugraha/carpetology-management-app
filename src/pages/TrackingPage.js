import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import {
    Search, X, MessageCircle, Clock, CheckCircle,
    WashingMachine, Layers, CalendarDays, Timer, Package,
    FileText, Settings, ChevronDown, ChevronUp, ArrowLeft,
    ShieldCheck, Phone, User, RotateCcw, Archive, Truck,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   DELIVERY TYPE HELPERS
   ambil_sendiri : Waiting List → Sudah Dicuci → Siap Diambil (final)
   antar_jemput  : Waiting List → Sudah Dicuci → Siap Diantar → Sudah Diantar (final)
   'Ready Anter' tetap didukung sebagai status legacy (data lama) = setara Siap Diambil
───────────────────────────────────────────── */
const FINAL_STATUS_BY_DELIVERY = { ambil_sendiri: 'Siap Diambil', antar_jemput: 'Sudah Diantar' };
const isFinalStatusRaw = (statusVal, deliveryTypeVal) => {
    if (statusVal === 'Ready Anter') return true; // kompatibilitas data lama
    return statusVal === FINAL_STATUS_BY_DELIVERY[deliveryTypeVal === 'antar_jemput' ? 'antar_jemput' : 'ambil_sendiri'];
};
const getOrderSteps = (deliveryType) =>
    deliveryType === 'antar_jemput'
        ? ['Diterima', 'Dicuci', 'Siap Diantar', 'Diterima']
        : ['Diterima', 'Dicuci', 'Siap Diambil'];

/* ─────────────────────────────────────────────
   STEP INDICATOR
───────────────────────────────────────────── */
function StepBar({ step }) {
    // step: 1 = search, 2 = confirm, 3 = result
    return (
        <div style={S.stepBar}>
            {[1, 2, 3].map(n => (
                <div
                    key={n}
                    style={{
                        ...S.stepDot,
                        background: n < step ? '#04CDCD' : n === step ? 'rgba(4,205,205,0.35)' : 'rgba(255,255,255,0.15)',
                    }}
                />
            ))}
        </div>
    );
}

/* ─────────────────────────────────────────────
   ORDER CARD
───────────────────────────────────────────── */
function OrderCard({ order, statusCfg, est, waLink, STEPS }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={S.card}>
            {/* Badge arsip jika order ini sudah di-hide admin */}
            {order.is_hidden && (
                <div style={S.archivedBadge}>
                    <Archive size={11} /> Order ini sudah diarsipkan (selesai &amp; lama)
                </div>
            )}

            {/* Collapsed summary */}
            <div style={S.cardTop}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.notaId}>{order.notaId}</div>
                    <div style={S.estRow}>
                        <Timer size={10} color="#94a3b8" />
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>Estimasi:</span>
                        <span style={{ color: '#1e293b', fontSize: 11, fontWeight: 700 }}>{est.tgl}</span>
                        <span style={{
                            fontSize: 10,
                            color: isFinalStatusRaw(order.status, order.delivery_type) ? '#15803d' : '#64748b',
                            fontWeight: 600,
                        }}>({est.info})</span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{
                        ...S.statusBadge,
                        background: statusCfg.bg,
                        color: statusCfg.text,
                        border: `1px solid ${statusCfg.border}`,
                    }}>
                        {statusCfg.icon} {statusCfg.label}
                    </div>
                    <button onClick={() => setExpanded(e => !e)} style={S.expandBtn}>
                        {expanded
                            ? <><ChevronUp size={11} /> Tutup</>
                            : <><ChevronDown size={11} /> Detail</>
                        }
                    </button>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <>
                    {/* Progress steps */}
                    <div style={S.stepsWrap}>
                        {STEPS.map((step, i) => {
                            const stepNum = i + 1;
                            const isDone = statusCfg.step > stepNum;
                            const isActive = statusCfg.step === stepNum;
                            return (
                                <React.Fragment key={i}>
                                    <div style={S.stepItem}>
                                        <div style={{
                                            ...S.stepCircle,
                                            background: isDone || isActive ? statusCfg.dotColor : '#e2e8f0',
                                            boxShadow: isActive ? `0 0 0 3px ${statusCfg.dotColor}33` : 'none',
                                        }}>
                                            {isDone
                                                ? <CheckCircle size={12} color="#fff" />
                                                : <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{stepNum}</span>
                                            }
                                        </div>
                                        <div style={{
                                            ...S.stepLabel,
                                            color: isDone || isActive ? statusCfg.text : '#94a3b8',
                                            fontWeight: isActive ? 700 : 500,
                                        }}>{step}</div>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div style={{
                                            ...S.stepLine,
                                            background: isDone ? statusCfg.dotColor : '#e2e8f0',
                                        }} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Info grid */}
                    <div style={S.infoGrid}>
                        <div style={S.infoCell}>
                            <div style={S.infoLabel}><CalendarDays size={9} /> Tgl Masuk</div>
                            <div style={S.infoVal}>{order.tanggal || '-'}</div>
                        </div>
                        <div style={S.infoCell}>
                            <div style={S.infoLabel}><Timer size={9} /> Estimasi Selesai</div>
                            <div style={{ ...S.infoVal, color: isFinalStatusRaw(order.status, order.delivery_type) ? '#15803d' : '#1e293b' }}>
                                {est.tgl} <span style={{ color: '#64748b', fontWeight: 500 }}>({est.info})</span>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    {order.items.length > 0 && (
                        <div style={S.itemsWrap}>
                            <Package size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>
                                {order.items.map((it, i) => (
                                    <span key={i}>
                                        {i > 0 && ', '}
                                        {it.qty}× {it.nama}
                                        {it.satuan === 'meter' && it.luas ? ` (${Number(it.luas).toFixed(1)}m²)` : ''}
                                    </span>
                                ))}
                            </span>
                        </div>
                    )}

                    {/* Catatan */}
                    {order.catatan && (
                        <div style={S.noteBox}>
                            <FileText size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{order.catatan}</span>
                        </div>
                    )}

                    {/* CTA WA */}
                    <a href={waLink} target="_blank" rel="noreferrer" style={S.waBtn}>
                        <MessageCircle size={14} /> Tanya Progres Order
                    </a>
                </>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
function TrackingPage() {
    // allOrders: untuk tampilan/listing umum — menyembunyikan order yang is_hidden / autoHidden / homeservice / home_visit
    const [allOrders, setAllOrders] = useState([]);
    // searchableOrders: dipakai khusus untuk pencarian manual oleh customer (nota/HP).
    // Tetap menyembunyikan homeservice/home_visit, TAPI tidak menyembunyikan order yang
    // sudah di-hide admin (is_hidden/autoHidden) — karena customer yang tahu nota/HP miliknya
    // sendiri tetap berhak melihat status order yang sudah selesai & diarsipkan.
    const [searchableOrders, setSearchableOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // UX Flow state: 'search' | 'confirm' | 'result'
    const [uiStep, setUiStep] = useState('search');
    const [inputNota, setInputNota] = useState('');
    const [inputHP, setInputHP] = useState('');
    const [searchError, setSearchError] = useState('');
    const [foundOrders, setFoundOrders] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerHP, setCustomerHP] = useState('');
    const [filter, setFilter] = useState('Semua');

    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Load semua order dari Firestore (tanpa expose ke UI)
    useEffect(() => {
        const q = query(collection(db, "transactions"), orderBy("created_at", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            console.log('[Tracking] 📦 Total docs dari Firestore:', snapshot.size);

            // RAW semua dokumen — untuk debug
            const rawAll = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    docId: doc.id,
                    notaId: d.notaId || doc.id,
                    nama: d.nama,
                    hp: d.hp,
                    layanan_type: d.layanan_type,
                    status_order: d.status_order,
                    is_hidden: d.is_hidden,
                };
            });
            console.log('[Tracking] 📋 Semua dokumen (raw):', rawAll);

            // Expose fungsi debug global — ketik window.__debugNota('NOTA-xxx') di console
            window.__debugNota = (notaInput) => {
                const input = String(notaInput).toUpperCase();
                console.log('[DEBUG] 🔍 Mencari nota:', input);
                console.log('[DEBUG] Total raw docs:', snapshot.size);
                snapshot.docs.forEach(doc => {
                    const d = doc.data();
                    const notaId = d.notaId || doc.id;
                    const match = notaId.toUpperCase().includes(input);
                    console.log(
                        match ? '[DEBUG] ✅ MATCH' : '[DEBUG] ❌',
                        '|', notaId,
                        '| layanan:', d.layanan_type,
                        '| is_hidden:', d.is_hidden,
                        '| status:', d.status_order,
                        '| nama:', d.nama,
                        '| hp:', d.hp
                    );
                });
            };
            console.log('[Tracking] 💡 Debug: ketik window.__debugNota("NOTA-xxx") di console untuk cek data mentah');

            const data = snapshot.docs.map(doc => {
                const d = doc.data();

                const isAutoHidden = (() => {
                    const statusVal = d.status_order || d.status;
                    if (!isFinalStatusRaw(statusVal, d.delivery_type)) return false;
                    const ts = d.ready_at || d.created_at;
                    if (!ts) return false;
                    const readyDate = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
                    return (new Date() - readyDate) / (1000 * 60 * 60 * 24) >= 7;
                })();

                return {
                    id: doc.id,
                    nama: d.nama || '-',
                    hp: d.hp || '-',
                    status: d.status_order || d.status || 'Waiting List',
                    tanggal: d.tanggal || null,
                    catatan: d.catatan || '',
                    items: d.items || [],
                    notaId: d.notaId || doc.id,
                    is_hidden: d.is_hidden || false,
                    layanan_type: d.layanan_type || 'laundry',
                    delivery_type: d.delivery_type === 'antar_jemput' ? 'antar_jemput' : 'ambil_sendiri',
                    isAutoHidden,
                };
            });

            const beforeFilter = data.length;

            // Untuk tampilan/listing umum: sembunyikan is_hidden, autoHidden, homeservice, home_visit
            const filtered = data.filter(o =>
                !o.is_hidden &&
                !o.isAutoHidden &&
                o.layanan_type !== 'home_visit' &&
                o.layanan_type !== 'homeservice'
            );

            // Untuk pencarian manual oleh customer: tetap sembunyikan homeservice/home_visit
            // (karena memang ditangani manual via WA), tapi JANGAN sembunyikan is_hidden/autoHidden
            // supaya customer yang mencari nota/HP miliknya sendiri tetap bisa menemukan order
            // yang sudah selesai & diarsipkan oleh admin.
            const searchable = data.filter(o =>
                o.layanan_type !== 'home_visit' &&
                o.layanan_type !== 'homeservice'
            );

            console.log('[Tracking] 🔎 Setelah filter (listing):', filtered.length, '/', beforeFilter, 'order lolos');
            console.log('[Tracking] 🔎 Setelah filter (searchable):', searchable.length, '/', beforeFilter, 'order lolos');
            console.log('[Tracking] 🚫 Disaring keluar dari listing:', data.filter(o =>
                o.is_hidden || o.isAutoHidden ||
                o.layanan_type === 'home_visit' ||
                o.layanan_type === 'homeservice'
            ).map(o => ({ notaId: o.notaId, alasan: o.is_hidden ? 'is_hidden' : o.isAutoHidden ? 'autoHidden' : 'layanan:'+o.layanan_type })));

            setAllOrders(filtered);
            setSearchableOrders(searchable);
            setIsLoading(false);
        }, (error) => {
            console.error('[Tracking] ❌ Firestore error:', error);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    // Normalisasi nomor HP: hapus semua non-digit, konversi 62xxx → 0xxx
    const normalizePhone = (phone) => {
        if (!phone) return '';
        let clean = String(phone).replace(/\D/g, '');
        // Handle leading 62 (Indonesian country code)
        if (clean.startsWith('62')) clean = '0' + clean.substring(2);
        // Handle leading 0062
        if (clean.startsWith('0062')) clean = '0' + clean.substring(4);
        return clean;
    };

    // Cari order berdasarkan nota atau HP
    const handleSearch = () => {
        setSearchError('');

        const rawNota = inputNota.trim();
        const rawHP   = inputHP.trim();

        if (!rawNota && !rawHP) return;

        // Guard: data belum selesai load
        if (isLoading) {
            setSearchError('Data sedang dimuat, coba lagi sebentar.');
            return;
        }

        const nota   = rawNota.toUpperCase();
        const hpNorm = normalizePhone(rawHP);

        console.log('[Search] 🔍 Input nota:', nota, '| HP raw:', rawHP, '| HP norm:', hpNorm);
        console.log('[Search] 📊 searchableOrders tersedia:', searchableOrders.length, 'order');

        const matched = searchableOrders.filter(o => {
            // 1. Cocokkan nomor nota (case-insensitive)
            const matchNota = nota.length > 0 &&
                o.notaId.toUpperCase().includes(nota);

            // 2. Cocokkan HP — strip semua non-digit, lalu compare 8 digit terakhir
            const orderHpNorm = normalizePhone(o.hp);
            const matchHP = hpNorm.length >= 6 &&
                (orderHpNorm === hpNorm ||
                    orderHpNorm.endsWith(hpNorm.slice(-8)) ||
                    hpNorm.endsWith(orderHpNorm.slice(-8)));

            if (matchNota || matchHP) {
                console.log('[Search] ✅ MATCH:', o.notaId, '| nota?', matchNota, '| hp?', matchHP, '| is_hidden?', o.is_hidden);
            }

            return matchNota || matchHP;
        });

        console.log('[Search] 🎯 Hasil:', matched.length, 'order ditemukan');

        if (matched.length === 0) {
            if (searchableOrders.length === 0) {
                console.warn('[Search] ⚠️ searchableOrders kosong — data belum load!');
                setSearchError('Data sedang dimuat, coba lagi dalam beberapa detik.');
            } else {
                console.warn('[Search] ⚠️ Tidak ditemukan dari', searchableOrders.length, 'order');
                console.log('[Search] Sample notaIds:', searchableOrders.slice(0, 5).map(o => o.notaId));
                setSearchError('Nomor tidak ditemukan. Coba periksa kembali atau hubungi kami via WhatsApp.');
            }
            return;
        }

        setFoundOrders(matched);
        setCustomerName(matched[0].nama);
        setCustomerHP(matched[0].hp);
        setUiStep('confirm');
    };

    const handleConfirm = () => {
        setFilter('Semua');
        setUiStep('result');
    };

    const handleReset = () => {
        setUiStep('search');
        setInputNota('');
        setInputHP('');
        setSearchError('');
        setFoundOrders([]);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // Estimasi
    const getEstimasiInfo = (tglMasukStr, status) => {
        if (!tglMasukStr) return { tgl: '-', info: '-', persen: 0 };
        const bulanIndo = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5,
            'Jul': 6, 'Ags': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11
        };
        const parts = tglMasukStr.split(' ');
        if (parts.length < 3) return { tgl: '-', info: '-', persen: 0 };
        const tglMasuk = new Date(parseInt(parts[2]), bulanIndo[parts[1]], parseInt(parts[0]));
        const tglSelesai = new Date(tglMasuk);
        tglSelesai.setDate(tglMasuk.getDate() + 5);

        const hariIni = new Date();
        const totalDurasi = tglSelesai - tglMasuk;
        const sudahBerlalu = hariIni - tglMasuk;
        const persen = Math.min(Math.round((sudahBerlalu / totalDurasi) * 100), 100);
        const selisih = Math.ceil((tglSelesai - hariIni) / (1000 * 60 * 60 * 24));
        const tglSelesaiStr = tglSelesai.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

        if (status === 'Ready Anter' || status === 'Siap Diambil' || status === 'Sudah Diantar') {
            return { tgl: tglSelesaiStr, info: 'Selesai ✓', persen: 100 };
        }
        if (status === 'Siap Diantar') return { tgl: tglSelesaiStr, info: 'Siap diantar', persen: 95 };
        if (selisih > 0) return { tgl: tglSelesaiStr, info: `${selisih} hari lagi`, persen };
        return { tgl: tglSelesaiStr, info: 'Sedang diselesaikan', persen: 90 };
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'Ready Anter':
            case 'Siap Diambil':
                return {
                    label: 'Siap Diambil', bg: '#dcfce7', text: '#15803d',
                    border: '#86efac', icon: <CheckCircle size={12} />,
                    dotColor: '#22c55e', progressColor: '#22c55e', step: 3,
                };
            case 'Siap Diantar':
                return {
                    label: 'Siap Diantar', bg: '#dbeafe', text: '#1d4ed8',
                    border: '#93c5fd', icon: <Truck size={12} />,
                    dotColor: '#3b82f6', progressColor: '#3b82f6', step: 3,
                };
            case 'Sudah Diantar':
                return {
                    label: 'Sudah Diterima', bg: '#dcfce7', text: '#15803d',
                    border: '#86efac', icon: <CheckCircle size={12} />,
                    dotColor: '#22c55e', progressColor: '#22c55e', step: 4,
                };
            case 'Sudah Dicuci':
                return {
                    label: 'Sedang Diproses', bg: '#fef3c7', text: '#b45309',
                    border: '#fcd34d', icon: <WashingMachine size={12} />,
                    dotColor: '#f59e0b', progressColor: '#f59e0b', step: 2,
                };
            default:
                return {
                    label: 'Dalam Antrian', bg: '#f1f5f9', text: '#475569',
                    border: '#cbd5e1', icon: <Clock size={12} />,
                    dotColor: '#94a3b8', progressColor: '#04CDCD', step: 1,
                };
        }
    };

    // Filter tab pada hasil — "Selesai" mencakup Siap Diambil maupun Sudah Diantar
    const countProses = foundOrders.filter(o => !isFinalStatusRaw(o.status, o.delivery_type)).length;
    const countReady = foundOrders.filter(o => isFinalStatusRaw(o.status, o.delivery_type)).length;
    const filteredOrders = foundOrders.filter(o => {
        if (filter === 'Semua') return true;
        if (filter === 'Proses') return !isFinalStatusRaw(o.status, o.delivery_type);
        if (filter === 'Selesai') return isFinalStatusRaw(o.status, o.delivery_type);
        return true;
    });

    // Masking HP untuk konfirmasi: 0812-****-7890
    const maskPhone = (phone) => {
        const clean = normalizePhone(phone);
        if (clean.length < 8) return phone;
        return clean.slice(0, 4) + '-****-' + clean.slice(-4);
    };

    return (
        <div style={S.page}>
            {/* ── HEADER ── */}
            <div style={S.hero}>
                <div style={S.heroInner}>
                    <div style={S.logoWrap}>
                        <div style={S.logoIconWrap}>
                            <Layers size={20} color="#04CDCD" />
                        </div>
                        <div>
                            <div style={S.brand}>Carpetology ID</div>
                            <div style={S.tagline}>Cuci Karpet & Laundry Professional</div>
                        </div>
                    </div>
                    <div style={S.heroMeta}>
                        <div style={S.hours}><Clock size={11} color="#6B8894" /> 08.00–16.00 WIB</div>
                        <button onClick={() => navigate('/admin-login')} style={S.adminBtn}>
                            <Settings size={11} /> Admin
                        </button>
                    </div>
                </div>

                {/* Step bar dalam hero */}
                <StepBar step={uiStep === 'search' ? 1 : uiStep === 'confirm' ? 2 : 3} />
            </div>

            <div style={S.contentWrap}>

                {/* ══════════════════════════════════
                    STEP 1 — SEARCH
                ═══════════════════════════════════ */}
                {uiStep === 'search' && (
                    <div style={S.stepSection}>
                        {/* Privacy badge */}
                        <div style={S.privacyBadge}>
                            <ShieldCheck size={13} color="#04CDCD" />
                            <span>Data order bersifat pribadi</span>
                        </div>

                        <h2 style={S.stepTitle}>Cek status ordermu</h2>
                        <p style={S.stepDesc}>
                            Masukkan nomor nota atau nomor HP yang kamu daftarkan saat antar karpet.
                        </p>

                        <label style={S.inputLabel}>Nomor nota</label>
                        <div style={S.inputWrap}>
                            <FileText size={15} color="#94a3b8" style={S.inputIcon} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Contoh: NOTA-20260624-124859-SD69S"
                                value={inputNota}
                                onChange={e => { setInputNota(e.target.value); setSearchError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                style={S.textInput}
                            />
                            {inputNota && (
                                <button onClick={() => setInputNota('')} style={S.clearBtn}>
                                    <X size={13} color="#64748b" />
                                </button>
                            )}
                        </div>

                        <div style={S.orDivider}>
                            <div style={S.orLine} />
                            <span style={S.orText}>atau</span>
                            <div style={S.orLine} />
                        </div>

                        <label style={S.inputLabel}>Nomor HP</label>
                        <div style={S.inputWrap}>
                            <Phone size={15} color="#94a3b8" style={S.inputIcon} />
                            <input
                                type="tel"
                                placeholder="Contoh: 08123456789"
                                value={inputHP}
                                onChange={e => { setInputHP(e.target.value); setSearchError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                style={S.textInput}
                            />
                            {inputHP && (
                                <button onClick={() => setInputHP('')} style={S.clearBtn}>
                                    <X size={13} color="#64748b" />
                                </button>
                            )}
                        </div>

                        {/* Error */}
                        {searchError && (
                            <div style={S.errorBox}>
                                <X size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                <div>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{searchError}</div>
                                    <a
                                        href="https://wa.me/6282151154727"
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#dc2626', fontWeight: 700, fontSize: 12, textDecoration: 'underline' }}
                                    >
                                        Hubungi kami via WhatsApp →
                                    </a>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleSearch}
                            disabled={isLoading || (!inputNota.trim() && !inputHP.trim())}
                            style={{
                                ...S.primaryBtn,
                                opacity: isLoading || (!inputNota.trim() && !inputHP.trim()) ? 0.5 : 1,
                                cursor: isLoading || (!inputNota.trim() && !inputHP.trim()) ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {isLoading
                                ? <><div style={S.btnSpinner} /> Memuat data...</>
                                : <><Search size={15} /> Cari order</>
                            }
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════
                    STEP 2 — KONFIRMASI
                ═══════════════════════════════════ */}
                {uiStep === 'confirm' && (
                    <div style={S.stepSection}>
                        <button onClick={handleReset} style={S.backBtn}>
                            <ArrowLeft size={14} /> Cari ulang
                        </button>

                        <h2 style={S.stepTitle}>Ini kamu?</h2>
                        <p style={S.stepDesc}>
                            Pastikan data berikut milik kamu sebelum melihat order.
                        </p>

                        {/* Customer card */}
                        <div style={S.customerCard}>
                            <div style={S.customerAvatar}>
                                {customerName.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={S.customerName}>{customerName}</div>
                                <div style={S.customerHP}>
                                    <Phone size={11} color="#94a3b8" /> {maskPhone(customerHP)}
                                </div>
                            </div>
                            <div style={S.orderCountBubble}>{foundOrders.length} order</div>
                        </div>

                        {/* Badge ringkasan */}
                        <div style={S.countRow}>
                            {countProses > 0 && (
                                <div style={{ ...S.countBadge, background: '#fef3c7', color: '#b45309' }}>
                                    <Clock size={11} /> {countProses} dalam proses
                                </div>
                            )}
                            {countReady > 0 && (
                                <div style={{ ...S.countBadge, background: '#dcfce7', color: '#15803d' }}>
                                    <CheckCircle size={11} /> {countReady} siap diambil
                                </div>
                            )}
                        </div>

                        {/* Info home visit */}
                        <div style={S.infoNote}>
                            <MessageCircle size={13} color="#04CDCD" style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>
                                Order <strong>home service</strong> (sofa & springbed) tidak ditampilkan di sini.
                                Tim kami akan menghubungi via WhatsApp.
                            </span>
                        </div>

                        <button onClick={handleConfirm} style={S.primaryBtn}>
                            <CheckCircle size={15} /> Ya, lihat order saya
                        </button>
                        <button onClick={handleReset} style={S.ghostBtn}>
                            Bukan saya, cari ulang
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════
                    STEP 3 — HASIL ORDER
                ═══════════════════════════════════ */}
                {uiStep === 'result' && (
                    <div>
                        {/* Back + header */}
                        <div style={S.resultHeader}>
                            <button onClick={() => setUiStep('confirm')} style={S.backBtn}>
                                <ArrowLeft size={14} /> Kembali
                            </button>
                            <div style={S.resultOwner}>
                                <User size={12} color="#04CDCD" />
                                <span>Order milik <strong>{customerName}</strong></span>
                            </div>
                        </div>

                        {/* Filter chips */}
                        <div style={S.filterRow}>
                            {[
                                { id: 'Semua', label: `Semua (${foundOrders.length})` },
                                { id: 'Proses', label: `Proses (${countProses})` },
                                { id: 'Selesai', label: `Selesai (${countReady})` },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    style={{
                                        ...S.filterChip,
                                        background: filter === f.id ? '#04CDCD' : '#fff',
                                        color: filter === f.id ? '#fff' : '#475569',
                                        borderColor: filter === f.id ? '#04CDCD' : '#e2e8f0',
                                        fontWeight: filter === f.id ? 700 : 600,
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Order list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {filteredOrders.map((order) => {
                                const statusCfg = getStatusConfig(order.status);
                                const est = getEstimasiInfo(order.tanggal, order.status);
                                const waLink = `https://wa.me/6282151154727?text=Halo Admin, saya ingin menanyakan progres order:%0ANama: ${encodeURIComponent(order.nama)}%0ATanggal Masuk: ${order.tanggal}%0ANota: ${order.notaId}`;
                                return (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        statusCfg={statusCfg}
                                        est={est}
                                        waLink={waLink}
                                        STEPS={getOrderSteps(order.delivery_type)}
                                    />
                                );
                            })}
                        </div>

                        {/* Cari order lain */}
                        <button onClick={handleReset} style={{ ...S.ghostBtn, marginTop: 20 }}>
                            <RotateCcw size={13} /> Cari order lain
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div style={S.footer}>
                    <div style={{ fontWeight: 700, color: '#04CDCD', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Layers size={14} color="#04CDCD" /> Carpetology ID
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Jasa Cuci Karpet & Laundry Professional</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Clock size={10} color="#94a3b8" /> Jam operasional: 08.00 – 16.00 WIB
                    </div>
                </div>
            </div>

            {/* FAB WhatsApp */}
            <a href="https://wa.me/6282151154727" target="_blank" rel="noreferrer" style={S.fab}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.148-.67-1.613-.916-2.207-.242-.579-.487-.5-.67-.509-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.996c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.005 0C5.37 0 .002 5.368.002 12.006c0 2.094.547 4.136 1.587 5.932L0 24l6.33-1.662a11.785 11.785 0 005.675 1.444h.005c6.634 0 12.002-5.368 12.002-12.006 0-3.21-1.25-6.233-3.522-8.504" />
                </svg>
            </a>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                input:focus { outline: none; border-color: #04CDCD !important; box-shadow: 0 0 0 3px rgba(4,205,205,0.12); }
            `}</style>
        </div>
    );
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const S = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
        paddingBottom: 100,
    },
    // Hero
    hero: {
        background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
        padding: '20px 20px 0',
    },
    heroInner: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        maxWidth: 500,
        margin: '0 auto 20px',
    },
    logoWrap: { display: 'flex', alignItems: 'center', gap: 10 },
    logoIconWrap: {
        width: 36, height: 36,
        background: '#04CDCD22', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    brand: { fontSize: 20, fontWeight: 800, color: '#04CDCD', letterSpacing: '-0.3px' },
    tagline: { fontSize: 10, color: '#6B8894', marginTop: 1 },
    heroMeta: { display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 },
    hours: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B8894', fontWeight: 600 },
    adminBtn: {
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'none', border: '1px solid #2C4A54', color: '#6B8894',
        padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
    },
    // Step bar
    stepBar: {
        display: 'flex',
        gap: 6,
        padding: '12px 20px',
        maxWidth: 500,
        margin: '0 auto',
    },
    stepDot: {
        flex: 1,
        height: 3,
        borderRadius: 2,
        transition: 'background 0.3s',
    },
    // Content
    contentWrap: {
        maxWidth: 500,
        margin: '0 auto',
        padding: '20px 16px 0',
    },
    // Step section
    stepSection: {
        animation: 'fadeUp 0.25s ease',
    },
    privacyBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(4,205,205,0.08)',
        border: '1px solid rgba(4,205,205,0.25)',
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: 11,
        color: '#04CDCD',
        fontWeight: 600,
        marginBottom: 16,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: 800,
        color: '#1e293b',
        margin: '0 0 8px',
        letterSpacing: '-0.4px',
    },
    stepDesc: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 1.6,
        margin: '0 0 24px',
    },
    // Input
    inputLabel: {
        display: 'block',
        fontSize: 12,
        fontWeight: 700,
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 6,
    },
    inputWrap: {
        position: 'relative',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: 13,
        pointerEvents: 'none',
        flexShrink: 0,
    },
    textInput: {
        width: '100%',
        padding: '12px 36px 12px 40px',
        borderRadius: 12,
        border: '1.5px solid #e2e8f0',
        fontSize: 14,
        fontFamily: 'inherit',
        backgroundColor: '#fff',
        color: '#1e293b',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    clearBtn: {
        position: 'absolute',
        right: 10,
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '50%',
        width: 22,
        height: 22,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Or divider
    orDivider: { display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' },
    orLine: { flex: 1, height: 1, background: '#e2e8f0' },
    orText: { fontSize: 12, color: '#94a3b8', fontWeight: 600 },
    // Error
    errorBox: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 13,
        color: '#dc2626',
        marginBottom: 4,
        marginTop: 8,
        lineHeight: 1.5,
    },
    // Buttons
    primaryBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        padding: '13px',
        background: 'linear-gradient(135deg, #04CDCD, #028585)',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        fontSize: 15,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(4,205,205,0.3)',
        boxSizing: 'border-box',
    },
    ghostBtn: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        padding: '11px',
        background: '#fff',
        color: '#475569',
        border: '1.5px solid #e2e8f0',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        boxSizing: 'border-box',
    },
    backBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        color: '#64748b',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        padding: '0 0 16px 0',
    },
    btnSpinner: {
        width: 14, height: 14,
        border: '2px solid rgba(255,255,255,0.4)',
        borderTop: '2px solid #fff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    // Confirm step
    customerCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: '#fff',
        border: '1.5px solid #e2e8f0',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    customerAvatar: {
        width: 46, height: 46,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #04CDCD, #028585)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, color: '#fff',
        flexShrink: 0,
    },
    customerName: { fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 4 },
    customerHP: {
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 13, color: '#64748b', fontWeight: 500,
        fontFamily: 'monospace',
    },
    orderCountBubble: {
        background: '#f1f5f9',
        color: '#475569',
        borderRadius: 20,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
    },
    countRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
    countBadge: {
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
    },
    infoNote: {
        display: 'flex', alignItems: 'flex-start', gap: 8,
        background: '#f0fefe',
        border: '1px solid rgba(4,205,205,0.2)',
        borderLeft: '3px solid #04CDCD',
        borderRadius: '0 10px 10px 0',
        padding: '10px 12px',
        fontSize: 12, color: '#475569', lineHeight: 1.6,
        marginBottom: 4,
    },
    // Result step
    resultHeader: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 4,
    },
    resultOwner: {
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: '#64748b', paddingBottom: 12,
    },
    // Filter chips
    filterRow: {
        display: 'flex', gap: 8, marginBottom: 16,
        overflowX: 'auto', paddingBottom: 2,
    },
    filterChip: {
        padding: '7px 14px', borderRadius: 20, border: '1.5px solid',
        fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
        fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0,
    },
    // Order card
    card: {
        background: '#fff', borderRadius: 16, padding: '14px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
    },
    archivedBadge: {
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: '#f1f5f9', color: '#64748b',
        fontSize: 10, fontWeight: 700,
        padding: '4px 10px', borderRadius: 20,
        marginBottom: 10,
    },
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
    notaId: { fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4, fontFamily: 'monospace' },
    estRow: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
    statusBadge: {
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        flexShrink: 0, whiteSpace: 'nowrap',
    },
    expandBtn: {
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b',
        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    },
    stepsWrap: {
        display: 'flex', alignItems: 'center',
        marginTop: 14, marginBottom: 14,
        padding: '10px 0',
        borderTop: '1px solid #f8fafc', borderBottom: '1px solid #f8fafc',
    },
    stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 },
    stepCircle: {
        width: 24, height: 24, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
    },
    stepLabel: { fontSize: 9, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' },
    stepLine: { flex: 1, height: 2, borderRadius: 2, margin: '0 4px', marginBottom: 14, transition: 'background 0.2s' },
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 },
    infoCell: { background: '#f8fafc', borderRadius: 8, padding: '8px 10px' },
    infoLabel: {
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 10, color: '#94a3b8', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2,
    },
    infoVal: { fontSize: 12, fontWeight: 700, color: '#1e293b' },
    itemsWrap: {
        display: 'flex', alignItems: 'flex-start', gap: 6,
        fontSize: 11, color: '#64748b', background: '#f8fafc',
        borderRadius: 8, padding: '8px 10px', marginBottom: 10,
        lineHeight: 1.5, fontStyle: 'italic',
    },
    noteBox: {
        display: 'flex', alignItems: 'flex-start', gap: 6,
        background: '#fff7ed', color: '#c2410c', fontSize: 11,
        padding: '8px 10px', borderRadius: 8, marginBottom: 10,
        border: '1px solid #fed7aa', lineHeight: 1.5,
    },
    waBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0',
        color: '#04CDCD', textDecoration: 'none', fontSize: 12, fontWeight: 700,
        fontFamily: 'inherit', background: '#f0fefe', cursor: 'pointer',
    },
    footer: { textAlign: 'center', padding: '32px 20px 16px', color: '#94a3b8', fontSize: 12 },
    fab: {
        position: 'fixed', bottom: 24, right: 20,
        backgroundColor: '#25D366', width: 52, height: 52,
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(37,211,102,0.4)', zIndex: 100, textDecoration: 'none',
    },
};

export default TrackingPage;