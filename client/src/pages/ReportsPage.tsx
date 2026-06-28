import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import {
  Download,
  Printer,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Leaf,
  ShieldCheck,
  Zap,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";

import jsPDF from "jspdf";
import logoUrl from '../assets/ecotrace-logo.png';

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

interface Activity {
  id: number;
  activity_type: string;
  usage: string;
  co2e: string;
  timestamp: string;
  uploaded_by: string;
}

type ScopeType = "Scope 1" | "Scope 2" | "Scope 3";

interface ReportStats {
  from: string;
  to: string;
  grouping: "month" | "quarter" | "year";
  totalEmissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
  periodData: { period: string; value: number }[];
  entries: Activity[];
}

interface ReportHistoryItem {
  id: number;
  from: string;
  to: string;
  createdAt: string;
  totalEmissions: number;
}

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#6366f1", "#ec4899"];

// ---- Scope classification helper ----
const classifyScope = (type: string): ScopeType => {
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

// ---- Grouping helpers ----
const getMonthLabel = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const getQuarterLabel = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()} Q${q}`;
};

const getYearLabel = (d: Date) => `${d.getFullYear()}`;

// Build report stats for a given set of activities + config
const buildReportStats = (
  from: string,
  to: string,
  grouping: "month" | "quarter" | "year",
  activities: Activity[]
): ReportStats => {
  let totalEmissions = 0;
  let scope1 = 0;
  let scope2 = 0;
  let scope3 = 0;

  const periodMap: Record<string, number> = {};

  activities.forEach((a) => {
    const co2 = parseFloat(a.co2e) || 0;
    totalEmissions += co2;

    const scope = classifyScope(a.activity_type);
    if (scope === "Scope 1") scope1 += co2;
    else if (scope === "Scope 2") scope2 += co2;
    else scope3 += co2;

    const d = new Date(a.timestamp);
    let label: string;
    if (grouping === "month") label = getMonthLabel(d);
    else if (grouping === "quarter") label = getQuarterLabel(d);
    else label = getYearLabel(d);

    periodMap[label] = (periodMap[label] || 0) + co2;
  });

  const periodData = Object.entries(periodMap)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([period, value]) => ({ period, value }));

  return {
    from,
    to,
    grouping,
    totalEmissions,
    scope1,
    scope2,
    scope3,
    periodData,
    entries: activities,
  };
};

export const ReportsPage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [grouping, setGrouping] = useState<"month" | "quarter" | "year">(
    "month"
  );

  const [currentReport, setCurrentReport] = useState<ReportStats | null>(null);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);

  // Fetch all activities once
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/activities");
      const data = response.data as Activity[];
      setActivities(data);

      if (data.length > 0) {
        const dates = data.map((a) => new Date(a.timestamp));
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        const fromStr = minDate.toISOString().slice(0, 10);
        const toStr = maxDate.toISOString().slice(0, 10);

        setFromDate(fromStr);
        setToDate(toStr);

        const filtered = data.filter((a) => {
          const ts = new Date(a.timestamp);
          const from = new Date(fromStr);
          const to = new Date(toStr);
          to.setDate(to.getDate() + 1);
          return ts >= from && ts < to;
        });

        const initialStats = buildReportStats(fromStr, toStr, "month", filtered);
        setCurrentReport(initialStats);

        const initHistoryItem: ReportHistoryItem = {
          id: 1,
          from: fromStr,
          to: toStr,
          createdAt: new Date().toLocaleString(),
          totalEmissions: initialStats.totalEmissions,
        };
        setHistory([initHistoryItem]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Could not load data for reports. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filteredActivities = useMemo(() => {
    if (!fromDate && !toDate) return activities;

    return activities.filter((a) => {
      const ts = new Date(a.timestamp);
      if (fromDate && ts < new Date(fromDate)) return false;
      if (toDate) {
        const to = new Date(toDate);
        to.setDate(to.getDate() + 1);
        if (ts >= to) return false;
      }
      return true;
    });
  }, [activities, fromDate, toDate]);

  const handleGenerateReport = () => {
    if (!fromDate || !toDate) {
      alert("Please select both From and To dates.");
      return;
    }

    if (filteredActivities.length === 0) {
      alert("No data found in the selected date range.");
      return;
    }

    const stats = buildReportStats(fromDate, toDate, grouping, filteredActivities);
    setCurrentReport(stats);

    const newHistoryItem: ReportHistoryItem = {
      id: history.length + 1,
      from: fromDate,
      to: toDate,
      createdAt: new Date().toLocaleString(),
      totalEmissions: stats.totalEmissions,
    };
    setHistory((prev) => [newHistoryItem, ...prev]);
  };

  const handleDownloadCSV = () => {
    if (!currentReport) return;

    const rows = [
      ["ID", "Activity Type", "Usage", "CO2e (kg)", "Timestamp", "Uploaded By", "Scope"],
      ...currentReport.entries.map((a) => [
        a.id,
        a.activity_type,
        a.usage,
        a.co2e,
        new Date(a.timestamp).toISOString(),
        a.uploaded_by,
        classifyScope(a.activity_type),
      ]),
    ];

    const csvContent = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ecotrace-report-${currentReport.from}-to-${currentReport.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (!currentReport) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Professional Sustainability Colors
    const primaryGreen = [16, 163, 74];
    const lightGreen = [240, 253, 244];
    const borderGray = [226, 232, 240];
    const textDark = [15, 23, 42];
    const textGray = [100, 116, 139];

    let currentY = 0;

    // --- Page 1: Header & Executive Summary ---
    // Top Brand Bar
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Logo / Brand Text
    try {
      const imgInfo = await loadImage(logoUrl);
      const targetHeight = 16;
      const imgWidth = (imgInfo.width / imgInfo.height) * targetHeight;
      const logoY = 12;
      doc.addImage(imgInfo, 'PNG', margin, logoY, imgWidth, targetHeight);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('PREMIUM SUSTAINABILITY REPORT', margin, logoY + targetHeight + 7);
    } catch (err) {
      console.error("Failed to load logo", err);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('EcoTrace', margin, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('PREMIUM SUSTAINABILITY REPORT', margin, 32);
    }

    // Organization Details (Right)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EcoTrace Inc.', pageWidth - margin, 18, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Engineering Campus Solutions', pageWidth - margin, 24, { align: 'right' });
    doc.text('Mumbai, India', pageWidth - margin, 30, { align: 'right' });

    currentY = 60;

    // Report Metadata Title
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Environmental Assessment Report', margin, currentY);
    currentY += 10;

    // Report Period Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const generatedOn = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated on: ${generatedOn}`, margin, currentY);
    doc.text(`Reporting Period: ${currentReport.from} — ${currentReport.to}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 15;

    // --- Executive Summary Box ---
    doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
    doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, currentY, contentWidth, 45, 3, 3, 'FD');

    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTIVE SUMMARY', margin + 8, currentY + 10);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(
      `This document presents a detailed analysis of the GHG emissions recorded by EcoTrace Inc. for the specified duration. The assessment covers direct (Scope 1), energy-related (Scope 2), and other indirect (Scope 3) emission sources. Total recorded impact is ${currentReport.totalEmissions.toFixed(2)} kg CO2e, representing a comprehensive view of the organization's environmental footprint.`,
      contentWidth - 16
    );
    doc.text(summaryLines, margin + 8, currentY + 18);

    currentY += 60;

    // --- Key Metrics Grid (Drawn as cells) ---
    const cellW = (contentWidth - 15) / 4;
    const cellH = 25;
    const metrics = [
      { label: 'TOTAL IMPACT', val: `${currentReport.totalEmissions.toFixed(1)}`, unit: 'kg CO2e' },
      { label: 'SCOPE 1', val: `${currentReport.scope1.toFixed(1)}`, unit: 'Direct' },
      { label: 'SCOPE 2', val: `${currentReport.scope2.toFixed(1)}`, unit: 'Energy' },
      { label: 'SCOPE 3', val: `${currentReport.scope3.toFixed(1)}`, unit: 'Other' }
    ];

    metrics.forEach((m, i) => {
      const x = margin + (cellW + 5) * i;
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, currentY, cellW, cellH, 2, 2, 'FD');

      doc.setFontSize(7);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(m.label, x + 5, currentY + 7);

      doc.setFontSize(12);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(m.val, x + 5, currentY + 16);

      doc.setFontSize(7);
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.text(m.unit, x + 5, currentY + 21);
    });

    currentY += 40;

    // --- Visualization (Simulated Charts) ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Emissions Distribution Analysis', margin, currentY);
    currentY += 10;

    const barMaxW = contentWidth - 40;
    const barH = 8;
    const scopes = [
      { name: 'Scope 1', val: currentReport.scope1, color: [16, 185, 129] },
      { name: 'Scope 2', val: currentReport.scope2, color: [59, 130, 246] },
      { name: 'Scope 3', val: currentReport.scope3, color: [245, 158, 11] }
    ];

    scopes.forEach(s => {
      const ratio = currentReport.totalEmissions > 0 ? s.val / currentReport.totalEmissions : 0;
      doc.setFontSize(9);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(s.name, margin, currentY + 6);

      doc.setFillColor(241, 245, 249);
      doc.rect(margin + 25, currentY, barMaxW, barH, 'F');

      doc.setFillColor(s.color[0], s.color[1], s.color[2]);
      doc.rect(margin + 25, currentY, ratio * barMaxW, barH, 'F');

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${(ratio * 100).toFixed(1)}%`, margin + barMaxW + 28, currentY + 6);
      currentY += 15;
    });

    // --- Footer ---
    const addFooter = (pNum: number, total: number) => {
      doc.setPage(pNum);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.setFontSize(8);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text('EcoTrace Environmental Report — Confidential', margin, pageHeight - 10);
      doc.text(`Page ${pNum} of ${total}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    };

    // --- Page 2: Detailed Activity Data ---
    doc.addPage();
    currentY = margin + 10;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Detailed Activity Ledger', margin, currentY);
    currentY += 10;

    // Table Header
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(margin, currentY, contentWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('ID', margin + 3, currentY + 7);
    doc.text('Activity Name', margin + 15, currentY + 7);
    doc.text('Usage Value', margin + 80, currentY + 7);
    doc.text('Emissions (kg)', margin + 120, currentY + 7);
    doc.text('Scope', margin + 155, currentY + 7);
    currentY += 12;

    const rowH = 8;
    currentReport.entries.slice(0, 20).forEach((e, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, currentY - 6, contentWidth, rowH, 'F');
      }
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${e.id}`, margin + 3, currentY);
      doc.text(`${e.activity_type.substring(0, 30)}`, margin + 15, currentY);
      doc.text(`${e.usage}`, margin + 80, currentY);
      doc.text(`${parseFloat(e.co2e).toFixed(2)}`, margin + 120, currentY);
      doc.text(`${classifyScope(e.activity_type)}`, margin + 155, currentY);
      currentY += rowH;
    });

    if (currentReport.entries.length > 20) {
      doc.setFontSize(7);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(`* Showing first 20 records. Total entries: ${currentReport.entries.length}`, margin, currentY + 5);
      currentY += 15;
    }

    // --- Sustainability Recommendations ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text('Campus Sustainability Guidance', margin, currentY);
    currentY += 8;

    const tips = [
      "Transition campus laboratory lighting to motion-sensor LED systems.",
      "Implement a policy for high-precision lab equipment shutdown after hours.",
      "Increase the adoption of renewable energy via hostel rooftop solar grids.",
      "Promote EV charging infrastructure for student and faculty vehicles."
    ];

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    tips.forEach(t => {
      doc.text(`• ${t}`, margin + 5, currentY);
      currentY += 7;
    });

    // Finalize page footers
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      addFooter(i, totalPages);
    }

    doc.save(`EcoTrace_Assessment_${currentReport.from}_to_${currentReport.to}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const reportDateStr = new Date().toLocaleDateString();

  return (
    <div className="reports-dashboard">
      <style>{`
        .reports-dashboard {
          padding: 32px;
          background: #f1f5f9;
          min-height: 100vh;
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
        }

        /* Print Optimization */
        @media print {
          body { background: white !important; padding: 0 !important; }
          .reports-dashboard { padding: 0 !important; background: white !important; }
          .header-section, .filter-toolbar, .hero-actions, .history-section, .breadcrumb { display: none !important; }
          .report-hero { 
            border: none !important; 
            box-shadow: none !important; 
            padding: 20px 0 !important;
            margin-bottom: 20px !important;
            background: white !important;
          }
          .hero-left h2 { font-size: 24px !important; color: #059669 !important; }
          .hero-right { display: block !important; border-top: 1px solid #eee !important; padding-top: 10px !important; }
          .stats-grid { gap: 10px !important; margin-bottom: 30px !important; }
          .stat-card { border: 1px solid #eee !important; box-shadow: none !important; padding: 15px !important; break-inside: avoid; }
          .charts-container { display: block !important; }
          .chart-wrapper { border: 1px solid #eee !important; box-shadow: none !important; margin-bottom: 20px !important; break-inside: avoid; }
          .icon-box { background: #f0fdf4 !important; color: #10b981 !important; print-color-adjust: exact; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        .header-section { margin-bottom: 40px; }
        .header-section h1 {
          font-size: 38px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.04em;
        }
        .header-section p { color: #64748b; font-size: 16px; margin: 4px 0 0 0; }
        
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #94a3b8;
          font-weight: 600;
          margin-bottom: 12px;
          text-transform: uppercase;
        }

        .filter-toolbar {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          padding: 24px;
          border-radius: 24px;
          margin-bottom: 40px;
          border: 1px solid white;
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          align-items: flex-end;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
        }

        .filter-item { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
        .filter-item label { font-size: 13px; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 6px; }
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

        .generate-btn {
          height: 44px;
          padding: 0 24px;
          background: #10b981;
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
        .generate-btn:hover { background: #059669; transform: translateY(-1px); }

        .report-hero {
          background: white;
          border-radius: 32px;
          padding: 40px;
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.03);
        }

        .hero-left { max-width: 60%; }
        .hero-left h2 { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0; }
        .hero-left p { color: #64748b; font-size: 16px; line-height: 1.6; margin: 0; }
        
        .hero-right { text-align: right; display: flex; flex-direction: column; gap: 8px; }
        .hero-meta { font-size: 14px; color: #64748b; font-weight: 500; }
        .hero-actions { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }

        .action-btn {
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #334155;
          transition: 0.2s;
        }
        .action-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
        .btn-primary { background: #1e293b; color: white; border: none; }
        .btn-primary:hover { background: #0f172a; }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .icon-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-content { display: flex; flex-direction: column; }
        .stat-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-value { font-size: 20px; font-weight: 800; color: #0f172a; }

        .charts-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-bottom: 40px;
        }

        .chart-wrapper {
          background: white;
          padding: 32px;
          border-radius: 32px;
          border: 1px solid #e2e8f0;
        }

        .chart-wrapper h3 {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 24px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .history-section {
          background: white;
          padding: 32px;
          border-radius: 32px;
          border: 1px solid #e2e8f0;
        }

        .history-section h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 24px 0; }

        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #f1f5f9; }
        .modern-table td { padding: 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
        
        .pill { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #475569; }

        .loading-bar {
          background: #dcfce7;
          color: #166534;
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 600;
          animation: pulse 2s infinite;
        }

        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 600;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>

      <div className="header-section">
        <div className="breadcrumb">
          <ChevronRight size={14} /> Analytics <ChevronRight size={14} /> Reports
        </div>
        <h1>GHG Reports</h1>
        <p>Comprehensive sustainability assessments and history.</p>
      </div>

      {loading && <div className="loading-bar">Updating report data...</div>}
      {error && <div className="error-message">{error}</div>}

      <section className="filter-toolbar">
        <div className="filter-item">
          <label><Calendar size={16} /> From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="filter-item">
          <label><Calendar size={16} /> To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="filter-item">
          <label><Filter size={16} /> Grouping</label>
          <select value={grouping} onChange={(e) => setGrouping(e.target.value as any)}>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
        <button className="generate-btn" onClick={handleGenerateReport}>
          <BarChart3 size={18} /> Generate Report
        </button>
      </section>

      {currentReport && (
        <>
          <section className="report-hero">
            <div className="hero-left">
              <h2>Executive Summary</h2>
              <p>
                This report details the carbon footprint of EcoTrace Inc. for the period of
                <strong> {currentReport.from} to {currentReport.to}</strong>.
                Our assessment follows GHG protocol standards, covering direct and indirect emission sources.
              </p>
              <div className="hero-actions">
                <button className="action-btn" onClick={handlePrint}><Printer size={16} /> Print</button>
                <button className="action-btn btn-primary" onClick={handleDownloadPDF}><Download size={16} /> Download PDF</button>
                <button className="action-btn" onClick={handleDownloadCSV}><FileSpreadsheet size={16} /> Export CSV</button>
              </div>
            </div>
            <div className="hero-right">
              <div className="hero-meta"><strong>Organization:</strong> EcoTrace Inc.</div>
              <div className="hero-meta"><strong>Report Date:</strong> {reportDateStr}</div>
              <div className="hero-meta"><strong>Grouping:</strong> {currentReport.grouping.toUpperCase()}</div>
              <div className="hero-meta"><strong>Status:</strong> <span style={{ color: '#10b981' }}>● Verified</span></div>
            </div>
          </section>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Leaf size={24} /></div>
              <div className="stat-content">
                <span className="stat-label">Total Impact</span>
                <span className="stat-value">{currentReport.totalEmissions.toFixed(1)} <small>kg</small></span>
              </div>
            </div>
            <div className="stat-card">
              <div className="icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Zap size={24} /></div>
              <div className="stat-content">
                <span className="stat-label">Scope 1</span>
                <span className="stat-value">{currentReport.scope1.toFixed(1)} <small>kg</small></span>
              </div>
            </div>
            <div className="stat-card">
              <div className="icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}><TrendingUp size={24} /></div>
              <div className="stat-content">
                <span className="stat-label">Scope 2</span>
                <span className="stat-value">{currentReport.scope2.toFixed(1)} <small>kg</small></span>
              </div>
            </div>
            <div className="stat-card">
              <div className="icon-box" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}><ShieldCheck size={24} /></div>
              <div className="stat-content">
                <span className="stat-label">Scope 3</span>
                <span className="stat-value">{currentReport.scope3.toFixed(1)} <small>kg</small></span>
              </div>
            </div>
          </div>

          <div className="charts-container">
            <div className="chart-wrapper">
              <h3><BarChart3 size={20} /> Emissions Timeline</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={currentReport.periodData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {currentReport.periodData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-wrapper">
              <h3><PieChartIcon size={20} /> Scope Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Scope 1", value: currentReport.scope1 },
                      { name: "Scope 2", value: currentReport.scope2 },
                      { name: "Scope 3", value: currentReport.scope3 },
                    ]}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                  >
                    {[0, 1, 2].map((i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <section className="history-section">
        <h2>Report History</h2>
        <table className="modern-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Period</th>
              <th>Generated On</th>
              <th>Total Emissions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td><span className="pill">#{h.id}</span></td>
                <td><strong>{h.from}</strong> to <strong>{h.to}</strong></td>
                <td>{h.createdAt}</td>
                <td><strong>{h.totalEmissions.toFixed(2)}</strong> kg CO₂e</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
