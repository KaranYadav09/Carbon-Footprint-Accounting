import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../api";
import "./AdminDashboard.css";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Activity,
  TrendingUp,
  Leaf,
  Zap,
  ShieldCheck,
  Search,
  Filter,
  Calendar
} from "lucide-react";

// ---- Types from your old code ----
interface ActivityData {
  id: number;
  activity_type: string;
  usage: string; // e.g. "33.99 kwh"
  co2e: string; // e.g. "78.5169"
  timestamp: string;
  uploaded_by: string;
}

// ---- Internal type used by this page ----
interface EmissionEntry {
  id: number;
  type: string;
  usage: number;
  usage_unit: string;
  co2e_kg: number;
  uploadedBy: string;
  timestamp: string;
  scope: "Scope 1" | "Scope 2" | "Scope 3";
}

const CHART_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#84cc16",
  "#14b8a6", "#a855f7", "#0ea5e9", "#f43f5e", "#10b981"
];

// ---- Frontend Normalization: Merge PNG variations and other synonyms ----
const normalizeFrontendActivity = (type: string): string => {
  if (!type) return "Unknown";
  const t = type.toLowerCase().trim().replace("_", " ");
  if (t.includes("png") && (t.includes("usage") || t.includes("consumption"))) {
    return "PNG Gas Consumption";
  }
  if (t === "electricity") return "Electricity Usage";
  if (t === "fuel" || t === "diesel" || t === "petrol") return "Fuel Usage (Petrol/Diesel)";
  if (t === "lpg") return "LPG Cylinder Consumption";
  if (t === "water") return "Water Usage";

  return type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

// ---- Helper: classify activity type into Scope 1 / 2 / 3 ----
const classifyScope = (type: string): "Scope 1" | "Scope 2" | "Scope 3" => {
  const t = type.toLowerCase();
  if (
    t.includes("fuel") ||
    t.includes("diesel") ||
    t.includes("petrol") ||
    t.includes("png") ||
    t.includes("lpg") ||
    t.includes("gas")
  ) {
    return "Scope 1";
  }
  if (t.includes("electricity") || t.includes("power")) {
    return "Scope 2";
  }
  return "Scope 3";
};

export const AnalyticsDashboard: React.FC = () => {
  const [entries, setEntries] = useState<EmissionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Hierarchical Filters
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // ---- Fetch activities USING SAME API ----
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/activities");
      const activities: ActivityData[] = response.data;

      const mapped: EmissionEntry[] = activities.map((a) => {
        let usageValue = 0;
        let usageUnit = "";
        if (a.usage) {
          const parts = a.usage.split(" ");
          usageValue = parseFloat(parts[0]) || 0;
          usageUnit = parts.slice(1).join(" ");
        }

        // Normalize the type right here for consistent display everywhere
        const normalizedType = normalizeFrontendActivity(a.activity_type);

        return {
          id: a.id,
          type: normalizedType,
          usage: usageValue,
          usage_unit: usageUnit || "",
          co2e_kg: parseFloat(a.co2e) || 0,
          uploadedBy: a.uploaded_by,
          timestamp: a.timestamp,
          scope: classifyScope(a.activity_type),
        };
      });
      setEntries(mapped);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Could not fetch activity log. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // ---- DYNAMIC SUB-CATEGORIES BASED ON SCOPE ----
  const availableSubCategories = useMemo(() => {
    const subs = new Set<string>();
    entries.forEach(e => {
      if (scopeFilter === "all" || e.scope.toLowerCase() === scopeFilter.toLowerCase()) {
        subs.add(e.type);
      }
    });
    return Array.from(subs).sort();
  }, [entries, scopeFilter]);

  // Reset sub-category if it's no longer available in the newly selected scope
  useEffect(() => {
    if (subCategoryFilter !== "all" && !availableSubCategories.includes(subCategoryFilter)) {
      setSubCategoryFilter("all");
    }
  }, [scopeFilter, availableSubCategories, subCategoryFilter]);

  // ---- FILTERED ENTRIES ----
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      // 1. Tier 1: Scope Filter
      if (scopeFilter !== "all") {
        if (e.scope.toLowerCase() !== scopeFilter.toLowerCase()) return false;
      }

      // 2. Tier 2: Sub-Category Filter
      if (subCategoryFilter !== "all") {
        if (e.type !== subCategoryFilter) return false;
      }

      if (search) {
        const s = search.toLowerCase();
        const combined = `${e.type} ${e.id} ${e.uploadedBy} ${e.scope}`.toLowerCase();
        if (!combined.includes(s)) return false;
      }

      if (dateFrom) {
        if (new Date(e.timestamp) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        if (new Date(e.timestamp) >= to) return false;
      }
      return true;
    });
  }, [entries, scopeFilter, subCategoryFilter, search, dateFrom, dateTo]);

  // ---- KPI CALCULATIONS ----
  const stats = useMemo(() => {
    const totalEmissions = filteredEntries.reduce((sum, e) => sum + e.co2e_kg, 0);
    const activityCount = filteredEntries.length;

    // Find top source
    const typeTotals: Record<string, number> = {};
    filteredEntries.forEach(e => {
      typeTotals[e.type] = (typeTotals[e.type] || 0) + e.co2e_kg;
    });
    const topSource = Object.entries(typeTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    // Scope breakdown
    const scopes = { "Scope 1": 0, "Scope 2": 0, "Scope 3": 0 };
    filteredEntries.forEach(e => {
      scopes[e.scope] += e.co2e_kg;
    });

    // New Professional Metrics: Eco-Efficiency
    const intensity = activityCount > 0 ? (totalEmissions / activityCount) : 0;

    // Eco-Score Calculation (0-100)
    // Benchmark: 0-200kg per activity is Excellent. >2000kg is Critical.
    let score = 100 - Math.min(100, (intensity / 3000) * 100);
    let rating = { label: "Optimal", color: "#10b981", bg: "#f0fdf4" };

    if (score < 40) {
      rating = { label: "Inefficient", color: "#ef4444", bg: "#fef2f2" };
    } else if (score < 75) {
      rating = { label: "Moderate", color: "#f59e0b", bg: "#fffbeb" };
    }

    return { totalEmissions, activityCount, topSource, scopes, intensity, score, rating };
  }, [filteredEntries]);

  // ---- CHART DATA ----
  const emissionsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach((e) => {
      const d = new Date(e.timestamp);
      const key = d.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + (e.co2e_kg || 0);
    });
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, value]) => ({ date, value }));
  }, [filteredEntries]);

  const emissionsByTypeChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach((e) => {
      const key = e.type || "Other";
      map[key] = (map[key] || 0) + (e.co2e_kg || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  return (
    <div className="analytics-dashboard">
      <style>{`
        .analytics-dashboard {
          padding: 32px;
          background: #f1f5f9;
          min-height: 100vh;
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
        }

        .header-section {
          margin-bottom: 40px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .header-section h1 {
          font-size: 38px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.04em;
          line-height: 1.1;
        }

        .header-section p {
          color: #64748b;
          font-size: 16px;
          font-weight: 500;
          margin: 0;
        }

        /* Stat Cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          padding: 28px;
          border-radius: 24px;
          box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(255, 255, 255, 1);
        }

        .stat-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08);
          background: white;
        }

        .stat-icon {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }

        .icon-blue { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); color: #2563eb; }
        .icon-green { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); color: #16a34a; }
        .icon-orange { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); color: #ea580c; }
        .icon-purple { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); color: #7c3aed; }

        .stat-info {
          flex: 1;
        }

        .stat-info h3 {
          font-size: 12px;
          font-weight: 800;
          color: #94a3b8;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .stat-info p {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin: 4px 0 0 0;
          letter-spacing: -0.03em;
        }

        /* Eco Index Styles */
        .efficiency-badge {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 8px;
          display: inline-block;
        }

        .efficiency-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }

        .efficiency-score {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
        }

        .efficiency-bar-container {
          width: 100%;
          height: 8px;
          background: #f1f5f9;
          border-radius: 4px;
          margin-top: 10px;
          overflow: hidden;
        }

        .efficiency-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Filter Section */
        .filter-section {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(8px);
          padding: 24px;
          border-radius: 24px;
          margin-bottom: 40px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: flex-end;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.03);
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
          min-width: 220px;
        }

        .filter-item label {
          font-size: 14px;
          font-weight: 700;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-item select, 
        .filter-item input {
          height: 48px;
          padding: 0 18px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .filter-item select:hover, 
        .filter-item input:hover {
          border-color: #94a3b8;
        }

        .filter-item select:focus, 
        .filter-item input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
        }

        /* Charts Layout */
        .charts-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
        }

        .chart-main {
          grid-column: span 2;
        }

        .chart-card-modern {
          background: white;
          padding: 32px;
          border-radius: 32px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
          transition: transform 0.3s ease;
        }
        
        .chart-card-modern:hover {
           transform: translateY(-2px);
        }

        .chart-card-modern h2 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 28px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          letter-spacing: -0.02em;
        }

        @media (max-width: 1200px) {
          .charts-container { grid-template-columns: 1fr; }
          .chart-main { grid-column: span 1; }
        }
      `}</style>

      <section className="header-section">
        <h1>Environmental Analytics</h1>
        <p>Comprehensive breakdown of carbon footprint data across all activities.</p>
      </section>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon icon-blue"><Leaf size={28} /></div>
          <div className="stat-info">
            <h3>Total Emissions</h3>
            <p>{stats.totalEmissions.toFixed(2)} kg CO₂e</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon icon-green"><Activity size={28} /></div>
          <div className="stat-info">
            <h3>Activity Count</h3>
            <p>{stats.activityCount}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon icon-orange"><TrendingUp size={28} /></div>
          <div className="stat-info">
            <h3>Top Source</h3>
            <p style={{ fontSize: '18px' }}>{stats.topSource}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon icon-purple"><ShieldCheck size={28} /></div>
          <div className="stat-info">
            <h3>Eco-Efficiency Rating</h3>
            <div className="efficiency-meta">
              <span className="efficiency-score">{stats.score.toFixed(0)}/100</span>
              <span className="efficiency-badge" style={{ backgroundColor: stats.rating.bg, color: stats.rating.color }}>
                {stats.rating.label}
              </span>
            </div>
            <div className="efficiency-bar-container">
              <div
                className="efficiency-bar-fill"
                style={{ width: `${stats.score}%`, backgroundColor: stats.rating.color }}
              />
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginTop: '8px' }}>
              Carbon Cost: {stats.intensity.toFixed(1)} kg per activity
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <section className="filter-section">
        <div className="filter-item">
          <label><ShieldCheck size={14} /> Emissions Scope</label>
          <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
            <option value="all">All Scopes</option>
            <option value="scope 1">Scope 1 (Direct)</option>
            <option value="scope 2">Scope 2 (Indirect)</option>
            <option value="scope 3">Scope 3 (Value Chain)</option>
          </select>
        </div>

        <div className="filter-item">
          <label><Filter size={14} /> Sub-Category</label>
          <select value={subCategoryFilter} onChange={(e) => setSubCategoryFilter(e.target.value)}>
            <option value="all">All Activities</option>
            {availableSubCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label><Search size={14} /> Quick Search</label>
          <input
            type="text"
            placeholder="Search details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label><Calendar size={14} /> Date Range</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </section>

      {loading && <div style={{ textAlign: 'center', padding: '40px' }}>Analyzing data...</div>}
      {error && <div style={{ color: '#ef4444', padding: '20px' }}>{error}</div>}

      {!loading && !error && (
        <div className="charts-container">
          {/* Emissions Over Time - Area Chart */}
          <div className="chart-card-modern chart-main">
            <h2><Zap size={20} color="#3b82f6" /> Emissions Trend (CO₂e)</h2>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={emissionsByDate}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  width={60}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown - Bar Chart */}
          <div className="chart-card-modern">
            <h2><Filter size={20} color="#f59e0b" /> Category Breakdown</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={emissionsByTypeChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 500 }}
                  width={180}
                />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {emissionsByTypeChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Contribution Share - Pie Chart */}
          <div className="chart-card-modern">
            <h2><TrendingUp size={20} color="#8b5cf6" /> Contribution Share</h2>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={emissionsByTypeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {emissionsByTypeChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
