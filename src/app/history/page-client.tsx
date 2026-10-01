'use client';

import { useState } from 'react';
import { History as HistoryIcon, RotateCcw, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

type UploadLog = {
    id: string | number;
    uploaded_at: string | number | Date;
    filename: string;
    total_hc: number | string;
    uploaded_by?: string | null;
    audit_summary?: string | null;
};

type AuditSummary = {
    validRows?: number;
    totalRowsRead?: number;
    duplicatesSkipped?: number;
    invalidRows?: number;
    skippedNonActive?: number;
};

const parseAuditSummary = (value: string | null | undefined): AuditSummary => {
    if (!value) return {};

    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        return {
            validRows: typeof parsed.validRows === 'number' ? parsed.validRows : undefined,
            totalRowsRead: typeof parsed.totalRowsRead === 'number' ? parsed.totalRowsRead : undefined,
            duplicatesSkipped: typeof parsed.duplicatesSkipped === 'number' ? parsed.duplicatesSkipped : undefined,
            invalidRows: typeof parsed.invalidRows === 'number' ? parsed.invalidRows : undefined,
            skippedNonActive: typeof parsed.skippedNonActive === 'number' ? parsed.skippedNonActive : undefined,
        };
    } catch {
        return {};
    }
};

export default function HistoryClient({ initialLogs }: { initialLogs: UploadLog[] }) {
    const [logs, setLogs] = useState<UploadLog[]>(initialLogs);
    const [isRollingBack, setIsRollingBack] = useState<string | null>(null);

    const handleRollback = async (id: string | number, filename: string) => {
        if (!confirm(`PERINGATAN: Anda akan menghapus permanen data upload "${filename}" dan semua detail tenaga kerja yang terkait. Apakah Anda yakin?`)) {
            return;
        }

        setIsRollingBack(String(id));
        try {
            const res = await fetch(`/api/upload-rollback?id=${String(id)}`, { method: 'DELETE' });
            if (res.ok) {
                setLogs(logs.filter(l => String(l.id) !== String(id)));
                alert('Rollback berhasil! Data telah dihapus.');
            } else {
                const data = await res.json() as Record<string, unknown>;
                alert(`Gagal melakukan rollback: ${String(data.error ?? 'Terjadi kesalahan')}`);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Gagal melakukan rollback';
            alert(`Gagal melakukan rollback: ${message}`);
        } finally {
            setIsRollingBack(null);
        }
    };

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a2b4a' }}>Riwayat Upload</h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#5a7184' }}>
                        Catatan semua pembaruan data domisili tenaga kerja
                    </p>
                </div>
                <Link href="/" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    color: '#5a7184', border: '1px solid #dde3ed', background: '#fff',
                    textDecoration: 'none', transition: 'background 0.15s',
                }}>
                    <ArrowLeft size={14} /> Kembali
                </Link>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <HistoryIcon size={18} color="#1e5fd4" />
                    <div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Upload</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2b4a', lineHeight: 1.2 }}>{logs.length || 0}</div>
                    </div>
                </div>
                {logs.length > 0 && (
                    <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload Terakhir</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2b4a', lineHeight: 1.4 }}>
                                {new Date(String(logs[0].uploaded_at)).toLocaleString('id-ID', {
                                    day: 'numeric', month: 'long', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {logs.length > 0 && (() => {
                const latestAudit = parseAuditSummary(logs[0].audit_summary);
                const totalRowsRead = latestAudit.totalRowsRead ?? 0;
                const validRows = latestAudit.validRows ?? Number(logs[0].total_hc ?? 0);
                const duplicates = latestAudit.duplicatesSkipped ?? 0;
                const invalid = latestAudit.invalidRows ?? 0;
                const nonActive = latestAudit.skippedNonActive ?? 0;

                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
                        <div className="card" style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Baris dibaca</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#1a2b4a', marginTop: 8 }}>{totalRowsRead.toLocaleString('id-ID')}</div>
                        </div>
                        <div className="card" style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valid</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#0ea573', marginTop: 8 }}>{validRows.toLocaleString('id-ID')}</div>
                        </div>
                        <div className="card" style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duplikat</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>{duplicates.toLocaleString('id-ID')}</div>
                        </div>
                        <div className="card" style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invalid / Non aktif</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2b4a', marginTop: 8 }}>{invalid.toLocaleString('id-ID')} invalid • {nonActive.toLocaleString('id-ID')} non-aktif</div>
                        </div>
                    </div>
                );
            })()}

            {/* Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #dde3ed' }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a' }}>Log Aktivitas Upload</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Waktu Upload</th>
                                <th>Nama File</th>
                                <th>Total HC</th>
                                <th>Pengunggah</th>
                                <th style={{ textAlign: 'right' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length > 0 ? (
                                logs.map((log, i) => (
                                    <tr key={String(log.id)}>
                                        <td style={{ color: '#5a7184', whiteSpace: 'nowrap' }}>
                                            {new Date(String(log.uploaded_at)).toLocaleString('id-ID', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {i === 0 && <span className="badge badge-green">Terbaru</span>}
                                                <span style={{ fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                    {log.filename}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>{Number(log.total_hc).toLocaleString('id-ID')}</span>
                                            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>TK</span>
                                        </td>
                                        <td style={{ color: '#5a7184' }}>
                                            {log.uploaded_by ?? '-'}
                                            {log.audit_summary && (
                                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                                    {(() => {
                                                        const s = parseAuditSummary(log.audit_summary);
                                                        const parts: string[] = [];
                                                        if (typeof s.duplicatesSkipped === 'number' && s.duplicatesSkipped > 0) parts.push(`Duplikat: ${s.duplicatesSkipped}`);
                                                        if (typeof s.invalidRows === 'number' && s.invalidRows > 0) parts.push(`Invalid: ${s.invalidRows}`);
                                                        if (typeof s.skippedNonActive === 'number' && s.skippedNonActive > 0) parts.push(`Non aktif: ${s.skippedNonActive}`);
                                                        if (typeof s.validRows === 'number' && s.validRows > 0) parts.push(`Valid: ${s.validRows}`);
                                                        return parts.length ? parts.join(' • ') : 'Audit tersimpan';
                                                    })()}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                <button 
                                                    title="Rollback" 
                                                    onClick={() => handleRollback(log.id, log.filename)}
                                                    disabled={isRollingBack === String(log.id)}
                                                    style={{
                                                    border: '1px solid #dde3ed', background: isRollingBack === String(log.id) ? '#f1f5f9' : '#fff0f3', borderRadius: 6,
                                                    padding: '5px 8px', cursor: isRollingBack === String(log.id) ? 'not-allowed' : 'pointer', color: '#e11d48',
                                                    display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                                                }}>
                                                    {isRollingBack === String(log.id) ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                                        Belum ada riwayat upload.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
