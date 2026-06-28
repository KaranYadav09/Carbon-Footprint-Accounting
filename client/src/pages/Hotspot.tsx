import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "../api";
import "./AdminDashboard.css";

// ---- Types from your old code ----
interface Activity {
  id: number;
  activity_type: string;
  usage: string; // e.g. "33.99 kwh"
  co2e: string; // e.g. "78.5169"
  timestamp: string;
  uploaded_by: string;
}

// ---- Internal type used by the hotspot page ----
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

interface HotspotItem {
  name: string;
  value: number; // kg CO2e
  percent: number; // % of total emissions (0–100)
}

// format for kg CO2 values
const formatKg = (kg: number) => `${kg.toFixed(2)} kg CO₂`;

const getRootCauseText = (name: string) => {
  const t = name.toLowerCase();
  if (t.includes("fuel") || t.includes("diesel") || t.includes("petrol")) {
    return "Root Cause: High frequency of fuel usage detected. Immediate action recommended.";
  }
  if (t.includes("electricity") || t.includes("power")) {
    return "Root Cause: High frequency of electricity usage detected. Consider efficiency improvements.";
  }
  if (t.includes("gas") || t.includes("png") || t.includes("lpg")) {
    return "Root Cause: High frequency of gas usage detected. Inspect systems and optimize operations.";
  }
  return "Root Cause: High contribution from this activity. Review processes and explore optimization.";
};


