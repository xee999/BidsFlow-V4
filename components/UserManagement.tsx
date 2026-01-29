
import React, { useState, useEffect } from 'react';
import { User, Shield, Mail, Key, Plus, Trash2, Edit3, Loader2, AlertCircle, CheckCircle2, X, Rocket } from 'lucide-react';
import { User as UserType, UserRole, USER_ROLE_LABELS, CustomRole } from '../types.ts';
import { userService, roleService } from '../services/authService.ts';
import { clsx } from 'clsx';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<UserType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<UserType> | null>(null);

    const [roles, setRoles] = useState<CustomRole[]>([]);

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        show: boolean;
        user: UserType | null;
        action: 'deactivate' | 'activate' | 'delete';
    }>({ show: false, user: null, action: 'deactivate' });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'VIEWER' as UserRole
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const data = await roleService.getAll();
            setRoles(data);
        } catch (err: any) {
            console.error('Failed to fetch roles:', err);
        }
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'VIEWER' });
        setShowModal(true);
    };

    const handleOpenEdit = (user: UserType) => {
        setEditingUser(user);
        setFormData({ name: user.name, email: user.email, password: '', role: user.role });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            if (editingUser) {
                await userService.update(editingUser.id!, formData);
            } else {
                await userService.create(formData);
            }
            setShowModal(false);
            fetchUsers();
        } catch (err: any) {
            setError(err.message || 'Operation failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatusClick = (user: UserType) => {
        // Prevent deactivating Super Admin users
        if (user.role === 'SUPER_ADMIN' && user.isActive) {
            alert('Super Admin accounts cannot be deactivated.');
            return;
        }

        // Show confirmation dialog
        setConfirmDialog({
            show: true,
            user,
            action: user.isActive ? 'deactivate' : 'activate'
        });
    };

    const handleDeleteClick = (user: UserType) => {
        if (user.role === 'SUPER_ADMIN') {
            alert('Super Admin accounts cannot be deleted.');
            return;
        }

        setConfirmDialog({
            show: true,
            user,
            action: 'delete'
        });
    };

    const handleConfirmToggle = async () => {
        if (!confirmDialog.user) return;

        try {
            if (confirmDialog.action === 'delete') {
                await userService.delete(confirmDialog.user.id);
            } else {
                await userService.update(confirmDialog.user.id, { isActive: !confirmDialog.user.isActive });
            }
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Failed to update user status');
        } finally {
            setConfirmDialog({ show: false, user: null, action: 'deactivate' });
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-slate-900">Platform Users</h2>
                    <p className="text-xs text-slate-500">Manage access and roles for your organization</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
                >
                    <Plus size={16} />
                    Add New User
                </button>
            </div>

            {isLoading ? (
                <div className="p-20 flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Retrieving User Database</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name & Identity</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Role</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {user.avatarType === 'image' && user.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt={user.name}
                                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                                    <Rocket size={20} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                                <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                                            user.role === 'SUPER_ADMIN' ? "bg-red-50 text-red-700 border-red-100" :
                                                user.role === 'BID_TEAM' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                    user.role === 'VIEWER' ? "bg-slate-100 text-slate-600 border-slate-200" :
                                                        "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        )}>
                                            {user.roleName || USER_ROLE_LABELS[user.role] || roles.find(r => r.id === user.role)?.name || user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={clsx("w-2 h-2 rounded-full", user.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300")} />
                                            <span className={clsx("text-xs font-bold", user.isActive ? "text-emerald-600" : "text-slate-400")}>
                                                {user.isActive ? 'Active' : 'Deactivated'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(user)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit User"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            {/* Hide deactivate button for Super Admin */}
                                            {user.role !== 'SUPER_ADMIN' && (
                                                <>
                                                    <button
                                                        onClick={() => handleToggleStatusClick(user)}
                                                        className={clsx(
                                                            "p-2 rounded-lg transition-all",
                                                            user.isActive ? "text-slate-400 hover:text-orange-500 hover:bg-orange-50" : "text-emerald-500 hover:bg-emerald-50"
                                                        )}
                                                        title={user.isActive ? "Deactivate User" : "Activate User"}
                                                    >
                                                        <Shield size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(user)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                                {editingUser ? 'Update User' : 'Register New User'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
                                    placeholder="Zeeshan Ahmed"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
                                    placeholder="email@jazz.com.pk"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {editingUser ? 'Password (Leave blank to keep current)' : 'Initial Password'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Platform Privilege Level</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Built-in System Roles */}
                                    {([...(formData.role === 'SUPER_ADMIN' ? ['SUPER_ADMIN'] : []), 'BID_TEAM', 'VIEWER'] as UserRole[]).map(roleId => (
                                        <button
                                            key={roleId}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: roleId })}
                                            className={clsx(
                                                "py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all",
                                                formData.role === roleId
                                                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                            )}
                                        >
                                            {USER_ROLE_LABELS[roleId] || roleId}
                                        </button>
                                    ))}

                                    {/* Custom Dynamically Created Roles */}
                                    {roles.filter(r => !r.isBuiltIn).map(customRole => (
                                        <button
                                            key={customRole.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: customRole.id })}
                                            className={clsx(
                                                "py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all",
                                                formData.role === customRole.id
                                                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                            )}
                                        >
                                            {customRole.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-400"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : (editingUser ? 'Save Updates' : 'Confirm Registration')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            {confirmDialog.show && confirmDialog.user && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDialog({ show: false, user: null, action: 'deactivate' })} />
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={clsx(
                                    "w-12 h-12 rounded-xl flex items-center justify-center",
                                    confirmDialog.action === 'activate' ? "bg-emerald-100" : confirmDialog.action === 'delete' ? "bg-red-100" : "bg-orange-100"
                                )}>
                                    <AlertCircle size={24} className={confirmDialog.action === 'activate' ? "text-emerald-600" : confirmDialog.action === 'delete' ? "text-red-600" : "text-orange-600"} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">
                                        {confirmDialog.action === 'delete' ? 'Delete User?' : confirmDialog.action === 'deactivate' ? 'Deactivate User?' : 'Activate User?'}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {confirmDialog.user.name} ({confirmDialog.user.email})
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-6">
                                {confirmDialog.action === 'delete'
                                    ? 'This user will be permanently removed. Their activity logs will be preserved.'
                                    : confirmDialog.action === 'deactivate'
                                        ? 'This user will no longer be able to access the platform. You can reactivate them later.'
                                        : 'This user will regain access to the platform with their existing permissions.'
                                }
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDialog({ show: false, user: null, action: 'deactivate' })}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmToggle}
                                    className={clsx(
                                        "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-white",
                                        confirmDialog.action === 'activate'
                                            ? "bg-emerald-600 hover:bg-emerald-700"
                                            : "bg-red-600 hover:bg-red-700"
                                    )}
                                >
                                    {confirmDialog.action === 'delete' ? 'Delete' : confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
