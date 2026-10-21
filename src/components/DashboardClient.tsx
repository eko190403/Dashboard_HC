'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Label
} from 'recharts';
import { Download, Users, MapPin, Map, Upload, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import UploadModal from './UploadModal';
import UploadMandorModal from './UploadMandorModal';
import TKChart from './TKChart';
import HCTrendChart from './HCTrendChart';
import { getEffectiveMonthLabel, getUploadMonthLabel } from '@/lib/reporting-month';
import type { DashboardData, UploadOption } from '@/lib/dashboard-types';

interface ChartTooltipPayload {
    value: number;
    name?: string;
    payload?: {
        percent?: number;
    };
}

interface ChartTooltipProps {
    active?: boolean;
    payload?: ChartTooltipPayload[];
    label?: string;
}

interface AgeSummary {
    name: string;
    value: number;
    fill: string;
}

interface AgeDemographicsResponse {
    data?: AgeSummary[];
    unknown?: number;
}

const DISTRICT_COLORS = [
    '#1e5fd4', '#0ea573', '#f59e0b', '#7c3aed',
    '#e11d48', '#0891b2', '#ea580c', '#65a30d',
    '#0d9488', '#9333ea', '#64748b',
];

const CustomTooltipPie = ({ active, payload, totalHc }: ChartTooltipProps & { totalHc: number }) => {
    const item = payload?.[0];
    if (active && item) {
        const val = item.value;
        const percent = item.payload?.percent;
        const pctText = totalHc ? `${((val / totalHc) * 100).toFixed(2)}%` : (percent !== undefined ? `${(percent * 100).toFixed(2)}%` : '');
        return (
            <div style={{
                background: '#fff', border: '1px solid #dde3ed',
                borderRadius: 8, padding: '10px 14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: 12,
            }}>
                <div style={{ fontWeight: 600, color: '#1a2b4a', marginBottom: 4 }}>{item.name}</div>
                <div style={{ color: '#5a7184' }}>{val.toLocaleString('id-ID')} TK</div>
                {pctText && <div style={{ color: '#94a3b8', fontSize: 11 }}>{pctText}</div>}
            </div>
        );
    }
    return null;
};

export default function DashboardClient({ initialData, allUploads, currentUploadId }: { initialData: DashboardData | null, allUploads: UploadOption[], currentUploadId: string | null }) {
    const router = useRouter();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isUploadMandorOpen, setIsUploadMandorOpen] = useState(false);
    const [justUpdated, setJustUpdated] = useState(false);
    const [filterGenderVillage, setFilterGenderVillage] = useState('All');
    const [showOtherVillages, setShowOtherVillages] = useState(false);
    const [ageData, setAgeData] = useState<AgeSummary[]>([]);
    const [ageUnknown, setAgeUnknown] = useState(0);
    const [ageLoading, setAgeLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const fetchAgeData = async () => {
            setAgeLoading(true);
            try {
                const queryParams = new URLSearchParams();
                if (filterGenderVillage !== 'All') queryParams.append('nama_desa', filterGenderVillage);
                if (currentUploadId) queryParams.append('upload_id', currentUploadId);
                
                const params = queryParams.toString() ? `?${queryParams.toString()}` : '';
                const res = await fetch(`/api/age-demographics${params}`, { signal: controller.signal });
                if (res.ok) {
                    const json = await res.json() as AgeDemographicsResponse;
                    setAgeData(json.data || []);
                    setAgeUnknown(json.unknown || 0);
                }
            } catch (err) {
                if ((err as Error).name !== 'AbortError') console.error("Failed to fetch age data", err);
            } finally {
                if (!controller.signal.aborted) setAgeLoading(false);
            }
        };
        fetchAgeData();
        return () => controller.abort();
    }, [filterGenderVillage, currentUploadId]);

    const summaryInsight = useMemo(() => {
        if (!initialData) return '';

        const absDiff = Math.abs(initialData.diffHc);

        if (!initialData.previousUploadDate) {
            return 'Belum ada upload sebelumnya untuk perbandingan tren.';
        }

        if (initialData.diffHc > 0) {
            return `Total HC naik ${absDiff.toLocaleString('id-ID')} TK (${Math.abs(initialData.diffPercent).toFixed(1)}%) dibanding upload sebelumnya.`;
        }

        if (initialData.diffHc < 0) {
            return `Total HC turun ${absDiff.toLocaleString('id-ID')} TK (${Math.abs(initialData.diffPercent).toFixed(1)}%) dibanding upload sebelumnya.`;
        }

        return 'Total HC relatif stabil dibanding upload sebelumnya.';
    }, [initialData]);

    const genderData = useMemo(() => {
        const villageData = initialData?.villageData ?? [];
        const villages = filterGenderVillage === 'All'
            ? villageData
            : villageData.filter(v => v.nama_desa === filterGenderVillage);
        const getCount = (value: unknown) => Number(value) || 0;
        const laki = villages.reduce((total, village) => total + getCount(village.jumlah_laki), 0);
        const perempuan = villages.reduce((total, village) => total + getCount(village.jumlah_perempuan), 0);

        return [
            { name: 'Laki-laki', value: laki, fill: '#1e5fd4' },
            { name: 'Perempuan', value: perempuan, fill: '#e11d48' },
        ];
    }, [initialData?.villageData, filterGenderVillage]);

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

    const handleDownloadFullData = async () => {
        try {
            const params = new URLSearchParams();
            if (currentUploadId) params.set('upload_id', currentUploadId);
            if (filterGenderVillage !== 'All') params.set('nama_desa', filterGenderVillage);
            const response = await fetch(`/api/export-full-data?${params.toString()}`);
            if (!response.ok) {
                const result = await response.json().catch(() => null);
                throw new Error(result?.error || 'Gagal mengunduh data lengkap.');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const disposition = response.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
            link.href = url;
            link.download = filenameMatch
                ? decodeURIComponent(filenameMatch[1])
                : `Data_Lengkap_PG2_${new Date(initialData.lastUpdated).toISOString().slice(0, 10)}.xlsx`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('Full data export error:', error);
            alert(error instanceof Error ? error.message : 'Gagal mengunduh data lengkap.');
        }
    };

    const uniqueVillages = ['All', ...Array.from(new Set(initialData.villageData.map(v => v.nama_desa))).filter(Boolean).sort()];

    const topDesaData = initialData.villageData.filter(v => !v.is_grouped).slice(0, 10);
    const otherDesaData = initialData.villageData
        .filter(v => !v.is_grouped)
        .slice(10)
        .sort((a, b) => b.jumlah_tk - a.jumlah_tk);
    const otherVillagesTotal = otherDesaData.reduce((sum, village) => sum + Number(village.jumlah_tk || 0), 0);

    const kpiCards: {
        label: string;
        value: string;
        sub: string;
        subColor: string;
        icon: React.ReactNode;
        iconBg: string;
        iconColor: string;
        borderColor: string;
        href?: string;
    }[] = [
        {
            label: 'Total Headcount',
            value: initialData.totalHc.toLocaleString('id-ID'),
            sub: !initialData.previousUploadDate
                ? 'Belum ada pembanding'
                : initialData.diffHc > 0
                    ? `+${initialData.diffHc.toLocaleString('id-ID')} (${Math.abs(initialData.diffPercent).toFixed(1)}%) vs upload sebelumnya`
                    : initialData.diffHc < 0
                        ? `${initialData.diffHc.toLocaleString('id-ID')} (${Math.abs(initialData.diffPercent).toFixed(1)}%) vs upload sebelumnya`
                        : 'Karyawan Aktif',
            subColor: initialData.diffHc > 0 ? '#0ea573' : initialData.diffHc < 0 ? '#e11d48' : '#94a3b8',
            icon: <Users size={20} />,
            iconBg: '#e9f0fc', iconColor: '#1e5fd4',
            borderColor: '#1e5fd4',
            href: currentUploadId ? `/tk-detail?upload_id=${encodeURIComponent(String(currentUploadId))}` : '/tk-detail',
        },
        {
            label: 'Total Desa',
            value: initialData.totalVillages.toString(),
            sub: 'Desa terdeteksi',
            subColor: '#94a3b8',
            icon: <MapPin size={20} />,
            iconBg: '#d1fae5', iconColor: '#0ea573',
            borderColor: '#0ea573',
            href: currentUploadId
                ? `/domisili?upload_id=${encodeURIComponent(String(currentUploadId))}`
                : '/domisili',
        },
        {
            label: 'Kecamatan Dominan',
            value: initialData.dominantDistrict.name,
            sub: `${initialData.dominantDistrict.percentage.toFixed(2)}% dari total TK`,
            subColor: '#94a3b8',
            icon: <Map size={20} />,
            iconBg: '#ede9fe', iconColor: '#7c3aed',
            borderColor: '#7c3aed',
            href: initialData.dominantDistrict.name !== '-'
                ? `/domisili?${new URLSearchParams({
                    ...(currentUploadId ? { upload_id: String(currentUploadId) } : {}),
                    kecamatan: initialData.dominantDistrict.name,
                }).toString()}`
                : undefined,
        },
    ];

    return (
        <div className="dashboard-wrapper" style={{ padding: '22px 32px', maxWidth: 1280, margin: '0 auto' }}>

            {/* ===== HEADER ===== */}
            <div className="dashboard-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a2b4a' }}>
                            Dashboard Domisili Tenaga Kerja
                        </h1>
                        {justUpdated && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: '#d1fae5', color: '#0ea573',
                                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                                borderRadius: 20, letterSpacing: '0.02em',
                                animation: 'fadeSlideUp 0.3s ease both',
                            }}>
                                ✓ Baru Diperbarui
                            </span>
                        )}
                        <select
                            className="form-select"
                            style={{ 
                                padding: '4px 28px 4px 10px', 
                                fontSize: 13, 
                                fontWeight: 600, 
                                color: '#1e5fd4',
                                background: '#e9f0fc',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                            value={currentUploadId || ''}
                            onChange={(e) => {
                                const newId = e.target.value;
                                router.push(`/?upload_id=${newId}`);
                            }}
                        >
                            {allUploads.map(upload => (
                                <option key={upload.id} value={upload.id}>
                                    {getEffectiveMonthLabel(upload.uploaded_at)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#5a7184' }}>
                        PG 2 Estate — Bulan laporan: <strong>{getEffectiveMonthLabel(initialData.lastUpdated)}</strong> • Upload aktual: {getUploadMonthLabel(initialData.lastUpdated)}
                    </p>
                    <div style={{
                        marginTop: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: '#eef6ff',
                        border: '1px solid #cfe3ff',
                        color: '#1a2b4a',
                        fontSize: 12,
                        lineHeight: 1.5,
                        maxWidth: 700,
                    }}>
                        <strong style={{ color: '#1e5fd4' }}>Insight utama:</strong> {summaryInsight} {initialData.dominantDistrict.name !== '-' && (
                            <span>
                                Kecamatan <strong>{initialData.dominantDistrict.name}</strong> masih dominan dengan <strong>{initialData.dominantDistrict.percentage.toFixed(2)}%</strong> dari total TK.
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-secondary" onClick={() => setIsUploadMandorOpen(true)} style={{ color: '#0ea573', borderColor: '#0ea573' }}>
                        <FileSpreadsheet size={14} /> Master Mandor
                    </button>
                    <button className="btn-primary" onClick={() => setIsUploadOpen(true)}>
                        <Upload size={14} /> Update Data
                    </button>
                </div>
            </div>

            {/* ===== KPI CARDS ===== */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {kpiCards.map((card, i) => {
                    const cardContent = (
                        <div
                            key={i}
                            className="kpi-card animate-in"
                            style={{ borderTop: `3px solid ${card.borderColor}`, animationDelay: `${i * 60}ms`, cursor: card.href ? 'pointer' : 'default' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5a7184', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {card.label}
                                </p>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: card.iconBg, color: card.iconColor,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    {card.icon}
                                </div>
                            </div>
                            <div style={{ fontSize: i === 2 ? 16 : 26, fontWeight: 700, color: '#1a2b4a', lineHeight: 1.2, marginBottom: 4 }}>
                                {card.value}
                            </div>
                            <div style={{ fontSize: 12, color: card.subColor, fontWeight: 500 }}>{card.sub}</div>
                        </div>
                    );

                    if (card.href) {
                        return (
                            <Link key={i} href={card.href} style={{ textDecoration: 'none' }}>
                                {cardContent}
                            </Link>
                        );
                    }

                    return cardContent;
                })}

                {/* Mini HC Trend replacing Update Terakhir */}
                <Link href="/history" aria-label="Buka riwayat upload dan tren HC" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="kpi-card animate-in" style={{ borderTop: `3px solid #1e5fd4`, animationDelay: `180ms`, padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                        <HCTrendChart variant="mini" />
                    </div>
                </Link>
            </div>

            {/* ===== EXECUTIVE INSIGHTS ===== */}
            {/* ===== TK CHART ===== */}
            <div className="card" style={{ padding: '22px 24px', marginBottom: 24 }}>
                <div style={{ marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>Distribusi Tenaga Kerja per Bagian & Wilayah Asal</h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>Breakdown per komoditi, bagian, dan desa asal tenaga kerja</p>
                </div>
                <TKChart uploadId={currentUploadId} />
            </div>

            {/* ===== CHARTS ===== */}
            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>

                {/* Pie Chart Top 10 Desa */}
                <div className="card" style={{ padding: '22px 24px' }}>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>Top 10 Desa — Jumlah TK Terbanyak</h3>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>Diurutkan berdasarkan jumlah tenaga kerja</p>
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
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                                        const actualPercent = (value / initialData.totalHc);
                                        if (actualPercent < 0.04) return null;
                                        const RADIAN = Math.PI / 180;
                                        const radius = (innerRadius ?? 0) + ((outerRadius ?? 0) - (innerRadius ?? 0)) * 0.55;
                                        const x = (cx ?? 0) + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
                                        const y = (cy ?? 0) + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
                                                style={{ fontSize: 10, fontWeight: 700 }}>
                                                {`${(actualPercent * 100).toFixed(2)}%`}
                                            </text>
                                        );
                                    }}
                                >
                                    {topDesaData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={DISTRICT_COLORS[index % DISTRICT_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltipPie totalHc={initialData.totalHc} />} />
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
                        {otherDesaData.length > 0 && (
                            <div style={{ marginTop: 8, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: '#1a2b4a', fontWeight: 700 }}>
                                        Lainnya ({otherDesaData.length} desa): {otherVillagesTotal.toLocaleString('id-ID')} TK
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowOtherVillages(v => !v)}
                                        style={{
                                            border: '1px solid #dde3ed',
                                            background: '#fff',
                                            color: '#1e5fd4',
                                            borderRadius: 6,
                                            padding: '4px 8px',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {showOtherVillages ? 'Sembunyikan' : 'Lihat daftar'}
                                    </button>
                                </div>
                                {showOtherVillages && (
                                    <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                                        {otherDesaData.map((d, i) => (
                                            <div key={`${d.nama_desa}-${i}`} style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '4px 0',
                                                borderBottom: i < otherDesaData.length - 1 ? '1px solid #f8fafc' : 'none',
                                            }}>
                                                <span style={{ flex: 1, fontSize: 10.5, color: '#5a7184', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {d.nama_desa}
                                                </span>
                                                <span style={{ fontSize: 10.5, color: '#1e5fd4', fontWeight: 700 }}>
                                                    {d.jumlah_tk.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {topDesaData.length > 5 && !otherDesaData.length && (
                            <div style={{ textAlign: 'center', marginTop: 4 }}>
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>+ {topDesaData.length - 5} desa lainnya di Top 10</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie Chart Distribusi Kecamatan */}
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
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                                        const actualPercent = (value / initialData.totalHc);
                                        if (actualPercent < 0.04) return null;
                                        const RADIAN = Math.PI / 180;
                                        const radius = (innerRadius ?? 0) + ((outerRadius ?? 0) - (innerRadius ?? 0)) * 0.55;
                                        const x = (cx ?? 0) + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
                                        const y = (cy ?? 0) + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
                                                style={{ fontSize: 10, fontWeight: 700 }}>
                                                {`${(actualPercent * 100).toFixed(2)}%`}
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
                                <Tooltip content={<CustomTooltipPie totalHc={initialData.totalHc} />} />
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
                    <div className="gender-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>Distribusi Gender</h3>
                            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>Laki-laki vs Perempuan</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleDownloadFullData}
                                title="Unduh data TK lengkap dan grafik gender serta umur untuk desa terpilih"
                                style={{ padding: '5px 8px', fontSize: 11 }}
                            >
                                <Download size={13} /> Excel
                            </button>
                        </div>
                    </div>
                    <div style={{ minHeight: 220, width: '100%', marginBottom: 12 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart key={`${filterGenderVillage}-${genderData[0].value}-${genderData[1].value}`}>
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
                                <Tooltip content={<CustomTooltipPie totalHc={genderData[0].value + genderData[1].value} />} />
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

                {/* Age Pie Chart */}
                <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
                    <div className="gender-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>Demografi Usia</h3>
                            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                                {filterGenderVillage === 'All' ? 'Semua desa' : filterGenderVillage}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleDownloadFullData}
                            disabled={ageLoading || ageData.length === 0}
                            title="Unduh data TK lengkap dan grafik gender serta umur untuk desa terpilih"
                            style={{ padding: '5px 8px', fontSize: 11 }}
                        >
                            <Download size={13} /> Excel
                        </button>
                    </div>
                    <div style={{ minHeight: 220, width: '100%', marginBottom: 12 }}>
                        {ageLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>Memuat data usia...</span>
                            </div>
                        ) : ageData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={ageData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={2}
                                        dataKey="value"
                                        labelLine={false}
                                        onClick={(entry) => {
                                            if (entry?.name) {
                                                const params = new URLSearchParams();
                                                params.append('range', entry.name);
                                                if (currentUploadId) params.append('upload_id', currentUploadId);
                                                router.push(`/age-detail?${params.toString()}`);
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
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
                                        {ageData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltipPie totalHc={initialData.totalHc} />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>Memuat data usia...</span>
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: 'auto' }}>
                        <div>
                            {ageData.map((d) => (
                                <div key={d.name}
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        params.append('range', d.name);
                                        if (currentUploadId) params.append('upload_id', currentUploadId);
                                        router.push(`/age-detail?${params.toString()}`);
                                    }}
                                    style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', borderRadius: 4, transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill }} />
                                        <span style={{ fontSize: 12, color: '#1a2b4a', fontWeight: 500 }}>{d.name} Tahun</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: '#1e5fd4', fontWeight: 600 }}>{d.value.toLocaleString('id-ID')} TK</span>
                                </div>
                            ))}
                            {ageUnknown > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8' }} />
                                        <span style={{ fontSize: 12, color: '#1a2b4a', fontWeight: 500 }}>Tidak Diketahui</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{ageUnknown.toLocaleString('id-ID')} TK</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onSuccess={() => { setJustUpdated(true); window.location.reload(); }} />
            <UploadMandorModal isOpen={isUploadMandorOpen} onClose={() => setIsUploadMandorOpen(false)} onSuccess={() => { window.location.reload(); }} />
        </div>
    );
}
