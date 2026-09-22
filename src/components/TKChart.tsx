'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Loader2, X, Users, Trophy, Layers, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';

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

export default function TKChart() {
    const [selectedKomoditi, setSelectedKomoditi] = useState<string>('Semua');
    const [dataTK, setDataTK] = useState<any[]>([]);
    const [topDesa, setTopDesa] = useState<string[]>([]);
    const [komoditiSummary, setKomoditiSummary] = useState<any[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedBagian, setSelectedBagian] = useState<any | null>(null);
    const [modalData, setModalData] = useState<{ bagian: string; details: [string, number][] } | null>(null);

    const isInitialLoad = React.useRef(true);

    const fetchData = useCallback(async (komoditi: string) => {
        setLoading(true);
        setSelectedBagian(null);
        try {
            const params = komoditi !== 'Semua' ? `?komoditi=${encodeURIComponent(komoditi)}&t=${Date.now()}` : `?t=${Date.now()}`;
            const res = await fetch(`/api/chart-tk${params}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Gagal mengambil data');
            const json = await res.json();
            setDataTK(json.data || []);
            setTopDesa(json.topDesa || []);
            setTotalRows(json.totalRows || 0);
            if (json.komoditiSummary) {
                setKomoditiSummary(json.komoditiSummary);
                if (isInitialLoad.current && komoditi === 'Semua' && json.komoditiSummary.length > 0) {
                    isInitialLoad.current = false;
                    const biggest = json.komoditiSummary.reduce((p: any, c: any) => c.value > p.value ? c : p);
                    setSelectedKomoditi(biggest.name);
                    return;
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(selectedKomoditi); }, [selectedKomoditi, fetchData]);

    const kpis = useMemo(() => {
        let totalTK = 0, biggestBagian = { name: '-', count: 0 };
        const desaMap: Record<string, number> = {};
        dataTK.forEach(row => {
            const t = topDesa.reduce((s, d) => s + (row[d] || 0), 0) + (row['Lainnya'] || 0);
            totalTK += t;
            if (t > biggestBagian.count) biggestBagian = { name: row.bagian, count: t };
            topDesa.forEach(d => { desaMap[d] = (desaMap[d] || 0) + (row[d] || 0); });
        });
        const biggestDesa = Object.entries(desaMap).reduce((b, [n, c]) => c > b.count ? { name: n, count: c } : b, { name: '-', count: 0 });
        const maxK = komoditiSummary.length > 0 ? komoditiSummary.reduce((p, c) => c.value > p.value ? c : p) : null;
        return { totalTK, biggestBagian, biggestDesa, biggestKomoditi: maxK ? { name: maxK.name, count: maxK.value } : { name: '-', count: 0 } };
    }, [dataTK, topDesa, komoditiSummary]);

    // Level 1: total per bagian
    const bagianChartData = useMemo(() =>
        dataTK.map(row => ({
            bagian: row.bagian,
            total: topDesa.reduce((s, d) => s + (row[d] || 0), 0) + (row['Lainnya'] || 0),
            _raw: row,
        })).sort((a, b) => b.total - a.total),
        [dataTK, topDesa]);

    // Level 2: desa breakdown per bagian
    const desaChartData = useMemo(() => {
        if (!selectedBagian) return [];
        const row = selectedBagian._raw;
        return [
            ...topDesa.map(d => ({ desa: d, count: row[d] || 0 })).filter(d => d.count > 0).sort((a, b) => b.count - a.count),
            ...(row['Lainnya'] > 0 ? [{ desa: 'Lainnya', count: row['Lainnya'] }] : [])
        ];
    }, [selectedBagian, topDesa]);

    const color = KOMODITI_COLORS[selectedKomoditi] || '#94a3b8';

    // Tooltip Level 1 (Bagian)
    const BagianTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 13 }}>
                <p style={{ margin: '0 0 3px', fontWeight: 700, color: '#0f172a' }}>{label}</p>
                <p style={{ margin: 0, color, fontWeight: 600 }}>{payload[0]?.value?.toLocaleString('id-ID')} TK</p>
                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#94a3b8' }}>Klik untuk drill-down desa →</p>
            </div>
        );
    };

    // Tooltip Level 2 (Desa)
    const DesaTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 13 }}>
                <p style={{ margin: '0 0 3px', fontWeight: 700, color: '#0f172a' }}>{label}</p>
                <p style={{ margin: 0, color: '#1e5fd4', fontWeight: 600 }}>{payload[0]?.value?.toLocaleString('id-ID')} TK</p>
                {label === 'Lainnya' && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#94a3b8' }}>Klik untuk lihat rincian →</p>}
            </div>
        );
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>

            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                    { icon: <Users size={20} />, bg: '#eff6ff', ic: '#3b82f6', label: 'Total Tenaga Kerja', value: totalRows.toLocaleString('id-ID'), sub: '' },
                    { icon: <Trophy size={20} />, bg: '#f0fdf4', ic: '#10b981', label: 'Komoditi Terbesar', value: kpis.biggestKomoditi.name, sub: `${kpis.biggestKomoditi.count.toLocaleString('id-ID')} TK` },
                    { icon: <Layers size={20} />, bg: '#fffbeb', ic: '#f59e0b', label: 'Bagian Dominan', value: kpis.biggestBagian.name, sub: `${kpis.biggestBagian.count.toLocaleString('id-ID')} TK` },
                    { icon: <MapPin size={20} />, bg: '#fdf2f8', ic: '#ec4899', label: 'Desa Terbanyak', value: kpis.biggestDesa.name, sub: `${kpis.biggestDesa.count.toLocaleString('id-ID')} TK` },
                ].map((k, i) => (
                    <div key={i} style={{ background: '#fff', padding: 18, borderRadius: 14, border: '1px solid #f1f5f9', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: k.bg, color: k.ic, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{k.icon}</div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>{k.label}</p>
                            <h3 style={{ margin: '3px 0 0', fontSize: 18, color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.value}</h3>
                            {k.sub && <p style={{ margin: '1px 0 0', fontSize: 12, color: '#94a3b8' }}>{k.sub}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {/* MAIN CHART CARD */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>

                {/* KOMODITI FILTER CHIPS (inline, inside chart card) */}
                {komoditiSummary.length > 0 && (
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>FILTER:</span>
                        {komoditiSummary.map((k, i) => {
                            const isActive = selectedKomoditi === k.name;
                            const kColor = KOMODITI_COLORS[k.name] || '#94a3b8';
                            return (
                                <button key={i} onClick={() => setSelectedKomoditi(k.name)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                                        borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: isActive ? 700 : 500,
                                        border: isActive ? `2px solid ${kColor}` : '1.5px solid #e2e8f0',
                                        background: isActive ? `${kColor}15` : '#fff',
                                        color: isActive ? kColor : '#475569',
                                        transition: 'all 0.15s ease'
                                    }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: kColor, display: 'inline-block' }} />
                                    {k.name}
                                    <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? kColor : '#94a3b8' }}>
                                        {k.value.toLocaleString('id-ID')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div style={{ padding: 24 }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350, gap: 12, color: '#64748b' }}>
                            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                            Memuat data...
                        </div>
                    ) : bagianChartData.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350, color: '#94a3b8' }}>
                            Belum ada data untuk komoditi ini.
                        </div>
                    ) : selectedBagian ? (
                        /* ── LEVEL 2: Desa breakdown ── */
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <button onClick={() => setSelectedBagian(null)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#475569', fontSize: 13, fontWeight: 600 }}>
                                    <ArrowLeft size={14} /> Kembali
                                </button>
                                <span style={{ fontSize: 13, color: '#94a3b8' }}>
                                    <span style={{ color: color, fontWeight: 600 }}>{selectedKomoditi}</span>
                                    <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} />
                                    <strong style={{ color: '#0f172a' }}>{selectedBagian.bagian}</strong>
                                </span>
                                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', background: '#f8fafc', padding: '4px 12px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                                    {selectedBagian.total.toLocaleString('id-ID')} TK
                                </span>
                            </div>
                            <div style={{ height: Math.max(280, desaChartData.length * 46) }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={desaChartData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }} barSize={26}
                                        onClick={(e) => {
                                            const payload = e?.activePayload?.[0]?.payload;
                                            if (payload?.desa === 'Lainnya' && selectedBagian?._raw?.lainnyaDetails) {
                                                const details = Object.entries(selectedBagian._raw.lainnyaDetails)
                                                    .map(([n, c]) => [n, c] as [string, number])
                                                    .sort((a, b) => b[1] - a[1]);
                                                setModalData({ bagian: selectedBagian.bagian, details });
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical stroke="#f8fafc" />
                                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="desa" width={150} tick={{ fontSize: 13, fill: '#334155', fontWeight: 500 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<DesaTooltip />} cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="count" radius={[0, 8, 8, 0]}
                                            label={{ position: 'right', fontSize: 12, fontWeight: 600, fill: '#64748b', formatter: (v: number) => v > 0 ? v.toLocaleString('id-ID') : '' }}>
                                            {desaChartData.map((entry, i) => (
                                                <Cell key={i} fill={entry.desa === 'Lainnya' ? '#cbd5e1' : color} fillOpacity={entry.desa === 'Lainnya' ? 0.8 : Math.max(0.4, 1 - i * 0.07)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            {selectedBagian._raw?.lainnyaDetails && Object.keys(selectedBagian._raw.lainnyaDetails).length > 0 && (
                                <p style={{ margin: '14px 0 0', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                                    💡 Klik bar <strong>Lainnya</strong> untuk melihat rincian semua desa tersembunyi
                                </p>
                            )}
                        </>
                    ) : (
                        /* ── LEVEL 1: Bagian totals ── */
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Distribusi per Bagian</h4>
                                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Klik tiang untuk melihat sebaran desa</p>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color, background: `${color}12`, padding: '5px 14px', borderRadius: 20 }}>
                                    {selectedKomoditi}
                                </span>
                            </div>
                            <div style={{ height: Math.max(280, bagianChartData.length * 46) }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={bagianChartData} layout="vertical" margin={{ top: 0, right: 70, left: 0, bottom: 0 }} barSize={28}
                                        onClick={(e) => {
                                            const payload = e?.activePayload?.[0]?.payload;
                                            if (payload?.bagian) setSelectedBagian(payload);
                                        }}
                                        style={{ cursor: 'pointer' }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical stroke="#f8fafc" />
                                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="bagian" width={180} tick={{ fontSize: 13, fill: '#334155', fontWeight: 500 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<BagianTooltip />} cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="total" radius={[0, 8, 8, 0]}
                                            label={{ position: 'right', fontSize: 12, fontWeight: 700, fill: '#475569', formatter: (v: number) => v > 0 ? v.toLocaleString('id-ID') : '' }}>
                                            {bagianChartData.map((_, i) => (
                                                <Cell key={i} fill={color} fillOpacity={Math.max(0.35, 1 - i * 0.06)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MODAL Desa Lainnya */}
            {modalData && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#fff', width: 440, maxWidth: '90%', maxHeight: '80vh', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Desa "Lainnya"</h3>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Bagian: <strong style={{ color: '#1e5fd4' }}>{modalData.bagian}</strong></p>
                            </div>
                            <button onClick={() => setModalData(null)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#475569', padding: 8, borderRadius: '50%', display: 'flex' }}>
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
                                    {modalData.details.map(([desa, count], i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '11px 24px', color: '#334155', fontWeight: 500 }}>{desa}</td>
                                            <td style={{ padding: '11px 24px', textAlign: 'right', fontWeight: 700, color: '#1e5fd4' }}>{count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
                            <span style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>
                                Total: {modalData.details.reduce((s, [, c]) => s + c, 0).toLocaleString('id-ID')} TK
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
