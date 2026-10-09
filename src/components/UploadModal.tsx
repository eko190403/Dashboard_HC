'use client';

import { useMemo, useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const monthOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        const now = new Date();

        for (let i = 11; i >= 0; i -= 1) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            options.push({ value, label });
        }

        return options;
    }, []);

    const formatUploadSummary = (data: Record<string, unknown>) => {
        const summaryParts: string[] = [];

        const totalHc = typeof data.totalHc === 'number' ? data.totalHc : Number(data.totalHc ?? 0);
        const duplicatesSkipped = typeof data.duplicatesSkipped === 'number' ? data.duplicatesSkipped : Number(data.duplicatesSkipped ?? 0);
        const invalidRows = typeof data.invalidRows === 'number' ? data.invalidRows : Number(data.invalidRows ?? 0);
        const skippedNonActive = typeof data.skippedNonActive === 'number' ? data.skippedNonActive : Number(data.skippedNonActive ?? 0);
        const validRows = typeof data.validRows === 'number' ? data.validRows : Number(data.validRows ?? 0);

        if (totalHc > 0) {
            summaryParts.push(`Total HC diproses: ${totalHc.toLocaleString('id-ID')}`);
        }
        if (duplicatesSkipped > 0) {
            summaryParts.push(`Duplikat dibuang: ${duplicatesSkipped.toLocaleString('id-ID')}`);
        }
        if (invalidRows > 0) {
            summaryParts.push(`Baris invalid: ${invalidRows.toLocaleString('id-ID')}`);
        }
        if (skippedNonActive > 0) {
            summaryParts.push(`Status non-aktif: ${skippedNonActive.toLocaleString('id-ID')}`);
        }
        if (validRows > 0) {
            summaryParts.push(`Baris valid akhir: ${validRows.toLocaleString('id-ID')}`);
        }

        return summaryParts.length > 0 ? ` ${summaryParts.join(' • ')}` : '';
    };

    if (!isOpen) return null;

    const reset = () => {
        setFile(null);
        setMessage(null);
        setIsDone(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => { reset(); onClose(); };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files.length > 0) validateAndSetFile(e.dataTransfer.files[0]);
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) validateAndSetFile(e.target.files[0]);
    };
    const validateAndSetFile = (f: File) => {
        setMessage(null);
        const ext = f.name.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
            setFile(f);
        } else {
            setMessage({ type: 'error', text: 'Format file tidak didukung. Gunakan .xlsx atau .xls.' });
        }
    };

    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const isDifferentMonthSelection = selectedMonth !== currentMonthKey;

    const handleUpload = async () => {
        if (!file) return;

        if (isDifferentMonthSelection) {
            const confirmed = window.confirm(
                `Anda memilih bulan laporan ${new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}.\n\nData akan diproses untuk bulan tersebut, walaupun file diupload di bulan lain. Lanjutkan?`
            );

            if (!confirmed) {
                return;
            }
        }

        setIsUploading(true);
        setMessage(null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('report_month', selectedMonth);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (res.ok) {
                setIsDone(true);
                const summaryText = `Berhasil! Total ${data.totalHc.toLocaleString('id-ID')} HC diproses.${formatUploadSummary(data)}`;
                setMessage({ type: 'success', text: summaryText });
                if (onSuccess) onSuccess();
                setTimeout(() => { handleClose(); }, 2600);
            } else {
                const errorText = data.error || 'Terjadi kesalahan saat mengunggah.';
                const missingColumns = Array.isArray(data.missingColumns) ? data.missingColumns.join(', ') : '';
                const details = missingColumns ? ` Kolom tidak ditemukan: ${missingColumns}.` : '';
                setMessage({ type: 'error', text: `${errorText}${details}` });
            }
        } catch {
            setMessage({ type: 'error', text: 'Gagal terhubung ke server.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(3px)',
        }}>
            <div className="animate-in" style={{
                background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440,
                boxShadow: '0 20px 40px rgba(0,0,0,0.13)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 22px',
                    borderBottom: '1px solid #dde3ed',
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2b4a' }}>Upload Data Excel</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>File .xlsx atau .xls</p>
                    </div>
                    <button onClick={handleClose} style={{
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: '#94a3b8', padding: 4, borderRadius: 6, display: 'flex',
                    }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '22px' }}>
                    {!file ? (
                        <div
                            style={{
                                border: `2px dashed ${isDragging ? '#1e5fd4' : '#dde3ed'}`,
                                background: isDragging ? '#f0f5ff' : '#f7f9fc',
                                borderRadius: 10, padding: '36px 24px',
                                textAlign: 'center', cursor: 'pointer',
                                transition: 'all 0.18s',
                            }}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={28} color={isDragging ? '#1e5fd4' : '#94a3b8'} style={{ margin: '0 auto 12px' }} />
                            <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13, color: '#1a2b4a' }}>
                                Klik atau seret file ke sini
                            </p>
                            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Mendukung .xlsx, .xls</p>
                            <input type="file" className="hidden" ref={fileInputRef}
                                accept=".xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: '#f0f5ff', borderRadius: 10, padding: '14px 16px',
                            border: '1px solid #c7d9f8',
                        }}>
                            <FileSpreadsheet size={28} color="#1e5fd4" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2b4a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {file.name}
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                            {!isUploading && !isDone && (
                                <button onClick={reset} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}>
                                    <X size={15} />
                                </button>
                            )}
                            {isDone && <CheckCircle2 size={20} color="#0ea573" />}
                        </div>
                    )}

                    <div style={{ marginTop: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2b4a' }}>
                                Bulan laporan
                            </div>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 999,
                                background: isDifferentMonthSelection ? '#fff7ed' : '#e9f0fc',
                                color: isDifferentMonthSelection ? '#b45309' : '#1e5fd4',
                                border: isDifferentMonthSelection ? '1px solid #fed7aa' : '1px solid #bfdbfe',
                                padding: '3px 8px',
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase',
                            }}>
                                {isDifferentMonthSelection ? 'Laporan khusus' : 'Bulan aktif'}
                            </span>
                        </div>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{
                                width: '100%',
                                border: '1px solid #cfe3ff',
                                borderRadius: 8,
                                background: '#f8fbff',
                                color: '#1a2b4a',
                                padding: '10px 12px',
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            {monthOptions.map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.label}
                                </option>
                            ))}
                        </select>
                        <div style={{
                            marginTop: 6,
                            padding: '6px 8px',
                            borderRadius: 6,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#475569',
                            fontSize: 11,
                            lineHeight: 1.5,
                        }}>
                            <strong style={{ color: '#1a2b4a' }}>Tanggal upload aktual:</strong> {' '}
                            {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div style={{
                            marginTop: 10,
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: '#fef3c7',
                            border: '1px solid #fcd34d',
                            color: '#92400e',
                            fontSize: 11,
                            lineHeight: 1.5,
                        }}>
                            <strong>Catatan:</strong> Data untuk bulan laporan yang dipilih akan menggantikan data yang sudah ada untuk bulan yang sama di database.
                        </div>
                        <div style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: isDifferentMonthSelection ? '#b45309' : '#5a7184',
                            background: isDifferentMonthSelection ? '#fff7ed' : 'transparent',
                            border: isDifferentMonthSelection ? '1px solid #fed7aa' : 'none',
                            borderRadius: 6,
                            padding: isDifferentMonthSelection ? '6px 8px' : '0',
                        }}>
                            {isDifferentMonthSelection
                                ? `Peringatan: bulan laporan berbeda dari bulan saat ini (${new Date(`${currentMonthKey}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}).`
                                : 'Data akan diproses sebagai bulan laporan yang dipilih, walaupun file diupload di bulan lain.'}
                        </div>
                    </div>

                    {/* Message */}
                    {message && (
                        <div style={{
                            marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 12,
                            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                            color: message.type === 'success' ? '#065f46' : '#991b1b',
                        }}>
                            {message.text}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                        <button className="btn-secondary" onClick={handleClose} disabled={isUploading}>
                            Batal
                        </button>
                        <button className="btn-primary" onClick={handleUpload}
                            disabled={!file || isUploading || isDone}
                            style={{ opacity: (!file || isUploading || isDone) ? 0.6 : 1 }}
                        >
                            {isUploading
                                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...</>
                                : isDone
                                ? <><CheckCircle2 size={14} /> Selesai</>
                                : <><Upload size={14} /> Mulai Upload</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
