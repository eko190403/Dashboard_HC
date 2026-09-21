'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, Building2, Users, ChevronRight } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();

    const navLinks = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Riwayat Upload', href: '/history', icon: History },
    ];

    return (
        <>
            {/* ===== SIDEBAR (Desktop) ===== */}
            <aside className="sidebar">
                {/* Logo / Brand */}
                <div style={{
                    padding: '20px 20px 16px',
                    borderBottom: '1px solid #dde3ed',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                        <div style={{
                            width: 36, height: 36,
                            background: '#1e5fd4',
                            borderRadius: 9,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Building2 size={18} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2b4a', lineHeight: 1.2 }}>HR Dashboard</div>
                            <div style={{ fontWeight: 400, fontSize: 11, color: '#5a7184', lineHeight: 1.2 }}>PG 2 Estate</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ padding: '16px 12px', flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 8 }}>
                        Menu
                    </div>
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '9px 10px',
                                    borderRadius: 8,
                                    marginBottom: 2,
                                    fontWeight: isActive ? 600 : 400,
                                    fontSize: 13,
                                    color: isActive ? '#1e5fd4' : '#5a7184',
                                    background: isActive ? '#e9f0fc' : 'transparent',
                                    textDecoration: 'none',
                                    transition: 'background 0.15s, color 0.15s',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLElement).style.background = '#f7f9fc';
                                        (e.currentTarget as HTMLElement).style.color = '#1a2b4a';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        (e.currentTarget as HTMLElement).style.color = '#5a7184';
                                    }
                                }}
                            >
                                <Icon size={16} style={{ flexShrink: 0 }} />
                                <span style={{ flex: 1 }}>{link.name}</span>
                                {isActive && <ChevronRight size={13} />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Footer */}
                <div style={{
                    padding: '14px 16px',
                    borderTop: '1px solid #dde3ed',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <div style={{
                        width: 32, height: 32,
                        borderRadius: '50%',
                        background: '#e9f0fc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#1e5fd4',
                        flexShrink: 0,
                    }}>
                        <Users size={15} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#1a2b4a' }}>Admin HR</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>People Partner</div>
                    </div>
                </div>
            </aside>

            {/* ===== MOBILE TOP BAR ===== */}
            <div className="mobile-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 30, height: 30,
                        background: '#1e5fd4',
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <Building2 size={15} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a2b4a', lineHeight: 1.2 }}>HR Dashboard</div>
                        <div style={{ fontSize: 10, color: '#5a7184', lineHeight: 1.2 }}>PG 2 Estate</div>
                    </div>
                </div>
                <div style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    background: '#e9f0fc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#1e5fd4',
                }}>
                    <Users size={15} />
                </div>
            </div>

            {/* ===== BOTTOM NAVIGATION (Mobile) ===== */}
            <nav className="bottom-nav">
                <div className="bottom-nav-inner">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`bottom-nav-item${isActive ? ' active' : ''}`}
                            >
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
