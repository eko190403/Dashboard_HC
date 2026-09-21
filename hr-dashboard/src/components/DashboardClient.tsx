'use client';

import { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Label
} from 'recharts';
import { Search, Download, Users, MapPin, Map, Clock, Upload, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import UploadModal from './UploadModal';

interface DashboardData {
    totalHc: number;
    totalVillages: number;
    dominantDistrict: { name: string; percentage: number };
    lastUpdated: string;
    villageData: any[];
    districtData: any[];
}

const DISTRICT_COLORS = [
    '#1e5fd4', '#0ea573', '#f59e0b', '#7c3aed',
    '#e11d48', '#0891b2', '#ea580c', '#65a30d',
    '#0d9488', '#9333ea', '#64748b',
];

const CustomTooltipBar = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#fff', border: '1px solid #dde3ed',
                borderRadius: 8, padding: '10px 14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: 12,
            }}>
                <div style={{ fontWeight: 600, color: '#1a2b4a', marginBottom: 4 }}>{label}</div>
                <div style={{ color: '#1e5fd4' }}>{payload[0].value.toLocaleString('id-ID')} TK</div>
            </div>
        );
    }
    return null;
};

const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#fff', border: '1px solid #dde3ed',
                borderRadius: 8, padding: '10px 14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: 12,
            }}>
                <div style={{ fontWeight: 600, color: '#1a2b4a', marginBottom: 4 }}>{payload[0].name}</div>
                <div style={{ color: '#5a7184' }}>{payload[0].value.toLocaleString('id-ID')} TK</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{payload[0].payload.percent !== undefined ? `${(payload[0].payload.percent * 100).toFixed(2)}%` : ''}</div>
            </div>
        );
    }
    return null;
};

