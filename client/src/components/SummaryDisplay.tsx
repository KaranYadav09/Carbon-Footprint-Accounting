import React from 'react';

interface SummaryProps {
  totalCo2e: number;
  totalActivities: number;
}

export const SummaryDisplay: React.FC<SummaryProps> = ({ totalCo2e, totalActivities }) => {
  return (
    <div className="summary-container">
      <div className="summary-card">
        <span className="summary-value">{totalCo2e.toFixed(2)}</span>
        <span className="summary-label">Total kg CO₂e</span>
      </div>
      <div className="summary-card">
        <span className="summary-value">{totalActivities}</span>
        <span className="summary-label">Total Activities Logged</span>
      </div>
    </div>
  );
};