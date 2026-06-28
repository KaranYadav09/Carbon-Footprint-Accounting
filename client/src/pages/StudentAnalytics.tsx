import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, PieChart as PieIcon, LineChart as LineIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import api from '../api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export const StudentAnalytics: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('/api/student/analytics');
                setData(res.data);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Analytics...</div>;
    if (!data) return <div style={{ padding: '40px', textAlign: 'center' }}>No data available.</div>;

    const hasTimeline = data.co2_timeline && data.co2_timeline.length > 0;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', fontFamily: "'Outfit', sans-serif" }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
                <button 
                    onClick={() => navigate('/dashboard')}
                    style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        padding: '10px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Personal Impact Analytics</h1>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>Visualize your contribution to a greener campus.</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
                
                {/* 1. CO2 Timeline */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <LineIcon size={20} color="#10b981" />
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>CO₂ Savings Trend</h3>
                    </div>
                    {hasTimeline ? (
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.co2_timeline}>
                                    <defs>
                                        <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9' }} />
                                    <Area type="monotone" dataKey="co2" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCo2)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            No history data for the last 6 months.
                        </div>
                    )}
                </div>

                {/* 2. Commutes Breakdown */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <PieIcon size={20} color="#3b82f6" />
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Commute Mode Distribution (km)</h3>
                    </div>
                    {data.commutes_by_mode.length > 0 ? (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.commutes_by_mode}
                                        dataKey="distance"
                                        nameKey="mode"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        label={({ mode }) => mode}
                                    >
                                        {data.commutes_by_mode.map((_entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            No commutes logged yet.
                        </div>
                    )}
                </div>

                {/* 3. Points Breakdown */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <BarChart3 size={20} color="#f59e0b" />
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Points Achievement Breakdown</h3>
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.points_breakdown} barSize={40}>
                                <XAxis dataKey="type" stroke="#94a3b8" fontSize={12} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="points" fill="#10b981" radius={[8, 8, 0, 0]}>
                                    {data.points_breakdown.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.type === 'Commutes' ? '#10b981' : entry.type === 'Trees' ? '#059669' : '#0ea5e9'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};
