'use client';

import { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

interface TrendPoint {
    month: string;
    label: string;
    total_hc: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipContentProps) => {
    if (active && payload && payload.length) {
        const totalHC = payload[0]?.value;
        return (
            <div style={{
                background: '#fff', border: '1px solid #dde3ed',
                borderRadius: 10, padding: '12px 16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                fontSize: 12,
            }}>
                <div style={{ fontWeight: 700, color: '#1a2b4a', marginBottom: 6, fontSize: 13 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1e5fd4' }} />
                    <span style={{ color: '#5a7184' }}>Total HC:</span>
                    <span style={{ fontWeight: 700, color: '#1e5fd4' }}>{typeof totalHC === 'number' ? totalHC.toLocaleString('id-ID') : totalHC}</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function HCTrendChart({ variant = 'full' }: { variant?: 'full' | 'mini' }) {
    const [trendData, setTrendData] = useState<TrendPoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrend = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/hc-trend', { cache: 'no-store' });
                if (res.ok) {
                    const json = await res.json();
                    setTrendData(json.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch HC trend:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrend();
    }, []);

    const lastTwo = trendData.slice(-2);
    const trendDirection = lastTwo.length === 2 ? lastTwo[1].total_hc - lastTwo[0].total_hc : 0;
    const trendPercent = lastTwo.length === 2 && lastTwo[0].total_hc > 0
        ? ((trendDirection / lastTwo[0].total_hc) * 100).toFixed(1)
        : '0';

    if (variant === 'mini') {
        const trendColor = trendDirection > 0 ? '#0ea573' : trendDirection < 0 ? '#e11d48' : '#64748b';
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 20px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5a7184', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Tren HC Bulanan
                    </p>
                    <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: '#e9f0fc', color: '#1e5fd4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <TrendingUp size={20} />
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 'auto', zIndex: 10 }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#1a2b4a', lineHeight: 1.2 }}>
                        {trendDirection > 0 ? '+' : ''}{trendPercent}%
                    </div>
                    <div style={{ fontSize: 12, color: trendColor, fontWeight: 500, paddingBottom: 4 }}>
                        {trendDirection > 0 ? 'Naik' : trendDirection < 0 ? 'Turun' : 'Tetap'}
                    </div>
                </div>

                {/* Background Sparkline */}
                {trendData.length >= 2 && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', opacity: 0.4, pointerEvents: 'none' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="miniGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1e5fd4" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#1e5fd4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="total_hc" stroke="#1e5fd4" strokeWidth={2} fill="url(#miniGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        );
    }

    // Full variant
    return (
        <div>
            {/* Header with trend indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>
                        Tren Headcount Bulanan
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        Pergerakan total tenaga kerja aktif per bulan
                    </p>
                </div>
                {trendData.length >= 2 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', borderRadius: 20,
                        background: trendDirection > 0 ? '#d1fae5' : trendDirection < 0 ? '#fce7f3' : '#f1f5f9',
                        color: trendDirection > 0 ? '#0ea573' : trendDirection < 0 ? '#e11d48' : '#64748b',
                        fontSize: 12, fontWeight: 700,
                    }}>
                        {trendDirection > 0 ? <TrendingUp size={14} /> : trendDirection < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                        {trendDirection > 0 ? '+' : ''}{trendPercent}%
                    </div>
                )}
            </div>

            {/* Chart */}
            <div style={{ height: 220 }}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Loader2 size={24} color="#1e5fd4" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : trendData.length < 2 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
                        <TrendingUp size={32} color="#cbd5e1" />
                        <span style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                            Upload data minimal 2 bulan berbeda<br />untuk melihat tren
                        </span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="hcGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1e5fd4" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#1e5fd4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val: number) => val.toLocaleString('id-ID')}
                                width={55}
                            />
                            <Tooltip content={CustomTooltip} />
                            <Area
                                type="monotone"
                                dataKey="total_hc"
                                stroke="#1e5fd4"
                                strokeWidth={2.5}
                                fill="url(#hcGradient)"
                                dot={{
                                    r: 5,
                                    fill: '#fff',
                                    stroke: '#1e5fd4',
                                    strokeWidth: 2.5,
                                }}
                                activeDot={{
                                    r: 7,
                                    fill: '#1e5fd4',
                                    stroke: '#fff',
                                    strokeWidth: 3,
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Summary pills */}
            {trendData.length >= 2 && (
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    {trendData.slice(-3).map((point, idx) => (
                        <div key={point.month} style={{
                            flex: 1, minWidth: 120,
                            background: idx === trendData.slice(-3).length - 1 ? '#e9f0fc' : '#f8fafc',
                            borderRadius: 8, padding: '8px 12px',
                            border: idx === trendData.slice(-3).length - 1 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{point.label}</div>
                            <div style={{
                                fontSize: 15, fontWeight: 700,
                                color: idx === trendData.slice(-3).length - 1 ? '#1e5fd4' : '#1a2b4a',
                            }}>
                                {point.total_hc.toLocaleString('id-ID')}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
