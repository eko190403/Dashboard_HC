'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, Label
} from 'recharts';
import { Loader2, X, Users, Trophy, Layers, MapPin } from 'lucide-react';

// Palet warna modern dengan pasangan gradasi (untuk defs)
const GRADIENTS = [
    { id: 'color0', start: '#3b82f6', end: '#2563eb' }, // Blue
    { id: 'color1', start: '#10b981', end: '#059669' }, // Emerald
    { id: 'color2', start: '#f59e0b', end: '#d97706' }, // Amber
    { id: 'color3', start: '#ec4899', end: '#db2777' }, // Pink
    { id: 'color4', start: '#8b5cf6', end: '#7c3aed' }, // Purple
    { id: 'color5', start: '#06b6d4', end: '#0891b2' }, // Cyan
    { id: 'color6', start: '#cbd5e1', end: '#94a3b8' }, // Slate (Lainnya)
];

const KOMODITI_COLORS: Record<string, string> = {
    'Pine': '#f59e0b',
    'Guava': '#10b981',
    'Banana': '#eab308',
    'QCPP': '#3b82f6',
    'Planting': '#8b5cf6',
    'Agritech': '#ec4899',
    'Riset & R&D': '#06b6d4',
    'Field & Support': '#64748b',
    'Lainnya': '#cbd5e1'
};

