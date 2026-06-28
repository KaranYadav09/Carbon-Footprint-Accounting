import React, { useState, useEffect } from 'react';
import api from '../api';
import { EmissionsChart } from './EmissionsChart';
import { SummaryDisplay } from './SummaryDisplay';

interface Activity { id: number; activity_type: string; usage: number; unit: string; co2e: number; timestamp: string; uploaded_by: string; }
interface SummaryData { total_co2e_kg: number; total_activities: number; }
interface DashboardProps {
  updateTrigger: number;
  summaryUrl: string;
  activitiesUrl: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ updateTrigger, summaryUrl, activitiesUrl }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, activitiesRes] = await Promise.all([
          api.get(summaryUrl),
          api.get(activitiesUrl)
        ]);
        setSummary(summaryRes.data);
        setActivities(activitiesRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [updateTrigger, summaryUrl, activitiesUrl]);

  if (isLoading) return <div className="dashboard-container"><h2>Loading Dashboard...</h2></div>;

  return (
    <div className="dashboard-container">
      {summary && <SummaryDisplay totalCo2e={summary.total_co2e_kg} totalActivities={summary.total_activities} />}
      {activities.length > 0 ? (
        <>
          <div className="chart-wrapper"><EmissionsChart activities={activities} /></div>
          <h3 className="log-title">Activity Log</h3>
          <table>
            <thead>
              <tr><th>Activity</th><th>Usage</th><th>CO₂e (kg)</th><th>Uploaded By</th><th>Date Recorded</th></tr>
            </thead>
            <tbody>
              {activities.map(activity => (
                <tr key={activity.id}>
                  <td>{activity.activity_type}</td><td>{activity.usage.toFixed(2)} {activity.unit}</td>
                  <td>{activity.co2e.toFixed(2)}</td><td>{activity.uploaded_by}</td>
                  <td>{new Date(activity.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : <p>No activities recorded yet.</p>}
    </div>
  );
};