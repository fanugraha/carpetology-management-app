import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
    Layers, CheckCircle, Clock, Scissors, Ruler,
    Package, CreditCard, ClipboardList, ArrowLeft,
    Printer, AlertTriangle, XCircle, Phone, Hash,
} from "lucide-react";

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
    primary: "#04CDCD", primary600: "#03A8A8", primary700: "#028585",
    primary100: "#E0FAFA", primary200: "#B3F0F0", primary50: "#F0FEFE",
    dark: "#1A2E35", muted: "#6B8894", border: "#D4ECEC",
    surface: "#F4FEFE", white: "#FFFFFF",
    success: "#22C55E", successBg: "#DCFCE7",
    warning: "#F59E0B", warningBg: "#FEF3C7",
    danger: "#EF4444", dangerBg: "#FEE2E2",
};

const rupiah = (n) => "Rp " + (n || 0).toLocaleString("id-ID");
const fmtDate = (d) => {
    if (!d) return "-";
    const dt = d?.toDate ? d.toDate() : new Date(d);
    return dt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: ${C.surface}; color: ${C.dark}; }
  .nota-root { max-width: 480px; margin: 0 auto; background: ${C.white}; min-height: 100vh; box-shadow: 0 0 40px rgba(4,205,205,0.08); }
  .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
  .badge-success { background: ${C.successBg}; color: #15803D; }
  .badge-warning { background: ${C.warningBg}; color: #D97706; }
  .badge-gray { background: #F1F5F9; color: #64748B; }
  .badge-primary { background: ${C.primary100}; color: ${C.primary700}; }
  .btn { padding: 13px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
  .btn-primary { background: ${C.primary}; color: white; }
  .btn-ghost { background: none; color: ${C.primary}; border: 1.5px solid ${C.primary}; }
  .spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid ${C.primary200}; border-top-color: ${C.primary}; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media print { .no-print { display: none !important; } }
`;

export default function NotaPublicPage() {
    const { notaId } = useParams();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'Admin';

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const el = document.createElement("style");
        el.textContent = globalCss;
        document.head.appendChild(el);
        return () => document.head.removeChild(el);
    }, []);

    useEffect(() => {
        if (!notaId) return;

        const q = query(
            collection(db, "transactions"),
            where("notaId", "==", notaId)
        );

        const unsub = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                const docSnap = snap.docs[0];
                const d = docSnap.data();
                setOrder({
                    id: docSnap.id,
                    customerNama: d.nama || "",
                    customerHp: d.hp || "-",
                    items: (d.items || []).map(it => ({
                        ...it,
                        qty: Number(it.qty || 1),
                        harga: Number(it.harga || 0),
                        luas: it.luas != null ? Number(it.luas) : null,
                        subtotal: Number(it.subtotal || 0),
                    })),
                    subtotal: Number(d.subtotal_harga || d.total_harga || 0),
                    diskon: d.diskon || null,
                    total: Number(d.total_harga || 0),
                    metode: d.metode_pembayaran || "",
                    statusBayar: d.statusBayar || "Belum Lunas",
                    status: d.status_order || "Waiting List",
                    tanggal: d.tanggal || "",
                    timestamp: d.created_at || null,
                    catatan: d.catatan || "",
                    notaId: d.notaId || docSnap.id,
                });
            } else {
                setOrder(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Gagal fetch nota:", err);
            setLoading(false);
        });

        return () => unsub();
    }, [notaId]);

    // ── Loading ──
    if (loading) return (
        <div className="nota-root">
            <div style={{ background: C.dark, padding: "20px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Layers size={22} color={C.primary} /> Carpetology
                </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: C.muted, fontSize: 13 }}>
                <div className="spinner" />
                Memuat nota...
            </div>
        </div>
    );

    // ── Not found ──
    if (!order) return (
        <div className="nota-root">
            <div style={{ background: C.dark, padding: "20px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Layers size={22} color={C.primary} /> Carpetology
                </div>
            </div>
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <XCircle size={40} color={C.danger} />
                </div>
                <div style={{ fontSize: 14 }}>Nota <strong>{notaId}</strong> tidak ditemukan</div>
            </div>
        </div>
    );

    const isLunas = order.statusBayar === "Lunas";

    // ── Render ──
    return (
        <div className="nota-root">
            {/* Header */}
            <div style={{ background: C.dark, padding: "20px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Layers size={22} color={C.primary} /> Carpetology
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                    Jasa Cuci Karpet &amp; Laundry Professional
                </div>
            </div>

            <div style={{ padding: 20 }}>
                {/* Status bar */}
                <div style={{
                    background: isLunas ? C.successBg : C.warningBg,
                    border: `1px solid ${isLunas ? C.success : C.warning}`,
                    borderRadius: 12, padding: "10px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
                }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isLunas ? "#15803D" : "#D97706", display: "flex", alignItems: "center", gap: 6 }}>
                        {isLunas
                            ? <CheckCircle size={15} color="#15803D" />
                            : <Clock size={15} color="#D97706" />}
                        {isLunas ? "Lunas" : "Belum Lunas"}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>{fmtDate(order.tanggal || order.timestamp)}</div>
                </div>

                {/* Customer info */}
                <div style={{ background: C.surface, borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Info Customer</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>{order.customerNama}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                        <Phone size={12} color={C.muted} /> {order.customerHp}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        <Hash size={11} color={C.muted} />{order.notaId}
                    </div>
                </div>

                {/* Items */}
                <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
                    <div style={{ padding: "12px 16px", background: C.primary, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "white", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                            <ClipboardList size={14} color="white" /> Detail Item
                        </span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>{order.items.length} item</span>
                    </div>

                    {order.items.map((item, i) => {
                        const belumDiukur = item.satuan === "meter" && (!item.luas || item.luas === 0);
                        return (
                            <div key={i} style={{
                                padding: "12px 16px",
                                borderBottom: i < order.items.length - 1 ? `1px solid ${C.border}` : "none",
                                display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.nama}</div>
                                    {belumDiukur ? (
                                        <div style={{ fontSize: 11, color: C.warning, marginTop: 2, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                            <AlertTriangle size={12} color={C.warning} /> Menunggu pengukuran
                                        </div>
                                    ) : item.satuan === "meter" ? (
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                            <Ruler size={12} color={C.muted} />
                                            {(item.luas || 0).toFixed(2)} m² × {rupiah(item.harga)}/m²
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                            <Package size={12} color={C.muted} />
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

                    {/* Diskon */}
                    {order.diskon?.amount > 0 && (
                        <>
                            <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}` }}>
                                <span style={{ fontSize: 12, color: C.muted }}>Subtotal</span>
                                <span style={{ fontSize: 12, color: C.muted }}>{rupiah(order.subtotal)}</span>
                            </div>
                            <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.successBg }}>
                                <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                    <Scissors size={13} color="#15803D" />
                                    Diskon {order.diskon.type === "persen" ? `${order.diskon.nilai}%` : ""}
                                </span>
                                <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>-{rupiah(order.diskon.amount)}</span>
                            </div>
                        </>
                    )}

                    {/* Total */}
                    <div style={{ padding: "14px 16px", background: C.primary100, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: C.primary700 }}>Total</span>
                        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: C.primary700 }}>
                            {rupiah(order.total)}
                        </span>
                    </div>
                </div>

                {/* Badge status */}
                <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                    <span className={`badge ${isLunas ? "badge-success" : "badge-warning"}`} style={{ padding: "6px 12px", fontSize: 12 }}>
                        {isLunas
                            ? <CheckCircle size={12} color="#15803D" />
                            : <Clock size={12} color="#D97706" />}
                        {isLunas ? "Lunas" : "Belum Lunas"}
                    </span>
                    <span className="badge badge-gray" style={{ padding: "6px 12px", fontSize: 12 }}>
                        <CreditCard size={12} color="#64748B" />
                        {order.metode || "Belum Payment"}
                    </span>
                    <span className="badge badge-primary" style={{ padding: "6px 12px", fontSize: 12 }}>
                        <ClipboardList size={12} color={C.primary700} />
                        {order.status || "Waiting List"}
                    </span>
                </div>

                {/* CTA — Cetak */}
                <div className="no-print" style={{ marginBottom: 12 }}>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        <Printer size={16} /> Cetak Nota
                    </button>
                </div>

                {/* Tombol ke admin — hanya jika sudah login sebagai admin */}
                {isAdmin && (
                    <a href="/admin/kasir" className="no-print" style={{ display: "block", marginBottom: 12 }}>
                        <button className="btn btn-ghost">
                            <ArrowLeft size={16} /> Kembali ke Kasir
                        </button>
                    </a>
                )}

                {/* Footer */}
                <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: `1px dashed ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.muted }}>Terima kasih telah mempercayai</div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, color: C.primary, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Layers size={14} color={C.primary} /> Carpetology
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                        Lacak progres cuci Anda dengan mudah
                    </div>
                </div>
            </div>
        </div>
    );
}