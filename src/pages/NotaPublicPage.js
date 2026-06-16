import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
    Layers, CheckCircle, Clock, Scissors,
    Package, CreditCard, ClipboardList, ArrowLeft,
    Printer, AlertTriangle, XCircle, Phone,
    Banknote, Home, Ruler, Tag,
} from "lucide-react";

const C = {
    primary: "#04CDCD", p600: "#03A8A8", p700: "#028585",
    p100: "#E0FAFA", p200: "#B3F0F0", p50: "#F0FEFE",
    amber: "#D97706", amberBg: "#FEF3C7", amberBd: "#FCD34D", amberTx: "#92400E",
    dark: "#1A2E35", dark2: "#2C4A54", muted: "#6B8894",
    border: "#D4ECEC", surface: "#F4FEFE", white: "#FFFFFF",
    ok: "#22C55E", okBg: "#DCFCE7", okTx: "#15803D",
    warn: "#F59E0B", warnBg: "#FEF3C7", warnTx: "#92400E",
    red: "#EF4444", redBg: "#FEE2E2",
};

const rupiah = (n) => "Rp " + (n || 0).toLocaleString("id-ID");

const fmtDate = (d) => {
    if (!d) return "-";
    const dt = d?.toDate ? d.toDate() : new Date(d);
    return dt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: ${C.surface}; color: ${C.dark}; }
  .nota-root { max-width: 480px; margin: 0 auto; background: ${C.white}; min-height: 100vh; box-shadow: 0 0 40px rgba(4,205,205,0.08); }
  .badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 5px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
  .bg-ok { background: ${C.okBg}; color: ${C.okTx}; }
  .bg-warn { background: ${C.warnBg}; color: ${C.warnTx}; }
  .bg-gray { background: #F1F5F9; color: #475569; }
  .bg-amber { background: ${C.amberBg}; color: ${C.amberTx}; }
  .bg-teal { background: ${C.p100}; color: ${C.p700}; }
  .spinner { display: inline-block; width: 22px; height: 22px; border: 3px solid ${C.p200}; border-top-color: ${C.primary}; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  .ani { animation: slideUp .22s ease-out; }
  @media print { .no-print { display: none !important; } }
`;

export default function NotaPublicPage() {
    const { notaId } = useParams();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin" || user?.role === "Admin";

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
        const q = query(collection(db, "transactions"), where("notaId", "==", notaId));
        const unsub = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                const d = snap.docs[0].data();
                setOrder({
                    id: snap.docs[0].id,
                    customerNama: d.nama || "",
                    customerHp: d.hp || "-",
                    items: (d.items || []).map(it => ({
                        ...it,
                        qty: Number(it.qty || 1),
                        harga: Number(it.harga || 0),
                        luas: it.luas != null ? Number(it.luas) : null,
                        subtotal: Number(it.subtotal || 0),
                    })),
                    diskon: d.diskon || null,
                    dp: d.dp || null,
                    layananType: d.layanan_type || null,
                    total: Number(d.total_harga || 0),
                    subtotal: Number(d.subtotal_harga || d.total_harga || 0),
                    metode: d.metode_pembayaran || "",
                    statusBayar: d.statusBayar || "Belum Lunas",
                    tanggal: d.tanggal || "",
                    timestamp: d.created_at || null,
                    catatan: d.catatan || "",
                    notaId: d.notaId || snap.docs[0].id,
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

    // ── LOADING ──────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="nota-root">
            <div style={{ background: C.dark, padding: "16px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Layers size={16} /> Carpetology
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Memuat nota...</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: C.muted, fontSize: 13 }}>
                <div className="spinner" />
                Memuat nota...
            </div>
        </div>
    );

    // ── NOT FOUND ─────────────────────────────────────────────────────────────
    if (!order) return (
        <div className="nota-root">
            <div style={{ background: C.dark, padding: "16px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Layers size={16} /> Carpetology
                </div>
            </div>
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <XCircle size={40} color={C.red} />
                </div>
                <div style={{ fontSize: 14 }}>Nota <strong>{notaId}</strong> tidak ditemukan</div>
            </div>
        </div>
    );

    // ── KALKULASI ─────────────────────────────────────────────────────────────
    const isHS = order.layananType === "homeservice";
    const isLunas = order.statusBayar === "Lunas";
    const subtotal = order.items.reduce((s, it) => s + it.subtotal, 0);
    const diskonAmt = order.diskon?.amount || 0;
    const dpAmt = order.dp?.nominal || 0;
    const totalAkhir = subtotal - diskonAmt - dpAmt;

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div className="nota-root ani">

            {/* ── HEADER ── */}
            <div style={{ background: C.dark, padding: "16px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Layers size={16} /> Carpetology
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{order.notaId}</div>
            </div>

            <div style={{ padding: "14px 16px 32px" }}>

                {/* ── STATUS PAYMENT ── */}
                <div style={{
                    background: isLunas ? C.okBg : C.warnBg,
                    border: `1px solid ${isLunas ? C.ok : C.warn}`,
                    borderRadius: 9, padding: "9px 13px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 12,
                }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isLunas ? C.okTx : C.warnTx, display: "flex", alignItems: "center", gap: 4 }}>
                        {isLunas
                            ? <><CheckCircle size={12} /> Sudah Lunas</>
                            : <><Clock size={12} /> Belum Lunas</>
                        }
                    </span>
                    <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(order.tanggal || order.timestamp)}</span>
                </div>

                {/* ── CUSTOMER ── */}
                <div style={{ background: C.surface, borderRadius: 10, padding: "11px 13px", border: `1px solid ${C.border}`, marginBottom: 12 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>{order.customerNama}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <Phone size={11} /> {order.customerHp}
                    </div>
                </div>

                {/* ── DETAIL ITEM + KALKULASI ── */}
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>

                    {/* Header tabel */}
                    <div style={{ background: C.primary, padding: "7px 13px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: ".5px" }}>
                            Detail Item
                        </span>
                    </div>

                    {/* Item list */}
                    {order.items.map((it, i) => {
                        const belumDiukur = it.satuan === "meter" && (!it.luas || it.luas === 0);
                        return (
                            <div key={i} style={{ padding: "9px 13px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{it.nama}</div>
                                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                                        {belumDiukur ? (
                                            <span style={{ color: C.warn, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                                                <AlertTriangle size={10} /> Menunggu pengukuran
                                            </span>
                                        ) : it.satuan === "meter" ? (
                                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                <Ruler size={10} /> {(it.luas || 0).toFixed(2)} m² × {rupiah(it.harga)}/m²
                                            </span>
                                        ) : (
                                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                <Package size={10} /> {it.qty} pcs × {rupiah(it.harga)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: belumDiukur ? C.muted : C.dark, marginLeft: 10, flexShrink: 0 }}>
                                    {belumDiukur ? "—" : rupiah(it.subtotal)}
                                </span>
                            </div>
                        );
                    })}

                    {/* Subtotal (kalau lebih dari 1 item) */}
                    {order.items.length > 1 && (
                        <div style={{ padding: "7px 13px", display: "flex", justifyContent: "space-between", fontSize: 12, borderBottom: `.5px solid ${C.border}`, background: C.surface }}>
                            <span style={{ color: C.muted }}>Subtotal</span>
                            <span style={{ fontWeight: 600 }}>{rupiah(subtotal)}</span>
                        </div>
                    )}

                    {/* Diskon */}
                    {diskonAmt > 0 && (
                        <div style={{ padding: "7px 13px", display: "flex", justifyContent: "space-between", fontSize: 12, color: C.okTx, borderBottom: `.5px solid ${C.border}`, background: C.surface }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <Tag size={11} /> Diskon
                                {order.diskon?.type === "persen" ? ` (${order.diskon.nilai}%)` : ""}
                            </span>
                            <span style={{ fontWeight: 700 }}>−{rupiah(diskonAmt)}</span>
                        </div>
                    )}

                    {/* DP — hanya Home Service */}
                    {isHS && dpAmt > 0 && (
                        <div style={{ padding: "7px 13px", display: "flex", justifyContent: "space-between", fontSize: 12, color: C.amberTx, borderBottom: `.5px solid ${C.border}`, background: C.surface }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <Banknote size={11} /> DP ({order.metode})
                            </span>
                            <span style={{ fontWeight: 700 }}>−{rupiah(dpAmt)}</span>
                        </div>
                    )}

                    {/* Total Akhir */}
                    <div style={{ padding: "11px 13px", background: C.p100, display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.p700 }}>Total Akhir</span>
                        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 800, color: C.p700 }}>
                            {rupiah(totalAkhir)}
                        </span>
                    </div>
                </div>

                {/* ── BADGES ── */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    <span className={`badge ${isLunas ? "bg-ok" : "bg-warn"}`} style={{ padding: "4px 9px" }}>
                        {isLunas ? <><CheckCircle size={9} /> Lunas</> : <><Clock size={9} /> Belum Lunas</>}
                    </span>
                    <span className="badge bg-gray" style={{ padding: "4px 9px" }}>
                        <CreditCard size={9} /> {order.metode || "Belum Payment"}
                    </span>
                    {isHS && (
                        <span className="badge bg-amber" style={{ padding: "4px 9px" }}>
                            <Home size={9} /> Home Service
                        </span>
                    )}
                </div>

                {/* ── CATATAN ── */}
                {order.catatan ? (
                    <div style={{ background: C.warnBg, border: `1px solid ${C.warn}`, borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: C.warnTx, fontStyle: "italic" }}>
                        📝 {order.catatan}
                    </div>
                ) : null}

                {/* ── ACTIONS ── */}
                <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    {isAdmin && (
                        <a href="/admin/kasir" style={{ flex: 1, textDecoration: "none" }}>
                            <button style={{ width: "100%", padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${C.primary}`, background: "none", color: C.primary, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <ArrowLeft size={13} /> Kembali
                            </button>
                        </a>
                    )}
                    <button
                        onClick={() => window.print()}
                        style={{ flex: 1, padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "none", background: C.primary, color: "white", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                        <Printer size={13} /> Cetak Nota
                    </button>
                </div>

                {/* ── FOOTER ── */}
                <div style={{ textAlign: "center", marginTop: 20, paddingTop: 14, borderTop: `1px dashed ${C.border}` }}>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 12, fontWeight: 700, color: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Layers size={12} /> Carpetology
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Terima kasih atas kepercayaan Anda</div>
                </div>

            </div>
        </div>
    );
}