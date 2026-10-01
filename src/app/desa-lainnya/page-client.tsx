'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Users } from 'lucide-react';

interface GroupedEmployee {
    kit_tk: string | null;
    employee_name: string | null;
    nama_desa: string | null;
    kecamatan: string | null;
    gender: string | null;
    bagian: string | null;
    nama_mandor: string | null;
}

export default function GroupedVillagePageClient({
    uploadId,
    totalCount: initialTotalCount,
}: {
    uploadId: string | null;
    totalCount: number;
}) {
    const [employees, setEmployees] = useState<GroupedEmployee[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(Boolean(uploadId));
    const [error, setError] = useState('');

    useEffect(() => {
        if (!uploadId) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams({
                    upload_id: uploadId,
                    page: String(page),
                    search,
                });
                const response = await fetch(`/api/grouped-village-employees?${params}`, {
                    signal: controller.signal,
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Gagal memuat daftar karyawan.');

                setEmployees(result.data || []);
                setTotalPages(result.totalPages || 1);
                setTotalCount(result.totalCount || 0);
            } catch (fetchError) {
                if ((fetchError as Error).name !== 'AbortError') {
                    setError((fetchError as Error).message || 'Gagal memuat daftar karyawan.');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, search ? 250 : 0);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [uploadId, page, search]);

    const dashboardHref = uploadId ? `/?upload_id=${encodeURIComponent(uploadId)}` : '/';

    return (
        <main style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <Link href={dashboardHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#5a7184', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                    <ArrowLeft size={16} /> Kembali ke Dashboard
                </Link>
            </div>

            <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 42, height: 42, borderRadius: 8, background: '#e9f0fc', color: '#1e5fd4', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Users size={21} />
                </div>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a2b4a' }}>Desa Lainnya (&lt;20 TK)</h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#5a7184' }}>
                        {totalCount.toLocaleString('id-ID')} karyawan dari desa-desa dengan jumlah di bawah 20 TK
                    </p>
                </div>
            </header>

            <section className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #dde3ed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2b4a' }}>Daftar Karyawan</h2>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>Total {totalCount.toLocaleString('id-ID')} orang</p>
                    </div>
                    <div style={{ position: 'relative', minWidth: 220, flex: '0 1 340px' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="search"
                            value={search}
                            onChange={event => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Cari nama karyawan atau desa..."
                            className="search-input"
                            style={{ paddingLeft: 32 }}
                        />
                    </div>
                </div>

                {error && <p role="alert" style={{ padding: '0 20px', color: '#b91c1c', fontSize: 13 }}>{error}</p>}

                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 48 }}>No</th>
                                <th>Nama Karyawan</th>
                                <th>Desa Asal</th>
                                <th>Kecamatan</th>
                                <th>Gender</th>
                                <th>Bagian</th>
                                <th>Mandor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>Memuat data...</td></tr>
                            ) : employees.length > 0 ? (
                                employees.map((employee, index) => (
                                    <tr key={`${employee.kit_tk || employee.employee_name}-${index}`}>
                                        <td style={{ color: '#94a3b8', fontSize: 12 }}>{(page - 1) * 50 + index + 1}</td>
                                        <td style={{ fontWeight: 500 }}>{employee.employee_name || '—'}</td>
                                        <td>{employee.nama_desa || '—'}</td>
                                        <td>{employee.kecamatan || '—'}</td>
                                        <td>{employee.gender || '—'}</td>
                                        <td>{employee.bagian || '—'}</td>
                                        <td>{employee.nama_mandor || '—'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>{error || 'Tidak ada data karyawan yang cocok.'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <footer style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#64748b' }}>
                    <span>{totalCount.toLocaleString('id-ID')} orang · Halaman {page} dari {totalPages}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage(current => Math.max(1, current - 1))}>Sebelumnya</button>
                        <button type="button" className="btn-secondary" disabled={page >= totalPages || loading} onClick={() => setPage(current => Math.min(totalPages, current + 1))}>Selanjutnya</button>
                    </div>
                </footer>
            </section>
        </main>
    );
}