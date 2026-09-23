'use client';

import { useState, useEffect } from 'react';
import { Search, Users, Trophy } from 'lucide-react';

export default function MandorSummary() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (debouncedSearch) params.append('search', debouncedSearch);
                const res = await fetch(`/api/mandor-summary?${params.toString()}`);
                const json = await res.json();
                setData(json.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [debouncedSearch]);

    return (
        <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 450 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2b4a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Trophy size={16} color="#f59e0b" /> Top Mandor
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        Mandor dengan jumlah TK terbanyak
                    </p>
                </div>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                    type="text"
                    placeholder="Cari mandor atau kasi..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%', padding: '8px 14px 8px 34px',
                        borderRadius: 8, border: '1px solid #dde3ed',
                        fontSize: 12, color: '#1e293b', outline: 'none',
                    }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Memuat data mandor...</span>
                    </div>
                ) : data.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Tidak ada mandor ditemukan.</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.slice(0, 50).map((m, i) => (
                            <div key={i} style={{
                                padding: '10px 14px', borderRadius: 8, border: '1px solid #f1f5f9',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'background 0.15s', cursor: 'default'
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: i === 0 ? '#fef3c7' : (i === 1 ? '#f1f5f9' : (i === 2 ? '#ffedd5' : '#f8fafc')),
                                        color: i === 0 ? '#d97706' : (i === 1 ? '#64748b' : (i === 2 ? '#c2410c' : '#94a3b8')),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700
                                    }}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2b4a' }}>{m.nama_mandor}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span>KIT: {m.kit_mandor}</span>
                                            <span style={{ color: '#dde3ed' }}>|</span>
                                            <span>Kasi: {m.kasi}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#e9f0fc', padding: '4px 8px', borderRadius: 20 }}>
                                    <Users size={12} color="#1e5fd4" />
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e5fd4' }}>{m.total_tk}</span>
                                </div>
                            </div>
                        ))}
                        {data.length > 50 && (
                            <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: '#94a3b8' }}>
                                Menampilkan 50 mandor teratas. Cari untuk melihat yang lain.
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <style>{`
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}
