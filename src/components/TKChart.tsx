'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Loader2 } from 'lucide-react';

// Palet warna yang solid & readable
const DESA_COLORS = [
    '#1e5fd4', '#0ea573', '#f59e0b', '#e11d48',
    '#7c3aed', '#0891b2', '#cbd5e1'
];

const KOMODITI_ICONS: Record<string, string> = {
    'Pine': '🌿',
    'Guava': '🍈',
    'Banana': '🍌',
    'QCPP': '📦',
    'Planting': '🌱',
    'Agritech': '🤖',
    'Riset & R&D': '🔬',
    'Field & Support': '🚜',
    'Lainnya': '📋',
};

export default function TKChart() {
    const [selectedKomoditi, setSelectedKomoditi] = useState<string>('Semua');
    const [dataTK, setDataTK] = useState<any[]>([]);
    const [topDesa, setTopDesa] = useState<string[]>([]);
    const [allKomoditi, setAllKomoditi] = useState<string[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showLainnya, setShowLainnya] = useState(false);

    const fetchData = useCallback(async (komoditi: string) => {
        setLoading(true);
        try {
            const params = komoditi !== 'Semua' ? `?komoditi=${encodeURIComponent(komoditi)}&t=${Date.now()}` : `?t=${Date.now()}`;
            const res = await fetch(`/api/chart-tk${params}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Gagal mengambil data chart');
            const json = await res.json();
            if (json.data) {
                setDataTK(json.data);
                setTopDesa(json.topDesa || []);
                setTotalRows(json.totalRows || 0);
                if (json.allKomoditi?.length > 0) {
                    setAllKomoditi(json.allKomoditi);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(selectedKomoditi);
    }, [selectedKomoditi, fetchData]);

    const handleTabClick = (komoditi: string) => {
        setSelectedKomoditi(komoditi);
    };

    const tabs = ['Semua', ...allKomoditi];

    // Hitung total TK dari data chart yang sedang ditampilkan
    const totalDisplayed = dataTK.reduce((acc, row) => {
        return acc + topDesa.reduce((s, d) => s + (row[d] || 0), 0) + (row['Lainnya'] || 0);
    }, 0);

    return (
        <div style={{ width: '100%' }}>
            {/* --- Tab Filter Komoditi --- */}
            <div style={{
                display: 'flex', gap: 6, flexWrap: 'wrap',
                marginBottom: 20, alignItems: 'center'
            }}>
                {tabs.map(tab => {
                    const isActive = selectedKomoditi === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => handleTabClick(tab)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 20,
                                border: isActive ? '2px solid #1e5fd4' : '1.5px solid #dde3ed',
                                background: isActive ? '#1e5fd4' : '#fff',
                                color: isActive ? '#fff' : '#5a7184',
                                fontSize: 12,
                                fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex', alignItems: 'center', gap: 5,
                            }}
                        >
                            {tab !== 'Semua' && <span>{KOMODITI_ICONS[tab] || '📋'}</span>}
                            {tab}
                        </button>
                    );
                })}
                {!loading && dataTK.length > 0 && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 15 }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                            color: '#5a7184', cursor: 'pointer', userSelect: 'none'
                        }}>
                            <input 
                                type="checkbox" 
                                checked={showLainnya}
                                onChange={(e) => setShowLainnya(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            Tampilkan 'Lainnya'
                        </label>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {totalDisplayed.toLocaleString('id-ID')} TK
                        </span>
                    </div>
                )}
            </div>

            {/* --- Chart Area --- */}
            {loading ? (
                <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={28} color="#1e5fd4" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : dataTK.length === 0 ? (
                <div style={{
                    height: 380, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 8
                }}>
                    <span style={{ fontSize: 32 }}>📭</span>
                    <p style={{ margin: 0, fontSize: 13 }}>Belum ada data untuk komoditi ini.</p>
                    <p style={{ margin: 0, fontSize: 12 }}>Silakan upload ulang file Excel dari dashboard.</p>
                </div>
            ) : (
                <div style={{ height: 380 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataTK} margin={{ top: 5, right: 20, left: 0, bottom: 70 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="bagian"
                                angle={-30}
                                textAnchor="end"
                                interval={0}
                                tick={{ fontSize: 11, fill: '#5a7184' }}
                                tickMargin={8}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#5a7184' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{
                                    borderRadius: 8,
                                    border: '1px solid #dde3ed',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    fontSize: 12,
                                }}
                                formatter={(value: any, name: string) => [
                                    `${Number(value).toLocaleString('id-ID')} TK`,
                                    name
                                ]}
                            />
                            <Legend
                                verticalAlign="top"
                                wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                            />
                            {topDesa.map((desa, index) => (
                                <Bar
                                    key={desa}
                                    dataKey={desa}
                                    stackId="a"
                                    fill={DESA_COLORS[index % DESA_COLORS.length]}
                                    radius={showLainnya ? 0 : [4, 4, 0, 0]}
                                />
                            ))}
                            {showLainnya && (
                                <Bar
                                    dataKey="Lainnya"
                                    stackId="a"
                                    fill={DESA_COLORS[6]}
                                    radius={[4, 4, 0, 0]}
                                />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
