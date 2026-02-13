
import React, { useState, useMemo, useRef } from 'react';
import { Activity, ChevronDown, Search, Filter, User, Zap, Sparkles, CheckCircle2, AlertCircle, Settings as SettingsIcon, Clock, FileText, ShieldAlert, ArrowUpRight, Users, Shield, Briefcase, Building2, Star, Rocket, Crown, Upload, Lock, Eye, EyeOff, Download, Calendar, Loader2, Bell } from 'lucide-react';
import { BidRecord, ActivityLog, User as UserType, UserRole, USER_ROLE_LABELS, AvatarIcon, AuditChangeType, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../types.ts';
import { clsx } from 'clsx';
import NotificationSettings from './NotificationSettings';
// Removed UserManagement and RoleManagement imports - moved to dedicated admin panel


interface SettingsProps {
    currentUser: UserType;
    onUpdateUser: (user: UserType) => void;
}

type SettingsSection = 'user-profile' | 'notifications';



const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateUser }) => {
    const [activeSection, setActiveSection] = useState<SettingsSection>('user-profile');
    // Removed audit filters
    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);


    const [customImage, setCustomImage] = useState<string | null>(
        currentUser.avatarType === 'image' ? currentUser.avatar || null : null
    );
    const [localName, setLocalName] = useState(currentUser.name);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isAdmin = currentUser.role === 'SUPER_ADMIN';
    const getRoleDisplayName = (role: string) => USER_ROLE_LABELS[role as UserRole] || role;



    // Password change state continued...

    const handlePasswordChange = async () => {
        setPasswordError(null);
        setPasswordSuccess(false);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All password fields are required');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        // In a real app, this would call an API
        // For now, simulate success
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 3000);
    };



    const [avatarError, setAvatarError] = useState<string | null>(null);

    const processAvatar = (file: File) => {
        setAvatarError(null);
        if (file.size > 1024 * 1024) {
            setAvatarError('File size must be less than 1MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setCustomImage(base64);
            onUpdateUser({
                ...currentUser,
                name: localName,
                avatar: base64,
                avatarType: 'image'
            });
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processAvatar(file);
            e.target.value = '';
        }
    };

    const renderAvatar = (user: UserType, size: 'sm' | 'md' | 'lg' = 'lg', isClickable: boolean = false) => {
        const sizeClasses = {
            sm: 'w-7 h-7 text-[9px]',
            md: 'w-12 h-12 text-sm',
            lg: 'w-24 h-24 text-3xl rounded-3xl'
        };

        const hasCustomImage = user.avatarType === 'image' && user.avatar;
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        const avatarContent = hasCustomImage ? (
            <img
                src={user.avatar!}
                alt={user.name}
                className={clsx(sizeClasses[size], "object-cover shadow-xl", size === 'lg' ? 'rounded-3xl' : 'rounded-full')}
            />
        ) : (
            <div className={clsx(
                sizeClasses[size],
                "bg-gradient-to-br from-[#D32F2F] to-[#B71C1C] flex items-center justify-center text-white shadow-xl",
                size === 'lg' ? 'rounded-3xl rotate-3' : 'rounded-full'
            )}>
                <Rocket size={size === 'lg' ? 40 : size === 'md' ? 24 : 14} />
            </div>
        );

        if (isClickable) {
            return (
                <div
                    className={clsx(
                        "relative group cursor-pointer transition-all duration-300",
                        isDragging && "scale-110 ring-4 ring-[#D32F2F] ring-offset-4"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) processAvatar(file);
                    }}
                >
                    {avatarContent}
                    <div className={clsx(
                        "absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center transition-all text-slate-900",
                        (size === 'lg' ? 'rounded-3xl' : 'rounded-full'),
                        isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                        <Upload size={size === 'lg' ? 24 : 16} className={clsx("mb-1", isDragging && "animate-bounce")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {isDragging ? "Drop!" : "Edit"}
                        </span>
                    </div>
                </div>
            );
        }

        return avatarContent;
    };

    // Sidebar items - User Profile and Notifications
    const sidebarItems = [
        { id: 'user-profile' as const, label: 'User Profile', icon: <User size={18} />, description: 'Your account settings' },
        { id: 'notifications' as const, label: 'Notifications', icon: <Bell size={18} />, description: 'Alert preferences' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in pb-24 overflow-hidden">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-slate-100 rounded-xl">
                        <SettingsIcon size={24} className="text-slate-600" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
                </div>
                <p className="text-slate-500 font-medium">Manage your account and preferences</p>
            </div>

            {/* Main Layout: Sidebar + Content */}
            <div className="flex gap-6 lg:gap-8 w-full">
                {/* Left Sidebar - Settings Navigation (hidden on mobile) */}
                <div className="hidden lg:block w-56 xl:w-64 shrink-0">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settings Menu</p>
                        </div>
                        <nav className="p-2">
                            {sidebarItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
                                        activeSection === item.id
                                            ? "bg-[#D32F2F] text-white shadow-lg"
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <div className={clsx(
                                        "shrink-0 transition-colors",
                                        activeSection === item.id ? "text-white" : "text-slate-400"
                                    )}>
                                        {item.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={clsx(
                                            "text-sm font-bold truncate",
                                            activeSection === item.id ? "text-white" : "text-slate-800"
                                        )}>
                                            {item.label}
                                        </p>
                                        <p className={clsx(
                                            "text-[10px] truncate",
                                            activeSection === item.id ? "text-white/70" : "text-slate-400"
                                        )}>
                                            {item.description}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    {/* Main content switched to profile but keep the logic for future sections */}
                    {activeSection === 'user-profile' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                            <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                <div className="flex items-center gap-6">
                                    {renderAvatar(currentUser, 'lg', true)}
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{currentUser.name}</h2>
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">{getRoleDisplayName(currentUser.role)}</p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded uppercase tracking-widest border border-emerald-200">Active Session</span>
                                            <span className="text-slate-400 text-[10px] font-medium tracking-tight">v2.4.0-pro (Enterprise)</span>
                                        </div>
                                        {avatarError && (
                                            <p className="text-red-500 text-[10px] font-bold mt-2 flex items-center gap-1">
                                                <AlertCircle size={10} />
                                                {avatarError}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="max-w-xl space-y-8">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />

                                    {/* Name Change */}
                                    <section>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <User size={16} className="text-[#D32F2F]" />
                                            Identity
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={localName}
                                                    onChange={(e) => setLocalName(e.target.value)}
                                                    onBlur={() => {
                                                        if (localName !== currentUser.name) {
                                                            onUpdateUser({ ...currentUser, name: localName });
                                                            setProfileSuccess(true);
                                                            setTimeout(() => setProfileSuccess(false), 3000);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all outline-none shadow-sm"
                                                />
                                            </div>
                                            {profileSuccess && (
                                                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-xs font-bold animate-fade-in mt-2">
                                                    <CheckCircle2 size={14} />
                                                    Identity updated
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* Password Change */}
                                    <section>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Lock size={16} className="text-[#D32F2F]" />
                                            Change Password
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Current Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        value={currentPassword}
                                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                                        className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all outline-none shadow-sm"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    >
                                                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                                                <div className="relative">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all outline-none shadow-sm"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    >
                                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all outline-none shadow-sm"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            {passwordError && (
                                                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold">
                                                    <AlertCircle size={14} />
                                                    {passwordError}
                                                </div>
                                            )}
                                            {passwordSuccess && (
                                                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-xs font-bold">
                                                    <CheckCircle2 size={14} />
                                                    Password updated successfully
                                                </div>
                                            )}
                                            <button
                                                onClick={handlePasswordChange}
                                                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                                            >
                                                Update Password
                                            </button>
                                        </div>
                                    </section>

                                    {/* Access Level - Read Only for non-admin users */}
                                    <section>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <ShieldAlert size={16} className="text-[#D32F2F]" />
                                            Your Access Level
                                        </h3>
                                        <div>
                                            {isAdmin ? (
                                                <>
                                                    <p className="text-xs text-slate-500 mb-4 bg-amber-50 border border-amber-100 p-3 rounded-xl leading-relaxed">
                                                        <span className="font-bold text-amber-800 uppercase text-[10px] block mb-1">Developer Mode</span>
                                                        Switching roles will adjust your platform visibility and approval authorities.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {(['SUPER_ADMIN', 'BID_TEAM', 'VIEWER'] as UserRole[]).map(role => (
                                                            <button
                                                                key={role}
                                                                onClick={() => onUpdateUser({ ...currentUser, role })}
                                                                className={clsx(
                                                                    "p-4 rounded-xl border flex flex-col gap-1 text-left transition-all group",
                                                                    currentUser.role === role
                                                                        ? "bg-[#D32F2F]/5 border-[#D32F2F] ring-1 ring-[#D32F2F]"
                                                                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                                                )}
                                                            >
                                                                <span className={clsx(
                                                                    "text-xs font-black uppercase tracking-tight",
                                                                    currentUser.role === role ? "text-[#D32F2F]" : "text-slate-800"
                                                                )}>
                                                                    {getRoleDisplayName(role)}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-medium">
                                                                    {role === 'SUPER_ADMIN' ? 'Full system access' : role === 'BID_TEAM' ? 'Bid operations access' : 'Read-only access'}
                                                                </span>
                                                                {currentUser.role === role && (
                                                                    <div className="mt-2 flex justify-end">
                                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                // Non-admin: Read-only view of their role
                                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                                                {getRoleDisplayName(currentUser.role)}
                                                            </span>
                                                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                                                                {currentUser.role === 'BID_TEAM' ? 'Bid operations access' : 'Read-only access'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-slate-400">
                                                            <Lock size={14} />
                                                            <span className="text-[10px] font-bold uppercase">Assigned by Admin</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>


                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Settings Section */}
                    {activeSection === 'notifications' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-[#D32F2F]/10 rounded-xl">
                                        <Bell size={20} className="text-[#D32F2F]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Notification Preferences</h2>
                                        <p className="text-xs text-slate-500 font-medium">Configure how and when you receive alerts</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                <NotificationSettings />
                            </div>
                        </div>
                    )}


                </div>
            </div>
        </div>
    );
};

export default Settings;
