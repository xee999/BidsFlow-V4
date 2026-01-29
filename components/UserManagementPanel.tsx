
import React, { useState } from 'react';
import { Users, Shield, UserPlus, ShieldPlus } from 'lucide-react';
import UserManagement from './UserManagement.tsx';
import RoleManagement from './RoleManagement.tsx';
import { clsx } from 'clsx';

const UserManagementPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-fade-in pb-24 h-full overflow-y-auto">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-slate-100 rounded-xl">
                        <Users size={24} className="text-slate-600" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
                </div>
                <p className="text-slate-500 font-medium ml-1">Manage platform users and their granular access roles</p>
            </div>

            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('users')}
                    className={clsx(
                        "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all",
                        activeTab === 'users'
                            ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                >
                    <Users size={16} />
                    Platform Users
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={clsx(
                        "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all",
                        activeTab === 'roles'
                            ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                >
                    <Shield size={16} />
                    Access Roles
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === 'users' ? <UserManagement /> : <RoleManagement />}
            </div>
        </div>
    );
};

export default UserManagementPanel;