export default function TKChart() {
    const [selectedKomoditi, setSelectedKomoditi] = useState<string>('Semua');
    const [dataTK, setDataTK] = useState<any[]>([]);
    const [topDesa, setTopDesa] = useState<string[]>([]);
    const [komoditiSummary, setKomoditiSummary] = useState<any[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showLainnya, setShowLainnya] = useState(false);
    
    // State untuk Modal Detail Lainnya
    const [modalData, setModalData] = useState<{ bagian: string; details: [string, number][] } | null>(null);

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
                if (json.komoditiSummary) {
                    setKomoditiSummary(json.komoditiSummary);
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

    // KPI Calculations
    const kpis = useMemo(() => {
        let totalTK = 0;
        let biggestBagian = { name: '-', count: 0 };
        const desaMap: Record<string, number> = {};

        dataTK.forEach(row => {
            let rowTotal = 0;
            topDesa.forEach(d => {
                const val = row[d] || 0;
                rowTotal += val;
                desaMap[d] = (desaMap[d] || 0) + val;
            });
            rowTotal += (row['Lainnya'] || 0);
            
            totalTK += rowTotal;
            if (rowTotal > biggestBagian.count) {
                biggestBagian = { name: row.bagian, count: rowTotal };
            }
        });

        let biggestDesa = { name: '-', count: 0 };
        Object.entries(desaMap).forEach(([desa, count]) => {
            if (count > biggestDesa.count) biggestDesa = { name: desa, count };
        });

        let biggestKomoditi = { name: '-', count: 0 };
        if (komoditiSummary.length > 0) {
            const maxK = komoditiSummary.reduce((prev, current) => (prev.value > current.value) ? prev : current);
            biggestKomoditi = { name: maxK.name, count: maxK.value };
        }

        return { totalTK, biggestBagian, biggestDesa, biggestKomoditi };
    }, [dataTK, topDesa, komoditiSummary]);

    const handleTabClick = (komoditi: string) => {
        setSelectedKomoditi(komoditi);
    };

    const handleBarClick = (data: any) => {
        if (!data || !data.payload || !data.payload.lainnyaDetails) return;
        const detailsObj = data.payload.lainnyaDetails;
        const detailsArray = Object.entries(detailsObj)
            .map(([name, count]) => [name, count] as [string, number])
            .sort((a, b) => b[1] - a[1]);

        setModalData({
            bagian: data.payload.bagian,
            details: detailsArray
        });
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>
            
            {/* --- KPI CARDS --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div style={kpiCardStyle}>
                    <div style={iconBoxStyle('#eff6ff', '#3b82f6')}><Users size={20} /></div>
                    <div>
                        <p style={kpiLabelStyle}>Total Tenaga Kerja</p>
                        <h3 style={kpiValueStyle}>{kpis.totalTK.toLocaleString('id-ID')}</h3>
                    </div>
                </div>
                <div style={kpiCardStyle}>
                    <div style={iconBoxStyle('#f0fdf4', '#10b981')}><Trophy size={20} /></div>
                    <div>
                        <p style={kpiLabelStyle}>Komoditi Terbesar</p>
                        <h3 style={kpiValueStyle}>{kpis.biggestKomoditi.name} <span style={kpiSubStyle}>({kpis.biggestKomoditi.count})</span></h3>
                    </div>
                </div>
                <div style={kpiCardStyle}>
                    <div style={iconBoxStyle('#fffbeb', '#f59e0b')}><Layers size={20} /></div>
                    <div>
                        <p style={kpiLabelStyle}>Bagian Dominan</p>
                        <h3 style={kpiValueStyle}>{kpis.biggestBagian.name} <span style={kpiSubStyle}>({kpis.biggestBagian.count})</span></h3>
                    </div>
                </div>
                <div style={kpiCardStyle}>
                    <div style={iconBoxStyle('#fdf2f8', '#ec4899')}><MapPin size={20} /></div>
                    <div>
                        <p style={kpiLabelStyle}>Desa Terbanyak</p>
                        <h3 style={kpiValueStyle}>{kpis.biggestDesa.name} <span style={kpiSubStyle}>({kpis.biggestDesa.count})</span></h3>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: '#64748b' }}>
                    <Loader2 size={32} className="animate-spin mb-4" />
                    Memuat data grafik...
                </div>
            ) : dataTK.length === 0 && komoditiSummary.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: '#64748b' }}>
                    <p>Belum ada data. Silakan upload file Excel dari dashboard.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {/* --- DONUT CHART (Filter Komoditi) --- */}
                    <div style={{
                        flex: '1 1 300px', minWidth: 300, background: '#fff', 
                        padding: '24px 20px', borderRadius: 16, border: '1px solid #f1f5f9',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                Distribusi Komoditi
                            </h4>
                        </div>
                        
                        <div style={{ width: '100%', height: 320, position: 'relative' }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={komoditiSummary}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={75}
                                        outerRadius={105}
                                        paddingAngle={4}
                                        cursor="pointer"
                                        onClick={(data) => handleTabClick(data.name)}
                                        stroke="none"
                                        cornerRadius={5}
                                    >
                                        {komoditiSummary.map((entry, index) => {
                                            const isActive = selectedKomoditi === 'Semua' || selectedKomoditi === entry.name;
                                            return (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={KOMODITI_COLORS[entry.name] || '#94a3b8'} 
                                                    opacity={isActive ? 1 : 0.25}
                                                    style={{ transition: 'opacity 0.3s ease', outline: 'none' }}
                                                />
                                            );
                                        })}
                                        <Label 
                                            value={selectedKomoditi} 
                                            position="centerBottom" 
                                            dy={-8}
                                            style={{ fontSize: 20, fontWeight: 800, fill: '#1e293b' }} 
                                        />
                                        <Label 
                                            value="Filter Aktif" 
                                            position="centerTop" 
                                            dy={15}
                                            style={{ fontSize: 12, fill: '#94a3b8' }} 
                                        />
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number) => [`${value.toLocaleString('id-ID')} TK`, 'Total']}
                                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {selectedKomoditi !== 'Semua' && (
                            <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                                <button
                                    onClick={() => handleTabClick('Semua')}
                                    style={{
                                        padding: '8px 20px', borderRadius: 30, border: '1px solid #e2e8f0',
                                        background: '#fff', color: '#0f172a', fontSize: 13,
                                        cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                                >
                                    Tampilkan Semua Komoditi
                                </button>
                            </div>
                        )}
                    </div>

                    {/* --- HORIZONTAL BAR CHART (Detail Bagian & Desa) --- */}
                    <div style={{
                        flex: '3 1 600px', background: '#fff', 
                        padding: '24px', borderRadius: 16, border: '1px solid #f1f5f9',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                    Detail Bagian & Wilayah Asal
                                </h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                                    Data untuk filter: <strong style={{color:'#1e5fd4'}}>{selectedKomoditi}</strong>
                                </p>
                            </div>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                                color: '#475569', cursor: 'pointer', userSelect: 'none',
                                background: '#f8fafc', padding: '6px 14px', borderRadius: 30, border: '1px solid #e2e8f0'
                            }}>
                                <input 
                                    type="checkbox" 
                                    checked={showLainnya}
                                    onChange={(e) => setShowLainnya(e.target.checked)}
                                    style={{ cursor: 'pointer', accentColor: '#1e5fd4' }}
                                />
                                Tampilkan Desa 'Lainnya'
                            </label>
                        </div>
                        
                        <div style={{ width: '100%', height: Math.max(400, dataTK.length * 40) }}>
                            <ResponsiveContainer>
                                <BarChart 
                                    data={dataTK} 
                                    layout="vertical"
                                    margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                                    barSize={24}
                                >
                                    <defs>
                                        {GRADIENTS.map((grad) => (
                                            <linearGradient key={grad.id} id={grad.id} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor={grad.start} />
                                                <stop offset="100%" stopColor={grad.end} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        type="number" 
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        type="category" 
                                        dataKey="bagian" 
                                        tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                                        width={160}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload || payload.length === 0) return null;
                                            const filtered = payload.filter(p => (p.value as number) > 0);
                                            if (filtered.length === 0) return null;
                                            return (
                                                <div style={{
                                                    background: '#fff', borderRadius: 12, padding: '12px 16px',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: 'none',
                                                    fontSize: 13, minWidth: 180
                                                }}>
                                                    <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>{label}</p>
                                                    {filtered.map((p, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 4 }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                                                                {p.name}
                                                            </span>
                                                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{(p.value as number).toLocaleString('id-ID')} TK</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        wrapperStyle={{ paddingBottom: 20, fontSize: 12, fontWeight: 500 }}
                                        iconType="circle"
                                    />
                                    {topDesa.map((desa, index) => (
                                        <Bar
                                            key={desa}
                                            dataKey={desa}
                                            stackId="a"
                                            fill={`url(#color${index % 6})`}
                                            radius={showLainnya ? 0 : [0, 6, 6, 0]}
                                        />
                                    ))}
                                    {showLainnya && (
                                        <Bar
                                            dataKey="Lainnya"
                                            stackId="a"
                                            fill="url(#color6)"
                                            radius={[0, 6, 6, 0]}
                                            onClick={handleBarClick}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modal Pop-up --- */}
            {modalData && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: '#fff', width: 440, maxWidth: '90%', maxHeight: '80vh',
                        borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Desa "Lainnya"</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                                    Detail sebaran pada bagian: <strong style={{color:'#1e5fd4'}}>{modalData.bagian}</strong>
                                </p>
                            </div>
                            <button 
                                onClick={() => setModalData(null)}
                                style={{
                                    background: '#f1f5f9', border: 'none', cursor: 'pointer',
                                    color: '#475569', padding: 8, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', fontSize: 12, textTransform: 'uppercase' }}>
                                        <th style={{ padding: '12px 24px', fontWeight: 600 }}>Nama Desa</th>
                                        <th style={{ padding: '12px 24px', fontWeight: 600, textAlign: 'right' }}>Jumlah TK</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.details.map(([desa, count], idx) => (
                                        <tr key={desa} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 24px', color: '#334155', fontWeight: 500 }}>
                                                {desa}
                                            </td>
                                            <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 700, color: '#1e5fd4' }}>
                                                {count}
                                            </td>
                                        </tr>
                                    ))}
                                    {modalData.details.length === 0 && (
                                        <tr>
                                            <td colSpan={2} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                                Tidak ada data
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline Styles for KPI Cards
const kpiCardStyle: React.CSSProperties = {
    background: '#fff', padding: '20px', borderRadius: '16px',
    border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
    display: 'flex', alignItems: 'center', gap: '16px'
};
const iconBoxStyle = (bg: string, color: string): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: 12, background: bg, color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
});
const kpiLabelStyle: React.CSSProperties = { margin: 0, fontSize: 13, color: '#64748b', fontWeight: 500 };
const kpiValueStyle: React.CSSProperties = { margin: '4px 0 0 0', fontSize: 20, color: '#0f172a', fontWeight: 800 };
const kpiSubStyle: React.CSSProperties = { fontSize: 14, color: '#94a3b8', fontWeight: 500 };
