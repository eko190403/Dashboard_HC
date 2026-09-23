'use client';

import { useState } from 'react';
import { History as HistoryIcon, Download, RotateCcw, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function HistoryClient({ initialLogs }: { initialLogs: any[] }) {
    const [logs, setLogs] = useState(initialLogs);
    const [isRollingBack, setIsRollingBack] = useState<string | null>(null);

    const handleRollback = async (id: string, filename: string) => {
        if (!confirm(`PERINGATAN: Anda akan menghapus permanen data upload "${filename}" dan semua detail tenaga kerja yang terkait. Apakah Anda yakin?`)) {
            return;
        }

        setIsRollingBack(id);
        try {
            const res = await fetch(`/api/upload-rollback?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setLogs(logs.filter(l => l.id !== id));
                alert('Rollback berhasil! Data telah dihapus.');
            } else {
                const data = await res.json();
                alert(`Gagal melakukan rollback: ${data.error}`);
            }
        } catch (e: any) {
            alert(`Gagal melakukan rollback: ${e.message}`);
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
            <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
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
                                {new Date(logs[0].uploaded_at).toLocaleString('id-ID', {
                                    day: 'numeric', month: 'long', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

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
                                    <tr key={log.id}>
                                        <td style={{ color: '#5a7184', whiteSpace: 'nowrap' }}>
                                            {new Date(log.uploaded_at).toLocaleString('id-ID', {
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
                                            <span style={{ fontWeight: 600 }}>{log.total_hc.toLocaleString('id-ID')}</span>
                                            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>TK</span>
                                        </td>
                                        <td style={{ color: '#5a7184' }}>{log.uploaded_by}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                <button 
                                                    title="Rollback" 
                                                    onClick={() => handleRollback(log.id, log.filename)}
                                                    disabled={isRollingBack === log.id}
                                                    style={{
                                                    border: '1px solid #dde3ed', background: isRollingBack === log.id ? '#f1f5f9' : '#fff0f3', borderRadius: 6,
                                                    padding: '5px 8px', cursor: isRollingBack === log.id ? 'not-allowed' : 'pointer', color: '#e11d48',
                                                    display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                                                }}>
                                                    {isRollingBack === log.id ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
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
