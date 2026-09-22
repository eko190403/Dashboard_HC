'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Loader2, X } from 'lucide-react';

// Palet warna yang solid & readable
const DESA_COLORS = [
    '#1e5fd4', '#0ea573', '#f59e0b', '#e11d48',
    '#7c3aed', '#0891b2', '#cbd5e1'
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

    const handleTabClick = (komoditi: string) => {
        setSelectedKomoditi(komoditi);
    };

    // Hitung total TK dari data chart yang sedang ditampilkan
    const totalDisplayed = dataTK.reduce((acc, row) => {
        return acc + topDesa.reduce((s, d) => s + (row[d] || 0), 0) + (row['Lainnya'] || 0);
    }, 0);

    const handleBarClick = (data: any, index: number, event: any) => {
        if (!data || !data.payload || !data.payload.lainnyaDetails) return;
        const detailsObj = data.payload.lainnyaDetails;
        const detailsArray = Object.entries(detailsObj)
            .map(([name, count]) => [name, count] as [string, number])
            .sort((a, b) => b[1] - a[1]); // Urutkan dari terbanyak

        setModalData({
            bagian: data.payload.bagian,
            details: detailsArray
        });
    };

    return (
        <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header & Controls */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f8fafc', padding: '12px 20px', borderRadius: 8, border: '1px solid #e2e8f0'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>
                        Distribusi Tenaga Kerja ({totalRows.toLocaleString('id-ID')} Total TK)
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        Klik pada Pie Chart untuk memfilter grafik Bar di bawahnya.
                    </p>
                </div>
                {!loading && dataTK.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
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
                            Tampilkan Desa 'Lainnya'
                        </label>
                    </div>
                )}
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
                    {/* --- PIE CHART (Filter Komoditi) --- */}
                    <div style={{
                        flex: '1 1 300px', minWidth: 300, background: '#fff', 
                        padding: 20, borderRadius: 12, border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#475569', textAlign: 'center' }}>
                            Komoditi ({selectedKomoditi})
                        </h4>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={komoditiSummary}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        cursor="pointer"
                                        onClick={(data) => handleTabClick(data.name)}
                                        stroke="none"
                                    >
                                        {komoditiSummary.map((entry, index) => {
                                            const isActive = selectedKomoditi === 'Semua' || selectedKomoditi === entry.name;
                                            return (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={KOMODITI_COLORS[entry.name] || '#94a3b8'} 
                                                    opacity={isActive ? 1 : 0.3}
                                                    style={{ outline: 'none' }}
                                                />
                                            );
                                        })}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number) => [`${value.toLocaleString('id-ID')} TK`, 'Total']}
                                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                                        onClick={(data) => handleTabClick(data.value)}
                                        cursor="pointer"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {selectedKomoditi !== 'Semua' && (
                            <div style={{ textAlign: 'center', marginTop: 10 }}>
                                <button
                                    onClick={() => handleTabClick('Semua')}
                                    style={{
                                        padding: '6px 16px', borderRadius: 20, border: '1px solid #e2e8f0',
                                        background: '#f8fafc', color: '#475569', fontSize: 12,
                                        cursor: 'pointer', fontWeight: 600
                                    }}
                                >
                                    Reset Filter (Semua)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* --- BAR CHART (Detail Bagian & Desa) --- */}
                    <div style={{
                        flex: '3 1 600px', background: '#fff', 
                        padding: 20, borderRadius: 12, border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                            <h4 style={{ margin: 0, fontSize: 14, color: '#475569' }}>
                                Detail Bagian: {selectedKomoditi}
                            </h4>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                {totalDisplayed.toLocaleString('id-ID')} TK Ditampilkan
                            </span>
                        </div>
                        
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer>
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
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#fff', width: 400, maxWidth: '90%', maxHeight: '80vh',
                        borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Detail Desa "Lainnya"</h3>
                                <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    Bagian: <strong>{modalData.bagian}</strong>
                                </p>
                            </div>
                            <button 
                                onClick={() => setModalData(null)}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: '#64748b', padding: 4, borderRadius: 4
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                                        <th style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0' }}>Nama Desa</th>
                                        <th style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Jumlah TK</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.details.map(([desa, count], idx) => (
                                        <tr key={desa} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                                                {desa}
                                            </td>
                                            <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600, color: '#1e5fd4' }}>
                                                {count}
                                            </td>
                                        </tr>
                                    ))}
                                    {modalData.details.length === 0 && (
                                        <tr>
                                            <td colSpan={2} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>
                                                Tidak ada data desa lainnya
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'right' }}>
                            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                                Total: {modalData.details.reduce((sum, item) => sum + item[1], 0)} TK
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
