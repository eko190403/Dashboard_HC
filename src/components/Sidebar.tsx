'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, History, Building2, Users, ChevronRight,
    Wheat, CalendarRange, ChevronDown
} from 'lucide-react';
import { getUser, type User } from '@/lib/auth';

const AGE_RANGES = [
    { name: '18 – 35 Tahun', href: '/age-detail?range=18-35', color: '#1e5fd4' },
    { name: '36 – 45 Tahun', href: '/age-detail?range=36-45', color: '#0ea573' },
    { name: '46 – 55 Tahun', href: '/age-detail?range=46-55', color: '#d97706' },
    { name: '> 55 Tahun',    href: '/age-detail?range=55%2B', color: '#e11d48' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [ageOpen, setAgeOpen] = useState(false);

    useEffect(() => {
        setUser(getUser());
    }, [pathname]);

    // Auto-expand age group if on age-detail page
    useEffect(() => {
        if (pathname.startsWith('/age-detail')) setAgeOpen(true);
    }, [pathname]);

    if (pathname === '/login') return null;

    const isAgeActive = pathname.startsWith('/age-detail');
    const isTKActive = pathname.startsWith('/tk-detail');

    const mainLinks = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Riwayat Upload', href: '/history', icon: History },
    ];

    const navItemStyle = (active: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 10px',
        borderRadius: 8,
        marginBottom: 2,
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        color: active ? '#1e5fd4' : '#5a7184',
        background: active ? '#e9f0fc' : 'transparent',
        textDecoration: 'none',
        transition: 'background 0.15s, color 0.15s',
        cursor: 'pointer',
    });

    const handleHover = (e: React.MouseEvent<HTMLElement>, active: boolean, enter: boolean) => {
        if (!active) {
            (e.currentTarget as HTMLElement).style.background = enter ? '#f7f9fc' : 'transparent';
            (e.currentTarget as HTMLElement).style.color = enter ? '#1a2b4a' : '#5a7184';
        }
    };

    return (
        <>
            {/* ===== SIDEBAR (Desktop) ===== */}
            <aside className="sidebar">
                {/* Logo / Brand */}
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #dde3ed' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                        <div style={{ width: 36, height: 36, background: '#1e5fd4', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building2 size={18} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2b4a', lineHeight: 1.2 }}>HR Dashboard</div>
                            <div style={{ fontWeight: 400, fontSize: 11, color: '#5a7184', lineHeight: 1.2 }}>PG 2 Estate</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>

                    {/* === MAIN === */}
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 8 }}>
                        Menu Utama
                    </div>
                    {mainLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link key={link.href} href={link.href}
                                style={navItemStyle(isActive)}
                                onMouseEnter={e => handleHover(e, isActive, true)}
                                onMouseLeave={e => handleHover(e, isActive, false)}
                            >
                                <Icon size={16} style={{ flexShrink: 0 }} />
                                <span style={{ flex: 1 }}>{link.name}</span>
                                {isActive && <ChevronRight size={13} />}
                            </Link>
                        );
                    })}

                    {/* === DATA TK === */}
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 8px 8px' }}>
                        Detail Data
                    </div>

                    {/* Detail TK per Komoditi */}
                    <Link href="/tk-detail?komoditi=Semua"
                        style={navItemStyle(isTKActive)}
                        onMouseEnter={e => handleHover(e, isTKActive, true)}
                        onMouseLeave={e => handleHover(e, isTKActive, false)}
                    >
                        <Wheat size={16} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>Detail TK per Komoditi</span>
                        {isTKActive && <ChevronRight size={13} />}
                    </Link>

                    {/* Demografi Usia — collapsible */}
                    <div>
                        <div
                            style={{ ...navItemStyle(isAgeActive && !ageOpen), display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, marginBottom: 2, fontSize: 13, cursor: 'pointer', color: isAgeActive ? '#1e5fd4' : '#5a7184', background: isAgeActive && !ageOpen ? '#e9f0fc' : 'transparent', fontWeight: isAgeActive ? 600 : 400, transition: 'background 0.15s', userSelect: 'none' }}
                            onClick={() => setAgeOpen(o => !o)}
                            onMouseEnter={e => { if (!isAgeActive) { (e.currentTarget as HTMLElement).style.background = '#f7f9fc'; (e.currentTarget as HTMLElement).style.color = '#1a2b4a'; } }}
                            onMouseLeave={e => { if (!isAgeActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#5a7184'; } }}
                        >
                            <CalendarRange size={16} style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>Demografi Usia</span>
                            <ChevronDown size={13} style={{ transform: ageOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>

                        {/* Sub-items */}
                        {ageOpen && (
                            <div style={{ paddingLeft: 14, marginBottom: 4 }}>
                                {AGE_RANGES.map((r) => {
                                    const isRangeActive = pathname + (typeof window !== 'undefined' ? window.location.search : '') === r.href
                                        || (typeof window !== 'undefined' && window.location.href.includes(r.href));
                                    return (
                                        <Link key={r.href} href={r.href} style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '7px 10px', borderRadius: 7, marginBottom: 1,
                                            fontSize: 12, color: '#5a7184', textDecoration: 'none',
                                            transition: 'background 0.12s, color 0.12s',
                                        }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f7f9fc'; (e.currentTarget as HTMLElement).style.color = '#1a2b4a'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#5a7184'; }}
                                        >
                                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                                            <span>{r.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </nav>

                {/* User Footer */}
                <div style={{ padding: '14px 16px', borderTop: '1px solid #dde3ed', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1e5fd4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {user?.initials ?? <Users size={15} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#1a2b4a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name ?? 'Admin HR'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{user?.role ?? 'People Partner'}</div>
                    </div>
                </div>
            </aside>

            {/* ===== MOBILE TOP BAR ===== */}
            <div className="mobile-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, background: '#1e5fd4', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={15} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a2b4a', lineHeight: 1.2 }}>HR Dashboard</div>
                        <div style={{ fontSize: 10, color: '#5a7184', lineHeight: 1.2 }}>PG 2 Estate</div>
                    </div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1e5fd4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                    {user?.initials ?? <Users size={15} />}
                </div>
            </div>

            {/* ===== BOTTOM NAVIGATION (Mobile) ===== */}
            <nav className="bottom-nav">
                <div className="bottom-nav-inner">
                    {[
                        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
                        { name: 'Detail TK', href: '/tk-detail?komoditi=Semua', icon: Wheat },
                        { name: 'Usia', href: '/age-detail?range=18-35', icon: CalendarRange },
                        { name: 'Riwayat', href: '/history', icon: History },
                    ].map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href.split('?')[0]));
                        return (
                            <Link key={link.href} href={link.href} className={`bottom-nav-item${isActive ? ' active' : ''}`}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                                <span>{link.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
