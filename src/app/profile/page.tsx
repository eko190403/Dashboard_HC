'use client';

import { useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Camera, Check, Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { getUser, type User, updateUser } from '@/lib/auth';

let cachedUserRaw: string | null | undefined;
let cachedUser: User | null = null;

function getUserSnapshot(): User | null {
    if (typeof window === 'undefined') return null;
    let raw: string | null;
    try {
        raw = window.localStorage.getItem('hr_pg2_user');
    } catch {
        return null;
    }
    if (raw !== cachedUserRaw) {
        cachedUserRaw = raw;
        cachedUser = getUser();
    }
    return cachedUser;
}

function subscribeToUserUpdates(onChange: () => void) {
    window.addEventListener('hr-user-updated', onChange);
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener('hr-user-updated', onChange);
        window.removeEventListener('storage', onChange);
    };
}

export default function ProfilePage() {
    const user = useSyncExternalStore(subscribeToUserUpdates, getUserSnapshot, () => null);

    if (!user) return null;
    return <ProfileEditor key={user.username} user={user} />;
}

function ProfileEditor({ user }: { user: User }) {
    const [name, setName] = useState(user.name);
    const [photo, setPhoto] = useState(user.avatar || '');
    const [saved, setSaved] = useState(false);

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => setPhoto(String(reader.result));
        reader.readAsDataURL(file);
        setSaved(false);
    };

    const handleSave = () => {
        const updated = updateUser({ name, avatar: photo || undefined });
        if (updated) {
            setName(updated.name);
            setSaved(true);
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-page-header">
                <Link href="/" className="back-link"><ArrowLeft size={15} /> Kembali ke Dashboard</Link>
                <h1>Profil Saya</h1>
                <p>Informasi akun yang sedang digunakan untuk mengakses dashboard.</p>
            </div>

            <div className="profile-layout">
                <section className="profile-hero card">
                    <div className="profile-avatar-large">
                        {photo ? <img src={photo} alt="Foto profil" /> : user.initials}
                        <label className="profile-avatar-edit" title="Ganti foto profil">
                            <Camera size={14} />
                            <input type="file" accept="image/*" onChange={handlePhotoChange} />
                        </label>
                    </div>
                    <h2>{user.name}</h2>
                    <p>{user.role}</p>
                    <span className="profile-status"><span /> Akun aktif</span>
                </section>

                <section className="profile-details card">
                    <div className="section-heading">
                        <div className="section-icon"><UserCircle2 size={17} /></div>
                        <div><h2>Detail Akun</h2><p>Data identitas pengguna</p></div>
                    </div>
                    <div className="profile-edit-field">
                        <label htmlFor="profile-name">Nama lengkap</label>
                        <input id="profile-name" value={name} onChange={event => { setName(event.target.value); setSaved(false); }} maxLength={60} />
                    </div>
                    <div className="profile-field"><span>Username</span><strong>{user.username}</strong></div>
                    <div className="profile-field"><span>Peran</span><strong>{user.role}</strong></div>
                    <div className="profile-field"><span>Akses</span><strong><ShieldCheck size={15} /> Dashboard & data TK</strong></div>
                    <div className="profile-field"><span>Kontak</span><strong><Mail size={15} /> Internal HR PG 2</strong></div>
                    <div className="profile-actions">
                        <button className="btn-primary" onClick={handleSave}>{saved ? <Check size={14} /> : <UserCircle2 size={14} />} {saved ? 'Tersimpan' : 'Simpan Perubahan'}</button>
                    </div>
                </section>
            </div>
        </div>
    );
}
