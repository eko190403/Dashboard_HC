'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, FileSpreadsheet, RotateCcw, Search } from 'lucide-react';
import { getEffectiveMonthLabel, getUploadMonthLabel } from '@/lib/reporting-month';
import type { DashboardData, UploadOption } from '@/lib/dashboard-types';

const PAGE_SIZE = 50;

export default function DomicileDetailsClient({
    initialData,
    allUploads,
    currentUploadId,
    initialKabupaten = 'All',
    initialKecamatan = 'All',
}: {
    initialData: DashboardData | null;
    allUploads: UploadOption[];
    currentUploadId: string | null;
    initialKabupaten?: string;
    initialKecamatan?: string;
}) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterKabupaten, setFilterKabupaten] = useState(initialKabupaten);
    const [filterDistrict, setFilterDistrict] = useState(initialKecamatan);
    const [page, setPage] = useState(1);

    const uniqueDistricts = useMemo(() => [
        'All',
        ...Array.from(new Set(initialData?.villageData.map(village => village.kecamatan) || [])).filter(Boolean).sort(),
    ], [initialData]);
    const uniqueKabupaten = useMemo(() => [
        'All',
        ...Array.from(new Set(initialData?.villageData.map(village => village.kabupaten || 'Tidak Diketahui') || [])).sort(),
    ], [initialData]);
    const filteredVillages = useMemo(() => (initialData?.villageData || [])
        .filter(village => village.nama_desa.toLocaleLowerCase('id-ID').includes(searchQuery.toLocaleLowerCase('id-ID')))
        .filter(village => filterDistrict === 'All' || village.kecamatan === filterDistrict)
        .filter(village => filterKabupaten === 'All' || (village.kabupaten || 'Tidak Diketahui') === filterKabupaten)
        .sort((a, b) => b.jumlah_tk - a.jumlah_tk), [
        initialData,
        searchQuery,
        filterDistrict,
        filterKabupaten,
    ]);
    const totalPages = Math.max(1, Math.ceil(filteredVillages.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pagedVillages = filteredVillages.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const resetPage = () => setPage(1);

    const handleExportCSV = () => {
        const headers = ['No', 'Nama Desa', 'Kabupaten', 'Kecamatan', 'Jumlah TK', 'Persentase (%)'];
        const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
        const rows = filteredVillages.map((village, index) => [
            String(index + 1),
            escapeCsv(village.nama_desa),
            escapeCsv(village.kabupaten || 'Tidak Diketahui'),
            escapeCsv(village.kecamatan || ''),
            String(village.jumlah_tk),
            String(village.persentase),
        ]);
        const blob = new Blob(
            ['\uFEFF', headers.join(','), '\n', ...rows.map(row => row.join(',' ) + '\n')],
            { type: 'text/csv;charset=utf-8;' },
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Domisili_TK_PG2_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const downloadExport = async (endpoint: string, fallbackName: string, useDisposition = false) => {
        try {
            const params = new URLSearchParams();
            if (currentUploadId) params.set('upload_id', currentUploadId);
            const response = await fetch(`${endpoint}?${params.toString()}`);
            if (!response.ok) {
                const result = await response.json().catch(() => null);
                throw new Error(result?.error || 'Gagal mengunduh file.');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const disposition = response.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
            link.href = url;
            link.download = useDisposition && filenameMatch
                ? decodeURIComponent(filenameMatch[1])
                : fallbackName;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error('Domicile export error:', error);
            alert(error instanceof Error ? error.message : 'Gagal mengunduh file.');
        }
    };

    if (!initialData) {
        return (
            <div className="dashboard-wrapper" style={{ padding: '22px 32px', maxWidth: 1280, margin: '0 auto' }}>
                <div className="card" style={{ padding: 32 }}>
                    <h1 style={{ marginTop: 0, fontSize: 20, color: '#1a2b4a' }}>Detail Data Domisili</h1>
                    <p style={{ color: '#5a7184' }}>Belum ada data domisili. Silakan unggah data melalui Dashboard.</p>
                    <Link href="/" className="btn-primary" style={{ textDecoration: 'none' }}>Kembali ke Dashboard</Link>
                </div>
            </div>
        );
    }

    const totalTk = filteredVillages.reduce((total, village) => total + village.jumlah_tk, 0);
    const totalLaki = filteredVillages.reduce((total, village) => total + (village.jumlah_laki || 0), 0);
    const totalPerempuan = filteredVillages.reduce((total, village) => total + (village.jumlah_perempuan || 0), 0);

    return (
        <div className="dashboard-wrapper" style={{ padding: '22px 32px', maxWidth: 1280, margin: '0 auto' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #dde3ed' }}>
                    <div className="table-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a2b4a' }}>Detail Data Domisili</h1>
                            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                                Bulan laporan: <strong>{getEffectiveMonthLabel(initialData.lastUpdated)}</strong>
                                {' · '}Upload aktual: {getUploadMonthLabel(initialData.lastUpdated)}
                            </p>
                            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                                {filteredVillages.length} dari {initialData.villageData.length} desa ditampilkan
                            </p>
                            <p title="Termasuk desa berlabel Tidak Diketahui dan alamat kosong atau tidak valid." style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                                Domisili belum diketahui: <strong>{initialData.unknownDomicileCount === null ? 'Data tidak tersedia' : initialData.unknownDomicileCount.toLocaleString('id-ID')}</strong>
                                {initialData.unknownDomicileCount === null ? '' : ' TK'}
                            </p>
                        </div>
                        <select
                            className="form-select"
                            aria-label="Pilih bulan laporan"
                            value={currentUploadId || ''}
                            onChange={event => router.push(`/domisili?upload_id=${encodeURIComponent(event.target.value)}`)}
                        >
                            {allUploads.map(upload => (
                                <option key={upload.id} value={upload.id}>{getEffectiveMonthLabel(upload.uploaded_at)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="table-controls" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="search"
                                placeholder="Cari desa..."
                                value={searchQuery}
                                onChange={event => {
                                    setSearchQuery(event.target.value);
                                    resetPage();
                                }}
                                className="search-input"
                                style={{ paddingLeft: 32 }}
                            />
                        </div>
                        <select
                            value={filterKabupaten}
                            onChange={event => {
                                setFilterKabupaten(event.target.value);
                                resetPage();
                            }}
                            className="form-select"
                            style={{ minWidth: 170 }}
                        >
                            {uniqueKabupaten.map(kabupaten => <option key={kabupaten} value={kabupaten}>{kabupaten === 'All' ? 'Semua Kabupaten' : kabupaten}</option>)}
                        </select>
                        <select
                            value={filterDistrict}
                            onChange={event => {
                                setFilterDistrict(event.target.value);
                                resetPage();
                            }}
                            className="form-select"
                            style={{ minWidth: 170 }}
                        >
                            {uniqueDistricts.map(district => <option key={district} value={district}>{district === 'All' ? 'Semua Kecamatan' : district}</option>)}
                        </select>
                        {(searchQuery || filterDistrict !== 'All' || filterKabupaten !== 'All') && (
                            <button className="btn-secondary" onClick={() => {
                                setSearchQuery('');
                                setFilterDistrict('All');
                                setFilterKabupaten('All');
                                resetPage();
                            }}>
                                <RotateCcw size={14} /> Reset Filter
                            </button>
                        )}
                        <button className="btn-secondary" onClick={() => downloadExport(
                            '/api/export-summary',
                            `Ringkasan_Desa_Kecamatan_${new Date(initialData.lastUpdated).toISOString().slice(0, 10)}.xlsx`,
                        )}>
                            <Download size={14} /> Export Excel
                        </button>
                        <button className="btn-secondary" onClick={() => downloadExport(
                            '/api/export-full-data',
                            `Data_Lengkap_PG2_${new Date(initialData.lastUpdated).toISOString().slice(0, 10)}.xlsx`,
                            true,
                        )}>
                            <FileSpreadsheet size={14} /> Data Lengkap
                        </button>
                        <button className="btn-secondary" onClick={handleExportCSV}>
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 48 }}>No</th>
                                <th>Nama Desa</th>
                                <th className="col-hide-xs">Kabupaten / City</th>
                                <th className="col-hide-xs">Kecamatan / District</th>
                                <th style={{ textAlign: 'right' }}>Jumlah TK</th>
                                <th style={{ textAlign: 'right' }} className="col-hide-xs">Laki-laki</th>
                                <th style={{ textAlign: 'right' }} className="col-hide-xs">Perempuan</th>
                                <th style={{ textAlign: 'right' }}>Persentase (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagedVillages.length ? pagedVillages.map((village, index) => {
                                const groupedParams = new URLSearchParams();
                                if (currentUploadId) groupedParams.set('upload_id', currentUploadId);
                                if (village.kabupaten) groupedParams.set('kabupaten', village.kabupaten);
                                const href = village.is_grouped
                                    ? `/desa-lainnya?${groupedParams.toString()}`
                                    : `/desa/${encodeURIComponent(village.nama_desa)}`;
                                const maxPercent = Math.max(...filteredVillages.map(item => Number(item.persentase) || 0), 1);
                                const barWidth = Math.min(100, ((Number(village.persentase) || 0) / maxPercent) * 100);
                                return (
                                    <tr key={village.id ?? `${village.nama_desa}-${index}`}>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {village.is_grouped && <span className="badge badge-blue">Grup</span>}
                                                <Link href={href} style={{ fontWeight: 500, color: '#1e5fd4', textDecoration: 'none' }} className="hover-underline">
                                                    {village.nama_desa}
                                                </Link>
                                            </div>
                                        </td>
                                        <td className="col-hide-xs" style={{ color: '#5a7184' }}>{village.kabupaten || 'Tidak Diketahui'}</td>
                                        <td className="col-hide-xs" style={{ color: '#5a7184' }}>{village.kecamatan || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{village.jumlah_tk.toLocaleString('id-ID')}</td>
                                        <td className="col-hide-xs" style={{ textAlign: 'right' }}>
                                            <span style={{ color: '#1e5fd4', fontWeight: 600 }}>{(village.jumlah_laki ?? 0).toLocaleString('id-ID')}</span>
                                            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 3 }}>♂</span>
                                        </td>
                                        <td className="col-hide-xs" style={{ textAlign: 'right' }}>
                                            <span style={{ color: '#e11d48', fontWeight: 600 }}>{(village.jumlah_perempuan ?? 0).toLocaleString('id-ID')}</span>
                                            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 3 }}>♀</span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                                                <span style={{ color: '#1a2b4a', fontWeight: 500, minWidth: 40 }}>{Number(village.persentase).toFixed(2)}%</span>
                                                <div className="progress-track"><div className="progress-bar" style={{ width: `${barWidth}%` }} /></div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>Tidak ada data yang cocok.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredVillages.length > 0 && (
                    <div className="table-footer" style={{
                        padding: '12px 20px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                        fontSize: 12,
                        color: '#94a3b8',
                    }}>
                        <span>Menampilkan <b style={{ color: '#1a2b4a' }}>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredVillages.length)}</b> dari <b style={{ color: '#1a2b4a' }}>{filteredVillages.length}</b> desa</span>
                        <div className="table-footer-stats" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <span>Total TK: <b style={{ color: '#1a2b4a' }}>{totalTk.toLocaleString('id-ID')}</b></span>
                            <span>♂ Laki-laki: <b style={{ color: '#1e5fd4' }}>{totalLaki.toLocaleString('id-ID')}</b></span>
                            <span>♀ Perempuan: <b style={{ color: '#e11d48' }}>{totalPerempuan.toLocaleString('id-ID')}</b></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button type="button" className="btn-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Sebelumnya</button>
                            <span style={{ whiteSpace: 'nowrap' }}>Halaman {currentPage} dari {totalPages}</span>
                            <button type="button" className="btn-secondary" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Selanjutnya</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
