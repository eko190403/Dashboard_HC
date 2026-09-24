'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Label
} from 'recharts';
import { Loader2, X, Users, Trophy, Layers, MapPin, ChevronRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

const KOMODITI_COLORS: Record<string, string> = {
    'Pine': '#f59e0b',
    'Guava': '#10b981',
    'Banana': '#eab308',
    'QCPP': '#3b82f6',
    'Planting': '#8b5cf6',
    'Agritech': '#ec4899',
    'Riset & R&D': '#06b6d4',
    'Field & Support': '#64748b',
    'Lainnya': '#94a3b8'
};

const PIE_FALLBACK = '#94a3b8';
const BAGIAN_COLORS = [
    '#1e5fd4', '#0ea573', '#f59e0b', '#7c3aed', '#e11d48',
    '#0891b2', '#ea580c', '#65a30d', '#0d9488', '#9333ea',
];

export default function TKChart() {
    const [selectedKomoditi, setSelectedKomoditi] = useState<string>('Semua');
    const [dataTK, setDataTK] = useState<any[]>([]);
    const [topDesa, setTopDesa] = useState<string[]>([]);
    const [komoditiSummary, setKomoditiSummary] = useState<any[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);

    // Drill-down state
    const [selectedBagian, setSelectedBagian] = useState<any | null>(null);

    // Modal state (desa lainnya)
    const [modalData, setModalData] = useState<{ bagian: string; details: [string, number][] } | null>(null);

    const isInitialLoad = React.useRef(true);
    const router = useRouter();

    const fetchData = useCallback(async (komoditi: string) => {
        setLoading(true);
        setSelectedBagian(null); // Reset drill-down on komoditi change
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
                    if (isInitialLoad.current && komoditi === 'Semua' && json.komoditiSummary.length > 0) {
                        isInitialLoad.current = false;
                        const biggest = json.komoditiSummary.reduce((prev: any, curr: any) =>
                            curr.value > prev.value ? curr : prev
                        );
                        setSelectedKomoditi(biggest.name);
                        return;
                    }
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

    // KPI data
    const kpis = useMemo(() => {
        let totalTK = 0;
        let biggestBagian = { name: '-', count: 0 };
        const desaMap: Record<string, number> = {};

        dataTK.forEach(row => {
            let rowTotal = topDesa.reduce((s, d) => s + (row[d] || 0), 0) + (row['Lainnya'] || 0);
            totalTK += rowTotal;
            if (rowTotal > biggestBagian.count) biggestBagian = { name: row.bagian, count: rowTotal };
            topDesa.forEach(d => { desaMap[d] = (desaMap[d] || 0) + (row[d] || 0); });
        });

        let biggestDesa = Object.entries(desaMap).reduce(
            (best, [desa, count]) => count > best.count ? { name: desa, count } : best,
            { name: '-', count: 0 }
        );

        let biggestKomoditi = { name: '-', count: 0 };
        if (komoditiSummary.length > 0) {
            const maxK = komoditiSummary.reduce((prev, curr) => curr.value > prev.value ? curr : prev);
            biggestKomoditi = { name: maxK.name, count: maxK.value };
        }

        return { totalTK, biggestBagian, biggestDesa, biggestKomoditi };
    }, [dataTK, topDesa, komoditiSummary]);

    // Level 1: Data for simple bagian bar chart (total per bagian)
    const bagianChartData = useMemo(() => {
        return dataTK
            .map(row => ({
                bagian: row.bagian,
                total: topDesa.reduce((s, d) => s + (row[d] || 0), 0) + (row['Lainnya'] || 0),
                _raw: row,
            }))
            .sort((a, b) => b.total - a.total);
    }, [dataTK, topDesa]);

    // Level 2: Data for desa bar chart (when a bagian is selected)
    const desaChartData = useMemo(() => {
        if (!selectedBagian) return [];
        const row = selectedBagian._raw;
        return [
            ...topDesa
                .map(desa => ({ desa, count: row[desa] || 0 }))
                .filter(d => d.count > 0)
                .sort((a, b) => b.count - a.count),
            ...(row['Lainnya'] > 0 ? [{ desa: 'Lainnya', count: row['Lainnya'] }] : [])
        ];
    }, [selectedBagian, topDesa]);

    const komoditiColor = KOMODITI_COLORS[selectedKomoditi] || PIE_FALLBACK;
    const totalKomoditi = komoditiSummary.reduce((sum, entry) => sum + entry.value, 0);
    const totalBagian = bagianChartData.reduce((sum, entry) => sum + entry.total, 0);

    const handleBagianClick = (data: any) => {
        const item = data?.payload || data;
        if (item && item.bagian) setSelectedBagian(item);
    };

    const handleDesaClick = (data: any) => {
        if (data?.desa === 'Lainnya' && selectedBagian?._raw?.lainnyaDetails) {
            const detailsArray = Object.entries(selectedBagian._raw.lainnyaDetails)
                .map(([name, count]) => [name, count] as [string, number])
                .sort((a, b) => b[1] - a[1]);
            setModalData({ bagian: selectedBagian.bagian, details: detailsArray });
        }
    };

    const goToDetailPage = () => {
        const params = new URLSearchParams();
        if (selectedKomoditi !== 'Semua') params.append('komoditi', selectedKomoditi);
        if (selectedBagian) params.append('bagian', selectedBagian.bagian);
        router.push(`/tk-detail?${params.toString()}`);
    };

    // Custom tooltips
    const BagianTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const item = payload[0];
        const name = item.name || item.payload?.bagian || label;
        const value = Number(item.value || item.payload?.total || 0);
        const percentage = totalBagian ? ((value / totalBagian) * 100).toFixed(1) : '0.0';
        return (
            <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 13 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#0f172a' }}>{name}</p>
                <p style={{ margin: 0, color: komoditiColor, fontWeight: 600 }}>{value.toLocaleString('id-ID')} TK ({percentage}%)</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>Klik untuk lihat detail desa →</p>
            </div>
        );
    };

    const DesaTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const isLainnya = label === 'Lainnya';
        return (
            <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 13 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#0f172a' }}>{label}</p>
                <p style={{ margin: 0, color: '#1e5fd4', fontWeight: 600 }}>{payload[0]?.value?.toLocaleString('id-ID')} TK</p>
                {isLainnya && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>Klik untuk lihat desa detail →</p>}
            </div>
        );
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>

            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                    { icon: <Users size={20} />, iconBg: '#eff6ff', iconColor: '#3b82f6', label: 'Total Tenaga Kerja', value: kpis.totalTK.toLocaleString('id-ID'), sub: '' },
                    { icon: <Trophy size={20} />, iconBg: '#f0fdf4', iconColor: '#10b981', label: 'Komoditi Terbesar', value: kpis.biggestKomoditi.name, sub: `${kpis.biggestKomoditi.count} TK` },
                    { icon: <Layers size={20} />, iconBg: '#fffbeb', iconColor: '#f59e0b', label: 'Bagian Dominan', value: kpis.biggestBagian.name, sub: `${kpis.biggestBagian.count} TK` },
                    { icon: <MapPin size={20} />, iconBg: '#fdf2f8', iconColor: '#ec4899', label: 'Desa Terbanyak', value: kpis.biggestDesa.name, sub: `${kpis.biggestDesa.count} TK` },
                ].map((kpi, i) => (
                    <div key={i} style={{ background: '#fff', padding: '18px', borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: kpi.iconBg, color: kpi.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {kpi.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>{kpi.label}</p>
                            <h3 style={{ margin: '3px 0 0', fontSize: 18, color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.value}</h3>
                            {kpi.sub && <p style={{ margin: '1px 0 0', fontSize: 12, color: '#94a3b8' }}>{kpi.sub}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {loading && dataTK.length === 0 && komoditiSummary.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: '#64748b', gap: 12 }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Memuat data...</span>
                </div>
            ) : dataTK.length === 0 && komoditiSummary.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: '#64748b' }}>
                    <p>Belum ada data. Silakan upload file Excel dari dashboard.</p>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                    {/* DONUT CHART */}
                    <div style={{ flex: '1 1 400px', minWidth: 320, background: '#fff', padding: '24px 16px', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>Distribusi Komoditi</h4>
                        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Klik irisan untuk filter</p>
                        <div style={{ width: '100%', height: 320 }}>
                            <ResponsiveContainer>
                                <PieChart className="chart-interactive" style={{ outline: 'none', overflow: 'visible' }}>
                                    <Pie data={komoditiSummary} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                        innerRadius={78} outerRadius={108} paddingAngle={3} cursor="pointer"
                                        onClick={(d: any) => d?.name && setSelectedKomoditi(d.name)} stroke="none" cornerRadius={4}
                                        labelLine={false}
                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                            if ((percent || 0) < 0.04) return null;
                                            const radius = (innerRadius + outerRadius) / 2;
                                            const angle = -midAngle * Math.PI / 180;
                                            const x = cx + radius * Math.cos(angle);
                                            const y = cy + radius * Math.sin(angle);
                                            return (
                                                <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700 }}>
                                                    {`${(percent * 100).toFixed(1)}%`}
                                                </text>
                                            );
                                        }}>
                                        {komoditiSummary.map((entry, i) => (
                                            <Cell key={i}
                                                fill={KOMODITI_COLORS[entry.name] || PIE_FALLBACK}
                                                opacity={selectedKomoditi === 'Semua' || selectedKomoditi === entry.name ? 1 : 0.2}
                                                style={{ transition: 'opacity 0.3s', outline: 'none' }}
                                            />
                                        ))}
                                        <Label value={selectedKomoditi} position="center" style={{ fontSize: 15, fontWeight: 800, fill: '#0f172a' }} />
                                    </Pie>
                                    <Tooltip formatter={(v: any) => [`${Number(v || 0).toLocaleString('id-ID')} TK`, 'Total']}
                                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 14px', marginTop: 8 }}>
                            {komoditiSummary.map((entry) => (
                                <button
                                    key={entry.name}
                                    onClick={() => setSelectedKomoditi(entry.name)}
                                    aria-label={`Filter ${entry.name}`}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 0, background: 'transparent', padding: 0, color: selectedKomoditi === entry.name ? '#0f172a' : '#64748b', fontSize: 11, fontWeight: selectedKomoditi === entry.name ? 700 : 500, cursor: 'pointer' }}
                                >
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: KOMODITI_COLORS[entry.name] || PIE_FALLBACK }} />
                                    {entry.name} ({((entry.value / Math.max(totalKomoditi, 1)) * 100).toFixed(1)}%)
                                </button>
                            ))}
                        </div>
                        {selectedKomoditi !== 'Semua' && (
                            <button onClick={() => setSelectedKomoditi('Semua')}
                                style={{ marginTop: 14, width: '100%', padding: '8px', borderRadius: 10, border: '1px dashed #cbd5e1', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                                Tampilkan Semua Komoditi
                            </button>
                        )}
                    </div>

                    {/* BAR CHART AREA */}
                    <div style={{ flex: '1 1 400px', background: '#fff', padding: '24px', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', minHeight: 400 }}>

                        {/* Level 2: Desa breakdown for selected bagian */}
                        {selectedBagian ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                    <button onClick={() => setSelectedBagian(null)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#475569', fontSize: 13, fontWeight: 600 }}>
                                        <ArrowLeft size={14} /> Kembali
                                    </button>
                                    <span style={{ color: '#94a3b8', fontSize: 13 }}>
                                        {selectedKomoditi} <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong style={{ color: '#0f172a' }}>{selectedBagian.bagian}</strong>
                                    </span>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                                        <button onClick={goToDetailPage}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, border: `1px solid ${komoditiColor}`, background: '#fff', color: komoditiColor, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                            <ExternalLink size={13} /> Lihat Detail TK
                                        </button>
                                        <span style={{ fontSize: 12, color: '#94a3b8', background: '#f8fafc', padding: '4px 10px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                                            {selectedBagian.total.toLocaleString('id-ID')} TK
                                        </span>
                                    </div>
                                </div>
                                <div style={{ height: Math.max(300, desaChartData.length * 44) }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={desaChartData} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
                                            barSize={26} onClick={handleDesaClick} style={{ cursor: 'pointer' }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                                            <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <YAxis type="category" dataKey="desa" tick={{ fontSize: 13, fill: '#334155', fontWeight: 500 }} width={140} axisLine={false} tickLine={false} />
                                            <Tooltip content={<DesaTooltip />} cursor={{ fill: '#f8fafc' }} />
                                            <Bar dataKey="count" radius={[0, 8, 8, 0]} onClick={(data) => handleDesaClick(data)} style={{ cursor: 'pointer' }} label={{ position: 'right', fontSize: 12, fontWeight: 600, fill: '#475569', formatter: (v: any) => v > 0 ? v : '' }}>
                                                {desaChartData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.desa === 'Lainnya' ? '#cbd5e1' : komoditiColor} fillOpacity={entry.desa === 'Lainnya' ? 1 : 1 - (i * 0.07)} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                {selectedBagian._raw?.lainnyaDetails && Object.keys(selectedBagian._raw.lainnyaDetails).length > 0 && (
                                    <p style={{ margin: '12px 0 0', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                                        💡 Klik bar <strong>Lainnya</strong> untuk melihat rincian desa-desanya
                                    </p>
                                )}
                            </>
                        ) : (
                            /* Level 1: Bagian totals */
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Distribusi per Bagian</h4>
                                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                                            Filter: <strong style={{ color: komoditiColor }}>{selectedKomoditi}</strong> · <span style={{ color: '#94a3b8' }}>Klik irisan untuk drill-down desa</span>
                                        </p>
                                    </div>
                                    {selectedKomoditi !== 'Semua' && (
                                        <button onClick={goToDetailPage}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${komoditiColor}`, background: '#fff', color: komoditiColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                            <ExternalLink size={14} /> Lihat Detail TK ({selectedKomoditi})
                                        </button>
                                    )}
                                </div>
                                <div style={{ height: 320 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart className="chart-interactive" style={{ outline: 'none', overflow: 'visible' }}>
                                            <Pie data={bagianChartData} dataKey="total" nameKey="bagian" cx="50%" cy="50%"
                                                innerRadius={78} outerRadius={108} paddingAngle={2} cursor="pointer"
                                                onClick={(d) => handleBagianClick(d)} stroke="none" cornerRadius={4}
                                                labelLine={false}
                                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                                    if ((percent || 0) < 0.04) return null;
                                                    const radius = (innerRadius + outerRadius) / 2;
                                                    const angle = -midAngle * Math.PI / 180;
                                                    const x = cx + radius * Math.cos(angle);
                                                    const y = cy + radius * Math.sin(angle);
                                                    return (
                                                        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700 }}>
                                                            {`${(percent * 100).toFixed(1)}%`}
                                                        </text>
                                                    );
                                                }}>
                                                {bagianChartData.map((_, i) => (
                                                    <Cell key={i} fill={BAGIAN_COLORS[i % BAGIAN_COLORS.length]} style={{ outline: 'none' }} />
                                                ))}
                                                <Label value="Pilih Bagian" position="center" style={{ fontSize: 14, fontWeight: 700, fill: '#64748b' }} />
                                            </Pie>
                                            <Tooltip content={<BagianTooltip />} cursor={{ fill: '#f8fafc' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '2px 16px', maxHeight: 148, overflowY: 'auto', marginTop: 8, padding: '4px 2px' }}>
                                    {bagianChartData.map((entry, index) => (
                                        <button
                                            key={entry.bagian}
                                            onClick={() => setSelectedBagian(entry)}
                                            aria-label={`Lihat detail ${entry.bagian}`}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, padding: '5px 4px', border: 0, borderRadius: 5, background: 'transparent', color: '#334155', cursor: 'pointer', textAlign: 'left' }}
                                        >
                                            <span style={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', background: BAGIAN_COLORS[index % BAGIAN_COLORS.length] }} />
                                            <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{entry.bagian}</span>
                                            <span style={{ flexShrink: 0, color: '#1e5fd4', fontSize: 11, fontWeight: 700 }}>{entry.total.toLocaleString('id-ID')} ({((entry.total / Math.max(totalBagian, 1)) * 100).toFixed(1)}%)</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    {loading && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.68)', borderRadius: 16, backdropFilter: 'blur(2px)' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, boxShadow: '0 4px 16px rgba(15,23,42,0.12)' }}>
                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Memuat filter...
                            </div>
                        </div>
                    )}
                </div>
                </div>
            )}

            {/* MODAL Desa Lainnya */}
            {modalData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#fff', width: 440, maxWidth: '90%', maxHeight: '80vh', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Desa "Lainnya"</h3>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Bagian: <strong style={{ color: '#1e5fd4' }}>{modalData.bagian}</strong></p>
                            </div>
                            <button onClick={() => setModalData(null)}
                                style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#475569', padding: 8, borderRadius: '50%', display: 'flex' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>
                                        <th style={{ padding: '12px 24px', textAlign: 'left', fontWeight: 600 }}>Nama Desa</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>Jumlah TK</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.details.map(([desa, count], idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '11px 24px', color: '#334155', fontWeight: 500 }}>{desa}</td>
                                            <td style={{ padding: '11px 24px', textAlign: 'right', fontWeight: 700, color: '#1e5fd4' }}>{count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
                            <span style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>
                                Total: {modalData.details.reduce((s, item) => s + item[1], 0)} TK
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
