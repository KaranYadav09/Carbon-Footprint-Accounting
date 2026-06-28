import React, { useState, useEffect } from "react";
import { Save, Loader2, Calculator, Info, FileText, Eye } from "lucide-react";
import api from "../api";

// Updated categories to match backend types
type Category =
  | "electricity" | "water" | "fuel" | "png_gas" | "lpg"
  | "desktop" | "monitor" | "desktop_combined"
  | "keyboard" | "mouse" | "router" | "network_switch"
  | "table" | "chair"
  | "printer" | "scanner" | "ups";

interface FormState {
  date: string;
  category: Category;
  amount: string;
  unit: string;
  description: string;
}

interface Activity {
  id: number;
  activity_type: string;
  usage: string;
  co2e: string;
  timestamp: string;
  uploaded_by: string;
}

// Decode JWT token and extract user id from "sub" (Flask-JWT-Extended default)
const getUserIdFromToken = (token: string): number | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    let payloadBase64 = parts[1];
    // Fix padding for base64url
    payloadBase64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    while (payloadBase64.length % 4 !== 0) {
      payloadBase64 += "=";
    }

    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    // Flask-JWT-Extended puts identity in "sub"
    const sub = payload.sub ?? payload.identity;
    if (!sub) return null;

    const num = Number(sub);
    return Number.isNaN(num) ? null : num;
  } catch (e) {
    console.error("Failed to decode JWT token:", e);
    return null;
  }
};

// Emission factors aligned with your Python script (kg CO2 per unit)
const factors: Record<Category, Record<string, number>> = {
  electricity: { kWh: 0.82 },
  water: { KL: 0.5 },
  fuel: { liters: 2.31 },
  png_gas: { SCM: 2.1 },
  lpg: { cylinder: 42.6 },

  // Scope 3: Computing
  desktop: { units: 300 },
  monitor: { units: 215 },
  desktop_combined: { units: 525 },

  // Scope 3: Input & Networking
  keyboard: { units: 6.5 },
  mouse: { units: 3 },
  router: { units: 22.5 },
  network_switch: { units: 42.5 },

  // Scope 3: Furniture
  table: { units: 45 },
  chair: { units: 35 },

  // Scope 3: Printing & Power
  printer: { units: 80 },
  scanner: { units: 60 },
  ups: { units: 85 },
};

// Match activity_type strings used by the OCR backend
const activityTypeMap: Record<Category, string> = {
  electricity: "Electricity Usage",
  water: "Water Usage",
  fuel: "Fuel Usage (Petrol/Diesel)",
  png_gas: "PNG Gas Consumption",
  lpg: "LPG Cylinder Consumption",

  desktop: "Desktop Computer",
  monitor: "Monitor",
  desktop_combined: "Desktop Combined",

  keyboard: "Keyboard",
  mouse: "Mouse",
  router: "Router",
  network_switch: "Network Switch",

  table: "Office Table",
  chair: "Office Chair",

  printer: "Laser Printer",
  scanner: "Scanner",
  ups: "UPS (1-2 kVA)",
};

