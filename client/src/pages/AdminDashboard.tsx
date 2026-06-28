import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../api"; // Custom axios instance
import "./AdminDashboard.css";
import { Activity as ActivityIcon, Leaf, Filter, Search, Calendar } from "lucide-react";

// ---- Types ----
interface Activity {
  id: number;
  activity_type: string;
  usage: string;
  co2e: string;
  timestamp: string;
  uploaded_by: string;
  metadata?: any;
}

interface EmissionEntry {
  id: number;
  type: string;
  usage: number;
  usage_unit: string;
  co2e_kg: number;
  uploadedBy: string;
  timestamp: string;
  scope: "Scope 1" | "Scope 2" | "Scope 3";
  metadata?: any;
}

// ---- Helper: classify activity type into Scope 1 / 2 / 3 ----
const classifyScope = (type: string): "Scope 1" | "Scope 2" | "Scope 3" => {
  const t = type.toLowerCase();
  if (t.includes("fuel") || t.includes("diesel") || t.includes("petrol") || t.includes("png") || t.includes("lpg") || t.includes("gas")) return "Scope 1";
  if (t.includes("electricity") || t.includes("power")) return "Scope 2";
  return "Scope 3";
};

export const AdminDashboard: React.FC = () => {
  // Activities State
  const [entries, setEntries] = useState<EmissionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedEntry, setSelectedEntry] = useState<EmissionEntry | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);

  // ---- Fetch Activities ----
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const sessionStart = localStorage.getItem('sessionStart');
      const url = sessionStart ? `/api/activities?since=${sessionStart}` : "/api/activities";
      const response = await api.get(url);
      const activities: Activity[] = response.data;
      const mapped: EmissionEntry[] = activities.map((a) => {
        let usageValue = 0;
        let usageUnit = "";
        if (a.usage) {
          const parts = a.usage.split(" ");
          usageValue = parseFloat(parts[0]) || 0;
          usageUnit = parts.slice(1).join(" ");
        }
        return {
          id: a.id,
          type: a.activity_type,
          usage: usageValue,
          usage_unit: usageUnit || "",
          co2e_kg: parseFloat(a.co2e) || 0,
          uploadedBy: a.uploaded_by,
          timestamp: a.timestamp,
          scope: classifyScope(a.activity_type),
          metadata: a.metadata,
        };
      });
      setEntries(mapped);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.response?.data?.error || "Could not fetch activity log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // ---- Filter Logic for Activities ----
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== "all" && !e.type.toLowerCase().includes(typeFilter.toLowerCase())) return false;
      if (search) {
        const s = search.toLowerCase();
        const combined = `${e.type} ${e.id} ${e.uploadedBy} ${e.scope}`.toLowerCase();
        if (!combined.includes(s)) return false;
      }
      if (dateFrom && new Date(e.timestamp) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        if (new Date(e.timestamp) >= to) return false;
      }
      return true;
    });
  }, [entries, typeFilter, search, dateFrom, dateTo]);

  const handleSetMonthActive = async (entry: EmissionEntry, hist: any) => {
    try {
      if (!window.confirm(`Set dashboard value to ${hist.usage_amount} for ${hist.month}?`)) return;
      
      const newUsage = parseFloat(hist.usage_amount);
      const newCo2 = parseFloat(hist.co2e_kg);
      
      await api.put(`/api/activities/${entry.id}`, {
        usage_kwh: newUsage,
        co2e_kg: newCo2
      });
      
      // Update local state without refetching or just refetch
      setEntries(prev => prev.map(e => {
        if (e.id === entry.id) {
          return { ...e, usage: newUsage, co2e_kg: newCo2 };
        }
        return e;
      }));
      
      // Update selected entry as well
      setSelectedEntry(prev => prev === entry ? { ...prev, usage: newUsage, co2e_kg: newCo2 } : prev);
      
      alert("Updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to update: " + (err.response?.data?.error || err.message));
    }
  };

  const visibleEntries = useMemo(
    () => showAllRows ? filteredEntries : filteredEntries.slice(0, 5),
    [filteredEntries, showAllRows]
  );

  const totalEmissionsKg = useMemo(() => filteredEntries.reduce((sum, e) => sum + (e.co2e_kg || 0), 0), [filteredEntries]);
  const totalEntries = filteredEntries.length;
  const scopeTotals = useMemo(() => filteredEntries.reduce((acc, e) => {
    if (e.scope === "Scope 1") acc.scope1 += e.co2e_kg || 0;
    else if (e.scope === "Scope 2") acc.scope2 += e.co2e_kg || 0;
    else acc.scope3 += e.co2e_kg || 0;
    return acc;
  }, { scope1: 0, scope2: 0, scope3: 0 }), [filteredEntries]);

  return (
    <div className="dashboard-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        
        .dashboard-container {
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
        }

        .filter-toolbar {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          padding: 24px;
          border-radius: 24px;
          margin-bottom: 24px;
          border: 1px solid white;
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          align-items: flex-end;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
        }

        .filter-item { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 150px; }
        .filter-item label { font-size: 13px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 6px; margin: 0; }
        .filter-item input, .filter-item select {
          height: 44px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #0f172a;
          font-size: 14px;
          font-weight: 500;
        }

        .history-btn {
          height: 44px;
          padding: 0 24px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: 0.2s;
        }
        .history-btn:hover { background: #4338ca; transform: translateY(-1px); }
      `}</style>

      <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              padding: "12px",
              borderRadius: "14px",
              boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)",
            }}
          >
            <Leaf color="white" size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: "28px", fontWeight: 800, margin: 0, color: "#0f172a", letterSpacing: "-0.02em" }}>
              EcoTrace
            </h2>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, letterSpacing: "0.05em", textTransform: 'uppercase' }}>
              Admin Portal
            </div>
          </div>
        </div>
        <div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
            Monitor activities from this session (since login).
          </p>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      {/* KPI CARDS */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "18px", marginBottom: "24px" }}>
        {/* Total Emissions */}
        <div style={{ background: "#020617", color: "#ffffff", borderRadius: "18px", padding: "18px 20px", boxShadow: "0 10px 24px rgba(15, 23, 42, 0.35)" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Total Emissions</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{totalEmissionsKg.toFixed(2)} kg</div>
          <div style={{ fontSize: 12, color: "#cbd5f5" }}>Entries: {totalEntries}</div>
        </div>
        {/* Scope 1 */}
        <div style={{ background: "#f59e0b", color: "#ffffff", borderRadius: "18px", padding: "18px 20px", boxShadow: "0 10px 24px rgba(251, 191, 36, 0.45)" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Scope 1</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{scopeTotals.scope1.toFixed(2)} kg</div>
        </div>
        {/* Scope 2 */}
        <div style={{ background: "#3b82f6", color: "#ffffff", borderRadius: "18px", padding: "18px 20px", boxShadow: "0 10px 24px rgba(59, 130, 246, 0.45)" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Scope 2</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{scopeTotals.scope2.toFixed(2)} kg</div>
        </div>
        {/* Scope 3 */}
        <div style={{ background: "#10b981", color: "#ffffff", borderRadius: "18px", padding: "18px 20px", boxShadow: "0 10px 24px rgba(16, 185, 129, 0.45)" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Scope 3</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{scopeTotals.scope3.toFixed(2)} kg</div>
        </div>
      </section>

      {/* Filters */}
      <section className="filter-toolbar">
        <div className="filter-item">
          <label><Filter size={16} /> Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="electricity">Electricity</option>
            <option value="fuel">Fuel</option>
            <option value="lpg">LPG</option>
            <option value="png">PNG</option>
            <option value="water">Water</option>
          </select>
        </div>
        <div className="filter-item">
          <label><Search size={16} /> Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
          />
        </div>
        <div className="filter-item">
          <label><Calendar size={16} /> From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="filter-item">
          <label><Calendar size={16} /> To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>

        <button
          className="history-btn"
          onClick={() => window.location.href = '/admin/history'}
        >
          <ActivityIcon size={18} /> History Archive
        </button>
      </section>

      {loading && <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading activity data...</p>}

      {/* Table */}
      <section className="table-section">
        <div className="table-wrapper">
          <table className="activity-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Scope</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Usage</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>CO₂e (kg)</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Time</th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, color: '#64748b' }}>#{entry.id}</td>
                  <td style={{ padding: '16px 12px', fontWeight: 700, color: '#1e293b', textTransform: 'capitalize' }}>{entry.type}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{
                      background: entry.scope === 'Scope 1' ? '#fff7ed' : entry.scope === 'Scope 2' ? '#eff6ff' : '#ecfdf5',
                      color: entry.scope === 'Scope 1' ? '#c2410c' : entry.scope === 'Scope 2' ? '#1d4ed8' : '#047857',
                      padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid currentColor', opacity: 0.9
                    }}>
                      {entry.scope}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 700, color: '#0f172a' }}>
                    {entry.usage} <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.8rem' }}>{entry.usage_unit}</span>
                  </td>
                  <td style={{ padding: '16px 12px', fontWeight: 800, color: '#10b981' }}>{entry.co2e_kg.toFixed(2)}</td>
                  <td style={{ padding: '16px 12px', color: '#475569', fontWeight: 500 }}>{entry.uploadedBy}</td>
                  <td style={{ padding: '16px 12px', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{new Date(entry.timestamp).toLocaleDateString()}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <button onClick={() => setSelectedEntry(entry)} style={{ border: '1.5px solid #e2e8f0', background: 'white', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569', transition: 'all 0.2s' }}>View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredEntries.length > 5 && (
          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <button onClick={() => setShowAllRows(!showAllRows)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 500 }}>
              {showAllRows ? "Show Less" : "View All"}
            </button>
          </div>
        )}
      </section>

      {/* Modal for Details */}
      {selectedEntry && (
        <div className="modal-backdrop" onClick={() => setSelectedEntry(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', padding: '24px', borderRadius: '12px', minWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px', fontFamily: 'Outfit, sans-serif' }}>
              Entry Details
            </h3>
            
            <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>Activity Type</span>
                <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{selectedEntry.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>Carbon Scope</span>
                <span style={{ 
                  fontWeight: 700, 
                  color: selectedEntry.scope === 'Scope 1' ? '#c2410c' : selectedEntry.scope === 'Scope 2' ? '#1d4ed8' : '#047857' 
                }}>{selectedEntry.scope}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>Recorded Usage</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedEntry.usage} {selectedEntry.usage_unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                <span style={{ fontWeight: 600, color: '#059669', fontSize: '0.9rem' }}>CO₂e Emissions</span>
                <span style={{ fontWeight: 800, color: '#059669' }}>{selectedEntry.co2e_kg.toFixed(4)} kg</span>
              </div>
            </div>
            
            {selectedEntry.metadata?.monthly_history && selectedEntry.metadata.monthly_history.length > 0 && (
              <div style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#1e293b' }}>Monthly History</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px' }}>Select a month to update the entry usage.</p>
                
                {(() => {
                  const history = selectedEntry.metadata.monthly_history;
                  const maxUsage = Math.max(...history.map((h: any) => parseFloat(h.usage_amount) || 0));
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {history.map((hist: any, idx: number) => {
                        const amt = parseFloat(hist.usage_amount) || 0;
                        const isHighest = amt === maxUsage && amt > 0;
                        const isCurrent = amt === selectedEntry.usage;
                        
                        return (
                          <div key={idx} style={{ 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px', background: isHighest ? '#fffbeb' : 'white',
                            border: `1px solid ${isHighest ? '#fde68a' : '#e2e8f0'}`,
                            borderRadius: '6px'
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {hist.month} {hist.year || ''}
                                {isHighest && <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>Highest</span>}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {amt} {selectedEntry.usage_unit} • {hist.co2e_kg} kg CO₂e
                              </div>
                            </div>
                            <button 
                              onClick={() => handleSetMonthActive(selectedEntry, hist)}
                              disabled={isCurrent}
                              style={{ 
                                padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600,
                                background: isCurrent ? '#cbd5e1' : '#3b82f6', 
                                color: isCurrent ? '#64748b' : 'white', 
                                border: 'none', borderRadius: '4px', cursor: isCurrent ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}>
                              {isCurrent ? 'Active' : 'Select'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
            
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setSelectedEntry(null)} style={{ padding: '8px 16px', background: '#e5e7eb', color: '#374151', fontWeight: 600, border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};
