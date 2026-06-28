import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
);

interface Activity { co2e: number; timestamp: string; }
interface ChartProps { activities: Activity[]; }

export const EmissionsChart: React.FC<ChartProps> = ({ activities }) => {
  const chartData = {
    labels: activities.map(a => new Date(a.timestamp).toLocaleDateString()).reverse(),
    datasets: [
      {
        label: 'CO₂e (kg)',
        data: activities.map(a => a.co2e).reverse(),
        backgroundColor: 'rgba(29, 123, 75, 0.6)',
        borderColor: 'rgba(29, 123, 75, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Carbon Emissions Over Time' },
    },
  };

  return <Bar options={options} data={chartData} />;
};