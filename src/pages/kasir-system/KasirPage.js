import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, addDoc, doc, serverTimestamp,
  query, orderBy, onSnapshot,
} from "firebase/firestore";
import {
  Search, X, ShoppingCart, ClipboardList, Package, Users, CreditCard,
  FileText, CheckCircle, AlertCircle, Clock, Trash2, Plus, Minus,
  ChevronRight, Phone, Printer, Edit3, Copy, MessageCircle,
  Ruler, Layers, Truck, Banknote, QrCode, Building2, Home,
  Loader2, Eye, Download, ArrowLeft, ChevronDown,
} from "lucide-react";
import { db } from "../../firebase";
import Navbar from "../../componets/Navbar";
import { useAuth } from "../../context/AuthContext";

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
  .topbar-icon { width: 36px; height: 36px; background: ${C.primary}; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: ${C.dark}; }

  /* Step indicator */
  .steps-bar { display: flex; align-items: center; padding: 16px 20px; background: ${C.white}; border-bottom: 1px solid ${C.border}; }
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

  /* ── SEARCH BAR — diperbaiki ─────────────────────────────────────────────── */
  .search-wrap {
    position: relative;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
  }
  .search-wrap .search-icon-box {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${C.muted};
    pointer-events: none;
    z-index: 1;
  }
  .search-wrap input {
    width: 100%;
    padding: 11px 40px 11px 40px;
    border: 1.5px solid ${C.border};
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    color: ${C.dark};
    background: ${C.surface};
    outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .search-wrap input:focus {
    border-color: ${C.primary};
    box-shadow: 0 0 0 3px ${C.primary100};
    background: ${C.white};
  }
  .search-wrap input::placeholder { color: #BCD8D8; }
  .search-clear-btn {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: ${C.muted};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 50%;
    transition: background .15s;
    z-index: 1;
  }
  .search-clear-btn:hover { background: ${C.border}; color: ${C.dark}; }

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
  .prod-type { font-size: 11px; color: ${C.muted}; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
  .prod-price { font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 600; color: ${C.primary700}; }
  .prod-unit { font-size: 10px; color: ${C.muted}; }

  /* Badge */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
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
  .qty-btn { width: 28px; height: 28px; border-radius: 7px; border: 1.5px solid ${C.border}; background: ${C.white}; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; color: ${C.dark}; }
  .qty-btn:hover { background: ${C.primary}; color: white; border-color: ${C.primary}; }
  .qty-display { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; min-width: 24px; text-align: center; }

  /* Meter input */
  .meter-result { background: ${C.primary100}; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .meter-result-label { font-size: 11px; color: ${C.primary700}; font-weight: 600; }
  .meter-result-value { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 700; color: ${C.primary700}; }

  /* Customer card */
  .cust-card { border: 1.5px solid ${C.border}; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all .15s; margin-bottom: 8px; }
  .cust-card:hover { border-color: ${C.primary}; background: ${C.primary50}; }
  .cust-card.selected { border-color: ${C.primary}; background: ${C.primary50}; box-shadow: 0 0 0 3px ${C.primary100}; }
  .cust-name { font-size: 14px; font-weight: 700; color: ${C.dark}; }
  .cust-phone { font-size: 12px; color: ${C.muted}; margin-top: 2px; display: flex; align-items: center; gap: 4px; }

  /* Payment methods */
  .pay-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  .pay-option { border: 2px solid ${C.border}; border-radius: 12px; padding: 14px; cursor: pointer; transition: all .15s; text-align: center; background: ${C.white}; }
  .pay-option:hover { border-color: ${C.primary200}; background: ${C.primary50}; }
  .pay-option.selected { border-color: ${C.primary}; background: ${C.primary100}; }
  .pay-option-icon { display: flex; align-items: center; justify-content: center; margin-bottom: 6px; color: ${C.darkMid}; }
  .pay-option.selected .pay-option-icon { color: ${C.primary700}; }
  .pay-option-name { font-size: 13px; font-weight: 700; color: ${C.dark}; }
  .pay-option-sub { font-size: 10px; color: ${C.muted}; margin-top: 2px; }

  /* Nota */
  .nota-card { border: 1px solid ${C.border}; border-radius: 16px; overflow: hidden; }
  .nota-header { background: ${C.dark}; padding: 24px 20px; text-align: center; }
  .nota-brand { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; color: ${C.primary}; display: flex; align-items: center; justify-content: center; gap: 8px; }
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
  .nav-tab { flex: 1; padding: 12px; text-align: center; font-size: 11px; font-weight: 700; color: ${C.muted}; cursor: pointer; transition: all .15s; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid transparent; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .nav-tab.active { color: ${C.primary}; border-bottom-color: ${C.primary}; }
  .nav-tab:hover:not(.active) { color: ${C.primary200}; }

  /* Success screen */
  .success-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px; min-height: 300px; }
  .success-icon { width: 80px; height: 80px; background: ${C.successBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; color: ${C.success}; }
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
  .empty-icon { display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
  .empty-text { font-size: 13px; }

  /* Tab chip */
  .tab-chips { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .tab-chip { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1.5px solid ${C.border}; background: ${C.white}; color: ${C.muted}; transition: all .15s; }
  .tab-chip.active { background: ${C.primary}; color: white; border-color: ${C.primary}; }
  .tab-chip:hover:not(.active) { border-color: ${C.primary}; color: ${C.primary}; }

  /* Divider */
  .or-divider { display: flex; align-items: center; gap: 10px; margin: 16px 0; color: ${C.muted}; font-size: 12px; }
  .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: ${C.border}; }

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

  /* Mini stat */
  .mini-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .mini-stat { background: ${C.surface}; border-radius: 10px; padding: 12px 14px; border: 1px solid ${C.border}; }
  .mini-stat-label { font-size: 11px; color: ${C.muted}; margin-bottom: 4px; }
  .mini-stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; color: ${C.dark}; }

  /* Toast */
  .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: ${C.dark}; color: white; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 999; animation: slideUp .2s ease-out; display: flex; align-items: center; gap: 8px; }

  /* Loading spinner */
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; gap: 12px; color: ${C.muted}; font-size: 13px; }
  .spinning { animation: spin .7s linear infinite; }
`;

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const PAY_METHODS = [
  { id: "tunai", label: "Tunai", Icon: Banknote, sub: "Bayar langsung" },
  { id: "qris", label: "QRIS", Icon: QrCode, sub: "Scan QR code" },
  { id: "transfer", label: "Transfer", Icon: Building2, sub: "Bank transfer" },
  { id: "belum", label: "Belum Payment", Icon: Clock, sub: "Hutang / cicil" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const rupiah = (n) => "Rp " + (n || 0).toLocaleString("id-ID");
const genId = () => Math.random().toString(36).substr(2, 8).toUpperCase();
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = d?.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};
const todayLabel = () =>
  new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

const mapProduct = (docSnap) => {
  const d = docSnap.data();
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

const mapCustomer = (docSnap) => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    nama: d.nama || d.nama_customer || d.name || d.fullname || "(Tanpa Nama)",
    hp: d.no_hp || d.hp || d.phone || d.telepon || "",
  };
};

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
    subtotal: Number(d.subtotal_harga || d.total_harga || d.total || 0),
    diskon: d.diskon || null,
    metode: d.metode_pembayaran || d.metode || "",
    statusBayar: d.statusBayar || "Belum Lunas",
    status: d.status || "Waiting List",
    tanggal: d.tanggal || "",
    timestamp: d.timestamp || d.created_at || null,
    catatan: d.catatan || "",
    notaId: d.notaId || docSnap.id,
  };
};

function inferKategori(nama = "") {
  const n = nama.toLowerCase();
  if (n.includes("sofa")) return "Sofa";
  if (n.includes("springbed") || n.includes("kasur")) return "Springbed";
  if (n.includes("karpet") || n.includes("gorden") || n.includes("tirai")) return "Karpet";
  return "Lainnya";
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
const STEPS = ["Produk", "Customer", "Bayar", "Nota"];
const STEP_ICONS = [Package, Users, CreditCard, FileText];

function StepBar({ current }) {
  return (
    <div className="steps-bar">
      {STEPS.map((s, i) => {
        const Icon = STEP_ICONS[i];
        return (
          <div key={i} className="step-item">
            <div className="step-wrapper">
              <div className={`step-dot ${i < current ? "done" : i === current ? "active" : "pending"}`}>
                {i < current
                  ? <CheckCircle size={14} strokeWidth={2.5} />
                  : i + 1
                }
              </div>
              <div className="step-label">{s}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`step-line ${i < current ? "done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── SEARCH INPUT ──────────────────────────────────────────────────────────────
function SearchInput({ value, onChange, placeholder = "Cari..." }) {
  return (
    <div className="search-wrap">
      <span className="search-icon-box">
        <Search size={16} strokeWidth={2} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="search-clear-btn" onClick={() => onChange("")}>
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
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
    if (existing) return;
    onCartChange([...cart, {
      produkId: prod.id, nama: prod.nama, satuan: prod.satuan, harga: prod.harga,
      qty: 1, panjang: null, lebar: null,
      luas: prod.satuan === "meter" ? "" : null,
      subtotal: prod.satuan === "meter" ? 0 : prod.harga * 1,
    }]);
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
      return { ...c, luas, panjang: null, lebar: null, subtotal: c.harga * c.qty * (parseFloat(luas) || 0) };
    }));
  };

  const total = cart.reduce((s, c) => s + c.subtotal, 0);
  const cartValid = cart.length > 0 && cart.every(c => c.satuan !== 'meter' || (parseFloat(c.luas) || 0) > 0);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="step-content" style={{ flex: 1, paddingBottom: 0 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Cari produk..." />

        <div className="tab-chips">
          {kategori.map((k) => (
            <div key={k} className={`tab-chip ${activeKat === k ? "active" : ""}`} onClick={() => setActiveKat(k)}>
              {k}
            </div>
          ))}
        </div>

        <div className="section-header">Pilih Produk</div>

        {loadingProducts ? (
          <div className="loading-screen">
            <Loader2 size={24} className="spinning" color={C.primary} />
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
                          {prod.satuan === "meter"
                            ? <><Ruler size={10} /> Meteran</>
                            : <><Package size={10} /> Satuan</>
                          }
                        </span>
                        {prod.kategori}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="prod-price">{rupiah(prod.harga)}</div>
                      <div className="prod-unit">{prod.unit_label}</div>
                      {inCart && (
                        <div className="badge badge-success" style={{ marginTop: 4 }}>
                          <CheckCircle size={10} /> Dipilih
                        </div>
                      )}
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
                          style={{ gap: 4 }}
                          onClick={(e) => { e.stopPropagation(); onCartChange(cart.filter((c) => c.produkId !== prod.id)); }}
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      </div>

                      {inCart.satuan === "meter" && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                            <button
                              className="qty-btn"
                              style={{ width: 36, height: 36, flexShrink: 0 }}
                              onClick={(e) => { e.stopPropagation(); updateLuas(prod.id, Math.max(0, (parseFloat(inCart.luas) || 0) - 1)); }}
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              value={inCart.luas === "" || inCart.luas == null ? "" : inCart.luas}
                              min="0" step="0.1" placeholder="Luas m²"
                              style={{ flex: 1, textAlign: "center", fontWeight: 700, padding: "9px 8px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                              onChange={(e) => { e.stopPropagation(); updateLuas(prod.id, e.target.value === "" ? "" : parseFloat(e.target.value) || 0); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              className="qty-btn"
                              style={{ width: 36, height: 36, flexShrink: 0 }}
                              onClick={(e) => { e.stopPropagation(); updateLuas(prod.id, (parseFloat(inCart.luas) || 0) + 1); }}
                            >
                              <Plus size={14} />
                            </button>
                            <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>m²</span>
                          </div>
                          {(parseFloat(inCart.luas) || 0) > 0 && (
                            <div className="meter-result" style={{ marginTop: 8 }}>
                              <span className="meter-result-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <Ruler size={12} /> {(parseFloat(inCart.luas) || 0).toFixed(2)} m² × {rupiah(inCart.harga)}/m²
                              </span>
                              <span className="meter-result-value">{rupiah(inCart.subtotal)}</span>
                            </div>
                          )}
                        </>
                      )}

                      {inCart.satuan === "satuan" && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div className="cart-item-controls" onClick={(e) => e.stopPropagation()}>
                            <button className="qty-btn" onClick={() => updateQty(prod.id, inCart.qty - 1)}><Minus size={13} /></button>
                            <span className="qty-display">{inCart.qty}</span>
                            <button className="qty-btn" onClick={() => updateQty(prod.id, inCart.qty + 1)}><Plus size={13} /></button>
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
                <div className="empty-icon"><Search size={40} color={C.border} /></div>
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
            {cart.some((c) => c.satuan === "meter" && ((parseFloat(c.luas) || 0) === 0)) && (
              <div style={{ background: C.dangerBg, border: `1px solid ${C.danger}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.danger, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} /> Luas karpet wajib diisi sebelum lanjut
              </div>
            )}
          </div>
        )}
        <button className="btn btn-primary btn-full" disabled={!cartValid} onClick={onNext}>
          Lanjut ke Customer <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── CUSTOMER PICKER MODAL ────────────────────────────────────────────────────
function CustomerPickerModal({ customers = [], loadingCustomers, selectedCust, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const filtered = customers
    .filter((c) => c.nama && c.nama !== "(Tanpa Nama)" || c.hp)
    .filter((c) => !search || c.nama.toLowerCase().includes(search.toLowerCase()) || c.hp.includes(search));

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,46,53,0.55)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "82vh", display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideUp .25s ease-out" }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: C.dark }}>Pilih Customer</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {customers.filter(c => c.nama && c.nama !== "(Tanpa Nama)" || c.hp).length} customer terdaftar
            </div>
          </div>
          <button onClick={onClose} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          {/* Menggunakan div wrapper agar ref bisa dipakai manual */}
          <div className="search-wrap" style={{ marginBottom: 0 }}>
            <span className="search-icon-box"><Search size={16} strokeWidth={2} /></span>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau nomor HP..."
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch("")}>
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
          {search && (
            <div style={{ fontSize: 11, color: C.muted, margin: "8px 0 0", paddingBottom: 8 }}>
              {filtered.length} hasil untuk "{search}"
            </div>
          )}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "12px 20px 24px" }}>
          {loadingCustomers ? (
            <div className="loading-screen">
              <Loader2 size={24} className="spinning" color={C.primary} />
              Memuat data customer...
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Users size={40} color={C.border} /></div>
              <div className="empty-text">{search ? `Tidak ada customer "${search}"` : "Belum ada customer"}</div>
            </div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className={`cust-card ${selectedCust?.id === c.id ? "selected" : ""}`} onClick={() => { onSelect(c); onClose(); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div className="cust-name">{c.nama}</div>
                    <div className="cust-phone"><Phone size={11} /> {c.hp || "-"}</div>
                  </div>
                  {selectedCust?.id === c.id
                    ? <div className="badge badge-success"><CheckCircle size={10} /> Dipilih</div>
                    : <ChevronRight size={18} color={C.border} />
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

// ─── STEP 2: CUSTOMER ─────────────────────────────────────────────────────────
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

  const cartValid = selectedCust && cart.length > 0;

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {showPicker && (
        <CustomerPickerModal customers={customers} loadingCustomers={loadingCustomers} selectedCust={selectedCust} onSelect={onSelect} onClose={() => setShowPicker(false)} />
      )}

      <div className="step-content" style={{ flex: 1 }}>
        {mode === "main" && (
          <>
            <div className="section-header">Customer</div>
            <div
              onClick={() => setShowPicker(true)}
              style={{ border: `2px dashed ${selectedCust ? C.primary : C.border}`, borderRadius: 14, padding: "18px 20px", cursor: "pointer", background: selectedCust ? C.primary50 : C.surface, display: "flex", alignItems: "center", gap: 14, marginBottom: 12, transition: "all .15s" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: selectedCust ? C.primary200 : C.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={20} color={selectedCust ? C.primary700 : C.muted} />
              </div>
              <div style={{ flex: 1 }}>
                {selectedCust ? (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{selectedCust.nama}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <Phone size={11} /> {selectedCust.hp || "-"}
                    </div>
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
              <ChevronRight size={18} color={selectedCust ? C.primary : C.muted} />
            </div>

            {selectedCust && (
              <button className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }} onClick={() => onSelect(null)}>
                <X size={12} /> Ganti Customer
              </button>
            )}

            <div className="or-divider">atau</div>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 4, marginBottom: 24 }} onClick={() => setMode("add")}>
              <Plus size={16} /> Tambah Customer Baru
            </button>

            <div className="section-header">Jumlah Item</div>
            <div style={{ background: C.primary50, border: `1px solid ${C.primary200}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.primary700, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={14} /> Khusus karpet, ukuran bisa diisi estimasi dahulu dan diupdate setelah pengukuran.
            </div>

            {cart.map((item) => (
              <div key={item.produkId} style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, background: C.white }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{item.nama}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {item.satuan === "meter"
                        ? `${(parseFloat(item.luas) || 0).toFixed(2)} m² · ${rupiah(item.subtotal)}`
                        : `${rupiah(item.harga)}/pcs · ${item.qty} pcs`}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: C.primary700 }}>
                    {item.satuan === "meter" ? `${(parseFloat(item.luas) || 0).toFixed(1)} m²` : `×${item.qty}`}
                  </div>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <div className="empty-icon"><ShoppingCart size={40} color={C.border} /></div>
                <div className="empty-text">Belum ada item dipilih di step sebelumnya</div>
              </div>
            )}
          </>
        )}

        {mode === "add" && (
          <div className="fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setMode("main")}><ArrowLeft size={14} /> Kembali</button>
              <div className="section-header" style={{ margin: 0, flex: 1 }}>Customer Baru</div>
            </div>
            <div className="field">
              <label>Nama Customer</label>
              <input placeholder="Masukkan nama lengkap" value={form.nama} autoFocus
                onChange={(e) => { setForm({ ...form, nama: e.target.value }); setErr({ ...err, nama: "" }); }} />
              {err.nama && <div style={{ color: C.danger, fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={12} />{err.nama}</div>}
            </div>
            <div className="field">
              <label>Nomor HP / WhatsApp</label>
              <input placeholder="08xxxxxxxxxx" value={form.hp} type="tel"
                onChange={(e) => { setForm({ ...form, hp: e.target.value }); setErr({ ...err, hp: "" }); }} />
              {err.hp && <div style={{ color: C.danger, fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={12} />{err.hp}</div>}
            </div>
            <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={saving} style={{ marginTop: 8 }}>
              {saving ? <><Loader2 size={16} className="spinning" /> Menyimpan...</> : "Simpan & Pilih Customer"}
            </button>
          </div>
        )}
      </div>

      <div className="footer-bar">
        {!cartValid && (
          <div style={{ background: C.warningBg, border: `1px solid ${C.warning}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={14} /> {!selectedCust ? "Pilih customer terlebih dahulu" : "Tidak ada item di cart"}
          </div>
        )}
        {cartValid && (
          <div style={{ background: C.successBg, border: `1px solid ${C.success}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#15803D", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle size={12} /> Siap dilanjutkan
              </div>
              <div style={{ fontSize: 14, color: C.dark, fontWeight: 700 }}>{selectedCust.nama}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{cart.reduce((s, c) => s + c.qty, 0)} item</div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" style={{ width: 80 }} onClick={onBack}><ArrowLeft size={14} /> Back</button>
          <button className="btn btn-primary" style={{ flex: 1 }} disabled={!cartValid} onClick={onNext}>
            Lanjut ke Pembayaran <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3: PEMBAYARAN ───────────────────────────────────────────────────────
function StepPembayaran({ cart, customer, payMethod, setPayMethod, catatan, setCatatan, onNext, onBack, saving }) {
  const [diskonType, setDiskonType] = useState("persen");
  const [diskonVal, setDiskonVal] = useState("");
  const [isHomeVisit, setIsHomeVisit] = useState(false);   // ← BARU

  const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const diskonAmount = diskonType === "persen"
    ? Math.round(subtotal * (parseFloat(diskonVal) || 0) / 100)
    : Math.min(parseFloat(diskonVal) || 0, subtotal);
  const total = subtotal - diskonAmount;

  // Kirim isHomeVisit ke parent lewat onNext
  const handleNext = () =>
    onNext({ diskonType, diskonVal: parseFloat(diskonVal) || 0, diskonAmount, isHomeVisit });

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="step-content" style={{ flex: 1 }}>

        {/* ── TIPE LAYANAN TOGGLE ─────────────────────────────────────────── */}
        <div className="section-header">Tipe Layanan</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {/* Laundry biasa */}
          <div
            onClick={() => setIsHomeVisit(false)}
            style={{
              border: `2px solid ${!isHomeVisit ? C.primary : C.border}`,
              borderRadius: 14,
              padding: "14px 12px",
              cursor: "pointer",
              background: !isHomeVisit ? C.primary100 : C.white,
              textAlign: "center",
              transition: "all .15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              {/* pakai icon WashingMachine — import dari lucide kalau belum ada */}
              <Layers size={24} color={!isHomeVisit ? C.primary700 : C.muted} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: !isHomeVisit ? C.primary700 : C.dark }}>
              Laundry
            </div>
            <div style={{ fontSize: 10, color: !isHomeVisit ? C.primary700 : C.muted, marginTop: 3 }}>
              Antar ke toko
            </div>
            {!isHomeVisit && (
              <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
                <CheckCircle size={14} color={C.primary} />
              </div>
            )}
          </div>

          {/* Home Visit */}
          <div
            onClick={() => setIsHomeVisit(true)}
            style={{
              border: `2px solid ${isHomeVisit ? "#F59E0B" : C.border}`,
              borderRadius: 14,
              padding: "14px 12px",
              cursor: "pointer",
              background: isHomeVisit ? "#FEF3C7" : C.white,
              textAlign: "center",
              transition: "all .15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <Home size={24} color={isHomeVisit ? "#D97706" : C.muted} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: isHomeVisit ? "#92400E" : C.dark }}>
              Home Visit
            </div>
            <div style={{ fontSize: 10, color: isHomeVisit ? "#D97706" : C.muted, marginTop: 3 }}>
              Cuci di tempat
            </div>
            {isHomeVisit && (
              <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
                <CheckCircle size={14} color="#D97706" />
              </div>
            )}
          </div>
        </div>

        {/* Banner info jika Home Visit */}
        {isHomeVisit && (
          <div style={{
            background: "#FEF3C7",
            border: "1px solid #FCD34D",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: 12,
            color: "#92400E",
            fontWeight: 600,
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Transaksi <strong>Home Visit</strong> langsung selesai — tidak masuk antrian cuci
              dan tidak tampil di halaman tracking pelanggan.
            </span>
          </div>
        )}

        {/* ── RINGKASAN ORDER ─────────────────────────────────────────────── */}
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

        {/* ── DISKON ──────────────────────────────────────────────────────── */}
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
            <div style={{ marginTop: 6, fontSize: 12, color: C.success, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle size={12} /> Hemat {rupiah(diskonAmount)}{diskonType === "persen" ? ` (${diskonVal}%)` : ""}
            </div>
          )}
        </div>

        {/* ── METODE PEMBAYARAN ────────────────────────────────────────────── */}
        <div className="section-header">Metode Pembayaran</div>
        <div className="pay-grid">
          {PAY_METHODS.map((m) => {
            const Icon = m.Icon;
            return (
              <div
                key={m.id}
                className={`pay-option ${payMethod === m.id ? "selected" : ""}`}
                onClick={() => setPayMethod(m.id)}
              >
                <div className="pay-option-icon"><Icon size={24} /></div>
                <div className="pay-option-name">{m.label}</div>
                <div className="pay-option-sub">{m.sub}</div>
              </div>
            );
          })}
        </div>

        {/* ── CATATAN ──────────────────────────────────────────────────────── */}
        <div className="field" style={{ marginTop: 16 }}>
          <label>Catatan (opsional)</label>
          <input
            placeholder="Mis: antar jam 10, waiting list, dll"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            {payMethod && (
              <div className="badge badge-primary">
                {PAY_METHODS.find((m) => m.id === payMethod)?.label}
              </div>
            )}
            {isHomeVisit && (
              <div style={{
                background: "#FEF3C7", color: "#92400E",
                fontSize: 10, fontWeight: 700, padding: "3px 8px",
                borderRadius: 6, border: "1px solid #FCD34D",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Home size={10} /> Home Visit
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" style={{ width: 80 }} onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={!payMethod || saving}
            onClick={handleNext}
          >
            {saving
              ? <><Loader2 size={16} className="spinning" /> Menyimpan...</>
              : <><CheckCircle size={16} /> Simpan Transaksi</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 4: SUKSES + NOTA ────────────────────────────────────────────────────
function StepSukses({ order, onReset, onViewNota }) {
  const [copied, setCopied] = useState(false);
  const notaUrl = `${window.location.origin}/nota/${order.notaId}`;
  const isHomeVisit = order.layananType === "home_visit";  // ← cek tipe layanan

  const copyLink = () => {
    navigator.clipboard?.writeText(notaUrl).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildWAMessage = () => {
    const fmt = (n) => "Rp " + (n || 0).toLocaleString("id-ID");
    const itemLines = order.items.map((it) => {
      const belum = it.satuan === "meter" && (!it.luas || it.luas === 0);
      if (belum) return `  - ${it.nama} (ukuran menyusul)`;
      if (it.satuan === "meter") return `  - ${it.nama} ${Number(it.luas).toFixed(2)} m² = ${fmt(it.subtotal)}`;
      return `  - ${it.qty}x ${it.nama} = ${fmt(it.subtotal)}`;
    }).join("\n");
    const subtotal = order.items.reduce((s, it) => s + (it.subtotal || 0), 0);
    const diskonAmount = order.diskon?.amount || 0;
    const totalAkhir = subtotal - diskonAmount;
    const diskonLine = diskonAmount > 0 ? `Diskon: -${fmt(diskonAmount)}\n` : "";
    const metodeLabel = order.metode || "Tunai";
    const trackingUrl = `${window.location.origin}/track/${order.notaId}`;

    // ── Pesan WA berbeda untuk Home Visit ──────────────────────────────────
    if (isHomeVisit) {
      return (
        `Halo ${order.customerNama}, terima kasih sudah mempercayakan perawatan ke *Carpetology*!\n\n` +
        `Berikut nota layanan *Home Visit* Anda:\n\n${itemLines}\n\n` +
        `${diskonAmount > 0 ? `Subtotal: ${fmt(subtotal)}\n${diskonLine}` : ""}` +
        `Total: *${fmt(totalAkhir)}*\nPembayaran: ${metodeLabel} ✅ Lunas\n\n` +
        `Layanan telah selesai dikerjakan di tempat Anda.\n\n` +
        `Lihat nota digital: ${notaUrl}\n\nTerima kasih — Carpetology`
      );
    }

    // ── Pesan WA laundry biasa ─────────────────────────────────────────────
    const adaBelumDiukur = order.items.some(it => it.satuan === "meter" && (!it.luas || it.luas === 0));
    const totalLine = adaBelumDiukur
      ? `Total sementara: *${fmt(totalAkhir)}* (menyusul setelah pengukuran)`
      : `${diskonAmount > 0 ? `Subtotal: ${fmt(subtotal)}\n${diskonLine}` : ""}Total: *${fmt(totalAkhir)}*`;
    const statusBayar = order.statusBayar === "Lunas" ? "Lunas" : "Belum lunas";
    return (
      `Halo ${order.customerNama}, terima kasih sudah mempercayakan cucian Anda ke *Carpetology*!\n\n` +
      `Berikut ringkasan order Anda:\n\n${itemLines}\n\n` +
      `${totalLine}\nPembayaran: ${metodeLabel} (${statusBayar})\n\n` +
      `*Garansi & Ketentuan:*\n- Estimasi selesai 5-7 hari kerja\n- Garansi cuci ulang gratis, klaim maks. 7 hari setelah pengambilan\n- Barang yang tidak diambil >30 hari menjadi tanggung jawab pelanggan\n\n` +
      `Nota digital: ${notaUrl}\n` +
      `Pantau progres cucian: ${trackingUrl}\n\n` +
      `Terima kasih atas kepercayaan Anda — Carpetology`
    );
  };

  const handleKirimWA = () => {
    const hp = (order.customerHp || "").replace(/\D/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${hp}?text=${encodeURIComponent(buildWAMessage())}`, "_blank");
  };

  const adaBelumDiukur = !isHomeVisit && order.items.some(it => it.satuan === "meter" && (!it.luas || it.luas === 0));
  const totalSudah = order.items
    .filter(it => !(it.satuan === "meter" && (!it.luas || it.luas === 0)))
    .reduce((s, it) => s + (it.subtotal || 0), 0);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="step-content" style={{ flex: 1 }}>

        {/* ── SUCCESS HEADER ── */}
        <div className="success-screen">
          <div className="success-icon" style={{ background: isHomeVisit ? "#FEF3C7" : C.successBg }}>
            {isHomeVisit
              ? <Home size={40} color="#D97706" />
              : <CheckCircle size={40} color={C.success} />
            }
          </div>
          <div className="success-title">Transaksi Berhasil!</div>
          <div className="success-sub">
            {isHomeVisit
              ? <>Layanan <strong>Home Visit</strong> untuk <strong>{order.customerNama}</strong> selesai dikerjakan.</>
              : <>Data order untuk <strong>{order.customerNama}</strong> berhasil disimpan.</>
            }
          </div>

          {/* Badge Home Visit di bawah subtitle */}
          {isHomeVisit && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#FEF3C7", color: "#92400E",
              border: "1.5px solid #FCD34D",
              borderRadius: 20, padding: "6px 16px",
              fontSize: 12, fontWeight: 700, marginTop: 4,
            }}>
              <Home size={13} /> Home Visit · Selesai di Tempat
            </div>
          )}
        </div>

        {/* ── WA BUTTON ── */}
        <div style={{
          background: "#dcfce7", border: "2px solid #22c55e",
          borderRadius: 16, padding: "16px", marginBottom: 16,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MessageCircle size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d" }}>Kirim Nota via WhatsApp</div>
              <div style={{ fontSize: 11, color: "#166534", marginTop: 1 }}>Otomatis ke {order.customerHp || "-"}</div>
            </div>
          </div>
          <button
            onClick={handleKirimWA}
            style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <MessageCircle size={18} /> Kirim Pesan WA + Nota
          </button>
        </div>

        {/* ── NOTA RINGKASAN ── */}
        <div className="nota-card" style={{ marginBottom: 16 }}>
          <div className="nota-header">
            <div className="nota-brand"><Layers size={22} /> Carpetology</div>
            <div className="nota-tagline">
              {isHomeVisit ? "Nota Layanan Home Visit" : "Nota Cuci Karpet & Laundry"}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#6B8894" }}>
              {order.notaId} • {order.tanggal}
            </div>
          </div>
          <div className="nota-body">
            <div className="nota-row"><span className="nota-key">Customer</span><span className="nota-val">{order.customerNama}</span></div>
            <div className="nota-row"><span className="nota-key">No. HP</span><span className="nota-val">{order.customerHp}</span></div>
            <div className="nota-divider" />

            {order.items.map((item, i) => {
              const belumDiukur = item.satuan === "meter" && (!item.luas || item.luas === 0);
              return (
                <div key={i} className="nota-item-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span className="nota-item-name" style={{ fontWeight: 600 }}>{item.nama}</span>
                    <span className="nota-item-price">{belumDiukur ? "—" : rupiah(item.subtotal)}</span>
                  </div>
                  {belumDiukur ? (
                    <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} /> Menunggu pengukuran
                    </span>
                  ) : item.satuan === "meter" ? (
                    <span style={{ fontSize: 11, color: "#6B8894", display: "flex", alignItems: "center", gap: 4 }}>
                      <Ruler size={11} /> {Number(item.luas).toFixed(2)} m² × {rupiah(item.harga)}/m²
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#6B8894" }}>{item.qty} pcs × {rupiah(item.harga)}</span>
                  )}
                </div>
              );
            })}

            {adaBelumDiukur ? (
              <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#92400E" }}>Subtotal sementara</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>{rupiah(totalSudah)}</span>
                </div>
                <div style={{ fontSize: 11, color: "#92400E", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={11} /> Biaya karpet menyusul setelah pengukuran
                </div>
              </div>
            ) : (
              <div className="nota-total-row" style={{ marginTop: 12 }}>
                <span className="nota-total-label">Total</span>
                <span className="nota-total-val">{rupiah(order.total)}</span>
              </div>
            )}

            {/* ── BADGE STATUS ── */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <span className={`badge ${order.metode === "Belum Payment" ? "badge-warning" : "badge-success"}`}>
                {order.metode}
              </span>
              {isHomeVisit ? (
                // Home Visit: badge selesai (bukan Waiting List)
                <>
                  <span className="badge badge-success" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle size={10} /> Lunas
                  </span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D",
                  }}>
                    <Home size={10} /> Home Visit
                  </span>
                </>
              ) : (
                <span className="badge badge-gray">Waiting List</span>
              )}
            </div>
          </div>
        </div>

        {/* ── LINK NOTA ── */}
        <div className="nota-link-box">
          <div className="nota-link-text" style={{ fontSize: 11, wordBreak: "break-all" }}>{notaUrl}</div>
          <button className="btn btn-sm btn-ghost" onClick={copyLink} style={{ gap: 4 }}>
            {copied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
        {copied && <div className="toast"><CheckCircle size={14} /> Link nota berhasil disalin!</div>}
      </div>

      {/* ── FOOTER ── */}
      <div className="footer-bar">
        <button className="btn btn-ghost btn-full" onClick={() => onViewNota(order.notaId)} style={{ gap: 6 }}>
          <Eye size={16} /> Lihat Halaman Nota
        </button>
        <button className="btn btn-primary btn-full" onClick={onReset} style={{ gap: 6 }}>
          <Plus size={16} /> Transaksi Baru
        </button>
      </div>
    </div>
  );
}

// ─── EDIT NOTA MODAL ──────────────────────────────────────────────────────────
// ─── EDIT NOTA MODAL ──────────────────────────────────────────────────────────
function EditNotaModal({ order, onClose, onSaved }) {
  const [metode, setMetode] = useState(order.metode || "");
  const [items, setItems] = useState(() => (order.items || []).map(it => ({ ...it })));
  const [statusBayar, setStatusBayar] = useState(order.statusBayar || "Belum Lunas");
  const [saving, setSaving] = useState(false);
  const [statusOrder, setStatusOrder] = useState(order?.status_order || order?.status || "Waiting List");

  // ── DISKON STATE — inisialisasi dari data order yang ada ──────────────────
  const [diskonType, setDiskonType] = useState(order.diskon?.type || "persen");
  const [diskonVal, setDiskonVal] = useState(
    order.diskon?.nilai != null ? String(order.diskon.nilai) : ""
  );

  const totalBaru = items.reduce((s, it) => s + (it.subtotal || 0), 0);

  // Hitung diskon secara reaktif
  const diskonAmount = diskonType === "persen"
    ? Math.round(totalBaru * (parseFloat(diskonVal) || 0) / 100)
    : Math.min(parseFloat(diskonVal) || 0, totalBaru);

  const totalAkhir = totalBaru - diskonAmount;

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

  const EDIT_PAY_METHODS = [
    { id: "Tunai", Icon: Banknote },
    { id: "QRIS", Icon: QrCode },
    { id: "Transfer", Icon: Building2 },
    { id: "Belum Payment", Icon: Clock },
  ];

  const handleSimpan = async () => {
    setSaving(true);
    try {
      const { doc, updateDoc, collection, query, where, getDocs } = await import("firebase/firestore");
      const itemsPayload = items.map((it) => ({
        produkId: it.produkId || "", nama: it.nama, satuan: it.satuan, qty: it.qty, harga: it.harga,
        panjang: null, lebar: null,
        luas: it.satuan === "meter" ? (parseFloat(it.luas) || 0) : null,
        subtotal: it.subtotal,
      }));
      const q = query(collection(db, "transactions"), where("notaId", "==", order.notaId));
      const txSnap = await getDocs(q);
      if (txSnap.empty) { alert("Transaksi tidak ditemukan!"); return; }
      for (const txDoc of txSnap.docs) {
        await updateDoc(doc(db, "transactions", txDoc.id), {
          items: itemsPayload,
          subtotal_harga: totalBaru,
          diskon: {
            type: diskonType,
            nilai: parseFloat(diskonVal) || 0,
            amount: diskonAmount,
          },
          total_harga: totalAkhir,
          statusBayar,
          metode_pembayaran: metode,
          status_order: statusOrder,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error("Gagal menyimpan:", e);
      alert("Gagal menyimpan: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(26,46,53,0.6)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.white, width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90vh", display: "flex", flexDirection: "column", animation: "slideUp .25s ease-out" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: C.dark }}>Edit Nota</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{order.notaId}</div>
          </div>
          <button onClick={onClose} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px 8px" }}>

          {/* Status */}
          <div className="section-header">Status</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {["Belum Lunas", "Lunas"].map(s => (
              <div key={s} onClick={() => setStatusBayar(s)} style={{
                flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                border: `2px solid ${statusBayar === s ? C.primary : C.border}`,
                background: statusBayar === s ? C.primary100 : C.white,
                fontWeight: 700, fontSize: 13, color: statusBayar === s ? C.primary700 : C.muted,
                transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                {s === "Lunas" ? <><CheckCircle size={14} /> Lunas</> : <><Clock size={14} /> Belum Lunas</>}
              </div>
            ))}
          </div>

          {/* Metode Pembayaran */}
          <div className="section-header">Metode Pembayaran</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {EDIT_PAY_METHODS.map((m) => {
              const Icon = m.Icon;
              return (
                <div key={m.id} onClick={() => setMetode(m.id)} style={{
                  border: `2px solid ${metode === m.id ? C.primary : C.border}`, borderRadius: 12, padding: "12px",
                  cursor: "pointer", textAlign: "center", background: metode === m.id ? C.primary100 : C.white,
                  transition: "all .15s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <Icon size={20} color={metode === m.id ? C.primary700 : C.darkMid} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: metode === m.id ? C.primary700 : C.dark }}>{m.id}</div>
                </div>
              );
            })}
          </div>

          {/* Detail Item */}
          <div className="section-header">Detail Item</div>
          {items.map((item, idx) => (
            <div key={idx} style={{ border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10, background: C.surface }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{item.nama}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button className="qty-btn" onClick={() => updateQty(idx, item.qty - 1)}><Minus size={13} /></button>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                  <button className="qty-btn" onClick={() => updateQty(idx, item.qty + 1)}><Plus size={13} /></button>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
                  Harga {item.satuan === "meter" ? "/m²" : "/pcs"}
                </div>
                <input type="number" value={item.harga} onChange={e => updateHarga(idx, e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              {item.satuan === "meter" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {["panjang", "lebar"].map(field => (
                      <div key={field}>
                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>
                          {field.charAt(0).toUpperCase() + field.slice(1)} (m)
                        </div>
                        <input type="number" step="0.1" min="0" value={item[field] ?? 0}
                          onChange={e => updateMeter(idx, field, e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ background: C.primary100, borderRadius: 8, padding: "8px 12px", marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.primary700, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <Ruler size={12} /> {(item.panjang || 0).toFixed(1)}m × {(item.lebar || 0).toFixed(1)}m = {(item.luas || 0).toFixed(2)} m²
                    </span>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: C.primary700 }}>{rupiah(item.subtotal)}</span>
                  </div>
                </>
              )}
              {item.satuan !== "meter" && (
                <div style={{ background: C.primary100, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.primary700 }}>{item.qty} × {rupiah(item.harga)}</span>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: C.primary700 }}>{rupiah(item.subtotal)}</span>
                </div>
              )}
            </div>
          ))}

          {/* ── DISKON ─────────────────────────────────────────────────────── */}
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
          <div style={{ marginBottom: 20 }}>
            <input
              type="number"
              placeholder={diskonType === "persen" ? "Contoh: 10 (artinya 10%)" : "Contoh: 50000"}
              value={diskonVal}
              min="0"
              max={diskonType === "persen" ? 100 : totalBaru}
              onChange={(e) => setDiskonVal(e.target.value)}
              style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: C.dark, outline: "none", boxSizing: "border-box" }}
            />
            {diskonAmount > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: C.success, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <CheckCircle size={12} /> Hemat {rupiah(diskonAmount)}{diskonType === "persen" ? ` (${diskonVal}%)` : ""}
              </div>
            )}
          </div>

          {/* Total */}
          <div style={{ background: C.dark, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            {diskonAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Subtotal</span>
                <span style={{ fontSize: 12, color: C.muted, textDecoration: "line-through" }}>{rupiah(totalBaru)}</span>
              </div>
            )}
            {diskonAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.success }}>Diskon</span>
                <span style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>−{rupiah(diskonAmount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>Total</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: C.white }}>{rupiah(totalAkhir)}</span>
            </div>
          </div>

        </div>

        <div style={{ padding: "12px 20px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button className="btn btn-primary btn-full" onClick={handleSimpan} disabled={saving} style={{ gap: 6 }}>
            {saving ? <><Loader2 size={16} className="spinning" /> Menyimpan...</> : <><CheckCircle size={16} /> Simpan Perubahan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NOTA PAGE ─────────────────────────────────────────────────────────────────
function NotaPage({ notaId, orders, onBack }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'Admin';
  const canGoBack = isAdmin && onBack;
  const canEdit = isAdmin;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleHapus = async () => {
    setDeleting(true);
    try {
      const { collection, query, where, getDocs, deleteDoc, doc } = await import("firebase/firestore");
      const q = query(collection(db, "transactions"), where("notaId", "==", notaId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "transactions", d.id));
      }
      onBack(); // kembali ke riwayat setelah hapus
    } catch (e) {
      alert("Gagal menghapus nota: " + e.message);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    let unsub = null;
    const fetchNota = async () => {
      try {
        const { collection, query, where, onSnapshot } = await import("firebase/firestore");
        const q = query(collection(db, "transactions"), where("notaId", "==", notaId));
        unsub = onSnapshot(q, (snap) => {
          if (!snap.empty) {
            const docSnap = snap.docs[0];
            const d = docSnap.data();
            setOrder({
              id: docSnap.id,
              customerNama: d.nama || "",
              customerHp: d.hp || "-",
              items: (d.items || []).map(it => ({ ...it, qty: Number(it.qty || 1), harga: Number(it.harga || 0), luas: it.luas != null ? Number(it.luas) : null, subtotal: Number(it.subtotal || 0) })),
              subtotal: Number(d.subtotal_harga || d.total_harga || 0),
              diskon: d.diskon || null,
              total: Number(d.total_harga || 0),
              metode: d.metode_pembayaran || "",
              statusBayar: d.statusBayar || "Belum Lunas",
              status: d.status_order || d.status || "Waiting List",
              tanggal: d.tanggal || "",
              timestamp: d.created_at || null,
              catatan: d.catatan || "",
              notaId: d.notaId || docSnap.id,
            });
          } else { setOrder(null); }
          setLoading(false);
        }, (err) => { console.error("Gagal fetch nota:", err); setLoading(false); });
      } catch (e) { console.error("Gagal import firestore:", e); setLoading(false); }
    };
    fetchNota();
    return () => { if (unsub) unsub(); };
  }, [notaId]);

  if (loading) {
    return (
      <div className="kasir-root">
        <div style={{ background: C.dark, padding: "20px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Layers size={24} /> Carpetology
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Jasa Cuci Karpet & Laundry Professional</div>
        </div>
        <div className="loading-screen" style={{ marginTop: 40 }}>
          <Loader2 size={24} className="spinning" color={C.primary} />
          Memuat nota...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="kasir-root">
        <div style={{ background: C.dark, padding: "20px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Layers size={24} /> Carpetology
          </div>
        </div>
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div className="empty-icon"><AlertCircle size={40} color={C.danger} /></div>
          <div className="empty-text">Nota <strong>{notaId}</strong> tidak ditemukan</div>
          {canGoBack && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={onBack}>
              <ArrowLeft size={14} /> Kembali
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="kasir-root">
      {showEdit && <EditNotaModal order={order} onClose={() => setShowEdit(false)} onSaved={() => setSaved(true)} />}
      {saved && <div className="toast"><CheckCircle size={14} /> Nota berhasil diupdate!</div>}

      <div style={{ background: C.dark, padding: "20px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Layers size={24} /> Carpetology
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Jasa Cuci Karpet & Laundry Professional</div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Status bar */}
        <div style={{ background: order.statusBayar === "Lunas" ? C.successBg : C.warningBg, border: `1px solid ${order.statusBayar === "Lunas" ? C.success : C.warning}`, borderRadius: 12, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: order.statusBayar === "Belum Lunas" ? "#D97706" : "#15803D", display: "flex", alignItems: "center", gap: 6 }}>
            {order.statusBayar === "Belum Lunas" ? <><Clock size={14} /> Belum Lunas</> : <><CheckCircle size={14} /> Lunas</>}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>{fmtDate(order.tanggal || order.timestamp)}</div>
        </div>

        {/* Customer info */}
        <div style={{ background: C.surface, borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Info Customer</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>{order.customerNama}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><Phone size={13} /> {order.customerHp}</div>
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
                    <div style={{ fontSize: 11, color: C.warning, marginTop: 2, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> Menunggu pengukuran</div>
                  ) : item.satuan === "meter" ? (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><Ruler size={11} /> {(item.luas || 0).toFixed(2)} m² × {rupiah(item.harga)}/m²</div>
                  ) : (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.qty} pcs × {rupiah(item.harga)}</div>
                  )}
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: belumDiukur ? C.muted : C.dark, marginLeft: 12 }}>
                  {belumDiukur ? "—" : rupiah(item.subtotal)}
                </div>
              </div>
            );
          })}
          {order.diskon?.amount > 0 && (
            <>
              <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.muted }}>Subtotal</span>
                <span style={{ fontSize: 12, color: C.muted }}>{rupiah(order.subtotal || order.total + order.diskon.amount)}</span>
              </div>
              <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", background: C.successBg }}>
                <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle size={12} /> Diskon {order.diskon.type === "persen" ? `${order.diskon.nilai}%` : ""}
                </span>
                <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>-{rupiah(order.diskon.amount)}</span>
              </div>
            </>
          )}
          <div style={{ padding: "14px 16px", background: C.primary100, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.primary700 }}>Total</span>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: C.primary700 }}>{rupiah(order.total)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <span className={`badge ${order.statusBayar === "Lunas" ? "badge-success" : "badge-warning"}`} style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            {order.statusBayar === "Lunas" ? <><CheckCircle size={12} /> Lunas</> : <><Clock size={12} /> Belum Lunas</>}
          </span>
          <span className="badge badge-gray" style={{ padding: "6px 12px", fontSize: 12 }}>{order.metode || "Belum Payment"}</span>
          <span className="badge badge-primary" style={{ padding: "6px 12px", fontSize: 12 }}>{order.status || "Waiting List"}</span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }} className="no-print">
          {canGoBack && (
            <button className="btn btn-secondary" style={{ flex: 1, gap: 6 }} onClick={onBack}>
              <ArrowLeft size={14} /> Kembali
            </button>
          )}
          <button className="btn btn-primary" style={{ flex: 1, gap: 6 }} onClick={() => window.print()}>
            <Printer size={16} /> Cetak Nota
          </button>
        </div>

        {canEdit && (
          <>
            <button
              className="btn btn-ghost btn-full no-print"
              style={{ marginBottom: 12, gap: 6 }}
              onClick={() => setShowEdit(true)}
            >
              <Edit3 size={16} /> Edit Nota
            </button>

            {!showDeleteConfirm ? (
              <button
                className="btn btn-danger btn-full no-print"
                style={{ marginBottom: 12, gap: 6 }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={16} /> Hapus Nota Ini
              </button>
            ) : (
              <div style={{
                background: C.dangerBg, border: `2px solid ${C.danger}`,
                borderRadius: 12, padding: "14px 16px", marginBottom: 12
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.danger, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={16} /> Hapus nota ini secara permanen?
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                  Data transaksi <strong>{notaId}</strong> akan terhapus dan tidak bisa dikembalikan.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Batal
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1, gap: 4 }}
                    onClick={handleHapus}
                    disabled={deleting}
                  >
                    {deleting ? <><Loader2 size={14} className="spinning" /> Menghapus...</> : <><Trash2 size={14} /> Ya, Hapus</>}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted }}>Terima kasih telah mempercayai</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.primary, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Layers size={14} /> Carpetology
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Lacak progres cuci Anda dengan mudah</div>
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT MODAL ─────────────────────────────────────────────────────────────
function ExportModal({ orders, onClose }) {
  const BULAN_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const now = new Date();
  const [exportMode, setExportMode] = useState("preset"); // "preset" | "custom" | "month"
  const [preset, setPreset] = useState("today");
  const [customFrom, setCustomFrom] = useState(now.toISOString().split("T")[0]);
  const [customTo, setCustomTo] = useState(now.toISOString().split("T")[0]);
  const [exportBulan, setExportBulan] = useState(now.getMonth());
  const [exportTahun, setExportTahun] = useState(now.getFullYear());
  const [exporting, setExporting] = useState(false);

  const parseOrderDate = (o) => {
    if (o.timestamp?.toDate) return o.timestamp.toDate();
    if (o.tanggal) return new Date(o.tanggal);
    return new Date(0);
  };

  const getDateRange = () => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    if (exportMode === "preset") {
      if (preset === "today") return { from: todayStart, to: todayEnd, label: `Hari_Ini_${todayStart.getDate()}${BULAN_LABEL[todayStart.getMonth()]}${todayStart.getFullYear()}` };
      if (preset === "yesterday") {
        const y = new Date(todayStart); y.setDate(y.getDate() - 1);
        const ye = new Date(y); ye.setHours(23, 59, 59, 999);
        return { from: y, to: ye, label: `Kemarin_${y.getDate()}${BULAN_LABEL[y.getMonth()]}${y.getFullYear()}` };
      }
      if (preset === "week") {
        const w = new Date(todayStart); w.setDate(w.getDate() - 6);
        return { from: w, to: todayEnd, label: `7Hari_${w.getDate()}${BULAN_LABEL[w.getMonth()]}-${todayStart.getDate()}${BULAN_LABEL[todayStart.getMonth()]}${todayStart.getFullYear()}` };
      }
      if (preset === "month") {
        const m = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
        return { from: m, to: todayEnd, label: `BulanIni_${BULAN_LABEL[todayStart.getMonth()]}${todayStart.getFullYear()}` };
      }
    }
    if (exportMode === "custom") {
      const from = new Date(customFrom); from.setHours(0, 0, 0, 0);
      const to = new Date(customTo); to.setHours(23, 59, 59, 999);
      const fLabel = `${String(from.getDate()).padStart(2, "0")}${BULAN_LABEL[from.getMonth()]}`;
      const tLabel = `${String(to.getDate()).padStart(2, "0")}${BULAN_LABEL[to.getMonth()]}${to.getFullYear()}`;
      return { from, to, label: `${fLabel}-${tLabel}` };
    }
    if (exportMode === "month") {
      const from = new Date(exportTahun, exportBulan, 1);
      const to = new Date(exportTahun, exportBulan + 1, 0, 23, 59, 59, 999);
      return { from, to, label: `${BULAN_LABEL[exportBulan]}_${exportTahun}` };
    }
  };

  const getFilteredOrders = () => {
    const range = getDateRange();
    if (!range) return [];
    return orders.filter((o) => {
      const d = parseOrderDate(o);
      return d >= range.from && d <= range.to;
    }).sort((a, b) => parseOrderDate(a) - parseOrderDate(b));
  };

  const preview = getFilteredOrders();
  const previewRevenue = preview.filter(o => o.statusBayar === "Lunas").reduce((s, o) => s + o.total, 0);
  const previewPiutang = preview.filter(o => o.statusBayar !== "Lunas").reduce((s, o) => s + o.total, 0);

  const PRESETS = [
    { id: "today", label: "Hari Ini" },
    { id: "yesterday", label: "Kemarin" },
    { id: "week", label: "7 Hari Terakhir" },
    { id: "month", label: "Bulan Ini" },
  ];

  const handleExport = async () => {
    const range = getDateRange();
    const data = getFilteredOrders();
    if (data.length === 0) return;
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Sheet 1: Transaksi
      const sheet1 = data.map((o) => ({
        "Tanggal": o.tanggal || "",
        "Nota ID": o.notaId || o.id,
        "Customer": o.customerNama,
        "No. HP": o.customerHp,
        "Item": (o.items || []).map((it) =>
          it.satuan === "meter"
            ? `${it.nama} (${(parseFloat(it.luas) || 0).toFixed(1)}m²)`
            : `${it.nama} (${it.qty}x)`
        ).join(" | "),
        "Subtotal": o.subtotal || o.total,
        "Diskon (Rp)": o.diskon?.amount || 0,
        "Total": o.total,
        "Metode": o.metode,
        "Status Bayar": o.statusBayar,
        "Catatan": o.catatan || "",
      }));
      const ws1 = XLSX.utils.json_to_sheet(sheet1);
      ws1["!cols"] = [
        { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 16 },
        { wch: 40 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
        { wch: 12 }, { wch: 14 }, { wch: 24 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "Transaksi");

      // Sheet 2: Rekap per Hari
      const byDay = {};
      data.forEach((o) => {
        const d = parseOrderDate(o);
        const key = `${String(d.getDate()).padStart(2, "0")} ${BULAN_LABEL[d.getMonth()]} ${d.getFullYear()}`;
        if (!byDay[key]) byDay[key] = { tanggal: key, jumlah: 0, lunas: 0, belum: 0, total: 0 };
        byDay[key].jumlah++;
        byDay[key].total += o.total;
        if (o.statusBayar === "Lunas") byDay[key].lunas += o.total;
        else byDay[key].belum += o.total;
      });
      const sheet2 = Object.values(byDay).map((r) => ({
        "Tanggal": r.tanggal,
        "Jumlah Transaksi": r.jumlah,
        "Omzet": r.total,
        "Lunas": r.lunas,
        "Piutang": r.belum,
      }));
      // Tambah baris total
      sheet2.push({
        "Tanggal": "TOTAL",
        "Jumlah Transaksi": data.length,
        "Omzet": previewRevenue + previewPiutang,
        "Lunas": previewRevenue,
        "Piutang": previewPiutang,
      });
      const ws2 = XLSX.utils.json_to_sheet(sheet2);
      ws2["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Rekap Harian");

      XLSX.writeFile(wb, `Carpetology_${range.label}.xlsx`);
      onClose();
    } catch (e) {
      alert("Gagal export: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(26,46,53,0.6)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: C.white, width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88vh", display: "flex", flexDirection: "column", animation: "slideUp .25s ease-out" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: C.dark, display: "flex", alignItems: "center", gap: 8 }}>
              <Download size={18} color={C.primary} /> Export Excel
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Pilih rentang tanggal yang ingin diexport</div>
          </div>
          <button onClick={onClose} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px" }}>

          {/* Mode selector */}
          <div className="section-header">Tipe Rentang</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            {[
              { id: "preset", label: "Preset Cepat" },
              { id: "custom", label: "Pilih Tanggal" },
              { id: "month", label: "Per Bulan" },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setExportMode(m.id)}
                style={{
                  padding: "10px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                  border: `2px solid ${exportMode === m.id ? C.primary : C.border}`,
                  background: exportMode === m.id ? C.primary100 : C.white,
                  fontSize: 12, fontWeight: 700,
                  color: exportMode === m.id ? C.primary700 : C.muted,
                  transition: "all .15s",
                }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Preset options */}
          {exportMode === "preset" && (
            <>
              <div className="section-header">Pilih Periode</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {PRESETS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    style={{
                      padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                      border: `2px solid ${preset === p.id ? C.primary : C.border}`,
                      background: preset === p.id ? C.primary100 : C.white,
                      fontSize: 13, fontWeight: 700,
                      color: preset === p.id ? C.primary700 : C.dark,
                      transition: "all .15s", textAlign: "center",
                    }}
                  >
                    {p.label}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Custom date range */}
          {exportMode === "custom" && (
            <>
              <div className="section-header">Rentang Tanggal</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Dari Tanggal</div>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", color: C.dark, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase" }}>Sampai Tanggal</div>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={now.toISOString().split("T")[0]}
                    onChange={(e) => setCustomTo(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", color: C.dark, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Month picker */}
          {exportMode === "month" && (
            <>
              <div className="section-header">Pilih Bulan</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
                <select
                  value={exportBulan}
                  onChange={(e) => setExportBulan(Number(e.target.value))}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", background: C.white, color: C.dark, outline: "none" }}
                >
                  {BULAN_LABEL.map((b, i) => <option key={i} value={i}>{b}</option>)}
                </select>
                <select
                  value={exportTahun}
                  onChange={(e) => setExportTahun(Number(e.target.value))}
                  style={{ width: 100, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: "inherit", background: C.white, color: C.dark, outline: "none" }}
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {/* Quick month chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                {BULAN_LABEL.map((b, i) => (
                  <div
                    key={i}
                    className={`tab-chip ${exportBulan === i ? "active" : ""}`}
                    style={{ padding: "4px 10px", fontSize: 11 }}
                    onClick={() => setExportBulan(i)}
                  >
                    {b}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Preview stats */}
          <div className="section-header">Preview Data</div>
          <div style={{
            background: preview.length > 0 ? C.primary50 : C.surface,
            border: `1.5px solid ${preview.length > 0 ? C.primary200 : C.border}`,
            borderRadius: 12, padding: "14px 16px", marginBottom: 8
          }}>
            {preview.length === 0 ? (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "8px 0" }}>
                Tidak ada transaksi di periode ini
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Transaksi</div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: C.dark }}>{preview.length}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#15803D", marginBottom: 2 }}>Lunas</div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: "#15803D" }}>{rupiah(previewRevenue)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#D97706", marginBottom: 2 }}>Piutang</div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: "#D97706" }}>{rupiah(previewPiutang)}</div>
                  </div>
                </div>
                <div style={{ background: C.primary100, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.primary700 }}>Total Omzet</span>
                  <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 800, color: C.primary700 }}>{rupiah(previewRevenue + previewPiutang)}</span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <FileText size={11} /> File berisi 2 sheet: <strong>Transaksi</strong> (detail) + <strong>Rekap Harian</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            className="btn btn-primary btn-full"
            onClick={handleExport}
            disabled={preview.length === 0 || exporting}
            style={{ gap: 6 }}
          >
            {exporting
              ? <><Loader2 size={16} className="spinning" /> Mengexport...</>
              : <><Download size={16} /> Export {preview.length} Transaksi ke Excel</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RIWAYAT PAGE (UPDATED) ───────────────────────────────────────────────────
function RiwayatPage({ orders, loadingOrders, onViewNota }) {
  const [search, setSearch] = useState("");
  const [filterMetode, setFilterMetode] = useState("Semua");
  const [viewMode, setViewMode] = useState("date");
  const [showExport, setShowExport] = useState(false);

  const BULAN_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const HARI_LABEL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const now = new Date();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const metodeOptions = ["Semua", "Tunai", "QRIS", "Transfer", "Belum Payment"];

  const parseOrderDate = (o) => {
    if (o.timestamp?.toDate) return o.timestamp.toDate();
    if (o.tanggal) return new Date(o.tanggal);
    return new Date(0);
  };

  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const formatDateLabel = (date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (isSameDay(date, today)) return "Hari Ini";
    if (isSameDay(date, yesterday)) return "Kemarin";
    return `${HARI_LABEL[date.getDay()]}, ${date.getDate()} ${BULAN_LABEL[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatDateShort = (date) =>
    `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

  const goDay = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const isToday = isSameDay(selectedDate, today);

  const filteredByDate = orders
    .filter((o) => isSameDay(parseOrderDate(o), selectedDate))
    .filter((o) => { const s = search.toLowerCase(); return (o.customerNama || "").toLowerCase().includes(s) || (o.customerHp || "").includes(s) || (o.id || "").toLowerCase().includes(s); })
    .filter((o) => filterMetode === "Semua" || o.metode === filterMetode)
    .sort((a, b) => parseOrderDate(b) - parseOrderDate(a));

  const buildGrouped = () => {
    const base = orders
      .filter((o) => { const s = search.toLowerCase(); return (o.customerNama || "").toLowerCase().includes(s) || (o.customerHp || "").includes(s); })
      .filter((o) => filterMetode === "Semua" || o.metode === filterMetode);
    const groups = {};
    base.forEach((o) => {
      const d = parseOrderDate(o);
      d.setHours(0, 0, 0, 0);
      const key = d.getTime();
      if (!groups[key]) groups[key] = { date: new Date(d), items: [] };
      groups[key].items.push(o);
    });
    return Object.values(groups).sort((a, b) => b.date - a.date);
  };

  const totalRevenue = filteredByDate.filter(o => o.statusBayar === "Lunas").reduce((s, o) => s + o.total, 0);
  const totalPiutang = filteredByDate.filter(o => o.statusBayar !== "Lunas").reduce((s, o) => s + o.total, 0);
  const grouped = viewMode === "grouped" ? buildGrouped() : null;

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {showExport && <ExportModal orders={orders} onClose={() => setShowExport(false)} />}

      <div className="step-content" style={{ flex: 1 }}>
        {/* Top row: view toggle + export */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
          <button onClick={() => setViewMode("date")} className={`btn btn-sm ${viewMode === "date" ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1 }}>
            Per Tanggal
          </button>
          <button onClick={() => setViewMode("grouped")} className={`btn btn-sm ${viewMode === "grouped" ? "btn-primary" : "btn-secondary"}`} style={{ flex: 1 }}>
            Grup Hari
          </button>
          <button onClick={() => setShowExport(true)} className="btn btn-ghost btn-sm" style={{ gap: 4, flexShrink: 0 }}>
            <Download size={14} /> Excel
          </button>
        </div>

        {viewMode === "date" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: C.surface, borderRadius: 12, padding: "8px 12px", border: `1.5px solid ${C.border}` }}>
              <button onClick={() => goDay(-1)} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.dark, flexShrink: 0 }}>
                <ArrowLeft size={14} />
              </button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{formatDateLabel(selectedDate)}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{formatDateShort(selectedDate)}</div>
              </div>
              <button onClick={() => goDay(1)} disabled={isToday} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, cursor: isToday ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: isToday ? C.border : C.dark, flexShrink: 0, opacity: isToday ? 0.4 : 1 }}>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
              {[{ label: "Kemarin", date: yesterday }, { label: "Hari Ini", date: today }].map(({ label, date }) => (
                <div key={label} className={`tab-chip ${isSameDay(selectedDate, date) ? "active" : ""}`} onClick={() => setSelectedDate(new Date(date))}>{label}</div>
              ))}
              <input
                type="date"
                max={today.toISOString().split("T")[0]}
                value={selectedDate.toISOString().split("T")[0]}
                onChange={(e) => { const d = new Date(e.target.value); d.setHours(0, 0, 0, 0); setSelectedDate(d); }}
                style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 20, border: `1.5px solid ${C.border}`, fontSize: 12, fontFamily: "inherit", color: C.dark, background: C.white, outline: "none", cursor: "pointer" }}
              />
            </div>

            <div className="mini-stats" style={{ marginBottom: 14 }}>
              <div className="mini-stat"><div className="mini-stat-label">Transaksi</div><div className="mini-stat-value">{filteredByDate.length}</div></div>
              <div className="mini-stat"><div className="mini-stat-label">Omzet</div><div className="mini-stat-value" style={{ fontSize: 13 }}>{rupiah(totalRevenue + totalPiutang)}</div></div>
              <div className="mini-stat"><div className="mini-stat-label" style={{ color: "#15803D", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={11} /> Lunas</div><div className="mini-stat-value" style={{ color: "#15803D", fontSize: 13 }}>{rupiah(totalRevenue)}</div></div>
              <div className="mini-stat"><div className="mini-stat-label" style={{ color: "#D97706", display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> Piutang</div><div className="mini-stat-value" style={{ color: "#D97706", fontSize: 13 }}>{rupiah(totalPiutang)}</div></div>
            </div>
          </>
        )}

        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama, HP, atau ID..." />
        <div className="tab-chips">
          {metodeOptions.map((m) => (
            <div key={m} className={`tab-chip ${filterMetode === m ? "active" : ""}`} onClick={() => setFilterMetode(m)}>{m}</div>
          ))}
        </div>

        {loadingOrders ? (
          <div className="loading-screen"><Loader2 size={24} className="spinning" color={C.primary} />Memuat riwayat transaksi...</div>
        ) : viewMode === "date" ? (
          <>
            <div className="section-header">{filteredByDate.length} transaksi · {formatDateLabel(selectedDate)}</div>
            {filteredByDate.map((order) => <HistoryCard key={order.id} order={order} onViewNota={onViewNota} fmtDate={fmtDate} />)}
            {filteredByDate.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><ClipboardList size={40} color={C.border} /></div>
                <div className="empty-text">Tidak ada transaksi pada {formatDateLabel(selectedDate)}</div>
              </div>
            )}
          </>
        ) : (
          <>
            {grouped.length === 0 ? (
              <div className="empty-state"><div className="empty-icon"><ClipboardList size={40} color={C.border} /></div><div className="empty-text">Belum ada transaksi</div></div>
            ) : grouped.map((group) => {
              const dayRevenue = group.items.filter(o => o.statusBayar === "Lunas").reduce((s, o) => s + o.total, 0);
              const dayPiutang = group.items.filter(o => o.statusBayar !== "Lunas").reduce((s, o) => s + o.total, 0);
              return (
                <div key={group.date.getTime()} style={{ marginBottom: 20 }}>
                  <div style={{ background: C.dark, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>{formatDateLabel(group.date)}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{formatDateShort(group.date)} · {group.items.length} transaksi</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.white, fontFamily: "'Space Grotesk',sans-serif" }}>{rupiah(dayRevenue + dayPiutang)}</div>
                      {dayPiutang > 0 && <div style={{ fontSize: 10, color: "#F59E0B", marginTop: 1 }}>piutang {rupiah(dayPiutang)}</div>}
                    </div>
                  </div>
                  {group.items.map((order) => <HistoryCard key={order.id} order={order} onViewNota={onViewNota} fmtDate={fmtDate} />)}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── HISTORY CARD (extracted) ─────────────────────────────────────────────────
function HistoryCard({ order, onViewNota, fmtDate }) {
  return (
    <div className="history-card" onClick={() => onViewNota(order.notaId || order.id)}>
      <div className="history-top">
        <div>
          <div className="history-cust">{order.customerNama}</div>
          <div className="history-date">{order.id} · {fmtDate(order.tanggal || order.timestamp)}</div>
        </div>
        <div className={`badge ${order.statusBayar === "Lunas" ? "badge-success" : "badge-warning"}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {order.statusBayar === "Lunas" ? <><CheckCircle size={10} /> Lunas</> : <><Clock size={10} /> Belum</>}
        </div>
      </div>
      <div className="history-items">
        {(order.items || []).map((i, idx) => (
          <span key={idx}>{idx > 0 && ", "}{i.qty}× {i.nama}</span>
        ))}
        {order.catatan && (
          <div style={{ fontSize: 11, color: "#D97706", marginTop: 4, fontStyle: "italic", display: "flex", alignItems: "center", gap: 4 }}>
            <FileText size={11} /> {order.catatan}
          </div>
        )}
      </div>
      <div className="history-bottom">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="badge badge-gray" style={{ fontSize: 10 }}>{order.metode}</span>
          {order.diskon?.amount > 0 && (
            <span className="badge badge-warning" style={{ fontSize: 10 }}>-{rupiah(order.diskon.amount)}</span>
          )}
        </div>
        <div className="history-total">{rupiah(order.total)}</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("kasir");
  const [kasirStep, setKasirStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [payMethod, setPayMethod] = useState("");
  const [catatan, setCatatan] = useState("");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [notaView, setNotaView] = useState(null);
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = globalCss;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(collection(db, "products"));
        const data = snap.docs.map(mapProduct);
        data.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
        setProducts(data);
      } catch (e) { console.error("Gagal load products:", e); }
      finally { setLoadingProducts(false); }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "customers"), orderBy("nama")), (snap) => {
      setCustomers(snap.docs.map(mapCustomer)); setLoadingCustomers(false);
    }, (e) => { console.error("Gagal load customers:", e); setLoadingCustomers(false); });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "transactions"), orderBy("created_at", "desc")), (snap) => {
      setOrders(snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id, ...d,
          customerNama: d.nama, customerHp: d.hp,
          metode: d.metode_pembayaran, total: d.total_harga,
          tanggal: d.tanggal, statusBayar: d.statusBayar,
          items: d.items, notaId: d.notaId, catatan: d.catatan || "",
          diskon: d.diskon || null, subtotal: d.subtotal_harga || d.total_harga,
        };
      }));
      setLoadingOrders(false);
    }, (e) => { console.error("Gagal load transactions:", e); setLoadingOrders(false); });
    return unsub;
  }, []);

  const handleAddCustomer = async ({ nama, hp }) => {
    const docRef = await addDoc(collection(db, "customers"), { nama, no_hp: hp, created_at: serverTimestamp() });
    return { id: docRef.id, nama, hp };
  };

  const handleSimpan = async ({ diskonType, diskonVal, diskonAmount, isHomeVisit }) => {
    setSavingOrder(true);
    try {
      const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
      const total = subtotal - diskonAmount;
      const notaId = "NOTA-" + genId();
      const metodeLabel = PAY_METHODS.find((m) => m.id === payMethod)?.label || payMethod;
      const statusBayar = payMethod === "belum" ? "Belum Lunas" : "Lunas";

      // ── Home Visit → langsung Selesai & Lunas ──────────────────────────────
      const statusOrder = isHomeVisit ? "Selesai" : "Waiting List";
      const layananType = isHomeVisit ? "home_visit" : "laundry";
      // Jika home visit paksa statusBayar = Lunas karena langsung selesai di tempat
      const finalStatusBayar = isHomeVisit ? "Lunas" : statusBayar;

      const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
      const now = new Date();
      const tanggalIndo = `${String(now.getDate()).padStart(2, "0")} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;

      const itemsPayload = cart.map((c) => ({
        produkId: c.produkId, nama: c.nama, satuan: c.satuan, qty: c.qty,
        panjang: null, lebar: null,
        luas: c.satuan === "meter" ? (parseFloat(c.luas) || 0) : null,
        harga: c.harga, subtotal: c.subtotal,
      }));

      const txRef = await addDoc(collection(db, "transactions"), {
        customer_id: doc(db, "customers", customer.id),
        nama: customer.nama,
        hp: customer.hp,
        items: itemsPayload,
        subtotal_harga: subtotal,
        diskon: { type: diskonType, nilai: diskonVal, amount: diskonAmount },
        metode_pembayaran: metodeLabel,
        status_order: statusOrder,       // ← "Selesai" jika home_visit
        statusBayar: finalStatusBayar,  // ← "Lunas" jika home_visit
        layanan_type: layananType,       // ← FIELD BARU
        total_harga: total,
        created_at: serverTimestamp(),
        tanggal: tanggalIndo,
        catatan: catatan || "",
        notaId,
      });

      setCurrentOrder({
        id: txRef.id, customerId: customer.id,
        customerNama: customer.nama, customerHp: customer.hp,
        items: itemsPayload, subtotal,
        diskon: { type: diskonType, nilai: diskonVal, amount: diskonAmount },
        total, metode: metodeLabel,
        statusBayar: finalStatusBayar,
        status: statusOrder,
        layananType,                           // ← kirim ke StepSukses
        tanggal: tanggalIndo, catatan, notaId,
        timestamp: new Date(),
      });
      setKasirStep(3);
    } catch (e) {
      console.error("Gagal simpan transaksi:", e);
      alert("Gagal menyimpan transaksi. Coba lagi.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleReset = () => {
    setKasirStep(0); setCart([]); setCustomer(null); setPayMethod(""); setCatatan(""); setCurrentOrder(null); setNotaView(null); setTab("kasir");
  };

  return (
    <div className="kasir-root">
      <div className="topbar">
        <div className="topbar-icon"><Layers size={20} strokeWidth={2} color={C.dark} /></div>
        <div style={{ flex: 1 }}>
          <div className="topbar-brand">Carpetology</div>
          <div className="topbar-sub">Sistem Kasir Laundry</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>{todayLabel()}</div>
          {cart.length > 0 && tab === "kasir" && kasirStep === 0 && !notaView && (
            <div className="badge badge-primary" style={{ marginTop: 4, display: "inline-flex" }}>{cart.length} item</div>
          )}
        </div>
      </div>

      {notaView ? (
        <NotaPage notaId={notaView} orders={orders} onBack={() => setNotaView(null)} />
      ) : (
        <>
          <div className="nav-tabs">
            <div className={`nav-tab ${tab === "kasir" ? "active" : ""}`} onClick={() => setTab("kasir")}>
              <ShoppingCart size={14} /> Kasir
            </div>
            <div className={`nav-tab ${tab === "riwayat" ? "active" : ""}`} onClick={() => setTab("riwayat")}>
              <ClipboardList size={14} /> Riwayat
            </div>
          </div>

          {tab === "kasir" && (
            <>
              {kasirStep < 3 && <StepBar current={kasirStep} />}
              {kasirStep === 0 && <StepProduk products={products} loadingProducts={loadingProducts} cart={cart} onCartChange={setCart} onNext={() => setKasirStep(1)} />}
              {kasirStep === 1 && <StepCustomer customers={customers} loadingCustomers={loadingCustomers} onAddCustomer={handleAddCustomer} selectedCust={customer} onSelect={setCustomer} cart={cart} onCartChange={setCart} onNext={() => setKasirStep(2)} onBack={() => setKasirStep(0)} />}
              {kasirStep === 2 && <StepPembayaran cart={cart} customer={customer} payMethod={payMethod} setPayMethod={setPayMethod} catatan={catatan} setCatatan={setCatatan} onNext={handleSimpan} onBack={() => setKasirStep(1)} saving={savingOrder} />}
              {kasirStep === 3 && currentOrder && <StepSukses order={currentOrder} onReset={handleReset} onViewNota={setNotaView} />}
            </>
          )}

          {tab === "riwayat" && <RiwayatPage orders={orders} loadingOrders={loadingOrders} onViewNota={setNotaView} />}
        </>
      )}

      {(user?.role === 'admin' || user?.role === 'Admin') && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', zIndex: 100 }}>
          <Navbar />
        </div>
      )}
    </div>
  );
}