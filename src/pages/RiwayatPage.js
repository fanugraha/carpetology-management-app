function RiwayatPage({ orders, onViewNota }) {
  const [search, setSearch] = useState("");
  const [filterMetode, setFilterMetode] = useState("Semua");

  const metodeOptions = ["Semua", "Tunai", "QRIS", "Transfer", "Belum Payment"];
  const filtered = orders
    .filter((o) => {
      const s = search.toLowerCase();
      return (
        o.customerNama.toLowerCase().includes(s) ||
        o.customerHp.includes(s) ||
        o.id.toLowerCase().includes(s)
      );
    })
    .filter((o) => filterMetode === "Semua" || o.metode === filterMetode)
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const totalRevenue = orders.filter(o => o.metode !== "Belum Payment").reduce((s, o) => s + o.total, 0);
  const totalPiutang = orders.filter(o => o.metode === "Belum Payment").reduce((s, o) => s + o.total, 0);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="step-content" style={{ flex: 1 }}>
        {/* Stats */}
        <div className="mini-stats">
          <div className="mini-stat">
            <div className="mini-stat-label">Total Transaksi</div>
            <div className="mini-stat-value">{orders.length}</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-label">Total Omzet</div>
            <div className="mini-stat-value" style={{ fontSize: 14 }}>{rupiah(totalRevenue + totalPiutang)}</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-label" style={{ color: "#15803D" }}>✅ Lunas</div>
            <div className="mini-stat-value" style={{ color: "#15803D", fontSize: 14 }}>{rupiah(totalRevenue)}</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-label" style={{ color: "#D97706" }}>⏳ Piutang</div>
            <div className="mini-stat-value" style={{ color: "#D97706", fontSize: 14 }}>{rupiah(totalPiutang)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, HP, atau ID..." />
          {search && <button className="search-clear" onClick={() => setSearch("")}>×</button>}
        </div>

        {/* Filter chips */}
        <div className="tab-chips">
          {metodeOptions.map((m) => (
            <div key={m} className={`tab-chip ${filterMetode === m ? "active" : ""}`} onClick={() => setFilterMetode(m)}>
              {m}
            </div>
          ))}
        </div>

        <div className="section-header">{filtered.length} transaksi</div>

        {filtered.map((order) => (
          <div key={order.id} className="history-card" onClick={() => onViewNota(order.notaId)}>
            <div className="history-top">
              <div>
                <div className="history-cust">{order.customerNama}</div>
                <div className="history-date">{order.id} • {fmtDate(order.tanggal)}</div>
              </div>
              <div className={`badge ${order.metode === "Belum Payment" ? "badge-warning" : "badge-success"}`}>
                {order.metode === "Belum Payment" ? "⏳ Belum" : "✅ Lunas"}
              </div>
            </div>
            <div className="history-items">
              {order.items.map((i, idx) => (
                <span key={idx}>
                  {idx > 0 && ", "}
                  {i.qty}× {i.nama}
                </span>
              ))}
            </div>
            <div className="history-bottom">
              <div style={{ display: "flex", gap: 6 }}>
                <span className="badge badge-gray" style={{ fontSize: 10 }}>{order.metode}</span>
              </div>
              <div className="history-total">{rupiah(order.total)}</div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">Belum ada transaksi</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RiwayatPage;