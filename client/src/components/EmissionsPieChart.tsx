import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Data for the chart
const data = [
  { name: 'Electricity', value: 58.5 },
  { name: 'Fuel', value: 20.3 },
  { name: 'Materials', value: 9.4 },
  { name: 'Transport', value: 6.6 },
  { name: 'Waste', value: 5.2 },
];

// Custom colors matching the UI's green palette
const COLORS = ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981'];

const ChartContainerStyle: React.CSSProperties = {
    width: '100%',
    height: 400,
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
};

export const EmissionsPieChart = () => {
  return (
    <div style={ChartContainerStyle}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#111827' }}>Emissions by Category</h3>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => `${value}%`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
