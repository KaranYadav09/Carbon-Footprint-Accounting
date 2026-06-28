import React from 'react';
import { FiArchive } from 'react-icons/fi'; // An icon for the empty state

// Assuming the 'Activity' type is defined elsewhere and passed as props
interface Activity {
    id: number;
    activity_type: string;
    usage: string;
    co2e: string;
    timestamp: string;
    uploaded_by: string;
}

interface ActivityLogProps {
    activities: Activity[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ activities }) => {
    return (
        <div className="activity-log-container">
            <div className="activity-log-header">
                <h2>Recent Activity Log</h2>
            </div>
            
            {/* This is the key change: it checks if there are activities */}
            {activities.length > 0 ? (
                <table className="activity-log-table">
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
                        {activities.map((activity) => (
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
                // If there are no activities, it shows the empty message
                <div className="empty-log-message">
                    <FiArchive />
                    <p>No recent activity.</p>
                </div>
            )}
        </div>
    );
};