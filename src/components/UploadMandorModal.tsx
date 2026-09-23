'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';

interface UploadMandorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function UploadMandorModal({ isOpen, onClose, onSuccess }: UploadMandorModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setMessage(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload-mandor', { method: 'POST', body: formData });
            const data = await res.json();
            if (res.ok) {
                setIsDone(true);
                setMessage({ type: 'success', text: `Berhasil! Total ${data.totalRows} data mandor disimpan.` });
                if (onSuccess) onSuccess();
                setTimeout(() => { handleClose(); }, 2200);
            } else {
                setMessage({ type: 'error', text: data.error || 'Terjadi kesalahan saat mengunggah.' });
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
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a2b4a' }}>Upload Master Mandor</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>File Excel Master Mandor (.xlsx/.xls)</p>
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
