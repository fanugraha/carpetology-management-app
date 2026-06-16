/**
 * KasirPage — v5
 *
 * Semua perubahan dari v4:
 * ─────────────────────────────────────────────────────────────────
 * [BUG FIX 🔴] KalkulatorPxL useEffect dependency
 *   - Tambah `onLuasChange` ke dependency array → pakai useCallback di Step1
 *   - Cegah stale closure saat onLuasChange berubah referensi
 *
 * [BUG FIX 🔴] lastCustomer stale closure di useEffect orders
 *   - Ganti cek `!lastCustomer` dengan useRef (lastCustomerSet)
 *   - Dependency array tidak lagi menyebabkan infinite loop
 *
 * [BUG FIX 🔴] Mobile auto-zoom pada input number
 *   - CSS .inp, .pxl-inp, semua input number → font-size: 16px
 *   - Tambah `touch-action: manipulation` dan viewport meta via CSS
 *
 * [BUG FIX 🟡] KalkulatorPxL reset saat cart berubah
 *   - State panjang/lebar dipindah ke cart item (cartDims[cartKey])
 *   - KalkulatorPxL terima initialPanjang/initialLebar sebagai prop
 *   - Komponen tidak di-unmount saat cart entry lain berubah
 *
 * [BUG FIX 🟡] Workshop statusBayar selalu "Lunas"
 *   - QRIS & Transfer → "Menunggu Konfirmasi" (bukan langsung Lunas)
 *   - Tunai → "Lunas"
 *   - Belum Bayar → "Belum Lunas"
 *   - Badge di success page merefleksikan status baru
 *
 * [UX 🟡] Konfirmasi Tandai Lunas diganti modal (bukan window.confirm)
 *   - Modal sheet dengan preview nota ID + nama customer
 *   - Spinner saat proses update
 *   - window.confirm dihapus seluruhnya
 *
 * [UX 🟢] Feedback loading tandai Lunas
 *   - Tombol "Tandai Lunas" → spinner "Memproses..." selama update
 *   - lunasLoading tracking per notaId sudah ada di v4, diperkuat
 *
 * [UX 🟢] Cart persist via sessionStorage
 *   - cart, customer, svcType, step disimpan ke sessionStorage
 *   - Restore otomatis saat halaman reload/refresh
 *   - Di-clear saat transaksi selesai (handleReset)
 *
 * [UX 🟢] Label pay-chip dipersingkat
 *   - "Belum Bayar" → label: "Tempo", sub: "Hutang"
 *   - Tidak terpotong di mobile 4-kolom
 *
 * [SKIP] Dark mode — user minta skip
 * [SKIP] Shortcut deposit chips — user minta skip
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection, getDocs, addDoc, doc, serverTimestamp,
  query, orderBy, onSnapshot, updateDoc, where, deleteDoc, limit,
} from "firebase/firestore";
import {
  Search, X, ShoppingCart, ClipboardList, Package,
  CheckCircle, AlertCircle, Clock, Trash2, Plus, Minus,
  ChevronRight, Phone, Printer, Edit3, Copy, MessageCircle,
  Layers, Banknote, QrCode, Building2, Home,
  Loader2, Eye, Download, ArrowLeft, Star,
  AlertTriangle, Tag, Save,
} from "lucide-react";
import { db } from "../../firebase";
import Navbar from "../../componets/Navbar";
import { useAuth } from "../../context/AuthContext";
import * as XLSX from "xlsx";

// ─── WARNA ────────────────────────────────────────────────────────────────────
const C = {
  primary: "#04CDCD", p600: "#03A8A8", p700: "#028585", p100: "#E0FAFA",
  p200: "#B3F0F0", p50: "#F0FEFE", amber: "#D97706", amberBg: "#FEF3C7",
  amberBd: "#FCD34D", amberTx: "#92400E", dark: "#1A2E35", dark2: "#2C4A54",
  muted: "#6B8894", border: "#D4ECEC", surface: "#F4FEFE", white: "#FFFFFF",
  ok: "#22C55E", okBg: "#DCFCE7", okTx: "#15803D", warn: "#F59E0B",
  warnBg: "#FEF3C7", warnTx: "#92400E", red: "#EF4444", redBg: "#FEE2E2",
  blue: "#3B82F6", blueBg: "#EFF6FF", blueTx: "#1D4ED8",
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
// [FIX 🔴] font-size: 16px pada semua input → cegah auto-zoom iOS/Android
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body,#root{font-family:'Plus Jakarta Sans',sans-serif;background:${C.surface};color:${C.dark};min-height:100vh}
input,select,textarea{font-size:16px!important;touch-action:manipulation}
.kr{display:flex;flex-direction:column;min-height:100vh;max-width:480px;margin:0 auto;background:${C.white};box-shadow:0 0 40px rgba(4,205,205,0.08);padding-bottom:60px}
.topbar{background:${C.dark};padding:11px 16px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:50}
.tb-icon{width:30px;height:30px;background:${C.primary};border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${C.dark}}
.tb-brand{font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700;color:${C.primary}}
.tb-sub{font-size:10px;color:${C.muted};margin-top:1px}
.sum-bar{background:${C.dark2};padding:7px 16px;display:flex;gap:8px}
.sum-pill{flex:1;background:rgba(4,205,205,0.12);border-radius:7px;padding:5px 8px;text-align:center}
.sum-pill-lbl{font-size:9px;color:${C.muted};text-transform:uppercase;letter-spacing:.4px}
.sum-pill-val{font-size:13px;font-weight:700;color:${C.primary};margin-top:1px;font-family:'Space Grotesk',sans-serif}
.sum-pill.red{background:rgba(239,68,68,.12)}
.sum-pill.red .sum-pill-lbl{color:#F87171}
.sum-pill.red .sum-pill-val{color:#F87171}
.nav{display:flex;background:${C.dark}}
.ntab{flex:1;padding:10px;text-align:center;font-size:11px;font-weight:700;color:${C.muted};cursor:pointer;border-bottom:2px solid transparent;display:flex;align-items:center;justify-content:center;gap:5px;transition:all .15s;text-transform:uppercase;letter-spacing:.4px}
.ntab.active{color:${C.primary};border-bottom-color:${C.primary}}
.ntab:hover:not(.active){color:${C.p200}}
.steps{display:flex;align-items:center;padding:11px 16px;background:${C.white};border-bottom:1px solid ${C.border}}
.sdot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;transition:all .2s}
.sdot.done{background:${C.primary};color:white}
.sdot.active{background:${C.primary};color:white;box-shadow:0 0 0 3px ${C.p200}}
.sdot.pend{background:${C.border};color:${C.muted}}
.sline{flex:1;height:2px;background:${C.border};margin:0 6px;transition:background .2s}
.sline.done{background:${C.primary}}
.swrap{display:flex;flex-direction:column;align-items:center}
.slbl{font-size:9px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.5px;margin-top:3px;text-align:center}
.pad{padding:14px 16px}
.sc{flex:1;padding:14px 16px;overflow-y:auto}
.svc-toggle{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.svc-opt{border:2px solid ${C.border};border-radius:12px;padding:12px 10px;cursor:pointer;text-align:center;transition:all .18s;background:${C.white};position:relative}
.svc-opt.ws.active{border-color:${C.primary};background:${C.p100}}
.svc-opt.hs.active{border-color:${C.amber};background:${C.amberBg}}
.svc-name{font-size:13px;font-weight:800;margin-top:4px}
.svc-sub{font-size:10px;margin-top:2px}
.svc-opt.ws .svc-name{color:${C.p700}}
.svc-opt.hs .svc-name{color:${C.amber}}
.svc-opt.ws .svc-sub{color:${C.p700}}
.svc-opt.hs .svc-sub{color:${C.amber}}
.svc-check{position:absolute;top:7px;right:7px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.svc-opt.ws.active .svc-check{background:${C.primary}}
.svc-opt.hs.active .svc-check{background:${C.amber}}
.last-cust{background:linear-gradient(135deg,${C.p100},${C.p50});border:1.5px solid ${C.primary};border-radius:10px;padding:9px 12px;display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer;transition:all .15s}
.last-cust:hover{border-color:${C.p700};transform:translateY(-1px)}
.last-lbl{font-size:9px;font-weight:700;color:${C.p700};text-transform:uppercase;letter-spacing:.4px;margin-bottom:1px;display:flex;align-items:center;gap:3px}
.last-name{font-size:13px;font-weight:700;color:${C.dark}}
.last-hp{font-size:10px;color:${C.muted}}
.cust-sel{border:1.5px dashed ${C.border};border-radius:10px;padding:11px 13px;cursor:pointer;display:flex;align-items:center;gap:10px;margin-bottom:8px;transition:all .15s;background:${C.surface}}
.cust-sel.has{border-color:${C.primary};background:${C.p100};border-style:solid}
.cust-av{width:34px;height:34px;border-radius:50%;background:${C.border};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:700;color:${C.muted}}
.cust-sel.has .cust-av{background:${C.p600};color:white}
.s-wrap{position:relative;margin-bottom:10px;display:flex;align-items:center}
.s-ico{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:${C.muted};pointer-events:none;display:flex;align-items:center;z-index:1}
.s-wrap input{width:100%;padding:9px 36px 9px 32px;border:1.5px solid ${C.border};border-radius:9px;font-family:inherit;color:${C.dark};background:${C.surface};outline:none;transition:border-color .2s,box-shadow .2s}
.s-wrap input:focus{border-color:${C.primary};box-shadow:0 0 0 3px ${C.p100};background:${C.white}}
.s-wrap input::placeholder{color:#BCD8D8}
.s-clr{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:${C.muted};display:flex;align-items:center;padding:3px;border-radius:50%;transition:background .15s;z-index:1}
.s-clr:hover{background:${C.border};color:${C.dark}}
.prod-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:2px}
.prod-card{border:1.5px solid ${C.border};border-radius:10px;padding:10px;cursor:pointer;background:${C.white};transition:all .15s;display:flex;flex-direction:column;gap:4px}
.prod-card:hover{border-color:${C.primary};background:${C.p50}}
.prod-card.sel{border-color:${C.primary};background:${C.p50}}
.prod-card-name{font-size:12px;font-weight:700;color:${C.dark};line-height:1.3}
.prod-card-price{font-size:12px;font-weight:800;color:${C.p700};font-family:'Space Grotesk',sans-serif}
.prod-card-sub{font-size:9px;color:${C.muted}}
.inp{width:100%;padding:8px 11px;border:1.5px solid ${C.border};border-radius:8px;font-family:inherit;color:${C.dark};outline:none;transition:border-color .2s}
.inp:focus{border-color:${C.primary}}
.badge{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:5px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px}
.bg-teal{background:${C.p100};color:${C.p700}}
.bg-ok{background:${C.okBg};color:${C.okTx}}
.bg-warn{background:${C.warnBg};color:${C.warnTx}}
.bg-red{background:${C.redBg};color:${C.red}}
.bg-amber{background:${C.amberBg};color:${C.amberTx}}
.bg-gray{background:#F1F5F9;color:#475569}
.bg-blue{background:${C.blueBg};color:${C.blueTx}}
.sec{font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.sec::after{content:'';flex:1;height:1px;background:${C.border}}
.chips{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
.chip{padding:5px 12px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid ${C.border};background:${C.white};color:${C.muted};transition:all .15s}
.chip.active{background:${C.primary};color:white;border-color:${C.primary}}
.chip:hover:not(.active){border-color:${C.primary};color:${C.primary}}
.chip.red.active{background:${C.red};border-color:${C.red};color:white}
.chip.amber.active{background:${C.amber};border-color:${C.amber};color:white}
.pay-chips{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
.pay-chip{border:2px solid ${C.border};border-radius:10px;padding:10px 6px;cursor:pointer;background:${C.white};transition:all .15s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;min-height:72px}
.pay-chip:hover{border-color:${C.p200};background:${C.p50}}
.pay-chip.sel{border-color:${C.primary};background:${C.p100}}
.pay-chip-n{font-size:10px;font-weight:700;color:${C.dark};text-align:center;line-height:1.2}
.pay-chip.sel .pay-chip-n{color:${C.p700}}
.foot{padding:11px 16px;background:${C.white};border-top:1px solid ${C.border};display:flex;flex-direction:column;gap:8px}
.btn{padding:11px 16px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .18s}
.btn-p{background:${C.primary};color:white}
.btn-p:hover{background:${C.p600};transform:translateY(-1px);box-shadow:0 4px 14px rgba(4,205,205,.3)}
.btn-p:active{transform:translateY(0)}
.btn-s{background:${C.surface};color:${C.dark};border:1.5px solid ${C.border}}
.btn-s:hover{background:${C.p100};border-color:${C.primary}}
.btn-g{background:none;color:${C.primary};border:1.5px solid ${C.primary}}
.btn-g:hover{background:${C.p100}}
.btn-red{background:${C.redBg};color:${C.red};border:1.5px solid ${C.red}}
.btn-full{width:100%}
.btn-sm{padding:6px 11px;font-size:11px;border-radius:7px}
.btn-green{background:#25D366;color:white;border:none}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important;box-shadow:none!important}
.diskon-wrap{display:flex;border:1.5px solid ${C.border};border-radius:9px;overflow:hidden;transition:border-color .2s}
.diskon-wrap:focus-within{border-color:${C.primary}}
.diskon-wrap.err{border-color:${C.red}!important}
.diskon-input{flex:1;padding:10px 12px;border:none;font-weight:700;font-family:inherit;color:${C.dark};outline:none;background:transparent;min-width:0}
.diskon-suffix{display:flex}
.diskon-suffix-btn{padding:0 12px;background:${C.surface};border:none;border-left:1.5px solid ${C.border};cursor:pointer;font-size:12px;font-weight:700;color:${C.muted};font-family:inherit;transition:all .15s}
.diskon-suffix-btn.active{background:${C.p100};color:${C.p700}}
.diskon-suffix-btn:first-child{border-left:none;border-right:1px solid ${C.border}}
.sum-box{background:${C.surface};border:.5px solid ${C.border};border-radius:10px;overflow:hidden;margin-bottom:10px}
.sum-row{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:.5px solid ${C.border};font-size:12px}
.sum-total{display:flex;justify-content:space-between;padding:10px 12px;background:${C.p100}}
.hist-card{border:1px solid ${C.border};border-radius:10px;padding:11px 13px;margin-bottom:7px;background:${C.white};cursor:pointer;transition:all .15s}
.hist-card:hover{border-color:${C.primary};transform:translateY(-1px);box-shadow:0 3px 10px rgba(4,205,205,.1)}
.hist-bot{display:flex;justify-content:space-between;align-items:center;margin-top:7px;padding-top:7px;border-top:.5px solid ${C.border};flex-wrap:wrap;gap:5px}
.lunas-btn{background:${C.okBg};color:${C.okTx};border:1.5px solid ${C.ok};border-radius:6px;padding:4px 9px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:3px;transition:all .15s}
.lunas-btn:hover{background:${C.ok};color:white}
.lunas-btn:disabled{opacity:.5;cursor:not-allowed}
.edit-btn{background:${C.p100};color:${C.p700};border:1.5px solid ${C.primary};border-radius:6px;padding:4px 9px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:3px;transition:all .15s}
.edit-btn:hover{background:${C.primary};color:white}
.del-btn{background:${C.redBg};color:${C.red};border:1.5px solid ${C.red};border-radius:6px;padding:4px 9px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:3px;transition:all .15s}
.del-btn:hover{background:${C.red};color:white}
.hl{background:#FEF9C3;border-radius:2px;padding:0 1px}
.back-warn{background:${C.warnBg};border:1.5px solid ${C.warn};border-radius:9px;padding:9px 12px;display:flex;align-items:center;gap:8px;font-size:12px;color:${C.warnTx}}
.nota-card{border:1px solid ${C.border};border-radius:14px;overflow:hidden}
.nota-hdr{background:${C.dark};padding:20px;text-align:center}
.nota-brand{font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;color:${C.primary};display:flex;align-items:center;justify-content:center;gap:6px}
.loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:180px;gap:10px;color:${C.muted};font-size:13px}
@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin .7s linear infinite}
.empty{text-align:center;padding:36px 20px;color:${C.muted};font-size:13px}
.empty-icon{display:flex;justify-content:center;margin-bottom:10px}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.ani{animation:slideUp .22s ease-out}
.fade{animation:fadeIn .18s ease-out}
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:${C.dark};color:white;padding:9px 18px;border-radius:9px;font-size:12px;font-weight:700;z-index:999;animation:slideUp .2s ease-out;display:flex;align-items:center;gap:6px;white-space:nowrap}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:flex-end;justify-content:center}
.modal-sheet{background:${C.white};border-radius:16px 16px 0 0;padding:20px 16px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
@media print{.no-print{display:none!important}}
.pxl-wrap{background:${C.white};border-radius:8px;padding:10px;border:1px solid ${C.border};margin-top:6px;overflow:hidden}
.pxl-row{display:flex;align-items:center;gap:4px;margin-bottom:6px;width:100%}
.pxl-inp{flex:1;min-width:0;width:0;padding:7px 4px;border:1.5px solid ${C.border};border-radius:7px;font-weight:700;font-family:inherit;color:${C.dark};outline:none;text-align:center;transition:border-color .2s}
.pxl-inp:focus{border-color:${C.primary}}
.pxl-result{background:${C.p100};border-radius:6px;padding:7px 10px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:${C.p700};font-weight:600}
.deposit-badge{background:${C.amberBg};border:1.5px solid ${C.amberBd};border-radius:9px;padding:10px 13px}
.entry-card{border:1.5px solid ${C.primary};border-radius:10px;padding:9px 11px;margin-bottom:6px;background:${C.p50}}
.entry-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.entry-label{font-size:10px;font-weight:700;color:${C.p700};text-transform:uppercase;letter-spacing:.4px;display:flex;align-items:center;gap:4px}
.session-banner{background:${C.amberBg};border-bottom:1px solid ${C.amberBd};padding:7px 16px;display:flex;align-items:center;gap:6px;font-size:11px;color:${C.amberTx};font-weight:600}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const rp = (n) => "Rp " + (n || 0).toLocaleString("id-ID");
const genId = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `NOTA-${date}-${time}-${rand}`;
};
const genCartKey = () => Math.random().toString(36).substr(2, 12);
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = d?.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};
const todayLabel = () => new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
const initials = (name = "") => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
const fmtIndo = (d = new Date()) => `${String(d.getDate()).padStart(2, "0")} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;

// ─── SESSION STORAGE HELPERS ──────────────────────────────────────────────────
// [FIX 🟢] Persist cart agar tidak hilang saat refresh
const SESSION_KEY = "carpetology_kasir_session";

const saveSession = (data) => {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (_) { }
};

const loadSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
};

const clearSession = () => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) { }
};

// ─── STATUS BAYAR LOGIC ───────────────────────────────────────────────────────
// [FIX 🟡] Workshop QRIS/Transfer → "Menunggu Konfirmasi", bukan langsung Lunas
const resolveStatusBayar = (isHS, dpAmount, payMethod) => {
  if (isHS) return dpAmount > 0 ? "DP" : "Belum Lunas";
  if (payMethod === "Belum Bayar") return "Belum Lunas";
  if (payMethod === "Tunai") return "Lunas";
  // QRIS & Transfer → perlu konfirmasi manual
  return "Menunggu Konfirmasi";
};

const isStatusLunas = (status) => status === "Lunas";

// Badge color berdasarkan status
const statusBadgeClass = (status) => {
  if (status === "Lunas") return "bg-ok";
  if (status === "Menunggu Konfirmasi") return "bg-blue";
  if (status === "DP") return "bg-amber";
  return "bg-warn";
};

const statusIcon = (status) => {
  if (status === "Lunas") return <CheckCircle size={9} />;
  if (status === "Menunggu Konfirmasi") return <Clock size={9} />;
  return <Clock size={9} />;
};

// ─── LABEL HELPER ─────────────────────────────────────────────────────────────
const addItemLabels = (cart) => {
  const count = {};
  cart.forEach(c => { count[c.produkId] = (count[c.produkId] || 0) + 1; });
  const seen = {};
  return cart.map(c => {
    if (count[c.produkId] <= 1) return { ...c, displayName: c.nama };
    seen[c.produkId] = (seen[c.produkId] || 0) + 1;
    return { ...c, displayName: `${c.nama} #${seen[c.produkId]}` };
  });
};

// ─── DATA MAPPERS ─────────────────────────────────────────────────────────────
const mapProduct = (snap) => {
  const d = snap.data();
  const raw = (d.satuan || "").toLowerCase().trim();
  const isMeter = ["m²", "m2", "m", "meter", "meteran"].includes(raw);
  return {
    id: snap.id,
    nama: d.nama_produk || d.nama || "",
    kategori: d.kategori || inferKat(d.nama_produk || d.nama || ""),
    harga: Number(d.harga_jual || d.harga || 0),
    satuan: isMeter ? "meter" : "satuan",
  };
};
const mapCustomer = (snap) => {
  const d = snap.data();
  return { id: snap.id, nama: d.nama || d.nama_customer || "(Tanpa Nama)", hp: d.no_hp || d.hp || "" };
};
const mapOrder = (snap) => {
  const d = snap.data();
  return {
    id: snap.id,
    customerNama: d.nama || "",
    customerHp: d.hp || "-",
    items: (d.items || []).map(it => ({
      ...it,
      qty: Number(it.qty || 1),
      harga: Number(it.harga || 0),
      luas: it.luas != null ? Number(it.luas) : null,
      subtotal: Number(it.subtotal || 0),
    })),
    total: Number(d.total_harga || 0),
    subtotal: Number(d.subtotal_harga || d.total_harga || 0),
    diskon: d.diskon || null,
    dp: d.dp || null,
    metode: d.metode_pembayaran || "",
    statusBayar: d.statusBayar || "Belum Lunas",
    layananType: d.layanan_type || "laundry",
    tanggal: d.tanggal || "",
    timestamp: d.timestamp || d.created_at || null,
    catatan: d.catatan || "",
    notaId: d.notaId || snap.id,
  };
};

function inferKat(nama = "") {
  const n = nama.toLowerCase();
  if (n.includes("sofa")) return "Sofa";
  if (n.includes("springbed") || n.includes("kasur")) return "Springbed";
  if (n.includes("karpet") || n.includes("gorden")) return "Karpet";
  return "Lainnya";
}

// [FIX 🟢] Label "Tempo" (bukan "Belum Bayar") — muat di 4-kolom mobile
const PAY_METHODS = [
  { id: "Tunai", Icon: Banknote, sub: "Langsung", label: "Tunai" },
  { id: "QRIS", Icon: QrCode, sub: "Scan QR", label: "QRIS" },
  { id: "Transfer", Icon: Building2, sub: "Bank", label: "Transfer" },
  { id: "Belum Bayar", Icon: Clock, sub: "Hutang", label: "Tempo" },
];

// ─── SHARED UI ────────────────────────────────────────────────────────────────
function SearchInput({ value, onChange, placeholder = "Cari...", autoFocus = false }) {
  return (
    <div className="s-wrap">
      <span className="s-ico"><Search size={14} strokeWidth={2} /></span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {value && <button className="s-clr" onClick={() => onChange("")}><X size={12} /></button>}
    </div>
  );
}

function HL({ text = "", query = "" }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="hl">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
}

function SummaryBar({ orders }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => {
    const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0);
    return d >= today;
  });
  const omzet = todayOrders.reduce((s, o) => s + o.total, 0);
  const piutang = todayOrders.filter(o => !isStatusLunas(o.statusBayar)).reduce((s, o) => s + o.total, 0);
  const fmtShort = (n) => {
    if (n >= 1000000) return "Rp " + (n / 1000000).toFixed(1) + "jt";
    if (n >= 1000) return "Rp " + (n / 1000).toFixed(0) + "rb";
    return rp(n);
  };
  return (
    <div className="sum-bar">
      <div className="sum-pill">
        <div className="sum-pill-lbl">Transaksi</div>
        <div className="sum-pill-val">{todayOrders.length}</div>
      </div>
      <div className="sum-pill">
        <div className="sum-pill-lbl">Omzet</div>
        <div className="sum-pill-val">{fmtShort(omzet)}</div>
      </div>
      <div className={`sum-pill ${piutang > 0 ? "red" : ""}`}>
        <div className="sum-pill-lbl">Piutang</div>
        <div className="sum-pill-val">{fmtShort(piutang)}</div>
      </div>
    </div>
  );
}

// ─── KONFIRMASI LUNAS MODAL ───────────────────────────────────────────────────
// [FIX 🟡] Ganti window.confirm dengan modal yang proper
function KonfirmasiLunasModal({ order, onConfirm, onClose, loading }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{ width: 50, height: 50, background: C.okBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <CheckCircle size={24} color={C.ok} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.dark, marginBottom: 6 }}>Tandai Lunas?</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>
            <strong style={{ color: C.dark }}>{order.notaId}</strong>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{order.customerNama}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.p700, marginTop: 6 }}>{rp(order.total)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
            Status akan diubah ke <strong>Lunas</strong>. Tindakan ini tidak bisa dibatalkan.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-s" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Batal</button>
          <button className="btn btn-p" style={{ flex: 1, background: C.ok }} onClick={onConfirm} disabled={loading}>
            {loading ? <><Loader2 size={14} className="spin" /> Memproses...</> : <><CheckCircle size={14} /> Tandai Lunas</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KONFIRMASI PEMBAYARAN MODAL ───────────────────────────────────────────────────
function KonfirmasiPembayaranModal({ order, onConfirm, onClose, loading }) {
  const [catatan, setCatatan] = useState("");
  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} · ${fmtIndo(now)}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", padding: "8px 0 14px" }}>
          <div style={{ width: 50, height: 50, background: C.blueBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            {order.metode === "QRIS" ? <QrCode size={22} color={C.blue} /> : <Building2 size={22} color={C.blue} />}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.dark, marginBottom: 6 }}>
            Konfirmasi Pembayaran {order.metode}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>
            <strong style={{ color: C.dark }}>{order.notaId}</strong>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{order.customerNama}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.p700, marginTop: 6 }}>{rp(order.total)}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Clock size={10} /> Dikonfirmasi: {timestamp}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
            Catatan Konfirmasi <span style={{ fontWeight: 400, textTransform: "none" }}>(opsional)</span>
          </div>
          <input
            className="inp"
            placeholder="cth: sudah masuk rek BCA, bukti dikirim WA..."
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ background: C.blueBg, border: `1px solid ${C.blue}`, borderRadius: 8, padding: "8px 11px", fontSize: 11, color: C.blueTx, marginBottom: 14, display: "flex", alignItems: "center", gap: 5 }}>
          <CheckCircle size={12} /> Status akan diubah ke <strong>Lunas</strong>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-s" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Batal</button>
          <button
            className="btn btn-p"
            style={{ flex: 1, background: C.blue }}
            onClick={() => onConfirm(catatan)}
            disabled={loading}
          >
            {loading
              ? <><Loader2 size={14} className="spin" /> Memproses...</>
              : <><CheckCircle size={14} /> Konfirmasi Lunas</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── KALKULATOR P×L ──────────────────────────────────────────────────────────
// [FIX 🔴] onLuasChange ada di dependency array
// [FIX 🟡] initialPanjang/initialLebar dari parent → state tidak reset saat re-render
function KalkulatorPxL({ harga, onLuasChange, autoFocus, initialPanjang = "", initialLebar = "" }) {
  const [panjang, setPanjang] = useState(initialPanjang);
  const [lebar, setLebar] = useState(initialLebar);

  // Hitung nilai saat ini berdasarkan state lokal
  const p = parseFloat(panjang) || 0;
  const l = parseFloat(lebar) || 0;
  const luas = p * l;
  const subtotal = luas * harga;

  // Fungsi untuk update data ke parent secara langsung
  const handleUpdate = (newP, newL) => {
    const valP = parseFloat(newP) || 0;
    const valL = parseFloat(newL) || 0;
    const newLuas = valP * valL;

    // Kirim data ke parent hanya saat user berinteraksi
    onLuasChange(newLuas > 0 ? newLuas : "", newP, newL);
  };

  return (
    <div className="pxl-wrap fade">
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
        Kalkulator Luas (P × L)
      </div>
      <div className="pxl-row">
        <input
          type="number" min="0" step="0.1" placeholder="Panjang"
          value={panjang}
          onChange={e => {
            setPanjang(e.target.value);
            handleUpdate(e.target.value, lebar);
          }}
          className="pxl-inp" autoFocus={autoFocus}
          style={{ borderColor: panjang ? C.primary : undefined }}
        />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>×</span>
        <input
          type="number" min="0" step="0.1" placeholder="Lebar"
          value={lebar}
          onChange={e => {
            setLebar(e.target.value);
            handleUpdate(panjang, e.target.value);
          }}
          className="pxl-inp"
          style={{ borderColor: lebar ? C.primary : undefined }}
        />
        <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, whiteSpace: "nowrap" }}>m²</span>
      </div>

      {luas > 0 && (
        <div className="pxl-result">
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle size={11} color={C.ok} />
            {luas.toFixed(2)} m² × {rp(harga)}/m²
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.p700 }}>{rp(subtotal)}</span>
        </div>
      )}
    </div>
  );
}

// ─── STEP 1 ───────────────────────────────────────────────────────────────────
function Step1({
  products, loadingProducts, customers, loadingCustomers,
  cart, setCart, customer, setCustomer, svcType, setSvcType,
  onAddCustomer, lastCustomer, onNext,
}) {
  const [search, setSearch] = useState("");
  const [kat, setKat] = useState("Semua");
  const [custSearch, setCustSearch] = useState("");
  const [newCust, setNewCust] = useState({ nama: "", hp: "" });
  const [saving, setSaving] = useState(false);
  const [custMode, setCustMode] = useState(false); // false | true


  // [FIX 🟡] cartDims menyimpan {panjang, lebar} per cartKey
  // Ini memastikan state KalkulatorPxL tidak hilang saat cart berubah
  const [cartDims, setCartDims] = useState({});

  const kategori = ["Semua", ...new Set(products.map(p => p.kategori))];
  const filtered = products.filter(p => {
    const mk = kat === "Semua" || p.kategori === kat;
    const ms = p.nama.toLowerCase().includes(search.toLowerCase());
    return mk && ms;
  });

  const addEntry = (prod) => {
    const cartKey = genCartKey();
    setCart(prev => [...prev, {
      cartKey,
      produkId: prod.id,
      nama: prod.nama,
      satuan: prod.satuan,
      harga: prod.harga,
      qty: 1,
      luas: prod.satuan === "meter" ? "" : null,
      subtotal: prod.satuan === "meter" ? 0 : prod.harga,
    }]);
  };

  const removeEntry = (cartKey) => {
    setCart(prev => prev.filter(c => c.cartKey !== cartKey));
    setCartDims(prev => { const n = { ...prev }; delete n[cartKey]; return n; });
  };

  const updateQty = (cartKey, val) => {
    if (val <= 0) { removeEntry(cartKey); return; }
    setCart(prev => prev.map(c => c.cartKey !== cartKey ? c : {
      ...c, qty: val, subtotal: c.harga * val,
    }));
  };

  // [FIX 🔴] onLuasChange dibungkus useCallback agar stable reference
  // sekarang terima panjang/lebar juga untuk disimpan di cartDims
  const updateLuas = useCallback((cartKey) => (luas, panjang, lebar) => {
    setCart(prev => prev.map(c => c.cartKey !== cartKey ? c : {
      ...c, luas, subtotal: c.harga * (parseFloat(luas) || 0),
    }));
    setCartDims(prev => ({ ...prev, [cartKey]: { panjang: panjang ?? "", lebar: lebar ?? "" } }));
  }, []);

  const cartWithLabels = addItemLabels(cart);
  const total = cart.reduce((s, c) => s + c.subtotal, 0);
  const luasOk = cart.every(c => c.satuan !== "meter" || (parseFloat(c.luas) || 0) > 0);
  const canNext = cart.length > 0 && luasOk && !!customer;

  const filteredCusts = customers.filter(c =>
    !custSearch || c.nama.toLowerCase().includes(custSearch.toLowerCase()) || c.hp.includes(custSearch)
  );

  const handleAddCust = async () => {
  if (!newCust.nama.trim() || !newCust.hp.trim()) return;
  setSaving(true);
  try {
    const cust = await onAddCustomer(newCust);
    setCustomer(cust);
    setCustMode(false);
    setCustSearch("");
    setNewCust({ nama: "", hp: "" });
  } finally { setSaving(false); }
};

  const prodIdsInCart = new Set(cart.map(c => c.produkId));

  return (
    <div className="ani" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="sc" style={{ paddingBottom: 0 }}>
        {/* Tipe layanan */}
        <div className="sec">Tipe Layanan</div>
        <div className="svc-toggle">
          {[
            { val: "workshop", cls: "ws", Icon: Package, label: "Workshop", sub: "Antar ke toko" },
            { val: "homeservice", cls: "hs", Icon: Home, label: "Home Service", sub: "Cuci di rumah" },
          ].map(opt => (
            <div key={opt.val} className={`svc-opt ${opt.cls} ${svcType === opt.val ? "active" : ""}`} onClick={() => setSvcType(opt.val)}>
              {svcType === opt.val && (
                <div className="svc-check"><CheckCircle size={10} color="white" strokeWidth={3} /></div>
              )}
              <opt.Icon size={22} color={svcType === opt.val ? (opt.val === "homeservice" ? C.amber : C.primary) : C.muted} />
              <div className="svc-name">{opt.label}</div>
              <div className="svc-sub">{opt.sub}</div>
            </div>
          ))}
        </div>

        {/* Customer */}
        <div className="sec">Customer</div>
        {lastCustomer && !customer && (
          <div className="last-cust" onClick={() => setCustomer(lastCustomer)}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.p600, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {initials(lastCustomer.nama)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="last-lbl"><Star size={9} /> Pelanggan terakhir</div>
              <div className="last-name">{lastCustomer.nama}</div>
              <div className="last-hp">{lastCustomer.hp || "-"}</div>
            </div>
            <ChevronRight size={14} color={C.primary} />
          </div>
        )}

        <div className={`cust-sel ${customer ? "has" : ""}`} onClick={() => { if (!customer) setCustMode(true); }}>
          <div className="cust-av">{customer ? initials(customer.nama) : "?"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: customer ? C.dark : C.muted }}>
              {customer ? customer.nama : "Pilih customer"}
            </div>
            {customer
              ? <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 3 }}><Phone size={10} /> {customer.hp || "-"}</div>
              : <div style={{ fontSize: 11, color: C.muted }}>{loadingCustomers ? "Memuat..." : `${customers.length} tersedia`}</div>
            }
          </div>
          {customer
            ? <button className="btn btn-sm btn-red" style={{ flexShrink: 0 }} onClick={e => { e.stopPropagation(); setCustomer(null); }}>Ganti</button>
            : <ChevronRight size={14} color={C.muted} />}
        </div>

        {custMode && !customer && (
          <div className="modal-overlay" onClick={() => setCustMode(false)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.dark }}>Pilih Customer</div>
                <button onClick={() => setCustMode(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <SearchInput value={custSearch} onChange={setCustSearch} placeholder="Cari nama atau HP..." autoFocus />

              {/* List */}
              <div style={{ maxHeight: 220, overflowY: "auto", margin: "0 -16px", padding: "0 16px" }}>
                {filteredCusts.length === 0
                  ? <div style={{ textAlign: "center", padding: "12px 0", color: C.muted, fontSize: 12 }}>Tidak ditemukan</div>
                  : filteredCusts.map(c => (
                    <div key={c.id}
                      style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                      onClick={() => { setCustomer(c); setCustMode(false); setCustSearch(""); }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.p100, display: "flex", alignItems: "center", justifyContent: "center", color: C.p700, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {initials(c.nama)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}><HL text={c.nama} query={custSearch} /></div>
                        <div style={{ fontSize: 10, color: C.muted }}>{c.hp}</div>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Form tambah baru — compact 1 baris */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
                  Tambah Customer Baru
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="inp" placeholder="Nama" value={newCust.nama}
                    onChange={e => setNewCust({ ...newCust, nama: e.target.value })}
                    style={{ flex: 2 }}
                  />
                  <input className="inp" placeholder="08xx" type="tel" value={newCust.hp}
                    onChange={e => setNewCust({ ...newCust, hp: e.target.value })}
                    style={{ flex: 1.5 }}
                  />
                  <button className="btn btn-p" style={{ flexShrink: 0, padding: "8px 12px" }}
                    onClick={handleAddCust}
                    disabled={saving || !newCust.nama || !newCust.hp}
                  >
                    {saving ? <Loader2 size={12} className="spin" /> : <Plus size={13} />}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Produk */}
        <div style={{
          position: "sticky", top: 0, zIndex: 5,
          background: C.white, paddingTop: 4, paddingBottom: 4,
          marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16,
        }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari produk..." />
          <div className="chips">
            {kategori.map(k => (
              <div key={k} className={`chip ${kat === k ? "active" : ""}`} onClick={() => setKat(k)}>{k}</div>
            ))}
          </div>
        </div>

        <div className="sec" style={{ marginTop: 6 }}>
          Pilih Produk
          <span style={{ fontSize: 9, color: C.ok, display: "flex", alignItems: "center", gap: 3, fontWeight: 700, textTransform: "none", letterSpacing: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.ok }} /> Live
          </span>
        </div>
        {/* Item terpilih */}
        {cart.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {cartWithLabels.map((item) => {
              const luasValid = item.satuan !== "meter" || (parseFloat(item.luas) || 0) > 0;
              const dims = cartDims[item.cartKey] || {};
              return (
                <div key={item.cartKey} className="entry-card fade">
                  <div className="entry-header">
                    <div className="entry-label">
                      <Layers size={10} />
                      {item.displayName}
                      <span className={`badge ${item.satuan === "meter" ? "bg-warn" : "bg-teal"}`} style={{ fontSize: 8, marginLeft: 2 }}>
                        {item.satuan === "meter" ? "Meteran" : "Satuan"}
                      </span>
                    </div>
                    <button
                      style={{ background: C.redBg, border: "none", borderRadius: 5, width: 24, height: 24, cursor: "pointer", color: C.red, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      onClick={() => removeEntry(item.cartKey)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {item.satuan === "meter" ? (
                    // [FIX 🟡] Kirim initialPanjang/initialLebar → state tidak reset
                    <KalkulatorPxL
                      harga={item.harga}
                      onLuasChange={updateLuas(item.cartKey)}
                      autoFocus={false}
                      initialPanjang={dims.panjang ?? ""}
                      initialLebar={dims.lebar ?? ""}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 12, color: C.muted }}>{rp(item.harga)}/pcs</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          onClick={() => updateQty(item.cartKey, item.qty - 1)}
                        ><Minus size={12} /></button>
                        <span style={{ fontWeight: 800, minWidth: 22, textAlign: "center", fontSize: 15 }}>{item.qty}</span>
                        <button
                          style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          onClick={() => updateQty(item.cartKey, item.qty + 1)}
                        ><Plus size={12} /></button>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.p700, marginLeft: 4, minWidth: 70, textAlign: "right" }}>{rp(item.subtotal)}</span>
                      </div>
                    </div>
                  )}

                  {item.satuan === "meter" && !luasValid && (
                    <div style={{ fontSize: 10, color: C.red, marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                      <AlertCircle size={10} /> Isi dimensi karpet
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loadingProducts ? (
          <div className="loading"><Loader2 size={20} className="spin" color={C.primary} /> Memuat produk...</div>
        ) : filtered.length === 0 ? (
          <div className="empty"><div className="empty-icon"><Search size={36} color={C.border} /></div>Produk tidak ditemukan</div>
        ) : (
          <div className="prod-grid">
            {filtered.map(prod => {
              const inCart = prodIdsInCart.has(prod.id);
              return (
                <div key={prod.id} onClick={() => addEntry(prod)}>
                  <div className={`prod-card ${inCart ? "sel" : ""}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span className={`badge ${prod.satuan === "meter" ? "bg-warn" : "bg-teal"}`} style={{ fontSize: 8 }}>
                        {prod.satuan === "meter" ? "Meteran" : "Satuan"}
                      </span>
                      {inCart
                        ? <span style={{ fontSize: 9, fontWeight: 700, color: C.p700, display: "flex", alignItems: "center", gap: 2 }}>
                          <Plus size={9} /> Tambah
                        </span>
                        : <Plus size={13} color={C.muted} />
                      }
                    </div>
                    <div className="prod-card-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.nama}</div>
                    <div className="prod-card-price">{rp(prod.harga)}</div>
                    <div className="prod-card-sub">{prod.satuan === "meter" ? "per m²" : "per pcs"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      <div className="foot">
        {!customer && (
          <div style={{ background: C.warnBg, border: `1px solid ${C.warn}`, borderRadius: 8, padding: "7px 11px", fontSize: 11, color: C.warnTx, display: "flex", alignItems: "center", gap: 5 }}>
            <AlertCircle size={12} /> Pilih customer dulu sebelum lanjut
          </div>
        )}
        {cart.length > 0 && !luasOk && (
          <div style={{ background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 8, padding: "7px 11px", fontSize: 11, color: C.red, display: "flex", alignItems: "center", gap: 5 }}>
            <AlertCircle size={12} /> Lengkapi dimensi karpet dulu
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>
              {cart.length} item{customer ? ` · ${customer.nama}` : ""}
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: C.dark }}>{rp(total)}</div>
          </div>
          <div className={`badge ${svcType === "homeservice" ? "bg-amber" : "bg-teal"}`}>
            {svcType === "homeservice" ? <><Home size={9} /> Home Service</> : <><Package size={9} /> Workshop</>}
          </div>
        </div>
        <button className="btn btn-p btn-full" disabled={!canNext} onClick={onNext}>
          Lanjut ke Pembayaran <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2 ───────────────────────────────────────────────────────────────────
function Step2({ cart, customer, svcType, onBack, onSave, saving }) {
  const [payMethod, setPayMethod] = useState("Tunai");
  const [catatan, setCatatan] = useState("");
  const [showCatatan, setShowCatatan] = useState(false);
  const [showBackWarn, setShowBackWarn] = useState(false);
  const [dpNominal, setDpNominal] = useState("");
  const [diskonType, setDiskonType] = useState("nominal");
  const [diskonVal, setDiskonVal] = useState("");

  const isHS = svcType === "homeservice";
  const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const cartWithLabels = addItemLabels(cart);

  const rawDiskon = parseFloat(diskonVal) || 0;
  const diskonAmt = (() => {
    if (diskonType === "persen") return Math.min((subtotal * rawDiskon) / 100, subtotal);
    return Math.min(rawDiskon, subtotal);
  })();
  const diskonOverflow = diskonType === "nominal" ? rawDiskon > subtotal : rawDiskon > 100;

  const totalHarga = subtotal - diskonAmt;
  const dpAmount = isHS ? Math.min(parseFloat(dpNominal) || 0, totalHarga) : 0;
  const dpMissing = isHS && dpAmount <= 0;
  const canSave = !!payMethod && !dpMissing;

  const handleBack = () => { if (cart.length > 0) setShowBackWarn(true); else onBack(); };
  const handleSave = () => {
    onSave({ payMethod, diskonAmt, diskonType, diskonNilai: rawDiskon, catatan, dpAmount: isHS ? dpAmount : 0 });
  };

  return (
    <div className="ani" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {showBackWarn && (
        <div style={{ padding: "8px 16px 0" }}>
          <div className="back-warn fade">
            <AlertTriangle size={14} />
            <span style={{ flex: 1 }}>Yakin kembali ke step 1?</span>
            <button className="btn btn-sm" style={{ background: C.warn, color: "white", border: "none", padding: "4px 10px", fontSize: 11 }} onClick={() => { setShowBackWarn(false); onBack(); }}>Ya</button>
            <button className="btn btn-sm btn-s" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setShowBackWarn(false)}>Batal</button>
          </div>
        </div>
      )}

      <div className="sc" style={{ paddingBottom: 80 }}>

        {/* Deposit Booking (Home Service) */}
        {isHS && (
          <div className="deposit-badge fade" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.amberTx, display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <Home size={13} /> Deposit Booking
            </div>
            <div style={{ fontSize: 10, color: C.amberTx, marginBottom: 10, opacity: .8 }}>
              Deposit untuk konfirmasi jadwal. Dicatat terpisah, tidak mengurangi tagihan.
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.muted }}>Rp</span>
              <input
                type="number" min="0"
                placeholder="Nominal deposit"
                value={dpNominal}
                onChange={e => setDpNominal(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px 10px 32px",
                  border: `1.5px solid ${dpMissing ? C.red : C.amberBd}`,
                  borderRadius: 8, fontWeight: 700,
                  fontFamily: "inherit", color: C.dark, outline: "none", background: C.white,
                  transition: "border-color .2s",
                }}
              />
            </div>
            {dpMissing && (
              <div style={{ fontSize: 11, color: C.red, marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                <AlertCircle size={11} color={C.red} /> Isi nominal deposit dulu untuk melanjutkan
              </div>
            )}
            {dpAmount > 0 && (
              <div style={{ fontSize: 11, color: C.amberTx, marginTop: 6, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                <CheckCircle size={11} color={C.amber} /> Deposit {rp(dpAmount)} dicatat · sisa {rp(totalHarga - dpAmount)} dibayar saat selesai
              </div>
            )}
          </div>
        )}

        {/* Diskon */}
        <div className="sec">Diskon <span style={{ fontWeight: 400, textTransform: "none", fontSize: 9, letterSpacing: 0 }}>(opsional)</span></div>
        <div style={{ marginBottom: 16 }}>
          <div className={`diskon-wrap ${diskonOverflow ? "err" : ""}`}>
            <input
              type="number" min="0" max={diskonType === "persen" ? 100 : undefined}
              placeholder="0"
              value={diskonVal}
              onChange={e => setDiskonVal(e.target.value)}
              className="diskon-input"
            />
            <div className="diskon-suffix">
              <button className={`diskon-suffix-btn ${diskonType === "nominal" ? "active" : ""}`}
                onClick={() => { setDiskonType("nominal"); setDiskonVal(""); }}>Rp</button>
              <button className={`diskon-suffix-btn ${diskonType === "persen" ? "active" : ""}`}
                onClick={() => { setDiskonType("persen"); setDiskonVal(""); }}>%</button>
            </div>
          </div>
          {diskonOverflow && (
            <div style={{ fontSize: 11, color: C.red, marginTop: 5, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              <AlertCircle size={11} /> {diskonType === "persen" ? "Persentase tidak boleh lebih dari 100%" : "Diskon melebihi total tagihan — otomatis dikurangi ke maksimum"}
            </div>
          )}
          {diskonAmt > 0 && !diskonOverflow && (
            <div style={{ fontSize: 11, color: C.ok, marginTop: 5, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              <CheckCircle size={11} /> Hemat {rp(diskonAmt)}{diskonType === "persen" ? ` (${rawDiskon}%)` : ""}
            </div>
          )}
        </div>

        {/* Metode Pembayaran */}
        <div className="sec">Metode Pembayaran</div>
        <div className="pay-chips">
          {PAY_METHODS.map(m => {
            const Icon = m.Icon;
            return (
              <div key={m.id} className={`pay-chip ${payMethod === m.id ? "sel" : ""}`} onClick={() => setPayMethod(m.id)}>
                <Icon size={20} color={payMethod === m.id ? C.p700 : C.dark2} />
                {/* [FIX 🟢] Pakai m.label yang lebih pendek */}
                <div className="pay-chip-n">{m.label}</div>
                <div style={{ fontSize: 9, color: C.muted }}>{m.sub}</div>
              </div>
            );
          })}
        </div>

        {/* [FIX 🟡] Info status yang akan disimpan untuk QRIS/Transfer */}
        {!isHS && (payMethod === "QRIS" || payMethod === "Transfer") && (
          <div style={{ background: C.blueBg, border: `1px solid ${C.blue}`, borderRadius: 8, padding: "8px 11px", fontSize: 11, color: C.blueTx, display: "flex", alignItems: "center", gap: 5, marginBottom: 14, marginTop: -8 }}>
            <Clock size={12} /> Status akan disimpan sebagai <strong>Menunggu Konfirmasi</strong> — ubah ke Lunas setelah pembayaran dikonfirmasi
          </div>
        )}

        {/* Catatan */}
        {!showCatatan
          ? <button className="btn btn-g btn-sm" style={{ marginBottom: 14 }} onClick={() => setShowCatatan(true)}>
            <Plus size={12} /> Tambah catatan
          </button>
          : <div style={{ marginBottom: 14 }}>
            <input className="inp" placeholder="Catatan order..." value={catatan} onChange={e => setCatatan(e.target.value)} autoFocus />
          </div>
        }

        {/* Rincian */}
        <div className="sum-box">
          <div style={{ padding: "8px 12px", background: C.surface, borderBottom: `.5px solid ${C.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>Rincian</span>
          </div>

          {cartWithLabels.map((item) => (
            <div key={item.cartKey} className="sum-row">
              <div>
                <div style={{ fontWeight: 600, color: C.dark }}>{item.displayName}</div>
                <div style={{ fontSize: 10, color: C.muted }}>
                  {item.satuan === "meter"
                    ? `${(parseFloat(item.luas) || 0).toFixed(2)} m² × ${rp(item.harga)}`
                    : `${item.qty} pcs × ${rp(item.harga)}`}
                </div>
              </div>
              <span style={{ fontWeight: 600 }}>{rp(item.subtotal)}</span>
            </div>
          ))}

          {cart.length > 1 && (
            <div className="sum-row" style={{ background: C.surface }}>
              <span style={{ color: C.muted }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{rp(subtotal)}</span>
            </div>
          )}

          {diskonAmt > 0 && (
            <div className="sum-row" style={{ color: C.okTx }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Tag size={11} /> Diskon</span>
              <span style={{ fontWeight: 700 }}>− {rp(diskonAmt)}</span>
            </div>
          )}

          <div className="sum-total">
            <span style={{ fontSize: 13, fontWeight: 800, color: C.p700 }}>Total Tagihan</span>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, color: C.p700 }}>
              {rp(totalHarga)}
            </span>
          </div>

          {isHS && dpAmount > 0 && (
            <div style={{ padding: "8px 12px", background: C.amberBg, borderTop: `.5px solid ${C.amberBd}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.amberTx, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                <Banknote size={11} /> Deposit dibayar
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.amberTx }}>{rp(dpAmount)}</span>
            </div>
          )}

          {isHS && dpAmount > 0 && (
            <div style={{ padding: "8px 12px", background: C.warnBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.warnTx, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                <Clock size={11} /> Sisa bayar saat selesai
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.warnTx }}>{rp(totalHarga - dpAmount)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="foot">
        {dpMissing && (
          <div style={{ background: C.warnBg, border: `1px solid ${C.warn}`, borderRadius: 8, padding: "7px 11px", fontSize: 11, color: C.warnTx, display: "flex", alignItems: "center", gap: 5 }}>
            <AlertCircle size={12} /> Isi nominal deposit booking dulu
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-s" style={{ width: 52 }} onClick={handleBack}><ArrowLeft size={14} /></button>
          <button className="btn btn-p" style={{ flex: 1 }} disabled={!canSave || saving} onClick={handleSave}>
            {saving
              ? <><Loader2 size={14} className="spin" /> Menyimpan...</>
              : <><CheckCircle size={14} /> Simpan · {rp(totalHarga)}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SUCCESS PAGE ─────────────────────────────────────────────────────────────
function StepSukses({ order, onReset, onViewNota }) {
  const [copied, setCopied] = useState(false);
  const notaUrl = `${window.location.origin}/nota/${order.notaId}`;
  const isHS = order.layananType === "homeservice";

  const copyLink = () => {
    navigator.clipboard?.writeText(notaUrl).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const subtotal = order.items.reduce((s, it) => s + it.subtotal, 0);
  const diskonAmt = order.diskon?.amount || 0;
  const totalTagihan = subtotal - diskonAmt;
  const dpAmt = order.dpAmount || 0;
  const sisaBayar = totalTagihan - dpAmt;
  const itemsLabeled = addItemLabels(order.items);

  const buildWA = () => {
    const itemLines = itemsLabeled.map(it =>
      it.satuan === "meter"
        ? `  - ${it.displayName} ${Number(it.luas).toFixed(2)} m² = ${rp(it.subtotal)}`
        : `  - ${it.qty}× ${it.displayName} = ${rp(it.subtotal)}`
    ).join("\n");
    const diskonLine = diskonAmt > 0 ? `Diskon: −${rp(diskonAmt)}\n` : "";
    const depositLine = isHS && dpAmt > 0 ? `Deposit: ${rp(dpAmt)} ✓\nSisa bayar: ${rp(sisaBayar)}\n` : "";
    const statusLine = order.statusBayar === "Menunggu Konfirmasi"
      ? `Status: Menunggu Konfirmasi Pembayaran\n`
      : "";
    return `Halo ${order.customerNama}, terima kasih sudah mempercayakan ke *Carpetology*!\n\n` +
      `${itemLines}\n${diskonLine}Total Tagihan: *${rp(totalTagihan)}*\n${depositLine}${statusLine}Metode: ${order.metode}\n\nNota: ${notaUrl}`;
  };

  const handleWA = () => {
    const hp = (order.customerHp || "").replace(/\D/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${hp}?text=${encodeURIComponent(buildWA())}`, "_blank");
  };

  return (
    <div className="ani sc">
      <div style={{ textAlign: "center", padding: "24px 0 18px" }}>
        <div style={{ width: 60, height: 60, background: C.okBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <CheckCircle size={28} color={C.ok} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 4 }}>Transaksi Berhasil</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
          <strong style={{ color: C.dark }}>{order.customerNama}</strong> · {order.tanggal}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
          <span className={`badge ${isHS ? "bg-amber" : "bg-teal"}`} style={{ padding: "4px 10px", fontSize: 11 }}>
            {isHS ? <><Home size={10} /> Home Service</> : <><Package size={10} /> Workshop</>}
          </span>
          {/* [FIX 🟡] Badge status baru */}
          <span className={`badge ${statusBadgeClass(order.statusBayar)}`} style={{ padding: "4px 10px", fontSize: 11 }}>
            {statusIcon(order.statusBayar)} {order.statusBayar}
          </span>
        </div>
      </div>

      <div className="nota-card" style={{ marginBottom: 14 }}>
        <div className="nota-hdr">
          <div className="nota-brand"><Layers size={16} /> Carpetology</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{order.notaId}</div>
        </div>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingBottom: 10, borderBottom: `.5px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{order.customerNama}</div>
            <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 3 }}><Phone size={10} /> {order.customerHp}</div>
          </div>

          {itemsLabeled.map((it, i) => (
            <div key={it.cartKey || i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{it.displayName}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{it.satuan === "meter" ? `${Number(it.luas).toFixed(2)} m²` : `${it.qty} pcs`}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{rp(it.subtotal)}</span>
            </div>
          ))}

          <div style={{ borderTop: `.5px solid ${C.border}`, marginTop: 8, paddingTop: 8 }}>
            {diskonAmt > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.okTx, marginBottom: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Tag size={10} /> Diskon</span>
                <span style={{ fontWeight: 700 }}>−{rp(diskonAmt)}</span>
              </div>
            )}
          </div>

          <div style={{ background: C.p100, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.p700 }}>Total Tagihan</span>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 800, color: C.p700 }}>{rp(totalTagihan)}</span>
          </div>

          {isHS && dpAmt > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.amberTx, marginTop: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Banknote size={10} /> Deposit dibayar</span>
                <span style={{ fontWeight: 700 }}>{rp(dpAmt)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.warnTx, marginTop: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} /> Sisa dibayar saat selesai</span>
                <span style={{ fontWeight: 700 }}>{rp(sisaBayar)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <button className="btn btn-green btn-full" style={{ marginBottom: 8, fontSize: 13 }} onClick={handleWA}>
        <MessageCircle size={16} /> Kirim via WhatsApp
      </button>

      <div style={{ background: C.p50, border: `1.5px dashed ${C.primary}`, borderRadius: 9, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: C.p700, fontWeight: 600, wordBreak: "break-all", flex: 1 }}>{notaUrl}</span>
        <button className="btn btn-g btn-sm" onClick={copyLink} style={{ flexShrink: 0 }}>
          {copied ? <><CheckCircle size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-g" style={{ flex: 1 }} onClick={() => onViewNota(order.notaId)}>
          <Eye size={14} /> Lihat Nota
        </button>
        <button className="btn btn-p" style={{ flex: 1 }} onClick={onReset}>
          <Plus size={14} /> Transaksi Baru
        </button>
      </div>
      {copied && <div className="toast"><CheckCircle size={13} /> Link disalin!</div>}
    </div>
  );
}

// ─── HISTORY CARD ─────────────────────────────────────────────────────────────
function HistCard({ order, onViewNota, search, onTandaiLunas, onKonfirmasiPembayaran, onEdit, onDelete, isAdmin, lunasLoading }) {
  const isHS = order.layananType === "homeservice";
  const isLunas = isStatusLunas(order.statusBayar);
  const items = order.items || [];
  const MAX_ITEM_SHOW = 2;
  const isThisLoading = lunasLoading === order.notaId;
  const itemsLabeled = addItemLabels(items);

  return (
    <div className="hist-card" onClick={() => onViewNota(order.notaId || order.id)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <HL text={order.customerNama || ""} query={search} />
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
            {order.notaId} · {fmtDate(order.timestamp || order.tanggal)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0, marginLeft: 8 }}>
          {isHS && <span className="badge bg-amber"><Home size={9} /> HS</span>}
          <span className={`badge ${statusBadgeClass(order.statusBayar)}`}>
            {statusIcon(order.statusBayar)} {isLunas ? "Lunas" : order.statusBayar === "Menunggu Konfirmasi" ? "Konfirmasi" : "Belum"}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {itemsLabeled.slice(0, MAX_ITEM_SHOW).map((it, i) => (
          <span key={it.cartKey || i}>{i > 0 && ", "}{it.qty || 1}× {it.displayName}</span>
        ))}
        {items.length > MAX_ITEM_SHOW && (
          <span style={{ color: C.primary, fontWeight: 700 }}> +{items.length - MAX_ITEM_SHOW} lainnya</span>
        )}
        {order.catatan && (
          <div style={{ fontSize: 10, color: C.warnTx, marginTop: 3, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {order.catatan}
          </div>
        )}
      </div>

      <div className="hist-bot">
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <span className="badge bg-gray">{order.metode}</span>
          {order.diskon?.amount > 0 && <span className="badge bg-warn">−{rp(order.diskon.amount)}</span>}
          {!isLunas && order.statusBayar === "Menunggu Konfirmasi" && (
            <button
              className="lunas-btn"
              style={{ background: C.blueBg, color: C.blueTx, borderColor: C.blue }}
              disabled={isThisLoading}
              onClick={e => {
                e.stopPropagation();
                onKonfirmasiPembayaran(order);
              }}
            >
              {isThisLoading
                ? <><Loader2 size={9} className="spin" /> Memproses...</>
                : <><CheckCircle size={9} /> Konfirmasi Bayar</>
              }
            </button>
          )}
          {!isLunas && order.statusBayar !== "Menunggu Konfirmasi" && (
            <button
              className="lunas-btn"
              disabled={isThisLoading}
              onClick={e => {
                e.stopPropagation();
                onTandaiLunas(order);
              }}
            >
              {isThisLoading
                ? <><Loader2 size={9} className="spin" /> Memproses...</>
                : <><CheckCircle size={9} /> Tandai Lunas</>
              }
            </button>
          )}
          {isAdmin && (
            <>
              <button className="edit-btn" onClick={e => { e.stopPropagation(); onEdit(order); }}>
                <Edit3 size={9} /> Edit
              </button>
              <button className="del-btn" onClick={e => { e.stopPropagation(); onDelete(order); }}>
                <Trash2 size={9} /> Hapus
              </button>
            </>
          )}
        </div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.dark, flexShrink: 0 }}>{rp(order.total)}</div>
      </div>
    </div>
  );
}

// ─── EDIT NOTA MODAL ──────────────────────────────────────────────────────────
function EditNotaModal({ order, onClose, onSave }) {
  const [nama, setNama] = useState(order.customerNama || "");
  const [hp, setHp] = useState(order.customerHp || "");
  const [metode, setMetode] = useState(order.metode || "");
  const [statusBayar, setStatusBayar] = useState(order.statusBayar || "Belum Lunas");
  const [catatan, setCatatan] = useState(order.catatan || "");
  const [diskonVal, setDiskonVal] = useState(String(order.diskon?.amount || ""));
  const [saving, setSaving] = useState(false);

  // [FIX 🟡] Status options kini termasuk "Menunggu Konfirmasi"
  const STATUS_OPTIONS = ["Lunas", "Menunggu Konfirmasi", "DP", "Belum Lunas"];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(order, { nama, hp, metode, statusBayar, catatan, diskonAmt: parseFloat(diskonVal) || 0 });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.dark }}>Edit Nota</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Nota ID</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 12, background: C.surface, padding: "6px 10px", borderRadius: 7 }}>{order.notaId}</div>

        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Nama Customer</div>
        <input className="inp" value={nama} onChange={e => setNama(e.target.value)} style={{ marginBottom: 10 }} />

        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>No. HP</div>
        <input className="inp" type="tel" value={hp} onChange={e => setHp(e.target.value)} style={{ marginBottom: 10 }} />

        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Diskon (Rp)</div>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.muted }}>Rp</span>
          <input className="inp" type="number" min="0" value={diskonVal} onChange={e => setDiskonVal(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Metode Pembayaran</div>
        <div className="pay-chips" style={{ marginBottom: 10 }}>
          {PAY_METHODS.map(m => {
            const Icon = m.Icon;
            return (
              <div key={m.id} className={`pay-chip ${metode === m.id ? "sel" : ""}`} onClick={() => setMetode(m.id)}>
                <Icon size={16} color={metode === m.id ? C.p700 : C.dark2} />
                <div className="pay-chip-n" style={{ fontSize: 10 }}>{m.label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Status Bayar</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {STATUS_OPTIONS.map(s => {
            const cls = statusBadgeClass(s);
            const isActive = statusBayar === s;
            return (
              <div key={s} onClick={() => setStatusBayar(s)}
                style={{
                  flex: "1 1 calc(50% - 6px)", padding: "8px 6px", border: `1.5px solid ${isActive ? C.primary : C.border}`,
                  borderRadius: 8, textAlign: "center", cursor: "pointer", fontSize: 11, fontWeight: 700,
                  background: isActive ? C.p100 : C.white, color: isActive ? C.p700 : C.muted,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                }}>
                {statusIcon(s)} {s}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Catatan</div>
        <input className="inp" placeholder="Catatan (opsional)" value={catatan} onChange={e => setCatatan(e.target.value)} style={{ marginBottom: 14 }} />

        <button className="btn btn-p btn-full" onClick={handleSave} disabled={saving || !nama}>
          {saving ? <><Loader2 size={14} className="spin" /> Menyimpan...</> : <><Save size={14} /> Simpan Perubahan</>}
        </button>
      </div>
    </div>
  );
}

function ChartTransaksi({ orders, viewMode, exportBulan }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  // Generate data points berdasarkan viewMode
  const data = (() => {
    if (viewMode === "minggu") {
      // 7 hari terakhir
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          label: d.toLocaleDateString("id-ID", { weekday: "short" }),
          date: d.toISOString().split("T")[0],
          value: 0,
        };
      });
      orders.forEach(o => {
        const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const found = days.find(x => x.date === key);
        if (found) found.value += o.total;
      });
      return days;
    }

    if (viewMode === "bulan") {
      // Per hari dalam bulan yang dipilih
      const [year, month] = exportBulan.split("-").map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => ({
        label: String(i + 1),
        value: 0,
      }));
      orders.forEach(o => {
        const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0);
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          days[d.getDate() - 1].value += o.total;
        }
      });
      return days;
    }

    // Semua: per bulan (12 bulan terakhir)
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return {
        label: BULAN[d.getMonth()],
        month: d.getMonth(),
        year: d.getFullYear(),
        value: 0,
      };
    });
    orders.forEach(o => {
      const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0);
      const found = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (found) found.value += o.total;
    });
    return months;
  })();

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const W = 340, H = 110, padL = 8, padR = 8, padT = 10, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.max(4, (chartW / data.length) - 3);

  const fmtShort = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "jt";
    if (n >= 1000) return (n / 1000).toFixed(0) + "rb";
    return String(n);
  };

  const hasData = data.some(d => d.value > 0);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 10px 8px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>
          Grafik Omzet
        </div>
        {hoverIdx !== null && data[hoverIdx] && (
          <div style={{ fontSize: 11, fontWeight: 700, color: C.p700, fontFamily: "'Space Grotesk',sans-serif" }}>
            {data[hoverIdx].label} · {rp(data[hoverIdx].value)}
          </div>
        )}
      </div>

      {!hasData ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 12 }}>
          Belum ada data
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: "block", overflow: "visible" }}
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((r, i) => (
            <line
              key={i}
              x1={padL} y1={padT + chartH * (1 - r)}
              x2={W - padR} y2={padT + chartH * (1 - r)}
              stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"
            />
          ))}

          {/* Max label */}
          <text x={padL} y={padT - 3} fontSize="8" fill={C.muted}>{fmtShort(maxVal)}</text>

          {/* Bars */}
          {data.map((d, i) => {
            const barH = Math.max(2, (d.value / maxVal) * chartH);
            const x = padL + (i / data.length) * chartW + (chartW / data.length - barW) / 2;
            const y = padT + chartH - barH;
            const isHover = hoverIdx === i;
            const showLabel = data.length <= 12 || i % Math.ceil(data.length / 12) === 0;

            return (
              <g key={i}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onTouchStart={() => setHoverIdx(i)}
                onTouchEnd={() => setTimeout(() => setHoverIdx(null), 1200)}
                style={{ cursor: "pointer" }}
              >
                {/* Hover area */}
                <rect
                  x={padL + (i / data.length) * chartW}
                  y={padT}
                  width={chartW / data.length}
                  height={chartH}
                  fill="transparent"
                />
                {/* Bar */}
                <rect
                  x={x} y={y}
                  width={barW} height={barH}
                  rx="3"
                  fill={isHover ? C.p600 : d.value > 0 ? C.primary : C.border}
                  opacity={isHover ? 1 : 0.85}
                />
                {/* Value label saat hover */}
                {isHover && d.value > 0 && (
                  <text
                    x={x + barW / 2} y={y - 4}
                    fontSize="8" fill={C.p700}
                    textAnchor="middle" fontWeight="700"
                  >
                    {fmtShort(d.value)}
                  </text>
                )}
                {/* X label */}
                {showLabel && (
                  <text
                    x={x + barW / 2}
                    y={H - 4}
                    fontSize="8" fill={isHover ? C.p700 : C.muted}
                    textAnchor="middle" fontWeight={isHover ? "700" : "400"}
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ─── RIWAYAT PAGE ─────────────────────────────────────────────────────────────
function RiwayatPage({ orders, loadingOrders, onViewNota, isAdmin, hasMore, onLoadMore }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [filterLayanan, setFilterLayanan] = useState("Semua");
  const [toast, setToast] = useState("");
  const [editOrder, setEditOrder] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewMode, setViewMode] = useState("minggu");
  const [showExport, setShowExport] = useState(false);
  const [exportMode, setExportMode] = useState("bulan");
  const [exportBulan, setExportBulan] = useState(() => new Date().toISOString().slice(0, 7));
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [lunasLoading, setLunasLoading] = useState(null);
  // [FIX 🟡] konfirmasiLunas state untuk modal — ganti window.confirm
  const [konfirmasiLunas, setKonfirmasiLunas] = useState(null);
  const [konfirmasiPembayaran, setKonfirmasiPembayaran] = useState(null);


  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const handleExport = () => {
    let data = orders;
    if (exportMode === "bulan") {
      data = orders.filter(o => {
        const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0);
        return d.toISOString().slice(0, 7) === exportBulan;
      });
    } else {
      const from = exportFrom ? new Date(exportFrom) : null;
      const to = exportTo ? new Date(exportTo + "T23:59:59") : null;
      data = orders.filter(o => {
        const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    const rows = data.map(o => ({
      "Nota ID": o.notaId,
      "Tanggal": fmtDate(o.timestamp || o.tanggal),
      "Customer": o.customerNama,
      "No HP": o.customerHp,
      "Layanan": o.layananType === "homeservice" ? "Home Service" : "Workshop",
      "Item": (o.items || []).map(it => `${it.qty || 1}× ${it.nama}`).join(", "),
      "Subtotal": o.subtotal || o.total,
      "Diskon": o.diskon?.amount || 0,
      "Deposit": o.dp?.nominal || 0,
      "Total Tagihan": o.total,
      "Sisa Bayar": o.total - (o.dp?.nominal || 0),
      "Metode": o.metode,
      "Status": o.statusBayar,
      "Catatan": o.catatan || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 35 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
    const label = exportMode === "bulan" ? exportBulan : `${exportFrom}_${exportTo}`;
    XLSX.writeFile(wb, `Carpetology_${label}.xlsx`);
    setShowExport(false);
  };

  // [FIX 🟡] handleTandaiLunas sekarang dipanggil dari modal konfirmasi
  const doTandaiLunas = async (order) => {
    setLunasLoading(order.notaId);
    try {
      const q = query(collection(db, "transactions"), where("notaId", "==", order.notaId));
      const snap = await getDocs(q);
      for (const d of snap.docs) await updateDoc(doc(db, "transactions", d.id), { statusBayar: "Lunas" });
      showToast("Status diupdate ke Lunas ✓");
    } catch (e) {
      console.error(e);
      showToast("Gagal update status");
    } finally {
      setLunasLoading(null);
      setKonfirmasiLunas(null);
    }
  };

  const doKonfirmasiPembayaran = async (order, catatan) => {
    setLunasLoading(order.notaId);
    try {
      const q = query(collection(db, "transactions"), where("notaId", "==", order.notaId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, "transactions", d.id), {
          statusBayar: "Lunas",
          konfirmasi: {
            timestamp: serverTimestamp(),
            catatan: catatan || "",
            confirmedBy: "kasir",
          },
        });
      }
      showToast("Pembayaran dikonfirmasi ✓");
    } catch (e) {
      console.error(e);
      showToast("Gagal konfirmasi pembayaran");
    } finally {
      setLunasLoading(null);
      setKonfirmasiPembayaran(null);
    }
  };

  const handleEditSave = async (order, changes) => {
    try {
      const q = query(collection(db, "transactions"), where("notaId", "==", order.notaId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const subtotal = order.subtotal || order.total;
        const diskonAmt = changes.diskonAmt || 0;
        const newTotal = subtotal - diskonAmt;
        await updateDoc(doc(db, "transactions", d.id), {
          nama: changes.nama, hp: changes.hp,
          metode_pembayaran: changes.metode, statusBayar: changes.statusBayar,
          catatan: changes.catatan,
          diskon: { type: "nominal", nilai: diskonAmt, amount: diskonAmt },
          total_harga: newTotal,
        });
      }
      showToast("Nota berhasil diupdate");
    } catch (e) { console.error(e); showToast("Gagal update nota"); }
  };

  const handleDelete = async (order) => {
    try {
      const q = query(collection(db, "transactions"), where("notaId", "==", order.notaId));
      const snap = await getDocs(q);
      for (const d of snap.docs) await deleteDoc(doc(db, "transactions", d.id));
      setDeleteConfirm(null);
      showToast("Nota berhasil dihapus");
    } catch (e) { console.error(e); showToast("Gagal hapus nota"); }
  };

  const STATUS_OPTS = ["Semua", "Lunas", "Menunggu Konfirmasi", "DP", "Belum Lunas"];
  const LAYANAN_OPTS = ["Semua", "Workshop", "Home Service"];

  const filtered = orders.filter(o => {
    const ms = !search
      || (o.customerNama || "").toLowerCase().includes(search.toLowerCase())
      || (o.customerHp || "").includes(search)
      || (o.notaId || "").toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus === "Semua" || o.statusBayar === filterStatus;
    const mlay = filterLayanan === "Semua"
      || (filterLayanan === "Home Service" && o.layananType === "homeservice")
      || (filterLayanan === "Workshop" && o.layananType !== "homeservice");
    let mDate = true;
    if (viewMode === "minggu") {
      const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0);
      mDate = d >= weekAgo;
    } else if (viewMode === "bulan") {
      const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0);
      mDate = d.getFullYear() === Number(exportBulan.split("-")[0]) &&
        d.getMonth() + 1 === Number(exportBulan.split("-")[1]);
    }
    return ms && mst && mlay && mDate;
  });

  const omzetFiltered = filtered.reduce((s, o) => s + o.total, 0);
  const piutangFiltered = filtered.filter(o => !isStatusLunas(o.statusBayar)).reduce((s, o) => s + o.total, 0);

  return (
    <div className="ani sc">
      {toast && <div className="toast"><CheckCircle size={13} /> {toast}</div>}

      {editOrder && <EditNotaModal order={editOrder} onClose={() => setEditOrder(null)} onSave={handleEditSave} />}

      {/* [FIX 🟡] Modal konfirmasi lunas — ganti window.confirm */}
      {konfirmasiLunas && (
        <KonfirmasiLunasModal
          order={konfirmasiLunas}
          loading={lunasLoading === konfirmasiLunas.notaId}
          onConfirm={() => doTandaiLunas(konfirmasiLunas)}
          onClose={() => !lunasLoading && setKonfirmasiLunas(null)}
        />
      )}

      {konfirmasiPembayaran && (
        <KonfirmasiPembayaranModal
          order={konfirmasiPembayaran}
          loading={lunasLoading === konfirmasiPembayaran.notaId}
          onConfirm={(catatan) => doKonfirmasiPembayaran(konfirmasiPembayaran, catatan)}
          onClose={() => !lunasLoading && setKonfirmasiPembayaran(null)}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ width: 50, height: 50, background: C.redBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Trash2 size={22} color={C.red} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.dark, marginBottom: 6 }}>Hapus Nota?</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                <strong>{deleteConfirm.notaId}</strong> · {deleteConfirm.customerNama}
              </div>
              <div style={{ fontSize: 11, color: C.red }}>Tindakan ini tidak dapat dibatalkan</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>Batal</button>
              <button className="btn btn-red" style={{ flex: 1 }} onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.dark, display: "flex", alignItems: "center", gap: 6 }}>
                <Download size={15} color={C.primary} /> Export Excel
              </div>
              <button onClick={() => setShowExport(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[["bulan", "Per Bulan"], ["range", "Rentang Tanggal"]].map(([v, l]) => (
                <div key={v} onClick={() => setExportMode(v)}
                  style={{ flex: 1, padding: "8px", border: `1.5px solid ${exportMode === v ? C.primary : C.border}`, borderRadius: 8, textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: 700, background: exportMode === v ? C.p100 : C.white, color: exportMode === v ? C.p700 : C.muted }}>
                  {l}
                </div>
              ))}
            </div>
            {exportMode === "bulan" ? (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Pilih Bulan</div>
                <input type="month" value={exportBulan} onChange={e => setExportBulan(e.target.value)} className="inp" style={{ marginBottom: 16 }} />
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Dari Tanggal</div>
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className="inp" style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Sampai Tanggal</div>
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className="inp" style={{ marginBottom: 16 }} />
              </>
            )}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: C.muted, display: "flex", justifyContent: "space-between" }}>
              <span>Estimasi data</span>
              <span style={{ fontWeight: 700, color: C.dark }}>
                {(() => {
                  if (exportMode === "bulan") return orders.filter(o => { const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0); return d.toISOString().slice(0, 7) === exportBulan; }).length;
                  const from = exportFrom ? new Date(exportFrom) : null;
                  const to = exportTo ? new Date(exportTo + "T23:59:59") : null;
                  return orders.filter(o => { const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.tanggal || 0); if (from && d < from) return false; if (to && d > to) return false; return true; }).length;
                })()} transaksi
              </span>
            </div>
            <button className="btn btn-p btn-full" onClick={handleExport} disabled={exportMode === "range" && (!exportFrom || !exportTo)}>
              <Download size={14} /> Download Excel
            </button>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, flex: 1 }}>
          {[
            { lbl: "Transaksi", val: filtered.length, color: C.dark, isNum: true },
            { lbl: "Omzet", val: omzetFiltered, color: C.p700 },
            { lbl: "Piutang", val: piutangFiltered, color: piutangFiltered > 0 ? C.red : C.muted },
          ].map(s => (
            <div key={s.lbl} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{s.lbl}</div>
              <div style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: s.isNum ? 18 : 12,
                fontWeight: 800,
                color: s.color,
                wordBreak: "break-word",
                lineHeight: 1.2,
              }}>
                {s.isNum ? s.val : rp(s.val)}
              </div>
            </div>
          ))}
        </div>
        {isAdmin && (
          <button className="btn btn-g btn-sm" style={{ flexShrink: 0, padding: "8px 10px", height: "fit-content" }} onClick={() => setShowExport(true)}>
            <Download size={13} />
          </button>
        )}
      </div>

      <ChartTransaksi
        orders={orders}
        viewMode={viewMode}
        exportBulan={exportBulan}
      />

      {/* View mode */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[["minggu", "Mingguan"], ["bulan", "Bulanan"], ["semua", "Semua"]].map(([v, lbl]) => (<div key={v} onClick={() => setViewMode(v)}
          style={{ flex: 1, padding: "7px", border: `1.5px solid ${viewMode === v ? C.primary : C.border}`, borderRadius: 8, textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: 700, background: viewMode === v ? C.p100 : C.white, color: viewMode === v ? C.p700 : C.muted }}>
          {lbl}
        </div>
        ))}
      </div>

      {viewMode === "bulan" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <input type="month" value={exportBulan} onChange={e => setExportBulan(e.target.value)}
            style={{ flex: 1, padding: "8px 11px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontFamily: "inherit", color: C.dark, outline: "none" }} />
          <button className="btn btn-g btn-sm" onClick={() => setExportBulan(new Date().toISOString().slice(0, 7))}>Bulan ini</button>
        </div>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder="Cari nama, HP, atau nota ID..." />

      {/* Filter status */}
      <div className="chips">
        {STATUS_OPTS.map(s => (
          <div key={s}
            className={`chip ${s === "Belum Lunas" ? "red" : ""} ${filterStatus === s ? "active" : ""}`}
            onClick={() => setFilterStatus(s)}>
            {s}
          </div>
        ))}
      </div>

      {/* Filter layanan */}
      <div className="chips" style={{ marginTop: -4 }}>
        {LAYANAN_OPTS.map(s => (
          <div key={s} className={`chip ${s === "Home Service" ? "amber" : ""} ${filterLayanan === s ? "active" : ""}`}
            onClick={() => setFilterLayanan(s)}>
            {s === "Home Service" ? <><Home size={9} /> Home Service</> : s === "Workshop" ? <><Package size={9} /> Workshop</> : s}
          </div>
        ))}
      </div>

      <div className="sec">{filtered.length} transaksi</div>

      {loadingOrders ? (
        <div className="loading"><Loader2 size={22} className="spin" color={C.primary} /> Memuat riwayat...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><ClipboardList size={38} color={C.border} /></div>
          Tidak ada transaksi
        </div>
      ) : filtered.map(o => (
        <HistCard
          key={o.id} order={o} onViewNota={onViewNota} search={search}
          onTandaiLunas={(order) => setKonfirmasiLunas(order)}
          lunasLoading={lunasLoading}
          onEdit={(ord) => setEditOrder(ord)}
          onDelete={(ord) => setDeleteConfirm(ord)}
          isAdmin={isAdmin}
          onKonfirmasiPembayaran={(order) => setKonfirmasiPembayaran(order)}
        />
      ))}
      {hasMore && (
        <button
          className="btn btn-g btn-sm btn-full"
          style={{ marginTop: 8, marginBottom: 16 }}
          onClick={onLoadMore}
        >
          <Plus size={12} /> Muat 200 transaksi berikutnya
        </button>
      )}
    </div>
  );
}

// ─── NOTA PAGE ────────────────────────────────────────────────────────────────
function NotaPage({ notaId, onBack }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "Admin";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = null;
    const load = async () => {
      const { onSnapshot: snap, collection: col, query: q, where: w } = await import("firebase/firestore");
      const qr = q(col(db, "transactions"), w("notaId", "==", notaId));
      unsub = snap(qr, s => { setOrder(s.empty ? null : mapOrder(s.docs[0])); setLoading(false); });
    };
    load();
    return () => unsub?.();
  }, [notaId]);

  if (loading) return <div className="loading" style={{ minHeight: 300 }}><Loader2 size={22} className="spin" color={C.primary} /> Memuat nota...</div>;
  if (!order) return (
    <div className="empty" style={{ marginTop: 60 }}>
      <div className="empty-icon"><AlertCircle size={40} color={C.red} /></div>
      Nota tidak ditemukan
      {isAdmin && <button className="btn btn-g btn-sm" style={{ marginTop: 14 }} onClick={onBack}><ArrowLeft size={12} /> Kembali</button>}
    </div>
  );

  const isHS = order.layananType === "homeservice";
  const isLunas = isStatusLunas(order.statusBayar);
  const subtotal = order.items.reduce((s, it) => s + it.subtotal, 0);
  const diskonAmt = order.diskon?.amount || 0;
  const totalTagihan = subtotal - diskonAmt;
  const depositAmt = order.dp?.nominal || 0;
  const sisaBayar = totalTagihan - depositAmt;
  const itemsLabeled = addItemLabels(order.items);

  return (
    <div className="ani pad">
      <div style={{ background: C.dark, borderRadius: 12, padding: "16px", textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Layers size={16} /> Carpetology
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{order.notaId}</div>
      </div>

      <div style={{
        background: isLunas ? C.okBg : order.statusBayar === "Menunggu Konfirmasi" ? C.blueBg : C.warnBg,
        border: `1px solid ${isLunas ? C.ok : order.statusBayar === "Menunggu Konfirmasi" ? C.blue : C.warn}`,
        borderRadius: 9, padding: "9px 13px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isLunas ? C.okTx : order.statusBayar === "Menunggu Konfirmasi" ? C.blueTx : C.warnTx, display: "flex", alignItems: "center", gap: 4 }}>
          {statusIcon(order.statusBayar)} {order.statusBayar}
        </span>
        <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(order.tanggal || order.timestamp)}</span>
      </div>

      <div style={{ background: C.surface, borderRadius: 10, padding: "11px 13px", border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>{order.customerNama}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
          <Phone size={11} /> {order.customerHp}
        </div>
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ background: C.primary, padding: "7px 13px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: ".5px" }}>Detail Item</span>
        </div>

        {itemsLabeled.map((it, i) => (
          <div key={it.cartKey || i} style={{ padding: "9px 13px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.displayName}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                {it.satuan === "meter" ? `${(it.luas || 0).toFixed(2)} m² × ${rp(it.harga)}/m²` : `${it.qty} pcs × ${rp(it.harga)}`}
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{rp(it.subtotal)}</span>
          </div>
        ))}

        {diskonAmt > 0 && (
          <div style={{ padding: "7px 13px", display: "flex", justifyContent: "space-between", fontSize: 12, color: C.okTx, borderBottom: `.5px solid ${C.border}`, background: C.surface }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Tag size={11} /> Diskon</span>
            <span style={{ fontWeight: 700 }}>−{rp(diskonAmt)}</span>
          </div>
        )}

        <div style={{ padding: "11px 13px", background: C.p100, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.p700 }}>Total Tagihan</span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 800, color: C.p700 }}>{rp(totalTagihan)}</span>
        </div>

        {isHS && depositAmt > 0 && (
          <div style={{ padding: "8px 13px", background: C.amberBg, borderTop: `.5px solid ${C.amberBd}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.amberTx, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              <Banknote size={11} /> Deposit dibayar ({order.metode})
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.amberTx }}>{rp(depositAmt)}</span>
          </div>
        )}

        {isHS && depositAmt > 0 && !isLunas && (
          <div style={{ padding: "8px 13px", background: C.warnBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.warnTx, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={11} /> Sisa dibayar saat selesai
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.warnTx }}>{rp(sisaBayar)}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <span className={`badge ${statusBadgeClass(order.statusBayar)}`} style={{ padding: "4px 9px" }}>{order.statusBayar}</span>
        <span className="badge bg-gray" style={{ padding: "4px 9px" }}>{order.metode}</span>
        {isHS && <span className="badge bg-amber" style={{ padding: "4px 9px" }}><Home size={9} /> Home Service</span>}
      </div>

      <div style={{ display: "flex", gap: 8 }} className="no-print">
        {isAdmin && onBack && <button className="btn btn-s" style={{ flex: 1 }} onClick={onBack}><ArrowLeft size={13} /> Kembali</button>}
        <button className="btn btn-p" style={{ flex: 1 }} onClick={() => window.print()}><Printer size={14} /> Cetak</button>
      </div>

      <div style={{ textAlign: "center", marginTop: 20, paddingTop: 14, borderTop: `1px dashed ${C.border}` }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <Layers size={12} /> Carpetology
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Terima kasih atas kepercayaan Anda</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "Admin";


  // [FIX 🟢] Load session dari sessionStorage saat mount
  const savedSession = loadSession();

  const [tab, setTab] = useState("kasir");
  const [step, setStep] = useState(savedSession?.step ?? 0);
  const [cart, setCart] = useState(savedSession?.cart ?? []);
  const [customer, setCustomer] = useState(savedSession?.customer ?? null);
  const [svcType, setSvcType] = useState(savedSession?.svcType ?? "workshop");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notaView, setNotaView] = useState(null);
  const [lastCustomer, setLastCustomer] = useState(null);
  const [orderLimit, setOrderLimit] = useState(200);
  const [hasMore, setHasMore] = useState(false);

  // Banner: tampilkan notifikasi kalau ada session yang dipulihkan
  const [sessionRestored] = useState(() => !!(savedSession?.cart?.length));

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // [FIX 🟢] Simpan ke sessionStorage setiap kali cart/customer/svcType/step berubah
  useEffect(() => {
    // Jangan simpan kalau sudah di step sukses (step 2)
    if (step < 2) {
      saveSession({ cart, customer, svcType, step });
    }
  }, [cart, customer, svcType, step]);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "products"), orderBy("nama_produk")),
      snap => {
        setProducts(snap.docs.map(mapProduct));
        setLoadingProducts(false);
      },
      e => { console.error(e); setLoadingProducts(false); }
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "customers"), orderBy("nama")),
      snap => { setCustomers(snap.docs.map(mapCustomer)); setLoadingCustomers(false); },
      e => { console.error(e); setLoadingCustomers(false); }
    );
    return unsub;
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (cart.length > 0 && step < 2) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [cart, step]);

  useEffect(() => {
    if (cart.length > 0 && step === 1) {
      window.history.pushState({ kasir: true }, "");
      const handlePopState = () => {
        setStep(0);
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [cart.length, step]);

  // [FIX 🔴] Gunakan useRef untuk lastCustomer agar tidak jadi dependency
  const lastCustomerSet = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "transactions"), orderBy("created_at", "desc"), limit(orderLimit)),
      snap => {
        const mapped = snap.docs.map(mapOrder);
        setOrders(mapped);
        setHasMore(snap.size === orderLimit);
        if (mapped.length > 0 && !lastCustomerSet.current) {
          const last = mapped[0];
          setLastCustomer({ id: last.customerId || "", nama: last.customerNama, hp: last.customerHp });
          lastCustomerSet.current = true;
        }
        setLoadingOrders(false);
      },
      e => { console.error(e); setLoadingOrders(false); }
    );
    return unsub;
  }, [orderLimit]);

  const handleAddCustomer = async ({ nama, hp }) => {
    const ref = await addDoc(collection(db, "customers"), { nama, no_hp: hp, created_at: serverTimestamp() });
    return { id: ref.id, nama, hp };
  };

  const handleSave = async ({ payMethod, diskonAmt, catatan, dpAmount }) => {
    setSaving(true);
    try {
      const subtotalVal = cart.reduce((s, c) => s + c.subtotal, 0);
      const totalHarga = subtotalVal - diskonAmt;
      const notaId = genId();
      const isHS = svcType === "homeservice";

      // [FIX 🟡] Status pakai helper baru — QRIS/Transfer → Menunggu Konfirmasi
      const statusBayar = resolveStatusBayar(isHS, dpAmount, payMethod);
      const tanggal = fmtIndo();

      const itemsPayload = cart.map(c => ({
        cartKey: c.cartKey,
        produkId: c.produkId,
        nama: c.nama,
        satuan: c.satuan,
        qty: c.qty,
        harga: c.harga,
        luas: c.satuan === "meter" ? (parseFloat(c.luas) || 0) : null,
        panjang: null,
        lebar: null,
        subtotal: c.subtotal,
      }));

      const dpPayload = isHS && dpAmount > 0
        ? { nominal: dpAmount, sisa: totalHarga - dpAmount }
        : null;

      const ref = await addDoc(collection(db, "transactions"), {
        customer_id: customer.id,
        nama: customer.nama,
        hp: customer.hp,
        items: itemsPayload,
        subtotal_harga: subtotalVal,
        diskon: { type: "nominal", nilai: diskonAmt, amount: diskonAmt },
        metode_pembayaran: payMethod,
        status_order: isHS ? "Home Service" : "Waiting List",
        statusBayar,
        layanan_type: svcType,
        dp: dpPayload,
        total_harga: totalHarga,
        created_at: serverTimestamp(),
        tanggal,
        catatan: catatan || "",
        notaId,
      });

      setCurrentOrder({
        id: ref.id,
        customerNama: customer.nama,
        customerHp: customer.hp,
        items: itemsPayload,
        diskon: { type: "nominal", nilai: diskonAmt, amount: diskonAmt },
        total: totalHarga,
        subtotal: subtotalVal,
        metode: payMethod,
        statusBayar,
        layananType: svcType,
        dp: dpPayload,
        dpAmount,
        tanggal,
        notaId,
      });

      setLastCustomer({ id: customer.id, nama: customer.nama, hp: customer.hp });
      // [FIX 🟢] Hapus session saat transaksi berhasil
      clearSession();
      setStep(2);
    } catch (e) {
      console.error(e);
      alert("Gagal simpan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    clearSession(); // [FIX 🟢] Bersihkan session
    setStep(0); setCart([]); setCustomer(null); setSvcType("workshop");
    setCurrentOrder(null); setNotaView(null); setTab("kasir");
  };

  return (
    <div className="kr">
      <div className="topbar">
        <div className="tb-icon"><Layers size={17} strokeWidth={2} /></div>
        <div style={{ flex: 1 }}>
          <div className="tb-brand">Carpetology</div>
          <div className="tb-sub">Sistem Kasir</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: C.primary, fontWeight: 600 }}>{todayLabel()}</div>
      </div>

      {/* [FIX 🟢] Banner kalau cart dipulihkan dari session */}
      {sessionRestored && step > 0 && step < 2 && (
        <div className="session-banner">
          <AlertCircle size={13} />
          Transaksi sebelumnya dipulihkan · {cart.length} item
          <button
            onClick={handleReset}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.amberTx, fontWeight: 700, fontSize: 11, padding: "2px 6px" }}
          >
            Mulai baru
          </button>
        </div>
      )}

      {notaView ? (
        <NotaPage notaId={notaView} onBack={() => setNotaView(null)} />
      ) : (
        <>
          <div className="nav">
            <div className={`ntab ${tab === "kasir" ? "active" : ""}`} onClick={() => setTab("kasir")}>
              <ShoppingCart size={12} /> Kasir
            </div>
            <div className={`ntab ${tab === "riwayat" ? "active" : ""}`} onClick={() => setTab("riwayat")}>
              <ClipboardList size={12} /> Riwayat
            </div>
          </div>

          {tab === "kasir" && (
            <>
              {step < 2 && (
                <div className="steps">
                  <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div className="swrap">
                      <div className={`sdot ${step > 0 ? "done" : "active"}`}>
                        {step > 0 ? <CheckCircle size={12} /> : "1"}
                      </div>
                      <div className="slbl">Produk & Customer</div>
                    </div>
                    <div className={`sline ${step > 0 ? "done" : ""}`} style={{ flex: 1, margin: "0 6px" }} />
                  </div>
                  <div className="swrap">
                    <div className={`sdot ${step === 1 ? "active" : "pend"}`}>2</div>
                    <div className="slbl">Bayar</div>
                  </div>
                </div>
              )}

              {step === 0 && (
                <Step1
                  products={products} loadingProducts={loadingProducts}
                  customers={customers} loadingCustomers={loadingCustomers}
                  cart={cart} setCart={setCart}
                  customer={customer} setCustomer={setCustomer}
                  svcType={svcType} setSvcType={setSvcType}
                  onAddCustomer={handleAddCustomer}
                  lastCustomer={lastCustomer}
                  onNext={() => setStep(1)}
                />
              )}

              {step === 1 && (
                <Step2
                  cart={cart} customer={customer} svcType={svcType}
                  onBack={() => setStep(0)} onSave={handleSave} saving={saving}
                />
              )}

              {step === 2 && currentOrder && (
                <StepSukses order={currentOrder} onReset={handleReset} onViewNota={setNotaView} />
              )}
            </>
          )}

          {tab === "riwayat" && (
            <RiwayatPage
              orders={orders}
              loadingOrders={loadingOrders}
              onViewNota={setNotaView}
              isAdmin={isAdmin}
              hasMore={hasMore}
              onLoadMore={() => setOrderLimit(prev => prev + 200)}
            />
          )}
        </>
      )}

      {isAdmin && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, borderTop: `1px solid ${C.border}`, backgroundColor: C.white, zIndex: 100 }}>
          <Navbar />
        </div>
      )}
    </div>
  );
}