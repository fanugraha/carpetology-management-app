import { useState, useEffect, useRef, } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase"; // Sesuaikan path import firebase kamu
import Navbar from '../../componets/Navbar';  // sesuaikan path-nya
import { useAuth } from '../../context/AuthContext';

// ─── BRAND COLORS ─────────────────────────────────────────────────────────────
const C = {
  primary: "#04CDCD",
  primary600: "#03A8A8",
  primary700: "#028585",
  primary100: "#E0FAFA",
  primary200: "#B3F0F0",
  primary50: "#F0FEFE",
  accent: "#FF6B6B",
  accentLight: "#FFE8E8",
  dark: "#1A2E35",
  darkMid: "#2C4A54",
  muted: "#6B8894",
  border: "#D4ECEC",
  surface: "#F4FEFE",
  white: "#FFFFFF",
  success: "#22C55E",
  successBg: "#DCFCE7",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  danger: "#EF4444",
  dangerBg: "#FEE2E2",
};

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, #root { font-family: 'Plus Jakarta Sans', sans-serif; background: ${C.surface}; color: ${C.dark}; min-height: 100vh; }
  
.kasir-root { display: flex; flex-direction: column; min-height: 100vh; max-width: 480px; margin: 0 auto; background: ${C.white}; box-shadow: 0 0 40px rgba(4,205,205,0.08); padding-bottom: 60px; }
  
  /* Topbar */
  .topbar { background: ${C.dark}; padding: 14px 20px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 50; }
  .topbar-brand { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; color: ${C.primary}; letter-spacing: -0.3px; }
  .topbar-sub { font-size: 12px; color: ${C.muted}; margin-top: 1px; }
  .topbar-icon { width: 36px; height: 36px; background: ${C.primary}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  
  /* Step indicator */
  .steps-bar { display: flex; align-items: center; padding: 16px 20px; background: ${C.white}; border-bottom: 1px solid ${C.border}; gap: 0; }
  .step-item { display: flex; align-items: center; flex: 1; }
  .step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; transition: all .25s; }
  .step-dot.done { background: ${C.primary}; color: white; }
  .step-dot.active { background: ${C.primary}; color: white; box-shadow: 0 0 0 4px ${C.primary200}; }
  .step-dot.pending { background: ${C.border}; color: ${C.muted}; }
  .step-line { flex: 1; height: 2px; background: ${C.border}; margin: 0 4px; transition: background .25s; }
  .step-line.done { background: ${C.primary}; }
  .step-label { font-size: 9px; font-weight: 600; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; text-align: center; }
  .step-wrapper { display: flex; flex-direction: column; align-items: center; }
  
  /* Content */
  .step-content { flex: 1; padding: 20px; overflow-y: auto; }
  
  /* Inputs */
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 12px; font-weight: 600; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .field input, .field select, .field textarea { width: 100%; padding: 11px 14px; border: 1.5px solid ${C.border}; border-radius: 10px; font-size: 14px; font-family: inherit; color: ${C.dark}; background: ${C.white}; outline: none; transition: border-color .2s, box-shadow .2s; }
  .field input:focus, .field select:focus { border-color: ${C.primary}; box-shadow: 0 0 0 3px ${C.primary100}; }
  .field input::placeholder { color: #BCD8D8; }
  
  /* Search */
  .search-wrap { position: relative; margin-bottom: 16px; }
  .search-wrap input { padding-left: 40px; background: ${C.surface}; }
  .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: ${C.muted}; font-size: 16px; }
  .search-clear { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: ${C.muted}; cursor: pointer; font-size: 18px; padding: 2px; border-radius: 50%; }
  .search-clear:hover { background: ${C.border}; }
  
  /* Buttons */
  .btn { padding: 13px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: all .18s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .btn-primary { background: ${C.primary}; color: white; }
  .btn-primary:hover { background: ${C.primary600}; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(4,205,205,0.3); }
  .btn-primary:active { transform: translateY(0); }
  .btn-secondary { background: ${C.surface}; color: ${C.dark}; border: 1.5px solid ${C.border}; }
  .btn-secondary:hover { background: ${C.primary100}; border-color: ${C.primary}; }
  .btn-danger { background: ${C.dangerBg}; color: ${C.danger}; }
  .btn-danger:hover { background: ${C.danger}; color: white; }
  .btn-ghost { background: none; color: ${C.primary}; border: 1.5px solid ${C.primary}; }
  .btn-ghost:hover { background: ${C.primary100}; }
  .btn-full { width: 100%; }
  .btn-sm { padding: 7px 12px; font-size: 12px; border-radius: 8px; }
  .btn-icon { width: 32px; height: 32px; padding: 0; border-radius: 8px; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  
  /* Footer sticky */
  .footer-bar { padding: 16px 20px; background: ${C.white}; border-top: 1px solid ${C.border}; display: flex; flex-direction: column; gap: 10px; }
  .footer-summary { display: flex; justify-content: space-between; align-items: center; }
  .footer-total { font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; color: ${C.dark}; }
  .footer-label { font-size: 12px; color: ${C.muted}; }
  
  /* Product card */
  .prod-card { border: 1.5px solid ${C.border}; border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: all .15s; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: ${C.white}; }
  .prod-card:hover { border-color: ${C.primary}; background: ${C.primary50}; }
  .prod-card.selected { border-color: ${C.primary}; background: ${C.primary50}; }
  .prod-name { font-size: 14px; font-weight: 600; color: ${C.dark}; }
  .prod-type { font-size: 11px; color: ${C.muted}; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
  .prod-price { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 600; color: ${C.primary700}; }
  .prod-unit { font-size: 10px; color: ${C.muted}; }
  
  /* Badge */
  .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
  .badge-primary { background: ${C.primary100}; color: ${C.primary700}; }
  .badge-meter { background: #FEF3C7; color: #B45309; }
  .badge-unit { background: ${C.primary50}; color: ${C.primary700}; border: 1px solid ${C.primary200}; }
  .badge-success { background: ${C.successBg}; color: #15803D; }
  .badge-warning { background: ${C.warningBg}; color: #D97706; }
  .badge-danger { background: ${C.dangerBg}; color: ${C.danger}; }
  .badge-gray { background: #F1F5F9; color: #64748B; }
  
  /* Cart item */
  .cart-item { border: 1px solid ${C.border}; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; background: ${C.white}; }
  .cart-item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .cart-item-name { font-size: 13px; font-weight: 600; color: ${C.dark}; }
  .cart-item-sub { font-size: 11px; color: ${C.muted}; margin-top: 2px; }
  .cart-item-controls { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .qty-btn { width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid ${C.border}; background: ${C.white}; cursor: pointer; font-size: 16px; font-weight: 700; color: ${C.dark}; display: flex; align-items: center; justify-content: center; transition: all .15s; }
  .qty-btn:hover { background: ${C.primary}; color: white; border-color: ${C.primary}; }
  .qty-display { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; min-width: 24px; text-align: center; }
  
  /* Meter input */
  .meter-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  .meter-result { background: ${C.primary100}; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .meter-result-label { font-size: 11px; color: ${C.primary700}; font-weight: 600; }
  .meter-result-value { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; color: ${C.primary700}; }
  
  /* Customer card */
  .cust-card { border: 1.5px solid ${C.border}; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all .15s; margin-bottom: 8px; }
  .cust-card:hover { border-color: ${C.primary}; background: ${C.primary50}; }
  .cust-card.selected { border-color: ${C.primary}; background: ${C.primary50}; box-shadow: 0 0 0 3px ${C.primary100}; }
  .cust-name { font-size: 14px; font-weight: 700; color: ${C.dark}; }
  .cust-phone { font-size: 12px; color: ${C.muted}; margin-top: 2px; }
  
  /* Payment methods */
  .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  .pay-option { border: 2px solid ${C.border}; border-radius: 12px; padding: 14px; cursor: pointer; transition: all .15s; text-align: center; background: ${C.white}; }
  .pay-option:hover { border-color: ${C.primary200}; background: ${C.primary50}; }
  .pay-option.selected { border-color: ${C.primary}; background: ${C.primary100}; }
  .pay-option-icon { font-size: 24px; margin-bottom: 6px; }
  .pay-option-name { font-size: 13px; font-weight: 700; color: ${C.dark}; }
  .pay-option-sub { font-size: 10px; color: ${C.muted}; margin-top: 2px; }
  
  /* Receipt / Nota */
  .nota-card { border: 1px solid ${C.border}; border-radius: 16px; overflow: hidden; }
  .nota-header { background: ${C.dark}; padding: 24px 20px; text-align: center; }
  .nota-brand { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; color: ${C.primary}; }
  .nota-tagline { font-size: 11px; color: ${C.muted}; margin-top: 2px; }
  .nota-body { padding: 20px; }
  .nota-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .nota-key { font-size: 12px; color: ${C.muted}; }
  .nota-val { font-size: 13px; font-weight: 600; color: ${C.dark}; text-align: right; max-width: 55%; }
  .nota-divider { height: 1px; background: ${C.border}; margin: 14px 0; }
  .nota-total-row { display: flex; justify-content: space-between; align-items: center; background: ${C.primary100}; border-radius: 10px; padding: 12px 14px; margin-top: 12px; }
  .nota-total-label { font-size: 13px; font-weight: 700; color: ${C.primary700}; }
  .nota-total-val { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 800; color: ${C.primary700}; }
  .nota-item-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .nota-item-name { font-size: 12px; color: ${C.dark}; }
  .nota-item-price { font-size: 12px; font-weight: 600; color: ${C.dark}; }
  
  /* History */
  .history-card { border: 1px solid ${C.border}; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; background: ${C.white}; transition: all .15s; cursor: pointer; }
  .history-card:hover { border-color: ${C.primary}; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(4,205,205,0.1); }
  .history-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .history-cust { font-size: 14px; font-weight: 700; color: ${C.dark}; }
  .history-date { font-size: 11px; color: ${C.muted}; }
  .history-items { font-size: 12px; color: ${C.muted}; margin-top: 4px; }
  .history-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px solid ${C.border}; padding-top: 10px; }
  .history-total { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: ${C.dark}; }
  
  /* Nav tabs */
  .nav-tabs { display: flex; background: ${C.dark}; }
  .nav-tab { flex: 1; padding: 12px; text-align: center; font-size: 11px; font-weight: 700; color: ${C.muted}; cursor: pointer; transition: all .15s; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid transparent; }
  .nav-tab.active { color: ${C.primary}; border-bottom-color: ${C.primary}; }
  .nav-tab:hover:not(.active) { color: ${C.primary200}; }
  
  /* Success screen */
  .success-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px; min-height: 300px; }
  .success-icon { width: 80px; height: 80px; background: ${C.successBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin-bottom: 20px; }
  .success-title { font-size: 22px; font-weight: 800; color: ${C.dark}; margin-bottom: 8px; }
  .success-sub { font-size: 14px; color: ${C.muted}; margin-bottom: 24px; line-height: 1.6; }
  
  /* Nota link box */
  .nota-link-box { background: ${C.primary50}; border: 1.5px dashed ${C.primary}; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .nota-link-text { font-size: 12px; color: ${C.primary700}; font-weight: 600; word-break: break-all; flex: 1; }
  
  /* Section header */
  .section-header { font-size: 11px; font-weight: 700; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .section-header::after { content: ''; flex: 1; height: 1px; background: ${C.border}; }
  
  /* Empty state */
  .empty-state { text-align: center; padding: 40px 20px; color: ${C.muted}; }
  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty-text { font-size: 13px; }
  
  /* Tab chip */
  .tab-chips { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .tab-chip { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1.5px solid ${C.border}; background: ${C.white}; color: ${C.muted}; transition: all .15s; }
  .tab-chip.active { background: ${C.primary}; color: white; border-color: ${C.primary}; }
  .tab-chip:hover:not(.active) { border-color: ${C.primary}; color: ${C.primary}; }
  
  /* Divider */
  .or-divider { display: flex; align-items: center; gap: 10px; margin: 16px 0; color: ${C.muted}; font-size: 12px; }
  .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: ${C.border}; }
  
  /* Quantity input inline */
  .qty-inline { display: flex; align-items: center; gap: 8px; }
  .qty-inline input { width: 60px; text-align: center; padding: 8px; font-weight: 700; }
  
  /* Nota print page */
  @media print { .no-print { display: none !important; } }
  
  /* Animations */
  @keyframes slideUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  .animate-in { animation: slideUp .28s ease-out; }
  .fade-in { animation: fadeIn .2s ease-out; }
  
  /* Scroll */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
  
  /* Nota standalone */
  .nota-standalone { max-width: 400px; margin: 0 auto; padding: 20px; }
  
  /* Mini stat */
  .mini-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .mini-stat { background: ${C.surface}; border-radius: 10px; padding: 12px 14px; border: 1px solid ${C.border}; }
  .mini-stat-label { font-size: 11px; color: ${C.muted}; margin-bottom: 4px; }
  .mini-stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; color: ${C.dark}; }
  
  /* Copy toast */
  .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: ${C.dark}; color: white; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 999; animation: slideUp .2s ease-out; }

  /* Loading spinner */
  .spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid ${C.primary200}; border-top-color: ${C.primary}; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 12px; color: ${C.muted}; font-size: 13px; }
`;

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAY_METHODS = [
  { id: "tunai", label: "Tunai", icon: "💵", sub: "Bayar langsung" },
  { id: "qris", label: "QRIS", icon: "📲", sub: "Scan QR code" },
  { id: "transfer", label: "Transfer", icon: "🏦", sub: "Bank transfer" },
  { id: "belum", label: "Belum Payment", icon: "⏳", sub: "Hutang / cicil" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const rupiah = (n) => "Rp " + (n || 0).toLocaleString("id-ID");
const genId = () => Math.random().toString(36).substr(2, 8).toUpperCase();
const fmtDate = (d) => {
  if (!d) return "-";
  // Handle Firestore Timestamp, JS Date, or ISO string
  const dt = d?.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};
const todayLabel = () =>
  new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

// Map Firestore product doc → internal product shape
const mapProduct = (docSnap) => {
  const d = docSnap.data();
  // Normalize berbagai kemungkinan nilai satuan dari Firestore:
  // "m²", "m2", "m", "meter", "meteran" → "meter"
  // "unit", "pcs", "satuan", atau lainnya → "satuan"
  const rawSatuan = (d.satuan || "").toLowerCase().trim();
  const isMeter = ["m²", "m2", "m", "meter", "meteran"].includes(rawSatuan);
  const satuan = isMeter ? "meter" : "satuan";
  return {
    id: docSnap.id,
    nama: d.nama_produk || d.nama || "",
    kategori: d.kategori || inferKategori(d.nama_produk || d.nama || ""),
    harga: Number(d.harga_jual || d.harga || 0),
    satuan,
    unit_label: satuan === "meter" ? "/m²" : "/pcs",
    created_at: d.created_at || null,
  };
};

// Map Firestore customer doc → internal shape
const mapCustomer = (docSnap) => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    // Coba semua kemungkinan field nama dari Firestore
    nama: d.nama || d.nama_customer || d.name || d.fullname || "(Tanpa Nama)",
    hp: d.no_hp || d.hp || d.phone || d.telepon || "",
  };
};

// Map Firestore order doc → internal shape
const mapOrder = (docSnap) => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    customerId: d.customer_id || "",
    customerNama: d.nama || d.customerNama || "",
    customerHp: d.hp || d.customerHp || "-",
    items: (d.items || []).map((it) => ({
      produkId: it.produkId || "",
      nama: it.nama || "",
      satuan: it.satuan || "satuan",
      qty: Number(it.qty || 1),
      panjang: it.panjang != null ? Number(it.panjang) : null,
      lebar: it.lebar != null ? Number(it.lebar) : null,
      luas: it.luas != null ? Number(it.luas) : null,
      harga: Number(it.harga || 0),
      subtotal: Number(it.subtotal || 0),
    })),
    total: Number(d.total_harga || d.total || 0),
    subtotal: Number(d.subtotal_harga || d.total_harga || d.total || 0), // ← tambah
    diskon: d.diskon || null,                                             // ← tambah
    metode: d.metode_pembayaran || d.metode || "",
    statusBayar: d.statusBayar || "Belum Lunas",
    status: d.status || "Waiting List",
    tanggal: d.tanggal || "",
    timestamp: d.timestamp || d.created_at || null,
    catatan: d.catatan || "",
    notaId: d.notaId || docSnap.id,
  };
};

// Simple heuristic kategori if field missing in Firestore
function inferKategori(nama = "") {
  const n = nama.toLowerCase();
  if (n.includes("sofa")) return "Sofa";
  if (n.includes("springbed") || n.includes("kasur")) return "Springbed";
  if (n.includes("karpet") || n.includes("gorden") || n.includes("tirai")) return "Karpet";
  return "Lainnya";
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
const STEPS = ["Produk", "Customer", "Bayar", "Nota"];
function StepBar({ current }) {
  return (
    <div className="steps-bar">
      {STEPS.map((s, i) => (
        <div key={i} className="step-item">
          <div className="step-wrapper">
            <div className={`step-dot ${i < current ? "done" : i === current ? "active" : "pending"}`}>
              {i < current ? "✓" : i + 1}
            </div>
            <div className="step-label">{s}</div>
          </div>
          {i < STEPS.length - 1 && <div className={`step-line ${i < current ? "done" : ""}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── STEP 1: PRODUK ───────────────────────────────────────────────────────────
function StepProduk({ products, loadingProducts, cart, onCartChange, onNext }) {
  const [search, setSearch] = useState("");
  const [activeKat, setActiveKat] = useState("Semua");

  const kategori = ["Semua", ...new Set(products.map((p) => p.kategori))];
  const filtered = products.filter((p) => {
    const matchKat = activeKat === "Semua" || p.kategori === activeKat;
    const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase());
    return matchKat && matchSearch;
  });

  const addToCart = (prod) => {
    const existing = cart.find((c) => c.produkId === prod.id);
    if (existing) {
      onCartChange(
        cart.map((c) =>
          c.produkId === prod.id
            ? {
              ...c,
              qty: c.qty + 1,
              subtotal: c.satuan === "meter"
                ? c.harga * (c.qty + 1) * (parseFloat(c.luas) || 0)
                : c.harga * (c.qty + 1),
            }
            : c
        )
      );
    } else {
      onCartChange([...cart, {
        produkId: prod.id,
        nama: prod.nama,
        satuan: prod.satuan,
        harga: prod.harga,
        qty: 1,
        panjang: null,
        lebar: null,
        luas: prod.satuan === "meter" ? "" : null,
        subtotal: 0,
      }]);
    }
  };

  const updateQty = (produkId, val) => {
    if (val <= 0) {
      onCartChange(cart.filter((c) => c.produkId !== produkId));
    } else {
      onCartChange(cart.map((c) => {
        if (c.produkId !== produkId) return c;
        return { ...c, qty: val, subtotal: c.harga * val };
      }));
    }
  };

  const updateLuas = (produkId, val) => {
    const luas = val === "" ? "" : Math.max(0, parseFloat(val) || 0);
    onCartChange(cart.map((c) => {
      if (c.produkId !== produkId) return c;
      return {
        ...c,
        luas,
        panjang: null,
        lebar: null,
        subtotal: c.harga * c.qty * (parseFloat(luas) || 0),
      };
    }));
  };

  const total = cart.reduce((s, c) => s + c.subtotal, 0);
  // Tidak valid jika ada produk meter yang belum diisi P atau L
  const cartValid = cart.length > 0;


  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="step-content" style={{ flex: 1, paddingBottom: 0 }}>
        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
          />
          {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
        </div>

        {/* Kategori chips */}
        <div className="tab-chips">
          {kategori.map((k) => (
            <div key={k} className={`tab-chip ${activeKat === k ? "active" : ""}`} onClick={() => setActiveKat(k)}>
              {k}
            </div>
          ))}
        </div>

        {/* Product list */}
        <div className="section-header">Pilih Produk</div>

        {loadingProducts ? (
          <div className="loading-screen">
            <div className="spinner" />
            Memuat produk dari database...
          </div>
        ) : (
          <>
            {filtered.map((prod) => {
              const inCart = cart.find((c) => c.produkId === prod.id);
              return (
                <div key={prod.id}>
                  <div
                    className={`prod-card ${inCart ? "selected" : ""}`}
                    onClick={() => addToCart(prod)}
                  >
                    <div>
                      <div className="prod-name">{prod.nama}</div>
                      <div className="prod-type">
                        <span className={`badge ${prod.satuan === "meter" ? "badge-meter" : "badge-unit"}`}>
                          {prod.satuan === "meter" ? "📐 Meteran" : "📦 Satuan"}
                        </span>
                        {prod.kategori}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="prod-price">{rupiah(prod.harga)}</div>
                      <div className="prod-unit">{prod.unit_label}</div>
                      {inCart && <div className="badge badge-success" style={{ marginTop: 4 }}>✓ Dipilih</div>}
                    </div>
                  </div>

                  {inCart && (
                    <div className="cart-item fade-in" style={{ marginTop: -4, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: "none" }}>
                      <div className="cart-item-header">
                        <div>
                          <div className="cart-item-name">{inCart.nama}</div>
                          <div className="cart-item-sub">{rupiah(inCart.harga)}{prod.unit_label}</div>
                        </div>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => { e.stopPropagation(); onCartChange(cart.filter((c) => c.produkId !== prod.id)); }}
                        >
                          Hapus
                        </button>
                      </div>

                      {inCart.satuan === "meter" && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                            <button
                              className="qty-btn"
                              style={{ width: 36, height: 36, fontSize: 18, flexShrink: 0 }}
                              onClick={(e) => { e.stopPropagation(); updateLuas(prod.id, Math.max(0, (parseFloat(inCart.luas) || 0) - 1)); }}
                            >−</button>
                            <input
                              type="number"
                              value={inCart.luas === "" || inCart.luas == null ? "" : inCart.luas}
                              min="0"
                              step="0.1"
                              placeholder="Luas m²"
                              style={{ flex: 1, textAlign: "center", fontWeight: 700, padding: "9px 8px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                              onChange={(e) => { e.stopPropagation(); updateLuas(prod.id, e.target.value === "" ? "" : parseFloat(e.target.value) || 0); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              className="qty-btn"
                              style={{ width: 36, height: 36, fontSize: 18, flexShrink: 0 }}
                              onClick={(e) => { e.stopPropagation(); updateLuas(prod.id, (parseFloat(inCart.luas) || 0) + 1); }}
                            >+</button>
                            <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>m²</span>
                          </div>
                          {(parseFloat(inCart.luas) || 0) > 0 && (
                            <div className="meter-result" style={{ marginTop: 8 }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span className="meter-result-label">
                                  📐 {(parseFloat(inCart.luas) || 0).toFixed(2)} m² × {rupiah(inCart.harga)}/m²
                                </span>
                              </div>
                              <span className="meter-result-value">{rupiah(inCart.subtotal)}</span>
                            </div>
                          )}
                        </>
                      )}

                      {inCart.satuan === "satuan" && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div className="cart-item-controls" onClick={(e) => e.stopPropagation()}>
                            <button className="qty-btn" onClick={() => updateQty(prod.id, inCart.qty - 1)}>−</button>
                            <span className="qty-display">{inCart.qty}</span>
                            <button className="qty-btn" onClick={() => updateQty(prod.id, inCart.qty + 1)}>+</button>
                            <span style={{ fontSize: 11, color: C.muted }}>pcs</span>
                          </div>
                          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: C.primary700 }}>
                            {rupiah(inCart.subtotal)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && !loadingProducts && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-text">Produk tidak ditemukan</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="footer-bar">
        {cart.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="footer-summary">
              <div>
                <div className="footer-label">{cart.length} item dipilih</div>
                <div className="footer-total">{rupiah(total)}</div>
              </div>
              <div className="badge badge-primary">{cart.reduce((s, c) => s + c.qty, 0)} pcs/lot</div>
            </div>
            {/* Warning jika ada meter yang belum diisi */}
            {cart.some((c) => c.satuan === "meter" && ((c.panjang || 0) === 0 || (c.lebar || 0) === 0)) && (
              <div style={{ background: C.primary50, border: `1px solid ${C.primary200}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.primary700, display: "flex", alignItems: "center", gap: 6 }}>
                💡 Ukuran karpet diisi 0 — bisa diupdate setelah pengukuran
              </div>
            )}
          </div>
        )}
        <button className="btn btn-primary btn-full" disabled={!cartValid} onClick={onNext}>
          Lanjut ke Customer →
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2: CUSTOMER ─────────────────────────────────────────────────────────
function CustomerPickerModal({ customers = [], loadingCustomers, selectedCust, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const filtered = customers
    .filter((c) => c.nama && c.nama !== "(Tanpa Nama)" || c.hp)
    .filter((c) =>
      !search ||
      c.nama.toLowerCase().includes(search.toLowerCase()) ||
      c.hp.includes(search)
    );

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(26,46,53,0.55)", display: "flex",
        flexDirection: "column", justifyContent: "flex-end",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        maxHeight: "82vh", display: "flex", flexDirection: "column",
        overflow: "hidden", animation: "slideUp .25s ease-out",
      }}>
        <div style={{
          padding: "16px 20px 12px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: C.dark }}>
              Pilih Customer
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {customers.filter(c => c.nama && c.nama !== "(Tanpa Nama)" || c.hp).length} customer terdaftar
            </div>
          </div>
          <button onClick={onClose} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center", color: C.muted,
          }}>×</button>
        </div>

        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          <div className="search-wrap" style={{ marginBottom: 0 }}>
            <span className="search-icon">🔍</span>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau nomor HP..."
            />
            {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
          </div>
          {search && (
            <div style={{ fontSize: 11, color: C.muted, margin: "8px 0 0", paddingBottom: 8 }}>
              {filtered.length} hasil untuk "{search}"
            </div>
          )}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "12px 20px 24px" }}>
          {loadingCustomers ? (
            <div className="loading-screen"><div className="spinner" />Memuat data customer...</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <div className="empty-text">{search ? `Tidak ada customer "${search}"` : "Belum ada customer"}</div>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className={`cust-card ${selectedCust?.id === c.id ? "selected" : ""}`}
                onClick={() => { onSelect(c); onClose(); }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div className="cust-name">{c.nama}</div>
                    <div className="cust-phone">📱 {c.hp || "-"}</div>
                  </div>
                  {selectedCust?.id === c.id
                    ? <div className="badge badge-success">✓ Dipilih</div>
                    : <div style={{ fontSize: 18, color: C.border }}>›</div>
                  }
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StepCustomer({ customers = [], loadingCustomers, onAddCustomer, selectedCust, onSelect, cart = [], onCartChange, onNext, onBack }) {
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState("main");
  const [form, setForm] = useState({ nama: "", hp: "" });
  const [err, setErr] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const e = {};
    if (!form.nama.trim()) e.nama = "Nama wajib diisi";
    if (!form.hp.trim()) e.hp = "Nomor HP wajib diisi";
    if (Object.keys(e).length) { setErr(e); return; }
    setSaving(true);
    try {
      const newCust = await onAddCustomer({ nama: form.nama.trim(), hp: form.hp.trim() });
      onSelect(newCust);
      setMode("main");
      setForm({ nama: "", hp: "" });
    } catch (err) {
      console.error("Gagal simpan customer:", err);
    } finally {
      setSaving(false);
    }
  };

  // Update qty item di cart
  const updateItemQty = (produkId, val) => {
    const qty = Math.max(0, val);
    if (qty === 0) {
      onCartChange(cart.filter(c => c.produkId !== produkId));
    } else {
      onCartChange(cart.map(c => {
        if (c.produkId !== produkId) return c;
        const base = c.satuan === "meter" ? (c.panjang || 0) * (c.lebar || 0) : 1;
        return { ...c, qty, subtotal: c.harga * qty * base };
      }));
    }
  };

  const cartValid = selectedCust && cart.length > 0;

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {showPicker && (
        <CustomerPickerModal
          customers={customers}
          loadingCustomers={loadingCustomers}
          selectedCust={selectedCust}
          onSelect={onSelect}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="step-content" style={{ flex: 1 }}>
        {mode === "main" && (
          <>
            {/* ── Pilih Customer ── */}
            <div className="section-header">Customer</div>
            <div
              onClick={() => setShowPicker(true)}
              style={{
                border: `2px dashed ${selectedCust ? C.primary : C.border}`,
                borderRadius: 14, padding: "18px 20px", cursor: "pointer",
                background: selectedCust ? C.primary50 : C.surface,
                display: "flex", alignItems: "center", gap: 14, marginBottom: 12,
                transition: "all .15s",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: selectedCust ? C.primary200 : C.border,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>
                {selectedCust ? "👤" : "👥"}
              </div>
              <div style={{ flex: 1 }}>
                {selectedCust ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{selectedCust.nama}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>📱 {selectedCust.hp || "-"}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.darkMid }}>Pilih dari Daftar Customer</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {loadingCustomers ? "Memuat..." : `${customers.filter(c => c.nama && c.nama !== "(Tanpa Nama)" || c.hp).length} customer tersedia`}
                    </div>
                  </>
                )}
              </div>
              <div style={{ fontSize: 18, color: selectedCust ? C.primary : C.muted }}>›</div>
            </div>

            {selectedCust && (
              <button className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}
                onClick={() => onSelect(null)}>
                × Ganti Customer
              </button>
            )}

            <div className="or-divider">atau</div>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 4, marginBottom: 24 }}
              onClick={() => setMode("add")}>
              ➕ Tambah Customer Baru
            </button>

            {/* ── Jumlah Item ── */}
            <div className="section-header">Jumlah Item</div>
            <div style={{
              background: C.primary50, border: `1px solid ${C.primary200}`,
              borderRadius: 10, padding: "10px 14px", fontSize: 12,
              color: C.primary700, marginBottom: 14,
            }}>
              💡 Khusus karpet, ukuran bisa diisi 0 dulu dan diupdate setelah pengukuran.
            </div>

            {cart.map((item) => (
              <div key={item.produkId} style={{
                border: `1.5px solid ${C.border}`, borderRadius: 12,
                padding: "12px 14px", marginBottom: 8, background: C.white,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{item.nama}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {item.satuan === "meter"
                        ? `📐 ${(parseFloat(item.luas) || 0).toFixed(2)} m² · ${rupiah(item.subtotal)}`
                        : `${rupiah(item.harga)}/pcs · ${item.qty} pcs`}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
                    fontSize: 14, color: C.primary700,
                  }}>
                    {item.satuan === "meter" ? `${(parseFloat(item.luas) || 0).toFixed(1)} m²` : `×${item.qty}`}
                  </div>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <div className="empty-icon">🧺</div>
                <div className="empty-text">Belum ada item dipilih di step sebelumnya</div>
              </div>
            )}
          </>
        )}

        {mode === "add" && (
          <div className="fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setMode("main")}>← Kembali</button>
              <div className="section-header" style={{ margin: 0, flex: 1 }}>Customer Baru</div>
            </div>
            <div className="field">
              <label>Nama Customer</label>
              <input placeholder="Masukkan nama lengkap" value={form.nama} autoFocus
                onChange={(e) => { setForm({ ...form, nama: e.target.value }); setErr({ ...err, nama: "" }); }} />
              {err.nama && <div style={{ color: C.danger, fontSize: 11, marginTop: 4 }}>{err.nama}</div>}
            </div>
            <div className="field">
              <label>Nomor HP / WhatsApp</label>
              <input placeholder="08xxxxxxxxxx" value={form.hp} type="tel"
                onChange={(e) => { setForm({ ...form, hp: e.target.value }); setErr({ ...err, hp: "" }); }} />
              {err.hp && <div style={{ color: C.danger, fontSize: 11, marginTop: 4 }}>{err.hp}</div>}
            </div>
            <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={saving} style={{ marginTop: 8 }}>
              {saving ? <><div className="spinner" /> Menyimpan...</> : "Simpan & Pilih Customer"}
            </button>
          </div>
        )}
      </div>

      <div className="footer-bar">
        {!cartValid && (
          <div style={{
            background: C.warningBg, border: `1px solid ${C.warning}`,
            borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400E",
          }}>
            {!selectedCust ? "⚠️ Pilih customer terlebih dahulu" : "⚠️ Tidak ada item di cart"}
          </div>
        )}
        {cartValid && (
          <div style={{
            background: C.successBg, border: `1px solid ${C.success}`,
            borderRadius: 10, padding: "10px 14px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#15803D", fontWeight: 700, textTransform: "uppercase" }}>✓ Siap dilanjutkan</div>
              <div style={{ fontSize: 14, color: C.dark, fontWeight: 700 }}>{selectedCust.nama}</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {cart.reduce((s, c) => s + c.qty, 0)} item · {cart.map(c => `${c.qty}× ${c.nama}`).join(", ")}
              </div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" style={{ width: 80 }} onClick={onBack}>← Back</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!cartValid} onClick={onNext}>
            Lanjut ke Pembayaran →
          </button>
        </div>
      </div>
    </div>
  );
}
// ─── STEP 3: PEMBAYARAN ───────────────────────────────────────────────────────
function StepPembayaran({ cart, customer, payMethod, setPayMethod, catatan, setCatatan, onNext, onBack, saving }) {
  const [diskonType, setDiskonType] = useState("persen"); // "persen" | "nominal"
  const [diskonVal, setDiskonVal] = useState("");
  const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const diskonAmount = diskonType === "persen"
    ? Math.round(subtotal * (parseFloat(diskonVal) || 0) / 100)
    : Math.min(parseFloat(diskonVal) || 0, subtotal);
  const total = subtotal - diskonAmount;

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="step-content" style={{ flex: 1 }}>
        <div className="section-header">Ringkasan Order</div>
        <div className="nota-card" style={{ marginBottom: 20 }}>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{customer?.nama}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{customer?.hp}</span>
            </div>
            <div className="nota-divider" />
            {cart.map((item, i) => (
              <div key={i} className="nota-item-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span className="nota-item-name" style={{ fontWeight: 600 }}>{item.nama}</span>
                  <span className="nota-item-price">{rupiah(item.subtotal)}</span>
                </div>
                {item.satuan === "meter" ? (
                  <span style={{ fontSize: 11, color: C.muted }}>
                    {(parseFloat(item.luas) || 0).toFixed(2)} m² × {rupiah(item.harga)}/m²
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: C.muted }}>
                    {item.qty} pcs × {rupiah(item.harga)}
                  </span>
                )}
              </div>
            ))}
            <div className="nota-total-row">
              <span className="nota-total-label">Total</span>
              <span className="nota-total-val">{rupiah(total)}</span>
            </div>
          </div>
        </div>
        <div className="section-header">Diskon (Opsional)</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {["persen", "nominal"].map(t => (
            <button
              key={t}
              className={`btn btn-sm ${diskonType === t ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1 }}
              onClick={() => { setDiskonType(t); setDiskonVal(""); }}
            >
              {t === "persen" ? "% Persen" : "Rp Nominal"}
            </button>
          ))}
        </div>
        <div className="field">
          <input
            type="number"
            placeholder={diskonType === "persen" ? "Contoh: 10 (artinya 10%)" : "Contoh: 50000"}
            value={diskonVal}
            min="0"
            max={diskonType === "persen" ? 100 : subtotal}
            onChange={(e) => setDiskonVal(e.target.value)}
          />
          {diskonAmount > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: C.success, fontWeight: 600 }}>
              ✂️ Hemat {rupiah(diskonAmount)}{diskonType === "persen" ? ` (${diskonVal}%)` : ""}
            </div>
          )}
        </div>
        <div className="section-header">Metode Pembayaran</div>
        <div className="pay-grid">
          {PAY_METHODS.map((m) => (
            <div
              key={m.id}
              className={`pay-option ${payMethod === m.id ? "selected" : ""}`}
              onClick={() => setPayMethod(m.id)}
            >
              <div className="pay-option-icon">{m.icon}</div>
              <div className="pay-option-name">{m.label}</div>
              <div className="pay-option-sub">{m.sub}</div>
            </div>
          ))}
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>Catatan (opsional)</label>
          <input
            placeholder="Mis: antar jam 10, waiting list, dll"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </div>

      <div className="footer-bar">
        <div className="footer-summary">
          <div>
            <div className="footer-label">
              {diskonAmount > 0
                ? <span>Subtotal <span style={{ textDecoration: "line-through", color: C.muted }}>{rupiah(subtotal)}</span></span>
                : "Total Tagihan"}
            </div>
            <div className="footer-total">{rupiah(total)}</div>
            {diskonAmount > 0 && (
              <div style={{ fontSize: 11, color: C.success }}>Diskon: −{rupiah(diskonAmount)}</div>
            )}
          </div>
          {payMethod && (
            <div className="badge badge-primary">
              {PAY_METHODS.find((m) => m.id === payMethod)?.label}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" style={{ width: 80 }} onClick={onBack}>← Back</button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={!payMethod || saving}
            onClick={() => onNext({ diskonType, diskonVal: parseFloat(diskonVal) || 0, diskonAmount })}          >
            {saving ? <><div className="spinner" /> Menyimpan...</> : "Simpan Transaksi ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 4: SUKSES + NOTA ────────────────────────────────────────────────────
function StepSukses({ order, onReset, onViewNota }) {
  const [copied, setCopied] = useState(false);
  const notaUrl = `#/nota/${order.notaId}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href.split("#")[0] + notaUrl).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const adaBelumDiukur = order.items.some(it => it.satuan === "meter" && (!it.luas || it.luas === 0));
  const totalSudah = order.items
    .filter(it => !(it.satuan === "meter" && (!it.luas || it.luas === 0)))
    .reduce((s, it) => s + (it.subtotal || 0), 0);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="step-content" style={{ flex: 1 }}>
        <div className="success-screen">
          <div className="success-icon">✅</div>
          <div className="success-title">Transaksi Berhasil!</div>
          <div className="success-sub">
            Data order untuk <strong>{order.customerNama}</strong> berhasil disimpan ke database.
          </div>
        </div>

        <div className="nota-card" style={{ marginBottom: 16 }}>
          <div className="nota-header">
            <div className="nota-brand">🧺 Carpetology</div>
            <div className="nota-tagline">Nota Cuci Karpet & Laundry</div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#6B8894" }}>
              {order.id} • {fmtDate(order.tanggal)}
            </div>
          </div>
          <div className="nota-body">
            <div className="nota-row">
              <span className="nota-key">Customer</span>
              <span className="nota-val">{order.customerNama}</span>
            </div>
            <div className="nota-row">
              <span className="nota-key">No. HP</span>
              <span className="nota-val">{order.customerHp}</span>
            </div>
            <div className="nota-divider" />
            <div className="section-header" style={{ fontSize: 10 }}>Detail Item</div>

            {order.items.map((item, i) => {
              const belumDiukur = item.satuan === "meter" && (!item.luas || item.luas === 0);
              return (
                <div key={i} className="nota-item-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span className="nota-item-name" style={{ fontWeight: 600 }}>{item.nama}</span>
                    <span className="nota-item-price">{belumDiukur ? "—" : rupiah(item.subtotal)}</span>
                  </div>
                  {belumDiukur ? (
                    <span style={{ fontSize: 11, color: C.warning, fontWeight: 600 }}>⚠️ Menunggu pengukuran</span>
                  ) : item.satuan === "meter" ? (
                    <span style={{ fontSize: 11, color: C.muted }}>
                      📐 {(parseFloat(item.luas) || 0).toFixed(2)} m² × {rupiah(item.harga)}/m²
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: C.muted }}>
                      {item.qty} pcs × {rupiah(item.harga)}
                    </span>
                  )}
                </div>
              );
            })}

            {/* ── Total — hanya 1x ── */}
            {adaBelumDiukur ? (
              <div style={{ background: C.warningBg, borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#92400E" }}>Subtotal sementara</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>{rupiah(totalSudah)}</span>
                </div>
                <div style={{ fontSize: 11, color: "#92400E", fontWeight: 600 }}>
                  ⚠️ Biaya karpet menyusul setelah pengukuran
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                {order.diskon?.amount > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px dashed ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.muted }}>Subtotal</span>
                      <span style={{ fontSize: 12, color: C.muted }}>{rupiah(order.subtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px dashed ${C.border}` }}>
                      <span style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>
                        ✂️ Diskon {order.diskon.type === "persen" ? `${order.diskon.nilai}%` : ""}
                      </span>
                      <span style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>-{rupiah(order.diskon.amount)}</span>
                    </div>
                  </>
                )}
                <div className="nota-total-row">
                  <span className="nota-total-label">Total</span>
                  <span className="nota-total-val">{rupiah(order.total)}</span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <span className={`badge ${order.metode === "Belum Payment" ? "badge-warning" : "badge-success"}`}>
                {order.metode}
              </span>
              <span className="badge badge-gray">Waiting List</span>
            </div>
          </div>
        </div>

        <div className="section-header">Link Nota Customer</div>
        <div className="nota-link-box">
          <div className="nota-link-text">{notaUrl}</div>
          <button className="btn btn-sm btn-ghost" onClick={copyLink}>
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
        </div>
        {copied && <div className="toast">Link nota berhasil disalin!</div>}
      </div>

      <div className="footer-bar">
        <button className="btn btn-ghost btn-full" onClick={() => onViewNota(order.notaId)}>
          👁 Lihat Halaman Nota
        </button>
        <button className="btn btn-primary btn-full" onClick={onReset}>
          ➕ Transaksi Baru
        </button>
      </div>
    </div>
  );
}

// ─── EDIT NOTA MODAL ──────────────────────────────────────────────────────────
function EditNotaModal({ order, onClose, onSaved }) {
  const [metode, setMetode] = useState(order.metode || "");
  const [items, setItems] = useState(() =>
    (order.items || []).map(it => ({ ...it }))
  );
  const [statusBayar, setStatusBayar] = useState(order.statusBayar || "Belum Lunas");
  const [saving, setSaving] = useState(false);

  const rupiah = (n) => "Rp " + (n || 0).toLocaleString("id-ID");

  const updateHarga = (idx, val) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const harga = parseFloat(val) || 0;
      const luas = it.satuan === "meter" ? (it.panjang || 0) * (it.lebar || 0) : 1;
      return { ...it, harga, subtotal: harga * it.qty * luas };
    }));
  };

  const updateMeter = (idx, field, val) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: parseFloat(val) || 0 };
      const luas = (updated.panjang || 0) * (updated.lebar || 0);
      return { ...updated, luas, subtotal: updated.harga * updated.qty * luas };
    }));
  };

  const updateQty = (idx, val) => {
    const qty = Math.max(1, val);
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const luas = it.satuan === "meter" ? (it.panjang || 0) * (it.lebar || 0) : 1;
      return { ...it, qty, subtotal: it.harga * qty * luas };
    }));
  };

  const totalBaru = items.reduce((s, it) => s + (it.subtotal || 0), 0);

  const handleSimpan = async () => {
    setSaving(true);
    try {
      const { doc, updateDoc, collection, query, where, getDocs } = await import("firebase/firestore");

      const itemsPayload = items.map(it => ({
        produkId: it.produkId || "",
        nama: it.nama,
        satuan: it.satuan,
        qty: it.qty,
        harga: it.harga,
        panjang: null,   // ← tidak dipakai lagi
        lebar: null,     // ← tidak dipakai lagi
        luas: it.satuan === "meter" ? (parseFloat(it.luas) || 0) : null,
        subtotal: it.subtotal,
      }));

      const updatePayload = {
        items: itemsPayload,
        total_harga: totalBaru,
        statusBayar,
        metode_pembayaran: metode,
      };

      await updateDoc(doc(db, "orders", order.id), updatePayload);

      if (order.notaId) {
        const txSnap = await getDocs(
          query(collection(db, "transactions"), where("notaId", "==", order.notaId))
        );
        for (const txDoc of txSnap.docs) {
          await updateDoc(doc(db, "transactions", txDoc.id), {
            items: itemsPayload,
            total_harga: totalBaru,
            status_order: statusBayar,
            metode_pembayaran: metode,
          });
        }
      }

      onSaved();
      onClose();
    } catch (e) {
      alert("Gagal menyimpan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(26,46,53,0.6)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: C.white, width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        animation: "slideUp .25s ease-out",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: C.dark }}>
              Edit Nota
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{order.notaId}</div>
          </div>
          <button onClick={onClose} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 18, color: C.muted,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px 8px" }}>

          {/* Status */}
          <div className="section-header">Status</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {["Belum Lunas", "Lunas"].map(s => (
              <div
                key={s}
                onClick={() => setStatusBayar(s)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                  border: `2px solid ${statusBayar === s ? C.primary : C.border}`,
                  background: statusBayar === s ? C.primary100 : C.white,
                  fontWeight: 700, fontSize: 13,
                  color: statusBayar === s ? C.primary700 : C.muted,
                  transition: "all .15s",
                }}
              >
                {s === "Lunas" ? "✅ Lunas" : "⏳ Belum Lunas"}
              </div>
            ))}
          </div>

          {/* Metode Pembayaran */}
          <div className="section-header">Metode Pembayaran</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { id: "Tunai", icon: "💵" },
              { id: "QRIS", icon: "📲" },
              { id: "Transfer", icon: "🏦" },
              { id: "Belum Payment", icon: "⏳" },
            ].map((m) => (
              <div key={m.id} onClick={() => setMetode(m.id)} style={{
                border: `2px solid ${metode === m.id ? C.primary : C.border}`,
                borderRadius: 12, padding: "12px", cursor: "pointer", textAlign: "center",
                background: metode === m.id ? C.primary100 : C.white, transition: "all .15s",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: metode === m.id ? C.primary700 : C.dark }}>
                  {m.id}
                </div>
              </div>
            ))}
          </div>

          {/* Items */}
          <div className="section-header">Detail Item</div>
          {items.map((item, idx) => (
            <div key={idx} style={{
              border: `1.5px solid ${C.border}`, borderRadius: 12,
              padding: "12px 14px", marginBottom: 10, background: C.surface,
            }}>
              {/* Nama + qty */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{item.nama}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button className="qty-btn" onClick={() => updateQty(idx, item.qty - 1)}>−</button>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                  <button className="qty-btn" onClick={() => updateQty(idx, item.qty + 1)}>+</button>
                </div>
              </div>

              {/* Harga */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
                  Harga {item.satuan === "meter" ? "/m²" : "/pcs"}
                </div>
                <input
                  type="number"
                  value={item.harga}
                  onChange={e => updateHarga(idx, e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Ukuran karpet */}
              {item.satuan === "meter" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Panjang (m)</div>
                      <input type="number" step="0.1" min="0" value={item.panjang ?? 0}
                        onChange={e => updateMeter(idx, "panjang", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Lebar (m)</div>
                      <input type="number" step="0.1" min="0" value={item.lebar ?? 0}
                        onChange={e => updateMeter(idx, "lebar", e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div style={{
                    background: C.primary100, borderRadius: 8, padding: "8px 12px",
                    marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 11, color: C.primary700, fontWeight: 600 }}>
                      📐 {(item.panjang || 0).toFixed(1)}m × {(item.lebar || 0).toFixed(1)}m = {(item.luas || 0).toFixed(2)} m²
                    </span>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: C.primary700 }}>
                      {rupiah(item.subtotal)}
                    </span>
                  </div>
                </>
              )}

              {/* Subtotal satuan */}
              {item.satuan !== "meter" && (
                <div style={{
                  background: C.primary100, borderRadius: 8, padding: "8px 12px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 11, color: C.primary700 }}>{item.qty} × {rupiah(item.harga)}</span>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: C.primary700 }}>
                    {rupiah(item.subtotal)}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Total baru */}
          <div style={{
            background: C.dark, borderRadius: 12, padding: "14px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>Total</span>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: C.white }}>
              {rupiah(totalBaru)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            className="btn btn-primary btn-full"
            onClick={handleSimpan}
            disabled={saving}
          >
            {saving ? <><div className="spinner" /> Menyimpan...</> : "💾 Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NOTA PAGE ─────────────────────────────────────────────────────────────────
function NotaPage({ notaId, orders, onBack }) {
  const order = orders.find((o) => o.notaId === notaId || o.id === notaId);
  const [showEdit, setShowEdit] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!order) {
    return (
      <div className="kasir-root">
        <div className="topbar">
          {onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", color: C.primary, cursor: "pointer", fontSize: 20 }}>←</button>
          )}
          <div className="topbar-icon">🧺</div>
          <div>
            <div className="topbar-brand">Carpetology</div>
            <div className="topbar-sub">Nota tidak ditemukan</div>
          </div>
        </div>
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div className="empty-icon">❌</div>
          <div className="empty-text">Nota dengan ID {notaId} tidak ditemukan</div>
          {onBack && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={onBack}>← Kembali</button>
          )}
        </div>
      </div>
    );
  }

  const adaBelumDiukur = order.items.some(it => it.satuan === "meter" && (!it.luas || it.luas === 0));
  const totalSudah = order.items
    .filter(it => !(it.satuan === "meter" && (!it.luas || it.luas === 0)))
    .reduce((s, it) => s + (it.subtotal || 0), 0);

  return (
    <div className="kasir-root" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Edit modal */}
      {showEdit && (
        <EditNotaModal
          order={order}
          onClose={() => setShowEdit(false)}
          onSaved={() => setSaved(true)}
        />
      )}

      {saved && (
        <div className="toast" style={{ bottom: 100 }}>✅ Nota berhasil diupdate!</div>
      )}

      <div style={{ background: C.dark, padding: "20px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: C.primary }}>
          🧺 Carpetology
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Jasa Cuci Karpet & Laundry Professional
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Status bar */}
        <div style={{
          background: order.statusBayar === "Lunas" ? C.successBg : C.warningBg,
          border: `1px solid ${order.statusBayar === "Lunas" ? C.success : C.warning}`,
          borderRadius: 12, padding: "10px 16px", display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: order.statusBayar === "Belum Payment" ? "#D97706" : "#15803D" }}>
            {order.statusBayar === "Belum Payment" ? "⏳ Belum Lunas" : "✅ Lunas"}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>{fmtDate(order.tanggal || order.timestamp)}</div>
        </div>

        {/* Customer info */}
        <div style={{ background: C.surface, borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Info Customer</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>{order.customerNama}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>📱 {order.customerHp}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>#{order.id} • {order.notaId}</div>
        </div>

        {/* Items */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", background: C.primary, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.5px" }}>Detail Item</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{order.items.length} item</span>
          </div>
          {order.items.map((item, i) => {
            const belumDiukur = item.satuan === "meter" && (!item.luas || item.luas === 0);
            return (
              <div key={i} style={{ padding: "12px 16px", borderBottom: i < order.items.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.nama}</div>
                  {belumDiukur ? (
                    <div style={{ fontSize: 11, color: C.warning, marginTop: 2, fontWeight: 600 }}>⚠️ Menunggu pengukuran</div>
                  ) : item.satuan === "meter" ? (
                    <>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        📐 {(item.panjang || 0).toFixed(1)}m × {(item.lebar || 0).toFixed(1)}m = {(item.luas || 0).toFixed(2)} m²
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {(item.luas || 0).toFixed(2)} m² × {rupiah(item.harga)}/m²
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {item.qty} pcs × {rupiah(item.harga)}
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: belumDiukur ? C.muted : C.dark, marginLeft: 12 }}>
                  {belumDiukur ? "—" : rupiah(item.subtotal)}
                </div>
              </div>
            );
          })}

          <div>
            {order.diskon?.amount > 0 && (
              <>
                <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Subtotal</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{rupiah((order.subtotal) || order.total + order.diskon.amount)}</span>
                </div>
                <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", background: C.successBg }}>
                  <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>
                    ✂️ Diskon {order.diskon.type === "persen" ? `${order.diskon.nilai}%` : ""}
                  </span>
                  <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>-{rupiah(order.diskon.amount)}</span>
                </div>
              </>
            )}
            <div style={{ padding: "14px 16px", background: C.primary100, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.primary700 }}>Total</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: C.primary700 }}>
                {rupiah(order.total)}
              </span>
            </div>
          </div>

          {/* Total */}
          {adaBelumDiukur ? (
            <>
              <div style={{ padding: "10px 16px", background: C.warningBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#92400E" }}>Subtotal (sudah dihitung)</span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: "#92400E" }}>{rupiah(totalSudah)}</span>
              </div>
              <div style={{ padding: "10px 16px", background: C.warningBg, borderTop: `1px solid ${C.warning}` }}>
                <div style={{ fontSize: 11, color: "#92400E", fontWeight: 600, textAlign: "center" }}>
                  ⚠️ Total sementara — biaya karpet menyusul setelah pengukuran
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "14px 16px", background: C.primary100, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.primary700 }}>Total</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: C.primary700 }}>
                {rupiah(order.total)}
              </span>
            </div>
          )}
        </div>

        {/* Payment method */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <span className={`badge ${order.statusBayar === "Lunas" ? "badge-success" : "badge-warning"}`} style={{ padding: "6px 12px", fontSize: 12 }}>
            {order.statusBayar === "Lunas" ? "✅ Lunas" : "⏳ Belum Lunas"}
          </span>
          <span className="badge badge-gray" style={{ padding: "6px 12px", fontSize: 12 }}>
            {order.metode || "Belum Payment"}
          </span>
          <span className="badge badge-primary" style={{ padding: "6px 12px", fontSize: 12 }}>
            {order.status || "Waiting List"}
          </span>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }} className="no-print">
          {onBack && (
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onBack}>← Kembali</button>
          )}
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { window.print(); }}>
            🖨 Cetak Nota
          </button>
        </div>

        {/* Tombol Edit — hanya untuk admin (onBack ada) */}
        {onBack && (
          <button
            className="btn btn-ghost btn-full no-print"
            onClick={() => { setShowEdit(true); setSaved(false); }}
          >
            ✏️ Edit Nota
          </button>
        )}

        {/* Footer nota */}
        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted }}>Terima kasih telah mempercayai</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.primary, marginTop: 4 }}>
            🧺 Carpetology
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            Lacak progres cuci Anda dengan mudah
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RIWAYAT PAGE ─────────────────────────────────────────────────────────────
function RiwayatPage({ orders, loadingOrders, onViewNota }) {
  const [search, setSearch] = useState("");
  const [filterMetode, setFilterMetode] = useState("Semua");
  const BULAN_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const now = new Date();
  const [filterBulan, setFilterBulan] = useState(now.getMonth());
  const [filterTahun, setFilterTahun] = useState(now.getFullYear());

  const metodeOptions = ["Semua", "Tunai", "QRIS", "Transfer", "Belum Payment"];

  const parseOrderDate = (o) => {
    if (o.timestamp?.toDate) return o.timestamp.toDate();
    if (o.tanggal) return new Date(o.tanggal);
    return new Date(0);
  };

  const filtered = orders
    .filter((o) => {
      const d = parseOrderDate(o);
      return d.getMonth() === filterBulan && d.getFullYear() === filterTahun;
    })
    .filter((o) => {
      const s = search.toLowerCase();
      return (
        (o.customerNama || "").toLowerCase().includes(s) ||
        (o.customerHp || "").includes(s) ||
        (o.id || "").toLowerCase().includes(s)
      );
    })
    .filter((o) => filterMetode === "Semua" || o.metode === filterMetode)
    .sort((a, b) => parseOrderDate(b) - parseOrderDate(a));

  const totalRevenue = filtered.filter(o => o.statusBayar === "Lunas").reduce((s, o) => s + o.total, 0);
  const totalPiutang = filtered.filter(o => o.statusBayar !== "Lunas").reduce((s, o) => s + o.total, 0);

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Transaksi (1 baris = 1 order) ──────────────
    const sheet1 = filtered.map((o) => ({
      "Tanggal": o.tanggal || "",
      "Customer": o.customerNama,
      "No. HP": o.customerHp,
      "Item (ringkasan)": (o.items || [])
        .map((it) =>
          it.satuan === "meter"
            ? `${it.nama} (${(parseFloat(it.luas) || 0).toFixed(1)}m²)`
            : `${it.nama} (${it.qty}x)`
        )
        .join(" | "),
      "Subtotal": o.subtotal || o.total,
      "Diskon (Rp)": o.diskon?.amount || 0,
      "Total": o.total,
      "Metode": o.metode,
      "Status": o.statusBayar,
      "Catatan": o.catatan || "",
    }));
    const ws1 = XLSX.utils.json_to_sheet(sheet1);
    ws1["!cols"] = [
      { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 40 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 24 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Transaksi");

    // ── Sheet 2: Produk Terlaris ─────────────────────────────
    const produkMap = {};
    filtered.forEach((o) => {
      (o.items || []).forEach((it) => {
        if (!produkMap[it.nama]) {
          produkMap[it.nama] = {
            "Nama Produk": it.nama,
            "Satuan": it.satuan === "meter" ? "Meteran" : "Satuan",
            "Jumlah Order": 0,
            "Total m²": 0,
            "Total Pcs": 0,
            "Total Pendapatan": 0,
          };
        }
        produkMap[it.nama]["Jumlah Order"] += 1;
        if (it.satuan === "meter") {
          produkMap[it.nama]["Total m²"] += parseFloat(it.luas) || 0;
        } else {
          produkMap[it.nama]["Total Pcs"] += it.qty || 0;
        }
        produkMap[it.nama]["Total Pendapatan"] += it.subtotal || 0;
      });
    });
    const sheet2 = Object.values(produkMap)
      .sort((a, b) => b["Total Pendapatan"] - a["Total Pendapatan"]);
    const ws2 = XLSX.utils.json_to_sheet(sheet2);
    ws2["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Produk Terlaris");

    // ── Sheet 3: Rekap Bulan ─────────────────────────────────
    const totalOmzet = filtered.reduce((s, o) => s + o.total, 0);
    const totalLunas = filtered.filter(o => o.statusBayar === "Lunas")
      .reduce((s, o) => s + o.total, 0);
    const totalPiutang = filtered.filter(o => o.statusBayar !== "Lunas")
      .reduce((s, o) => s + o.total, 0);
    const totalDiskon = filtered.reduce((s, o) => s + (o.diskon?.amount || 0), 0);

    const sheet3 = [
      {
        "Keterangan": "Periode",
        "Nilai": `${BULAN_LABEL[filterBulan]} ${filterTahun}`
      },
      {
        "Keterangan": "Total Transaksi",
        "Nilai": filtered.length + " order"
      },
      { "Keterangan": "Omzet (Rp)", "Nilai": totalOmzet },
      { "Keterangan": "Sudah Lunas (Rp)", "Nilai": totalLunas },
      { "Keterangan": "Piutang (Rp)", "Nilai": totalPiutang },
      { "Keterangan": "Total Diskon (Rp)", "Nilai": totalDiskon },
    ];
    const ws3 = XLSX.utils.json_to_sheet(sheet3);
    ws3["!cols"] = [{ wch: 22 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Rekap Bulan");

    // ── Download ─────────────────────────────────────────────
    XLSX.writeFile(wb,
      `Carpetology_${BULAN_LABEL[filterBulan]}_${filterTahun}.xlsx`
    );
  };


  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="step-content" style={{ flex: 1 }}>

        {/* ── Filter Bulan ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <select
            value={filterBulan}
            onChange={(e) => setFilterBulan(Number(e.target.value))}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", background: C.white, color: C.dark, outline: "none" }}
          >
            {BULAN_LABEL.map((b, i) => (
              <option key={i} value={i}>{b}</option>
            ))}
          </select>
          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(Number(e.target.value))}
            style={{ width: 90, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", background: C.white, color: C.dark, outline: "none" }}
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            className="btn btn-ghost btn-sm"
            onClick={exportExcel}
            disabled={filtered.length === 0}
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            📥 Excel
          </button>
        </div>

        {/* ── Stats bulan terpilih ── */}
        <div className="mini-stats">
          <div className="mini-stat">
            <div className="mini-stat-label">Transaksi {BULAN_LABEL[filterBulan]}</div>
            <div className="mini-stat-value">{filtered.length}</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-label">Omzet {BULAN_LABEL[filterBulan]}</div>
            <div className="mini-stat-value" style={{ fontSize: 13 }}>{rupiah(totalRevenue + totalPiutang)}</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-label" style={{ color: "#15803D" }}>✅ Lunas</div>
            <div className="mini-stat-value" style={{ color: "#15803D", fontSize: 13 }}>{rupiah(totalRevenue)}</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-label" style={{ color: "#D97706" }}>⏳ Piutang</div>
            <div className="mini-stat-value" style={{ color: "#D97706", fontSize: 13 }}>{rupiah(totalPiutang)}</div>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, HP, atau ID..." />
          {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
        </div>

        {/* ── Filter metode ── */}
        <div className="tab-chips">
          {metodeOptions.map((m) => (
            <div key={m} className={`tab-chip ${filterMetode === m ? "active" : ""}`} onClick={() => setFilterMetode(m)}>
              {m}
            </div>
          ))}
        </div>

        {loadingOrders ? (
          <div className="loading-screen">
            <div className="spinner" />
            Memuat riwayat transaksi...
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="section-header" style={{ margin: 0 }}>
                {filtered.length} transaksi · {BULAN_LABEL[filterBulan]} {filterTahun}
              </div>
            </div>

            {filtered.map((order) => (
              <div key={order.id} className="history-card" onClick={() => onViewNota(order.notaId || order.id)}>
                <div className="history-top">
                  <div>
                    <div className="history-cust">{order.customerNama}</div>
                    <div className="history-date">{order.id} • {fmtDate(order.tanggal || order.timestamp)}</div>
                  </div>
                  <div className={`badge ${order.statusBayar === "Lunas" ? "badge-success" : "badge-warning"}`}>
                    {order.statusBayar === "Lunas" ? "✅ Lunas" : "⏳ Belum"}
                  </div>
                </div>
                <div className="history-items">
                  {(order.items || []).map((i, idx) => (
                    <span key={idx}>
                      {idx > 0 && ", "}
                      {i.qty}× {i.nama}
                    </span>
                  ))}
                </div>
                <div className="history-bottom">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>{order.metode}</span>
                    {order.diskon?.amount > 0 && (
                      <span className="badge badge-warning" style={{ fontSize: 10 }}>
                        ✂️ -{rupiah(order.diskon.amount)}
                      </span>
                    )}
                  </div>
                  <div className="history-total">{rupiah(order.total)}</div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-text">
                  Belum ada transaksi di {BULAN_LABEL[filterBulan]} {filterTahun}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("kasir");
  const [kasirStep, setKasirStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [payMethod, setPayMethod] = useState("");
  const [catatan, setCatatan] = useState("");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [viewingNota, setViewingNota] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const { user } = useAuth();

  // ── Firestore data ─────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Inject global styles
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = globalCss;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // ── Real-time listeners ────────────────────────────────────────────────────
  useEffect(() => {
    // Products — one-time fetch (products rarely change mid-session)
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(collection(db, "products"));
        setProducts(snap.docs.map(mapProduct));
      } catch (e) {
        console.error("Gagal load products:", e);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    // Customers — real-time so new customers appear immediately
    const unsub = onSnapshot(
      query(collection(db, "customers"), orderBy("nama")),
      (snap) => {
        setCustomers(snap.docs.map(mapCustomer));
        setLoadingCustomers(false);
      },
      (e) => {
        console.error("Gagal load customers:", e);
        setLoadingCustomers(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    // Orders — real-time
    const unsub = onSnapshot(
      query(collection(db, "orders"), orderBy("timestamp", "desc")),
      (snap) => {
        setOrders(snap.docs.map(mapOrder));
        setLoadingOrders(false);
      },
      (e) => {
        console.error("Gagal load orders:", e);
        setLoadingOrders(false);
      }
    );
    return unsub;
  }, []);

  // ── Deep link: baca hash URL untuk buka nota langsung ─────────────────────
  const [pendingNotaId, setPendingNotaId] = useState(() => {
    const match = window.location.hash.match(/^#\/nota\/(.+)$/);
    return match ? match[1] : null;
  });

  useEffect(() => {
    if (pendingNotaId && !loadingOrders) {
      setViewingNota(pendingNotaId);
      setPendingNotaId(null);
    }
  }, [pendingNotaId, loadingOrders]);

  useEffect(() => {
    const readHash = () => {
      const match = window.location.hash.match(/^#\/nota\/(.+)$/);
      if (match) {
        if (loadingOrders) {
          setPendingNotaId(match[1]);
        } else {
          setViewingNota(match[1]);
        }
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [loadingOrders]);

  // ── Add Customer to Firestore ──────────────────────────────────────────────
  const handleAddCustomer = async ({ nama, hp }) => {
    const docRef = await addDoc(collection(db, "customers"), {
      nama,
      no_hp: hp,
      created_at: serverTimestamp(),
    });
    return { id: docRef.id, nama, hp };
  };

  // ── Save Order to Firestore ────────────────────────────────────────────────
  const handleSimpan = async ({ diskonType, diskonVal, diskonAmount }) => {
    setSavingOrder(true);
    try {
      const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
      const total = subtotal - diskonAmount;
      const notaId = "NOTA-" + genId();
      const metodeLabel = PAY_METHODS.find((m) => m.id === payMethod)?.label || payMethod;
      const statusBayar = payMethod === "belum" ? "Belum Lunas" : "Lunas";
      const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
      const now = new Date();
      const tanggalIndo = `${String(now.getDate()).padStart(2, "0")} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;

      const itemsPayload = cart.map((c) => ({
        produkId: c.produkId,
        nama: c.nama,
        satuan: c.satuan,
        qty: c.qty,
        panjang: null,
        lebar: null,
        luas: c.satuan === "meter" ? (parseFloat(c.luas) || 0) : null,
        harga: c.harga,
        subtotal: c.subtotal,
      }));

      const orderPayload = {
        customer_id: doc(db, "customers", customer.id),
        nama: customer.nama,
        hp: customer.hp,
        items: itemsPayload,
        subtotal_harga: subtotal,
        diskon: {
          type: diskonType,
          nilai: diskonVal,
          amount: diskonAmount,
        },
        total_harga: total,
        metode_pembayaran: metodeLabel,
        statusBayar,
        status: "Waiting List",
        tanggal: tanggalIndo,
        timestamp: serverTimestamp(),
        catatan: catatan || "",
        notaId,
      };

      const docRef = await addDoc(collection(db, "orders"), orderPayload);

      await addDoc(collection(db, "transactions"), {
        customer_id: doc(db, "customers", customer.id),
        nama: customer.nama,
        hp: customer.hp,
        items: itemsPayload,
        subtotal_harga: subtotal,
        diskon: {
          type: diskonType,
          nilai: diskonVal,
          amount: diskonAmount,
        },
        metode_pembayaran: metodeLabel,
        status_order: "Waiting List",
        statusBayar,             
        total_harga: total,
        created_at: serverTimestamp(),
        notaId,
        order_id: docRef.id,
      });

      const newOrder = {
        id: docRef.id,
        customerId: customer.id,
        customerNama: customer.nama,
        customerHp: customer.hp,
        items: itemsPayload,
        subtotal,
        diskon: { type: diskonType, nilai: diskonVal, amount: diskonAmount },
        total,
        metode: metodeLabel,
        statusBayar,
        status: "Waiting List",
        tanggal: tanggalIndo,
        catatan,
        notaId,
        timestamp: new Date(),
      };

      setCurrentOrder(newOrder);
      setKasirStep(3);
    } catch (e) {
      console.error("Gagal simpan transaksi:", e);
      alert("Gagal menyimpan transaksi. Coba lagi.");
    } finally {
      setSavingOrder(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setKasirStep(0);
    setCart([]);
    setCustomer(null);
    setPayMethod("");
    setCatatan("");
    setCurrentOrder(null);
    setViewingNota(null);
    setTab("kasir");
  };

  const handleViewNota = (notaId) => setViewingNota(notaId);

  // ── Render: Nota page ──────────────────────────────────────────────────────
  if (viewingNota) {
    // Direct link = dibuka dari tab baru / URL langsung tanpa hash sebelumnya
    // Cara deteksi: cek apakah ada referrer dari domain yang sama
    const isDirectLink = !document.referrer ||
      (!currentOrder && kasirStep === 0 && cart.length === 0 &&
        !window.history.state?.fromAdmin);

    return (
      <NotaPage
        notaId={viewingNota}
        orders={orders}
        onBack={() => {
          window.location.hash = "";
          setViewingNota(null);
        }}
      />
    );
  }

  // ── Render: Main ───────────────────────────────────────────────────────────
  return (
    <div className="kasir-root">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-icon">🧺</div>
        <div style={{ flex: 1 }}>
          <div className="topbar-brand">Carpetology</div>
          <div className="topbar-sub">Sistem Kasir Laundry</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>
            {todayLabel()}
          </div>
          {cart.length > 0 && tab === "kasir" && kasirStep === 0 && (
            <div className="badge badge-primary" style={{ marginTop: 4 }}>
              {cart.length} item
            </div>
          )}
        </div>
      </div>

      {/* Nav tabs */}
      <div className="nav-tabs">
        <div className={`nav-tab ${tab === "kasir" ? "active" : ""}`} onClick={() => setTab("kasir")}>
          🛒 Kasir
        </div>
        <div className={`nav-tab ${tab === "riwayat" ? "active" : ""}`} onClick={() => setTab("riwayat")}>
          📋 Riwayat
        </div>
      </div>

      {/* Main content */}
      {tab === "kasir" && (
        <>
          {kasirStep < 3 && <StepBar current={kasirStep} />}

          {kasirStep === 0 && (
            <StepProduk
              products={products}
              loadingProducts={loadingProducts}
              cart={cart}
              onCartChange={setCart}
              onNext={() => setKasirStep(1)}
            />
          )}
          {kasirStep === 1 && (
            <StepCustomer
              customers={customers}
              loadingCustomers={loadingCustomers}
              onAddCustomer={handleAddCustomer}
              selectedCust={customer}
              onSelect={setCustomer}
              cart={cart}
              onCartChange={setCart}
              onNext={() => setKasirStep(2)}
              onBack={() => setKasirStep(0)}
            />
          )}
          {kasirStep === 2 && (
            <StepPembayaran
              cart={cart}
              customer={customer}
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              catatan={catatan}
              setCatatan={setCatatan}
              onNext={handleSimpan}
              onBack={() => setKasirStep(1)}
              saving={savingOrder}
            />
          )}
          {kasirStep === 3 && currentOrder && (
            <StepSukses
              order={currentOrder}
              onReset={handleReset}
              onViewNota={handleViewNota}
            />
          )}
        </>
      )}

      {tab === "riwayat" && (
        <RiwayatPage
          orders={orders}
          loadingOrders={loadingOrders}
          onViewNota={handleViewNota}
        />
      )}
      {/* Tambah Navbar admin di paling bawah */}
      {(user?.role === 'admin' || user?.role === 'Admin') && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',              // ← center seperti kasir-root
          transform: 'translateX(-50%)',  // ← center
          width: '100%',
          maxWidth: 480,            // ← ikuti max-width kasir-root
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#fff',
          zIndex: 100,
        }}>
          <Navbar />
        </div>
      )}
    </div>
  );
}