'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

export default function ClientEmployeeTable({ employees, latestUpload }: { employees: any[], latestUpload: any }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const rowsPerPage = 50;

    const filteredEmployees = useMemo(() => {
        if (!searchQuery.trim()) return employees;
        return employees.filter(emp => 
            emp.employee_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [employees, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / rowsPerPage));
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const currentData = filteredEmployees.slice(startIndex, startIndex + rowsPerPage);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handlePrev = () => setCurrentPage(p => Math.max(1, p - 1));
    const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #dde3ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a2b4a' }}>Daftar Karyawan</h3>
                    <span style={{ fontSize: 13, color: '#5a7184' }}>Total: {filteredEmployees.length.toLocaleString('id-ID')} TK</span>
                </div>
                
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Cari nama..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="search-input"
                        style={{ width: 220, paddingLeft: 32, paddingRight: 12, paddingTop: 6, paddingBottom: 6, borderRadius: 6, border: '1px solid #dde3ed', fontSize: 13 }}
                    />
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 48 }}>No</th>
                            <th>Nama Karyawan</th>
                            <th>Tgl Lahir</th>
                            <th>Umur</th>
                            <th>Gender</th>
                            <th>Status</th>
                            <th>Alamat Lengkap</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.length > 0 ? (
                            currentData.map((emp, i) => (
                                <tr key={emp.id}>
                                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{startIndex + i + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{emp.employee_name}</td>
                                    <td>{emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                                    <td>{emp.age ? `${emp.age} thn` : '—'}</td>
                                    <td>
                                        {emp.gender.toLowerCase() === 'male' || emp.gender.toLowerCase() === 'laki-laki' ? (
                                            <span style={{ color: '#1e5fd4', fontWeight: 500 }}>Laki-laki ♂</span>
                                        ) : emp.gender.toLowerCase() === 'female' || emp.gender.toLowerCase() === 'perempuan' ? (
                                            <span style={{ color: '#e11d48', fontWeight: 500 }}>Perempuan ♀</span>
                                        ) : (
                                            <span style={{ color: '#5a7184' }}>{emp.gender}</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className="badge badge-blue">{emp.employment_status || 'Active'}</span>
                                    </td>
                                    <td style={{ color: '#5a7184', fontSize: 12 }}>{emp.street_address || '—'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                    {latestUpload ? 'Tidak ada data karyawan ditemukan untuk desa ini.' : 'Belum ada data yang diupload.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ 
                    padding: '12px 20px', 
                    borderTop: '1px solid #f1f5f9', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                }}>
                    <span style={{ fontSize: 13, color: '#5a7184' }}>
                        Menampilkan {filteredEmployees.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredEmployees.length)} dari {filteredEmployees.length}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                            onClick={handlePrev} 
                            disabled={currentPage === 1}
                            style={{ 
                                padding: '6px 12px', borderRadius: 6, border: '1px solid #dde3ed',
                                background: currentPage === 1 ? '#f8fafc' : '#fff',
                                color: currentPage === 1 ? '#94a3b8' : '#1a2b4a',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                fontSize: 13, fontWeight: 500
                            }}
                        >
                            Sebelumnya
                        </button>
                        <span style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#1a2b4a' }}>
                            {currentPage} / {totalPages}
                        </span>
                        <button 
                            onClick={handleNext} 
                            disabled={currentPage === totalPages}
                            style={{ 
                                padding: '6px 12px', borderRadius: 6, border: '1px solid #dde3ed',
                                background: currentPage === totalPages ? '#f8fafc' : '#fff',
                                color: currentPage === totalPages ? '#94a3b8' : '#1a2b4a',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                fontSize: 13, fontWeight: 500
                            }}
                        >
                            Selanjutnya
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
