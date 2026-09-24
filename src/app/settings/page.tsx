'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Check, Monitor, RotateCcw, Settings2 } from 'lucide-react';
import Link from 'next/link';

const SETTINGS_KEY = 'hr_pg2_settings';

type AppSettings = {
    compactMode: boolean;
    showNotifications: boolean;
};

const defaultSettings: AppSettings = {
    compactMode: false,
    showNotifications: true,
};

export default function SettingsPage() {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const stored = { ...defaultSettings, ...JSON.parse(raw) };
                setSettings(stored);
                document.documentElement.dataset.compact = stored.compactMode ? 'true' : 'false';
            }
        } catch {
            setSettings(defaultSettings);
        }
    }, []);

    const updateSetting = (key: keyof AppSettings) => {
        setSettings(current => ({ ...current, [key]: !current[key] }));
        setSaved(false);
    };

    const saveSettings = () => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        document.documentElement.dataset.compact = settings.compactMode ? 'true' : 'false';
        setSaved(true);
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
        localStorage.removeItem(SETTINGS_KEY);
        document.documentElement.dataset.compact = 'false';
        setSaved(false);
    };

    return (
        <div className="settings-page">
            <div className="settings-page-header">
                <Link href="/" className="back-link"><ArrowLeft size={15} /> Kembali ke Dashboard</Link>
                <h1>Pengaturan</h1>
                <p>Atur preferensi tampilan dan notifikasi dashboard.</p>
            </div>

            <div className="settings-list card">
                <div className="section-heading">
                    <div className="section-icon"><Settings2 size={17} /></div>
                    <div><h2>Preferensi Aplikasi</h2><p>Pengaturan ini tersimpan di browser perangkat Anda.</p></div>
                </div>
                <SettingRow icon={<Monitor size={18} />} title="Mode ringkas" description="Gunakan jarak dan tabel yang lebih padat untuk melihat lebih banyak data." enabled={settings.compactMode} onToggle={() => updateSetting('compactMode')} />
                <SettingRow icon={<Bell size={18} />} title="Notifikasi dashboard" description="Izinkan informasi pembaruan ditampilkan di dalam dashboard." enabled={settings.showNotifications} onToggle={() => updateSetting('showNotifications')} />
                <div className="settings-actions">
                    <button className="btn-secondary" onClick={resetSettings}><RotateCcw size={14} /> Kembalikan Default</button>
                    <button className="btn-primary" onClick={saveSettings}>{saved ? <Check size={14} /> : <Settings2 size={14} />} {saved ? 'Tersimpan' : 'Simpan Pengaturan'}</button>
                </div>
            </div>
        </div>
    );
}

function SettingRow({ icon, title, description, enabled, onToggle }: { icon: React.ReactNode; title: string; description: string; enabled: boolean; onToggle: () => void }) {
    return (
        <div className="setting-row">
            <div className="setting-icon">{icon}</div>
            <div className="setting-copy"><strong>{title}</strong><span>{description}</span></div>
            <button className={`setting-toggle ${enabled ? 'is-on' : ''}`} onClick={onToggle} aria-pressed={enabled} aria-label={`${title}: ${enabled ? 'aktif' : 'nonaktif'}`}><span /></button>
        </div>
    );
}
