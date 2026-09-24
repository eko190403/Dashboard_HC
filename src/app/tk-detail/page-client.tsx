'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, Download, Users, Filter, ChevronDown, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';

const KOMODITI_COLORS: Record<string, string> = {
    Guava: '#10b981',
    Pine: '#f59e0b',
    Palm: '#22c55e',
    Karet: '#ef4444',
    Banana: '#eab308',
    QCPP: '#3b82f6',
    Planting: '#8b5cf6',
    Agritech: '#ec4899',
    'Riset & R&D': '#06b6d4',
    'Field & Support': '#64748b',
    Lainnya: '#94a3b8',
    'Semua': '#1e5fd4',
};

export default function DetailTKPage() {
    const searchParams = useSearchParams();

    const initialKomoditi = searchParams.get('komoditi') || 'Semua';
    const initialBagian = searchParams.get('bagian') || '';

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterBagian, setFilterBagian] = useState(initialBagian);
    const [filterKomoditi, setFilterKomoditi] = useState(initialKomoditi);
    const [filterGender, setFilterGender] = useState('Semua');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [bagianList, setBagianList] = useState<string[]>([]);
    const [komoditiList, setKomoditiList] = useState<string[]>([]);

    const komoditiColor = KOMODITI_COLORS[filterKomoditi] || '#1e5fd4';

    useEffect(() => {
        const fetchKomoditi = async () => {
            try {
                const res = await fetch('/api/chart-tk', { cache: 'no-store' });
                const json = await res.json();
                const available = (json.komoditiSummary || [])
                    .filter((item: { name: string; value: number }) => item.value > 0)
                    .map((item: { name: string }) => item.name);
                setKomoditiList(available);
                if (filterKomoditi !== 'Semua' && !available.includes(filterKomoditi)) {
                    setFilterKomoditi('Semua');
                }
            } catch (err) {
                console.error('Gagal mengambil daftar komoditi', err);
            }
        };
        fetchKomoditi();
    }, [filterKomoditi]);

    // Fetch available bagian when komoditi changes
    useEffect(() => {
        const fetchBagian = async () => {
            const params = new URLSearchParams();
            if (filterKomoditi !== 'Semua') params.append('komoditi', filterKomoditi);
            const res = await fetch(`/api/bagian-list?${params.toString()}`);
            const json = await res.json();
            setBagianList(json.bagianList || []);
        };
        fetchBagian();
    }, [filterKomoditi]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterKomoditi !== 'Semua') params.append('komoditi', filterKomoditi);
            if (filterBagian) params.append('bagian', filterBagian);
            if (filterGender !== 'Semua') params.append('gender', filterGender);
            if (debouncedSearch) params.append('search', debouncedSearch);
            params.append('page', String(page));

            const res = await fetch(`/api/tk-details?${params.toString()}`);
            const json = await res.json();
            setData(json.data || []);
            setTotalPages(json.totalPages || 1);
            setTotalCount(json.totalCount || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filterKomoditi, filterBagian, filterGender, debouncedSearch, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset page when filters change
    const handleKomoditiChange = (val: string) => {
        setFilterKomoditi(val);
        setFilterBagian('');
        setPage(1);
    };
    const handleBagianChange = (val: string) => {
        setFilterBagian(val);
        setPage(1);
    };

    const handleExportCSV = async () => {
        // Export current filtered data page by page (max 1000 rows for CSV)
        const params = new URLSearchParams();
        if (filterKomoditi !== 'Semua') params.append('komoditi', filterKomoditi);
        if (filterBagian) params.append('bagian', filterBagian);
        if (filterGender !== 'Semua') params.append('gender', filterGender);
        if (debouncedSearch) params.append('search', debouncedSearch);
        params.append('page', '1');

        // Fetch all pages up to 10 (1000 rows)
        const allRows: any[] = [];
        for (let p = 1; p <= Math.min(totalPages, 10); p++) {
            params.set('page', String(p));
            const res = await fetch(`/api/tk-details?${params.toString()}`);
            const json = await res.json();
            allRows.push(...(json.data || []));
        }

        const headers = ['KIT TK', 'Nama TK', 'Gender', 'KIT Mandor', 'Nama Mandor', 'Kasi', 'Indeks TK', 'Bagian'];
        const rows = allRows.map(r => [
            r.kit_tk || '', r.employee_name || '', r.gender || '', r.kit_mandor || '',
            r.nama_mandor || '', r.kasi || '', r.indeks_tk || '', r.bagian || ''
        ]);
        const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `detail-tk-${filterKomoditi}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const pageStart = (page - 1) * 100 + 1;
    const pageEnd = Math.min(page * 100, totalCount);

    return (
        <div className="tk-detail-page" style={{ padding: '22px 32px', maxWidth: 1280, margin: '0 auto' }}>

            {/* Header */}
            <div className="tk-detail-header" style={{ marginBottom: 16 }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', textDecoration: 'none', marginBottom: 12 }}>
                    <ArrowLeft size={15} /> Kembali ke Dashboard
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a2b4a' }}>Detail Tenaga Kerja</h1>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                            Komoditi:{' '}
                            <strong style={{ color: komoditiColor }}>{filterKomoditi}</strong>
                            {filterBagian && (
                                <> &middot; Bagian: <strong style={{ color: '#0f172a' }}>{filterBagian}</strong></>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={handleExportCSV}
                        disabled={loading || totalCount === 0}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '9px 18px', borderRadius: 8,
                            border: '1px solid #dde3ed', background: '#fff',
                            color: '#1a2b4a', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', opacity: (loading || totalCount === 0) ? 0.5 : 1,
                        }}
                    >
                        <Download size={15} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="tk-detail-filters" style={{
                background: '#fff', borderRadius: 12, border: '1px solid #dde3ed',
                padding: '11px 16px', marginBottom: 16,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 220 }}>
                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Cari nama TK..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '9px 14px 9px 36px',
                            borderRadius: 8, border: '1px solid #dde3ed',
                            fontSize: 13, color: '#1e293b', outline: 'none',
                        }}
                    />
                </div>

                {/* Komoditi Filter */}
                <div style={{ position: 'relative' }}>
                    <Filter size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <select
                        value={filterKomoditi}
                        onChange={e => handleKomoditiChange(e.target.value)}
                        style={{
                            padding: '9px 32px 9px 30px', borderRadius: 8,
                            border: '1px solid #dde3ed', fontSize: 13, color: '#1a2b4a',
                            background: '#fff', outline: 'none', cursor: 'pointer', appearance: 'none',
                        }}
                    >
                        <option value="Semua">Semua Komoditi</option>
                        {komoditiList.map(k => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                    <ChevronDown size={13} color="#94a3b8" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                {/* Gender Filter */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterGender}
                        onChange={e => {
                            setFilterGender(e.target.value);
                            setPage(1);
                        }}
                        style={{
                            padding: '9px 32px 9px 12px', borderRadius: 8,
                            border: '1px solid #dde3ed', fontSize: 13, color: '#1a2b4a',
                            background: '#fff', outline: 'none', cursor: 'pointer',
                            appearance: 'none', minWidth: 120,
                        }}
                    >
                        <option value="Semua">Semua Gender</option>
                        <option value="L">Laki-Laki (L)</option>
                        <option value="P">Perempuan (P)</option>
                    </select>
                    <ChevronDown size={13} color="#94a3b8" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                {/* Bagian Filter - Dynamic dropdown */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterBagian}
                        onChange={e => handleBagianChange(e.target.value)}
                        style={{
                            padding: '9px 32px 9px 12px', borderRadius: 8,
                            border: '1px solid #dde3ed', fontSize: 13, color: '#1a2b4a',
                            background: '#fff', outline: 'none', cursor: 'pointer',
                            appearance: 'none', minWidth: 180,
                        }}
                    >
                        <option value="">Semua Bagian</option>
                        {bagianList.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                    <ChevronDown size={13} color="#94a3b8" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                {(searchQuery || filterKomoditi !== 'Semua' || filterGender !== 'Semua' || filterBagian) && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setFilterKomoditi('Semua');
                            setFilterGender('Semua');
                            setFilterBagian('');
                            setPage(1);
                        }}
                        aria-label="Reset semua filter"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 8, border: '1px solid #dde3ed', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        <RotateCcw size={14} /> Reset
                    </button>
                )}

                {/* Total count badge */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Users size={14} color="#64748b" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2b4a' }}>
                        {loading ? '...' : totalCount.toLocaleString('id-ID')} TK
                    </span>
                </div>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dde3ed', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', minWidth: 800 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['No', 'KIT TK', 'Nama TK', 'Gender', 'KIT Mandor', 'Nama Mandor', 'Kasi', 'Indeks TK', 'Bagian'].map(h => (
                                    <th key={h} style={{ padding: '13px 16px', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        {Array.from({ length: 8 }).map((__, j) => (
                                            <td key={j} style={{ padding: '14px 16px' }}>
                                                <div style={{ height: 13, background: '#f1f5f9', borderRadius: 4, width: j === 2 ? '80%' : '55%', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 60}ms` }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '64px 24px', textAlign: 'center' }}>
                                        <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 12px', display: 'block' }} />
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>Data tidak ditemukan</div>
                                        <div style={{ fontSize: 12, color: '#cbd5e1' }}>Coba ubah filter atau kata kunci pencarian</div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{pageStart + idx}</td>
                                        <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500, fontFamily: 'monospace', fontSize: 12 }}>{row.kit_tk || '-'}</td>
                                        <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600 }}>{row.employee_name || '-'}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            {row.gender ? (
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, display: 'inline-block',
                                                    background: row.gender === 'L' ? '#e0f2fe' : (row.gender === 'P' ? '#fce7f3' : '#f1f5f9'),
                                                    color: row.gender === 'L' ? '#0369a1' : (row.gender === 'P' ? '#be185d' : '#64748b')
                                                }}>
                                                    {row.gender === 'L' ? 'L' : (row.gender === 'P' ? 'P' : row.gender)}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#334155', fontFamily: 'monospace', fontSize: 12 }}>{row.kit_mandor || '-'}</td>
                                        <td style={{ padding: '12px 16px', color: '#334155' }}>{row.nama_mandor && row.nama_mandor !== '-' ? row.nama_mandor : <span style={{ color: '#cbd5e1' }}>-</span>}</td>
                                        <td style={{ padding: '12px 16px', color: '#334155' }}>{row.kasi && row.kasi !== '-' ? row.kasi : <span style={{ color: '#cbd5e1' }}>-</span>}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: '#e9f0fc', color: '#1e5fd4', fontWeight: 600, fontSize: 12, fontFamily: 'monospace' }}>
                                                {row.indeks_tk || '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: '#f8fafc', color: '#475569', fontSize: 12, border: '1px solid #e2e8f0' }}>
                                                {row.bagian || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div style={{
                    padding: '12px 20px', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 10,
                }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {loading ? '...' : (
                            totalCount === 0
                                ? 'Tidak ada data'
                                : <>Menampilkan <b style={{ color: '#1a2b4a' }}>{pageStart}–{pageEnd}</b> dari <b style={{ color: '#1a2b4a' }}>{totalCount.toLocaleString('id-ID')}</b> data</>
                        )}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '7px 14px', borderRadius: 8,
                                border: '1px solid #dde3ed', background: '#fff',
                                fontSize: 13, fontWeight: 600, color: '#1a2b4a',
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                                opacity: page === 1 ? 0.4 : 1,
                            }}
                        >
                            <ChevronLeft size={15} /> Sebelumnya
                        </button>

                        <span style={{ fontSize: 13, color: '#475569', padding: '0 4px', fontWeight: 600 }}>
                            {page} / {totalPages}
                        </span>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '7px 14px', borderRadius: 8,
                                border: '1px solid #dde3ed', background: page === totalPages ? '#f8fafc' : '#1e5fd4',
                                fontSize: 13, fontWeight: 600,
                                color: page === totalPages ? '#94a3b8' : '#fff',
                                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                opacity: page === totalPages ? 0.4 : 1,
                            }}
                        >
                            Selanjutnya <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