export default function DashboardClient({ initialData }: { initialData: DashboardData | null }) {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('All');
    const [filterGenderVillage, setFilterGenderVillage] = useState('All');

    if (!initialData) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
                <div style={{
                    background: '#fff', borderRadius: 16, border: '1px solid #dde3ed',
                    padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: '#e9f0fc', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                    }}>
                        <Upload size={28} color="#1e5fd4" />
                    </div>
                    <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: '#1a2b4a' }}>Belum Ada Data</h2>
                    <p style={{ margin: '0 0 28px', color: '#5a7184', fontSize: 13, lineHeight: 1.6 }}>
                        Silakan unggah file Excel data domisili tenaga kerja untuk menampilkan dashboard analitik.
                    </p>
                    <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setIsUploadOpen(true)}>
                        <Upload size={15} /> Upload File Excel
                    </button>
                </div>
                <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onSuccess={() => window.location.reload()} />
            </div>
        );
    }

    const filteredVillages = useMemo(() => {
        return initialData.villageData
            .filter(v => {
                const matchSearch = v.nama_desa.toLowerCase().includes(searchQuery.toLowerCase());
                const matchDistrict = filterDistrict === 'All' || v.kecamatan === filterDistrict;
                return matchSearch && matchDistrict;
            })
            .sort((a, b) => b.jumlah_tk - a.jumlah_tk);
    }, [initialData.villageData, searchQuery, filterDistrict]);

    const handleExportCSV = () => {
        const headers = ['No', 'Nama Desa', 'Kecamatan', 'Jumlah TK', 'Persentase (%)'];
        const csvContent = [
            headers.join(','),
            ...filteredVillages.map((v, i) => `${i + 1},"${v.nama_desa}","${v.kecamatan}",${v.jumlah_tk},${v.persentase}`)
        ].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Domisili_TK_PG2_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const uniqueDistricts = ['All', ...Array.from(new Set(initialData.villageData.map(v => v.kecamatan))).filter(Boolean).sort()];
    const uniqueVillages = ['All', ...Array.from(new Set(initialData.villageData.map(v => v.nama_desa))).filter(Boolean).sort()];

    const topDesaData = initialData.villageData.filter(v => !v.is_grouped).slice(0, 10);

    const genderData = useMemo(() => {
        let laki = 0;
        let perempuan = 0;

        if (filterGenderVillage === 'All') {
            initialData.villageData.forEach(v => {
                laki += (v.jumlah_laki || 0);
                perempuan += (v.jumlah_perempuan || 0);
            });
        } else {
            const v = initialData.villageData.find(v => v.nama_desa === filterGenderVillage);
            if (v) {
                laki = v.jumlah_laki || 0;
                perempuan = v.jumlah_perempuan || 0;
            }
        }

        return [
            { name: 'Laki-laki', value: laki, fill: '#1e5fd4' },
            { name: 'Perempuan', value: perempuan, fill: '#e11d48' },
        ];
    }, [initialData.villageData, filterGenderVillage]);

    const kpiCards = [
        {
            label: 'Total Headcount',
            value: initialData.totalHc.toLocaleString('id-ID'),
            sub: 'Karyawan Aktif',
            icon: <Users size={20} />,
            iconBg: '#e9f0fc', iconColor: '#1e5fd4',
            borderColor: '#1e5fd4',
        },
        {
            label: 'Total Desa',
            value: initialData.totalVillages.toString(),
            sub: 'Desa terdeteksi',
            icon: <MapPin size={20} />,
            iconBg: '#d1fae5', iconColor: '#0ea573',
            borderColor: '#0ea573',
        },
        {
            label: 'Kecamatan Dominan',
            value: initialData.dominantDistrict.name,
            sub: `${initialData.dominantDistrict.percentage.toFixed(2)}% dari total TK`,
            icon: <Map size={20} />,
            iconBg: '#ede9fe', iconColor: '#7c3aed',
            borderColor: '#7c3aed',
        },
        {
            label: 'Update Terakhir',
            value: new Date(initialData.lastUpdated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            sub: new Date(initialData.lastUpdated).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            icon: <Clock size={20} />,
            iconBg: '#fef3c7', iconColor: '#f59e0b',
            borderColor: '#f59e0b',
        },
    ];

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

            {/* ===== HEADER ===== */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a2b4a' }}>
                        Dashboard Domisili Tenaga Kerja
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#5a7184' }}>
                        PG 2 Estate — Data per 21 September 2026
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setIsUploadOpen(true)}>
                    <ArrowUp size={14} /> Update Data
                </button>
            </div>

            {/* ===== KPI CARDS ===== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {kpiCards.map((card, i) => (
                    <div key={i} className="kpi-card" style={{ borderTop: `3px solid ${card.borderColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5a7184', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {card.label}
                            </p>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: card.iconBg, color: card.iconColor,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {card.icon}
                            </div>
                        </div>
                        <div style={{ fontSize: i === 2 ? 16 : 26, fontWeight: 700, color: '#1a2b4a', lineHeight: 1.2, marginBottom: 4 }}>
                            {card.value}
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{card.sub}</div>
                    </div>
                ))}
            </div>

            {/* ===== CHARTS ===== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>

                {/* Pie Chart Top 10 Desa */}
                <div className="card" style={{ padding: '22px 24px' }}>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>Top 10 Desa — Jumlah TK Terbanyak</h3>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>Tidak termasuk kelompok "Desa Lainnya"</p>
                    </div>
                    <div style={{ height: 210 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={topDesaData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={2}
                                    dataKey="jumlah_tk"
                                    nameKey="nama_desa"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        if ((percent ?? 0) < 0.04) return null;
                                        const RADIAN = Math.PI / 180;
                                        const radius = (innerRadius ?? 0) + ((outerRadius ?? 0) - (innerRadius ?? 0)) * 0.55;
                                        const x = (cx ?? 0) + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
                                        const y = (cy ?? 0) + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
                                                style={{ fontSize: 10, fontWeight: 700 }}>
                                                {`${((percent ?? 0) * 100).toFixed(1)}%`}
                                            </text>
                                        );
                                    }}
                                >
                                    {topDesaData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={DISTRICT_COLORS[index % DISTRICT_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltipPie />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Summary Table per Desa */}
                    <div style={{ marginTop: 8 }}>
                        {topDesaData.slice(0, 5).map((d, i) => {
                            const pct = ((d.jumlah_tk / initialData.totalHc) * 100);
                            return (
                                <div key={d.nama_desa} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '5px 0',
                                    borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none',
                                }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                        background: DISTRICT_COLORS[i % DISTRICT_COLORS.length],
                                    }} />
                                    <span style={{ flex: 1, fontSize: 11, color: '#1a2b4a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {d.nama_desa}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#1e5fd4', fontWeight: 700, flexShrink: 0 }}>
                                        {pct.toFixed(2)}%
                                    </span>
                                    <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, minWidth: 38, textAlign: 'right' }}>
                                        {d.jumlah_tk.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            );
                        })}
                        {topDesaData.length > 5 && (
                            <div style={{ textAlign: 'center', marginTop: 4 }}>
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>+ {topDesaData.length - 5} desa lainnya di Top 10</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="card" style={{ padding: '22px 24px' }}>
                    <div style={{ marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>Distribusi per Kecamatan</h3>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>Persentase dari total headcount</p>
                    </div>

                    {/* Donut Chart */}
                    <div style={{ height: 210 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={initialData.districtData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={2}
                                    dataKey="value"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        if ((percent ?? 0) < 0.04) return null;
                                        const RADIAN = Math.PI / 180;
                                        const radius = (innerRadius ?? 0) + ((outerRadius ?? 0) - (innerRadius ?? 0)) * 0.55;
                                        const x = (cx ?? 0) + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
                                        const y = (cy ?? 0) + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
                                                style={{ fontSize: 10, fontWeight: 700 }}>
                                                {`${((percent ?? 0) * 100).toFixed(1)}%`}
                                            </text>
                                        );
                                    }}
                                >
                                    {initialData.districtData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={DISTRICT_COLORS[index % DISTRICT_COLORS.length]} />
                                    ))}
                                    <Label
                                        value={`${initialData.totalHc.toLocaleString('id-ID')} TK`}
                                        position="center"
                                        style={{ fontSize: 13, fontWeight: 700, fill: '#1a2b4a' }}
                                    />
                                </Pie>
                                <Tooltip content={<CustomTooltipPie />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Summary Table per Kecamatan */}
                    <div style={{ marginTop: 8 }}>
                        {initialData.districtData.slice(0, 5).map((d, i) => {
                            const pct = ((d.value / initialData.totalHc) * 100);
                            return (
                                <div key={d.name} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '5px 0',
                                    borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none',
                                }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                        background: DISTRICT_COLORS[i % DISTRICT_COLORS.length],
                                    }} />
                                    <span style={{ flex: 1, fontSize: 11, color: '#1a2b4a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {d.name}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#1e5fd4', fontWeight: 700, flexShrink: 0 }}>
                                        {pct.toFixed(2)}%
                                    </span>
                                    <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, minWidth: 38, textAlign: 'right' }}>
                                        {d.value.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Gender Pie Chart */}
                <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>Distribusi Gender</h3>
                            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>Laki-laki vs Perempuan</p>
                        </div>
                        <select
                            value={filterGenderVillage}
                            onChange={(e) => setFilterGenderVillage(e.target.value)}
                            className="form-select"
                            style={{ width: 120, padding: '4px 8px', fontSize: 11 }}
                        >
                            {uniqueVillages.map(v => (
                                <option key={v} value={v}>{v === 'All' ? 'Semua Desa' : v}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ height: 210, flex: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={2}
                                    dataKey="value"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        if ((percent ?? 0) === 0) return null;
                                        const RADIAN = Math.PI / 180;
                                        const radius = (innerRadius ?? 0) + ((outerRadius ?? 0) - (innerRadius ?? 0)) * 0.55;
                                        const x = (cx ?? 0) + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
                                        const y = (cy ?? 0) + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
                                                style={{ fontSize: 10, fontWeight: 700 }}>
                                                {`${((percent ?? 0) * 100).toFixed(1)}%`}
                                            </text>
                                        );
                                    }}
                                >
                                    {genderData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                    <Label
                                        value={`${(genderData[0].value + genderData[1].value).toLocaleString('id-ID')} TK`}
                                        position="center"
                                        style={{ fontSize: 13, fontWeight: 700, fill: '#1a2b4a' }}
                                    />
                                </Pie>
                                <Tooltip content={<CustomTooltipPie />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#1e5fd4' }} />
                            <span style={{ fontSize: 12, color: '#5a7184' }}>Laki-laki ({genderData[0].value})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#e11d48' }} />
                            <span style={{ fontSize: 12, color: '#5a7184' }}>Perempuan ({genderData[1].value})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== DATA TABLE ===== */}
            <div className="card" style={{ overflow: 'hidden' }}>
                {/* Table Header Bar */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #dde3ed',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>Detail Data Domisili</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                            {filteredVillages.length} dari {initialData.villageData.length} desa ditampilkan
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Cari desa..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="search-input"
                                style={{ width: 220, paddingLeft: 32 }}
                            />
                        </div>
                        {/* Filter */}
                        <select
                            value={filterDistrict}
                            onChange={e => setFilterDistrict(e.target.value)}
                            className="form-select"
                            style={{ minWidth: 170 }}
                        >
                            {uniqueDistricts.map(d => (
                                <option key={d} value={d}>{d === 'All' ? 'Semua Kecamatan' : d}</option>
                            ))}
                        </select>
                        {/* Export */}
                        <button
                            className="btn-secondary"
                            onClick={handleExportCSV}
                            title="Export ke CSV"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 48 }}>No</th>
                                <th>Nama Desa</th>
                                <th>Kecamatan / District</th>
                                <th style={{ textAlign: 'right' }}>Jumlah TK</th>
                                <th style={{ textAlign: 'right' }}>Laki-laki</th>
                                <th style={{ textAlign: 'right' }}>Perempuan</th>
                                <th style={{ textAlign: 'right' }}>Persentase (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVillages.length > 0 ? (
                                filteredVillages.map((row, i) => {
                                    const isGrouped = row.is_grouped;
                                    return (
                                        <tr key={row.id}>
                                            <td style={{ color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {isGrouped ? (
                                                        <>
                                                            <span className="badge badge-blue">Grup</span>
                                                            <span style={{ fontWeight: 500 }}>{row.nama_desa}</span>
                                                        </>
                                                    ) : (
                                                        <Link 
                                                            href={`/desa/${encodeURIComponent(row.nama_desa)}`}
                                                            style={{ fontWeight: 500, color: '#1e5fd4', textDecoration: 'none' }}
                                                            className="hover-underline"
                                                        >
                                                            {row.nama_desa}
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ color: '#5a7184' }}>{row.kecamatan || '—'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.jumlah_tk.toLocaleString('id-ID')}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span style={{ color: '#1e5fd4', fontWeight: 600 }}>
                                                    {(row.jumlah_laki ?? 0).toLocaleString('id-ID')}
                                                </span>
                                                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 3 }}>♂</span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <span style={{ color: '#e11d48', fontWeight: 600 }}>
                                                    {(row.jumlah_perempuan ?? 0).toLocaleString('id-ID')}
                                                </span>
                                                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 3 }}>♀</span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                                                    <span style={{ color: '#1a2b4a', fontWeight: 500, minWidth: 40 }}>
                                                        {Number(row.persentase).toFixed(2)}%
                                                    </span>
                                                    <div className="progress-track">
                                                        <div className="progress-bar" style={{ width: `${Math.min(100, row.persentase * 5)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                        Tidak ada data yang cocok.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                {filteredVillages.length > 0 && (
                    <div style={{
                        padding: '12px 20px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                        fontSize: 12, color: '#94a3b8',
                    }}>
                        <span>Menampilkan <b style={{ color: '#1a2b4a' }}>{filteredVillages.length}</b> baris</span>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <span>Total TK: <b style={{ color: '#1a2b4a' }}>{filteredVillages.reduce((s, v) => s + v.jumlah_tk, 0).toLocaleString('id-ID')}</b></span>
                            <span>♂ Laki-laki: <b style={{ color: '#1e5fd4' }}>{filteredVillages.reduce((s, v) => s + (v.jumlah_laki ?? 0), 0).toLocaleString('id-ID')}</b></span>
                            <span>♀ Perempuan: <b style={{ color: '#e11d48' }}>{filteredVillages.reduce((s, v) => s + (v.jumlah_perempuan ?? 0), 0).toLocaleString('id-ID')}</b></span>
                        </div>
                    </div>
                )}
            </div>

            <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onSuccess={() => window.location.reload()} />
        </div>
    );
}