export const Hotspot: React.FC = () => {
  const [entries, setEntries] = useState<EmissionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---- Fetch activities ----
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/activities");
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

  // ---- Hotspot aggregation (using ALL entries) ----
  const totalEmissionsKg = useMemo(
    () => entries.reduce((sum, e) => sum + (e.co2e_kg || 0), 0),
    [entries]
  );

  const hotspots: HotspotItem[] = useMemo(() => {
    if (entries.length === 0 || totalEmissionsKg === 0) return [];

    const map: Record<string, number> = {};
    entries.forEach((e) => {
      const key = e.type || "Other";
      map[key] = (map[key] || 0) + (e.co2e_kg || 0);
    });

    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percent: (value / totalEmissionsKg) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [entries, totalEmissionsKg]);

  const mainHotspot = hotspots[0];
  const secondaryHotspots = hotspots.slice(1, 4); // show up to 3 more

  return (
    <div className="dashboard-container">
      {/* MINIMIZED TOP HERO */}
      <section
        style={{
          background: "linear-gradient(135deg, #e9fdf7 0%, #e9f7ff 100%)",
          borderRadius: "16px",
          padding: "16px 18px 14px",
          textAlign: "center",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "999px",
            margin: "0 auto 6px",
            backgroundColor: "#ffe8e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 20, color: "#f25c4b" }}>🔥</span>
        </div>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: 2,
          }}
        >
          Emission Hotspots
        </h1>

        <p
          style={{
            fontSize: 12,
            color: "#6b7280",
            margin: 0,
          }}
        >
          Identifying your highest contributors.
        </p>
      </section>

      {error && <p className="error-message">{error}</p>}

      {loading && <p>Loading data…</p>}

      {!loading && hotspots.length === 0 && !error && (
        <p>No hotspot data available.</p>
      )}

      {!loading && hotspots.length > 0 && (
        <>
          {/* MAIN HOTSPOT CARD */}
          <section className="hotspot-main-card">
            <div
              className="hotspot-hero"
              style={{
                background: "#f04b37",
                color: "#fff",
                borderRadius: "18px",
                padding: "24px 28px",
                marginBottom: "16px",
                boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 600, opacity: 0.9 }}>
                #1 CONTRIBUTOR
              </div>
              <h2 style={{ marginTop: 8, fontSize: 22, fontWeight: 700 }}>
                {mainHotspot.name}
              </h2>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginTop: 16,
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    {formatKg(mainHotspot.value)}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    {mainHotspot.percent.toFixed(1)}% of total
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 40,
                    opacity: 0.2,
                    fontWeight: 700,
                  }}
                >
                  🔥
                </div>
              </div>

              {/* progress bar */}
              <div
                style={{
                  marginTop: 16,
                  height: 6,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.25)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(mainHotspot.percent, 100)}%`,
                    height: "100%",
                    background: "#6b0000",
                  }}
                />
              </div>

              <p
                style={{
                  marginTop: 16,
                  fontSize: 13,
                  opacity: 0.95,
                }}
              >
                {getRootCauseText(mainHotspot.name)}
              </p>
            </div>

            {/* KEY RECOMMENDATIONS CARD */}
            <AIRecommendationBlock hotspot={mainHotspot} isMain={true} />
          </section>

          {/* SECONDARY HOTSPOT CARDS */}
          <section
            className="hotspot-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                secondaryHotspots.length >= 3
                  ? "repeat(3, minmax(0,1fr))"
                  : `repeat(${secondaryHotspots.length}, minmax(0,1fr))`,
              gap: "18px",
              marginBottom: "24px",
            }}
          >
            {secondaryHotspots.map((item, idx) => (
              <div
                key={item.name}
                className="hotspot-card"
                style={{
                  background: "#fff",
                  borderRadius: "18px",
                  padding: "18px 20px",
                  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                  }}
                >
                  #{idx + 2} Contributor
                </div>

                <h3
                  style={{
                    marginTop: 8,
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {item.name}
                </h3>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginTop: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        lineHeight: 1.1,
                      }}
                    >
                      {formatKg(item.value)}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginTop: 2,
                      }}
                    >
                      {item.percent.toFixed(1)}% of total
                    </div>
                  </div>
                  <div style={{ fontSize: 20, opacity: 0.7 }}>⚡</div>
                </div>

                {/* mini progress bar */}
                <div
                  style={{
                    marginTop: 10,
                    height: 4,
                    borderRadius: 999,
                    background: "#e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(item.percent, 100)}%`,
                      height: "100%",
                      background: "#111827",
                    }}
                  />
                </div>

                <p
                  style={{
                    marginTop: 10,
                    marginBottom: 10,
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  {getRootCauseText(item.name)}
                </p>

                {/* AI Recommendations for Secondary Hotspot */}
                <AIRecommendationBlock hotspot={item} isMain={false} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
};

const AIRecommendationBlock: React.FC<{ hotspot: HotspotItem; isMain?: boolean }> = ({ hotspot, isMain }) => {
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchRecommendations = useCallback(async () => {
    if (!hotspot) return;
    try {
      setLoading(true);
      setError("");
      const response = await api.post("/api/ai-recommendations", {
        hotspot_name: hotspot.name,
        co2e_kg: hotspot.value,
        percentage: hotspot.percent,
        cacheSeed: Math.random() // Unique request per refresh
      });

      if (response.data && response.data.recommendations) {
        setRecommendations(response.data.recommendations);
        setError("");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Error fetching AI recommendations:", err);
      setRecommendations([]);
      const errorMsg = err?.response?.data?.error || err?.message || "Failed to load AI recommendations.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [hotspot]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (isMain) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          padding: "18px 22px",
          boxShadow: "0 10px 24px rgba(15,23,42,0.10)",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#0f172a",
                margin: 0,
              }}
            >
              AI Recommendations to Reduce This Hotspot
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: 12,
                color: "#16a34a",
                fontWeight: 500,
              }}
            >
              Targeted actions for {hotspot.name}
            </span>
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              style={{
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 500,
                color: "#16a34a",
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Get new AI recommendations"
            >
              {loading ? "⏳" : "🔄"} Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>
            <div style={{ fontSize: 14 }}>🤖 Generating AI recommendations...</div>
          </div>
        ) : recommendations.length > 0 ? (
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 13,
              color: "#4b5563",
              lineHeight: 1.6,
            }}
          >
            {recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "#ef4444" }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              ⚠️ Unable to generate AI recommendations
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
              {error || "Please check your API keys (Gemini or OpenAI) and try refreshing."}
            </div>
            <button
              onClick={fetchRecommendations}
              style={{
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 500,
                color: "#fff",
                background: "#16a34a",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  // Secondary style
  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>AI Recommendations</h4>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          style={{
            padding: "2px 8px",
            fontSize: 10,
            fontWeight: 500,
            color: "#16a34a",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: "2px"
          }}
        >
          {loading ? "⏳" : "🔄"}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "10px", textAlign: "center", color: "#6b7280", fontSize: '11px' }}>
          Generating...
        </div>
      ) : recommendations.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#4b5563', lineHeight: 1.4 }}>
           {recommendations.slice(0, 3).map((rec, index) => (
             <li key={index} style={{ marginBottom: '4px' }}>{rec}</li>
           ))}
        </ul>
      ) : (
        <div style={{ padding: "10px", textAlign: "center", color: "#ef4444", fontSize: '11px' }}>
          <div style={{ marginBottom: '4px' }}>Unable to generate</div>
          <button 
            onClick={fetchRecommendations} 
            style={{ 
              padding: '2px 8px', fontSize: '10px', background: '#e2e8f0', 
              border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#475569'
            }}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
