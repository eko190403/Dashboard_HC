'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, Download, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const RANGE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    '18-35': { label: '18 – 35 Tahun', color: '#1e5fd4', bg: '#e9f0fc' },
    '36-45': { label: '36 – 45 Tahun', color: '#0ea573', bg: '#d1fae5' },
    '46-55': { label: '46 – 55 Tahun', color: '#d97706', bg: '#fef3c7' },
    '55+':   { label: '> 55 Tahun',    color: '#e11d48', bg: '#ffe4e6' },
};

export default function AgeDetailClient() {
    const searchParams = useSearchParams();
    const range = searchParams.get('range') || '18-35';
    const meta = RANGE_LABELS[range] || { label: range, color: '#1e5fd4', bg: '#e9f0fc' };

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterKomoditi, setFilterKomoditi] = useState('Semua');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('range', range);
            if (filterKomoditi !== 'Semua') params.append('komoditi', filterKomoditi);
            params.append('page', String(page));
            if (debouncedSearch) params.append('search', debouncedSearch);
            const res = await fetch(`/api/age-detail?${params}`);
            const json = await res.json();
            setData(json.data || []);
            setTotalPages(json.totalPages || 1);
            setTotalCount(json.totalCount || 0);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [range, page, filterKomoditi, debouncedSearch]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const pageStart = (page - 1) * 100 + 1;
    const pageEnd = Math.min(page * 100, totalCount);

    const handleExport = async () => {
        const allRows: any[] = [];
        for (let p = 1; p <= Math.min(totalPages, 10); p++) {
            const params = new URLSearchParams({ range, page: String(p) });
            if (filterKomoditi !== 'Semua') params.append('komoditi', filterKomoditi);
            if (debouncedSearch) params.append('search', debouncedSearch);
            const res = await fetch(`/api/age-detail?${params}`);
            const json = await res.json();
            allRows.push(...(json.data || []));
        }
        const headers = ['No', 'KIT TK', 'Nama TK', 'Usia', 'Gender', 'Komoditi', 'Bagian', 'Desa', 'Kecamatan'];
        const rows = allRows.map((r, i) => [
            i + 1, r.kit_tk || '', r.employee_name || '', r.age ?? '', r.gender || '',
            r.komoditi || '', r.bagian || '', r.nama_desa || '', r.kecamatan || ''
        ]);
        const csv = [headers, ...rows].map(r => r.map((c: any) => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `usia-${range}-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const genderMap: Record<string, string> = { 'male': 'L', 'female': 'P', 'Male': 'L', 'Female': 'P', '1': 'L', '2': 'P' };

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', textDecoration: 'none', marginBottom: 16 }}>
                    <ArrowLeft size={15} /> Kembali ke Dashboard
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a2b4a' }}>Detail Usia TK</h1>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ display: 'inline-block', padding: '3px 14px', borderRadius: 20, background: meta.bg, color: meta.color, fontSize: 13, fontWeight: 700 }}>
                                {meta.label}
                            </span>
                            {/* Quick switch */}
                            {Object.entries(RANGE_LABELS).filter(([k]) => k !== range).map(([k, v]) => (
                                <Link key={k} href={`/age-detail?range=${k}`}
                                    style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: '#f8fafc', color: '#64748b', fontSize: 12, fontWeight: 500, textDecoration: 'none', border: '1px solid #e2e8f0' }}>
                                    {v.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleExport} disabled={loading || totalCount === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: '1px solid #dde3ed', background: '#fff', color: '#1a2b4a', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: totalCount === 0 ? 0.5 : 1 }}>
                        <Download size={15} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dde3ed', padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 220 }}>
                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" placeholder="Cari nama TK..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '9px 14px 9px 36px', borderRadius: 8, border: '1px solid #dde3ed', fontSize: 13, color: '#1e293b', outline: 'none' }} />
                </div>
                
                {/* Komoditi Filter */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterKomoditi}
                        onChange={e => { setFilterKomoditi(e.target.value); setPage(1); }}
                        style={{
                            padding: '9px 32px 9px 14px', borderRadius: 8,
                            border: '1px solid #dde3ed', fontSize: 13, color: '#1a2b4a',
                            background: '#fff', outline: 'none', cursor: 'pointer', appearance: 'none',
                        }}
                    >
                        <option value="Semua">Semua Komoditi</option>
                        <option value="Pine">Pine</option>
                        <option value="Guava">Guava</option>
                        <option value="Palm">Palm</option>
                        <option value="Karet">Karet</option>
                    </select>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Users size={14} color="#64748b" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2b4a' }}>{loading ? '...' : totalCount.toLocaleString('id-ID')} TK</span>
                </div>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dde3ed', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left', minWidth: 800 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                {['No', 'KIT TK', 'Nama TK', 'Usia', 'Gender', 'Komoditi', 'Bagian', 'Desa / Kecamatan'].map(h => (
                                    <th key={h} style={{ padding: '13px 16px', fontWeight: 600, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        {Array.from({ length: 8 }).map((__, j) => (
                                            <td key={j} style={{ padding: '14px 16px' }}>
                                                <div style={{ height: 13, background: '#f1f5f9', borderRadius: 4, width: j === 2 ? '75%' : '50%', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 60}ms` }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '64px 24px', textAlign: 'center' }}>
                                        <Users size={36} color="#cbd5e1" style={{ margin: '0 auto 12px', display: 'block' }} />
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Data tidak ditemukan</div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>{pageStart + idx}</td>
                                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#334155', fontWeight: 500 }}>{row.kit_tk || '-'}</td>
                                        <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600 }}>{row.employee_name || '-'}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: meta.bg, color: meta.color, fontWeight: 700, fontSize: 12 }}>
                                                {row.age ?? '-'} thn
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: (genderMap[row.gender] === 'L') ? '#eff6ff' : '#fff0f3', color: (genderMap[row.gender] === 'L') ? '#1e5fd4' : '#e11d48' }}>
                                                {genderMap[row.gender] || row.gender || '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#334155' }}>{row.komoditi || '-'}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: '#f8fafc', color: '#475569', fontSize: 12, border: '1px solid #e2e8f0' }}>
                                                {row.bagian || '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 500 }}>{row.nama_desa || '-'}</div>
                                            {row.kecamatan && <div style={{ fontSize: 11, color: '#94a3b8' }}>{row.kecamatan}</div>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {loading ? '...' : totalCount === 0 ? 'Tidak ada data' : (
                            <>Menampilkan <b style={{ color: '#1a2b4a' }}>{pageStart}–{pageEnd}</b> dari <b style={{ color: '#1a2b4a' }}>{totalCount.toLocaleString('id-ID')}</b> data</>
                        )}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 8, border: '1px solid #dde3ed', background: '#fff', fontSize: 13, fontWeight: 600, color: '#1a2b4a', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                            <ChevronLeft size={15} /> Sebelumnya
                        </button>
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{page} / {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 8, border: '1px solid #dde3ed', background: page === totalPages ? '#f8fafc' : '#1e5fd4', fontSize: 13, fontWeight: 600, color: page === totalPages ? '#94a3b8' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
                            Selanjutnya <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>
        </div>
    );
}