const ManualEntryPage: React.FC = () => {
  const [formData, setFormData] = useState<FormState>({
    date: new Date().toISOString().split("T")[0],
    category: "electricity",
    amount: "",
    unit: "kWh",
    description: "",
  });

  const [calculatedCo2, setCalculatedCo2] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [showRecentBills, setShowRecentBills] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const calculate = () => {
    const factor = factors[formData.category]?.[formData.unit] ?? 0.5;
    // kg CO2
    const co2 = parseFloat(formData.amount || "0") * factor;
    setCalculatedCo2(co2);
    return co2;
  };

  // Fetch recent activities to show what has been captured from bills
  const fetchRecentActivities = async () => {
    setLoadingActivities(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to view activities.");
        return;
      }

      const response = await api.get("/api/activities");
      setRecentActivities(response.data);
    } catch (error) {
      console.error("Error fetching activities:", error);
      alert("Failed to fetch recent activities.");
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (showRecentBills) {
      fetchRecentActivities();
    }
  }, [showRecentBills]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.amount) return;

    setIsSaving(true);
    const co2 = calculate(); // kg CO2 (for UI)

    try {
      const numericAmount = parseFloat(formData.amount);
      const activity_type = activityTypeMap[formData.category];

      // Get token (same as upload page)
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to save a record.");
        setIsSaving(false);
        return;
      }

      // Decode user_id from JWT (Flask-JWT-Extended identity)
      const user_id = getUserIdFromToken(token);
      console.log("Decoded user_id from token:", user_id);
      if (!user_id) {
        alert("Could not extract user id from token. Please log in again.");
        setIsSaving(false);
        return;
      }

      // POST to backend using the newly updated field name gracefully
      const response = await api.post(
        "/api/activities",
        {
          activity_type, // e.g. "Electricity Usage"
          usage_value: numericAmount, // Will be read generically by app.py
          user_id,
          co2e_kg: co2, // optional; backend currently recomputes
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Manual entry submitted", {
        ...formData,
        amount: numericAmount,
        co2e_kg: co2,
        activity_type,
        user_id,
        response: response.data,
      });

      alert("Record added successfully");

      // Reset form + preview
      setFormData({
        date: new Date().toISOString().split("T")[0],
        category: "electricity",
        amount: "",
        unit: "kWh",
        description: "",
      });
      setCalculatedCo2(null);
    } catch (err: any) {
      console.error("Manual entry save error:", err);

      if (err?.response) {
        console.error("Response data:", err.response.data);
        const status = err.response.status;
        const data = err.response.data;
        alert(
          `Error ${status}: ${typeof data === "string" ? data : JSON.stringify(data)
          }`
        );
      } else {
        alert(`Network error: ${err?.message || "Something went wrong while saving."}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const unitOptions = Object.keys(factors[formData.category] || {});

  return (
    <div className="me-page">
      {/* LOCAL CSS */}
      <style>{`
        .me-page {
          padding: 24px 28px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #f3f4f6;
          min-height: 100%;
        }
        .me-header-title {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        .me-header-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 24px;
        }
        .me-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          gap: 24px;
        }
        @media (max-width: 900px) {
          .me-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .me-card {
          background: rgba(255,255,255,0.9);
          border-radius: 18px;
          padding: 20px 22px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          border: 1px solid rgba(148, 163, 184, 0.4);
        }
        .me-card-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
        }
        .me-form-grid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .me-form-grid3 {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 14px;
        }
        @media (max-width: 640px) {
          .me-form-grid2,
          .me-form-grid3 {
            grid-template-columns: 1fr;
          }
        }
        .me-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
        }
        .me-label {
          font-weight: 500;
          color: #111827;
        }
        .me-input,
        .me-select {
          padding: 9px 10px;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          font-size: 14px;
          outline: none;
          background: #6b6a6aff;
          transition: border-color 0.12s, box-shadow 0.12s;
        }
        .me-input:focus,
        .me-select:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 1px rgba(16,185,129,0.25);
        }
        .me-footer {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
        }
        .me-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          outline: none;
          transition: background 0.15s, transform 0.05s, box-shadow 0.15s;
        }
        .me-btn-primary {
          background: #059669;
          color: #ffffff;
          min-width: 150px;
          box-shadow: 0 10px 22px rgba(16,185,129,0.4);
        }
        .me-btn-primary:hover {
          background: #047857;
        }
        .me-btn-ghost {
          background: transparent;
          color: #065f46;
        }
        .me-btn-ghost:hover {
          background: rgba(5,150,105,0.08);
        }
        .me-btn:disabled {
          opacity: 0.7;
          cursor: default;
          box-shadow: none;
        }

        /* Calculator card */
        .me-card-dark {
          background: linear-gradient(180deg, #020617, #0f172a);
          color: #e5e7eb;
          border-color: transparent;
        }
        .me-card-dark .me-card-title {
          color: #6ee7b7;
        }
        .me-calc-main {
          text-align: center;
          padding: 32px 0 26px;
        }
        .me-calc-main-label {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 4px;
        }
        .me-calc-main-value {
          font-size: 40px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .me-calc-main-sub {
          font-size: 13px;
          color: #6ee7b7;
          font-weight: 500;
        }
        .me-calc-box {
          background: rgba(255,255,255,0.06);
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 10px;
        }
        .me-calc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .me-calc-row:last-child {
          margin-bottom: 0;
        }
        .me-calc-note {
          display: flex;
          gap: 8px;
          margin-top: 6px;
          font-size: 11px;
          background: rgba(59,130,246,0.22);
          border-radius: 10px;
          padding: 8px 9px;
          color: #c7d2fe;
        }
        .me-calc-note-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .me-spin {
          animation: me-spin 1s linear infinite;
        }
        @keyframes me-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Recent Bills Section */
        .recent-bills-section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        .recent-bills-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .toggle-bills-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .toggle-bills-btn:hover {
          background: #e5e7eb;
        }
        .activity-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .activity-table th {
          background: #f9fafb;
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }
        .activity-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .activity-table tr:last-child td {
          border-bottom: none;
        }
        .no-activities {
          text-align: center;
          padding: 24px;
          color: #6b7280;
          font-style: italic;
        }
        .loading {
          text-align: center;
          padding: 24px;
          color: #6b7280;
        }
      `}</style>

      <header>
        <h1 className="me-header-title">Manual Data Entry</h1>
        <p className="me-header-subtitle">
          Log your consumption manually when documents aren&apos;t available.
        </p>
      </header>

      {/* Section to show recent bills that were processed */}
      <div className="recent-bills-section">
        <div className="recent-bills-header">
          <h2 className="me-card-title">Recent Bills & Activities</h2>
          <button
            className="toggle-bills-btn"
            onClick={() => setShowRecentBills(!showRecentBills)}
          >
            {showRecentBills ? (
              <>
                <Eye size={16} />
                Hide Recent Activities
              </>
            ) : (
              <>
                <FileText size={16} />
                Show Recent Activities
              </>
            )}
          </button>
        </div>

        {showRecentBills && (
          <div className="me-card">
            {loadingActivities ? (
              <div className="loading">Loading recent activities...</div>
            ) : recentActivities.length > 0 ? (
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Usage</th>
                    <th>CO₂e (kg)</th>
                    <th>Uploaded By</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((activity) => (
                    <tr key={activity.id}>
                      <td>{activity.id}</td>
                      <td>{activity.activity_type}</td>
                      <td>{activity.usage}</td>
                      <td>{activity.co2e}</td>
                      <td>{activity.uploaded_by}</td>
                      <td>{new Date(activity.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-activities">
                No recent activities found. Process some bills or add manual entries.
              </div>
            )}
          </div>
        )}

        <p className="me-header-subtitle" style={{ marginTop: '16px' }}>
          Use this section to check what has already been captured from your bills.
          Add items that were not found in your bills below.
        </p>
      </div>

      <div className="me-grid">
        {/* FORM CARD */}
        <section className="me-card">
          <h2 className="me-card-title">Manual Entry Form</h2>

          <form onSubmit={handleSubmit}>
            {/* Date + Category */}
            <div className="me-form-grid2">
              <div className="me-field">
                <label className="me-label">Date</label>
                <input
                  type="date"
                  className="me-input"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="me-field">
                <label className="me-label">Category</label>
                <select
                  className="me-select"
                  value={formData.category}
                  onChange={(e) => {
                    const category = e.target.value as Category;
                    const firstUnit =
                      Object.keys(factors[category] || {})[0] || "";
                    setFormData({
                      ...formData,
                      category,
                      unit: firstUnit,
                    });
                    setCalculatedCo2(null);
                  }}
                >
                  <optgroup label="Core Utilities">
                    <option value="electricity">Electricity</option>
                    <option value="water">Water</option>
                    <option value="fuel">Fuel</option>
                    <option value="png_gas">PNG Gas</option>
                    <option value="lpg">LPG Cylinders</option>
                  </optgroup>

                  <optgroup label="Scope 3: Computing Equipment">
                    <option value="desktop">Desktop Computer</option>
                    <option value="monitor">Monitor (22-24")</option>
                    <option value="desktop_combined">Desktop + Monitor</option>
                  </optgroup>

                  <optgroup label="Scope 3: Input & Networking">
                    <option value="keyboard">Keyboard</option>
                    <option value="mouse">Mouse</option>
                    <option value="router">Router</option>
                    <option value="network_switch">Network Switch</option>
                  </optgroup>

                  <optgroup label="Scope 3: Furniture">
                    <option value="table">Office Table</option>
                    <option value="chair">Office Chair</option>
                  </optgroup>

                  <optgroup label="Scope 3: Printing & Power">
                    <option value="printer">Laser Printer</option>
                    <option value="scanner">Scanner</option>
                    <option value="ups">UPS (1-2 kVA)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Amount + Unit */}
            <div className="me-form-grid3" style={{ marginTop: 14 }}>
              <div className="me-field">
                <label className="me-label">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="me-input"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value });
                    setCalculatedCo2(null);
                  }}
                  required
                />
              </div>

              <div className="me-field">
                <label className="me-label">Unit</label>
                <select
                  className="me-select"
                  value={formData.unit}
                  onChange={(e) => {
                    setFormData({ ...formData, unit: e.target.value });
                    setCalculatedCo2(null);
                  }}
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="me-field" style={{ marginTop: 14 }}>
              <label className="me-label">Description / Note</label>
              <input
                className="me-input"
                placeholder="e.g. November factory usage"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* Buttons */}
            <div className="me-footer">
              <button
                type="button"
                className="me-btn me-btn-ghost"
                onClick={calculate}
                disabled={!formData.amount}
              >
                <Calculator size={16} />
                <span>Calculate Preview</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="me-btn me-btn-primary"
              >
                {isSaving ? (
                  <Loader2 size={16} className="me-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span>{isSaving ? "Saving..." : "Save Record"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* CALCULATOR CARD */}
        <section className="me-card me-card-dark">
          <h2 className="me-card-title">Calculator</h2>

          <div>
            <div className="me-calc-main">
              <div className="me-calc-main-label">Estimated Footprint</div>
              <div className="me-calc-main-value">
                {calculatedCo2 !== null ? calculatedCo2.toFixed(2) : "0.00"}
              </div>
              <div className="me-calc-main-sub">kg CO₂e</div>
            </div>

            <div className="me-calc-box">
              <div className="me-calc-row">
                <span style={{ color: "#d1d5db" }}>Factor used:</span>
                <span style={{ fontFamily: "monospace" }}>
                  {factors[formData.category]?.[formData.unit] ?? "0.5"} kg /
                  unit
                </span>
              </div>
              <div className="me-calc-row">
                <span style={{ color: "#d1d5db" }}>Category:</span>
                <span style={{ textTransform: "capitalize" }}>
                  {formData.category}
                </span>
              </div>
            </div>

            <div className="me-calc-note">
              <div className="me-calc-note-icon">
                <Info size={14} />
              </div>
              <p>
                Calculations use standard emission factors. For precise
                reporting, ensure your amount and unit selection are correct and
                aligned with your organization&apos;s methodology.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ManualEntryPage;
