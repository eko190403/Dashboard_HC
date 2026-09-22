'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Loader2 } from 'lucide-react';

const colors = [
  '#1e5fd4', '#0ea573', '#f59e0b', '#e11d48', '#7c3aed', '#64748b', '#0891b2'
];

export default function TKChart() {
  const [dataTK, setDataTK] = useState<any[]>([]);
  const [topDesa, setTopDesa] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/chart-tk?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Gagal mengambil data chart');
        const json = await res.json();
        if (json.data) {
          setDataTK(json.data);
          setTopDesa(json.topDesa || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ width: '100%', height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="#1e5fd4" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (dataTK.length === 0) {
    return (
      <div style={{ width: '100%', height: 450, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Belum ada data distribusi tenaga kerja per bagian. Silakan upload file Excel terlebih dahulu.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 450, padding: '10px 0' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dataTK} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="bagian" 
            angle={-25} 
            textAnchor="end" 
            interval={0} 
            tick={{ fontSize: 11, fill: '#5a7184' }}
            tickMargin={10}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#5a7184' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ borderRadius: 8, border: '1px solid #dde3ed', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
          />
          <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px', fontSize: 12 }} />
          
          {topDesa.map((desa, index) => (
             <Bar key={desa} dataKey={desa} stackId="a" fill={colors[index % colors.length]} radius={0} />
          ))}
          <Bar dataKey="Lainnya" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
