
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Plus, Edit3, Trash2, Loader2, AlertCircle, CheckCircle2, X, Eye, EyeOff, Lock, Layers, BarChart3, Settings as SettingsIcon, Check } from 'lucide-react';
import { CustomRole, AppSection, PermissionLevel, APP_SECTIONS } from '../types.ts';
import { roleService } from '../services/authService.ts';
import { clsx } from 'clsx';

// Modal Portal Component
const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Using inline z-index to ensure it sits above everything
    return createPortal(
        <div style={{ zIndex: 100000 }} className="fixed inset-0 flex items-center justify-center p-4">
            {children}
        </div>,
        document.body
    );
};

// Section Grouping
const SECTION_GROUPS = [
    {
        title: 'Core Operations',
        icon: <Layers size={14} className="text-blue-500" />,
        sections: ['bid-intake', 'edit_bids', 'bid-stages', 'studio', 'vault', 'approvals'] as AppSection[]
    },
    {
        title: 'Analytics & Risk',
        icon: <BarChart3 size={14} className="text-purple-500" />,
        sections: ['reports', 'risk-watch', 'calculator', 'calendar'] as AppSection[]
    },
    {
        title: 'Administration',
        icon: <SettingsIcon size={14} className="text-slate-500" />,
        sections: ['settings', 'delete-manager'] as AppSection[]
    }
];

const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
    const [viewingRole, setViewingRole] = useState<CustomRole | null>(null);

    // Delete confirmation
    const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; role: CustomRole | null }>({
        show: false,
        role: null
    });

    // Form state
    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        permissions: Record<AppSection, PermissionLevel>;
    }>({
        name: '',
        description: '',
        permissions: {
            'bid-intake': 'none',
            'bid-stages': 'none',
            'studio': 'none',
            'vault': 'none',
            'calculator': 'none',
            'approvals': 'none',
            'reports': 'none',
            'risk-watch': 'none',
            'settings': 'none',
            'edit_bids': 'none',
            'calendar': 'none',
            'delete-manager': 'none',
        }
    });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await roleService.getAll();
            setRoles(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load roles');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingRole(null);
        setFormData({
            name: '',
            description: '',
            permissions: {
                'bid-intake': 'none',
                'bid-stages': 'none',
                'studio': 'none',
                'vault': 'none',
                'calculator': 'none',
                'approvals': 'none',
                'reports': 'none',
                'risk-watch': 'none',
                'settings': 'none',
                'edit_bids': 'none',
                'calendar': 'none',
                'delete-manager': 'none',
            }
        });
        setIsAddingNew(true);
    };

    const handleOpenEdit = (role: CustomRole) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description,
            permissions: { ...role.permissions }
        });
        setIsAddingNew(true);
    };

    const handleCloseForm = () => {
        setIsAddingNew(false);
        setEditingRole(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            if (editingRole) {
                await roleService.update(editingRole.id, formData);
                setSuccessMessage('Role updated successfully');
            } else {
                await roleService.create(formData);
                setSuccessMessage('Role created successfully');
            }
            handleCloseForm();
            fetchRoles();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Operation failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (role: CustomRole) => {
        if (role.isBuiltIn) return;
        setConfirmDelete({ show: true, role });
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete.role) return;

        try {
            await roleService.delete(confirmDelete.role.id);
            setSuccessMessage('Role deleted successfully');
            fetchRoles();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to delete role');
        } finally {
            setConfirmDelete({ show: false, role: null });
        }
    };

    const handlePermissionChange = (section: AppSection, level: PermissionLevel) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [section]: level
            }
        }));
    };

    const getPermissionCount = (role: CustomRole, level: PermissionLevel) => {
        return Object.values(role.permissions).filter(p => p === level).length;
    };

    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-fade-in min-h-[600px] flex flex-col">
            {isAddingNew ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleCloseForm}
                                className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all shadow-sm active:scale-95"
                            >
                                <X size={20} />
                            </button>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                                    {editingRole ? 'Configure Access Role' : 'Define New System Role'}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                                    {editingRole ? `Editing: ${editingRole.name}` : 'Set global permissions for this role'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-12 max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 border-b border-slate-100">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Identity / Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    disabled={editingRole?.isBuiltIn}
                                    className={clsx(
                                        "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-900 outline-none transition-all",
                                        editingRole?.isBuiltIn ? "opacity-60 cursor-not-allowed bg-slate-100" : "focus:ring-4 focus:ring-[#D32F2F]/10 focus:border-[#D32F2F] focus:bg-white"
                                    )}
                                    placeholder="e.g., Regional Manager"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Description</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    disabled={editingRole?.isBuiltIn}
                                    className={clsx(
                                        "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-900 outline-none transition-all",
                                        editingRole?.isBuiltIn ? "opacity-60 cursor-not-allowed bg-slate-100" : "focus:ring-4 focus:ring-[#D32F2F]/10 focus:border-[#D32F2F] focus:bg-white"
                                    )}
                                    placeholder="Describe what users with this role can do"
                                />
                            </div>
                        </div>

                        <div className="space-y-12">
                            {SECTION_GROUPS.map((group, groupIdx) => (
                                <div key={groupIdx} className="space-y-6">
                                    <div className="flex items-center gap-3 text-slate-800 px-1">
                                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                            {group.icon}
                                        </div>
                                        <span className="text-sm font-black uppercase tracking-[0.2em]">{group.title}</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {group.sections.map(sectionId => {
                                            const section = APP_SECTIONS.find(s => s.id === sectionId);
                                            if (!section) return null;

                                            const currentLevel = formData.permissions[sectionId];

                                            return (
                                                <div key={sectionId} className="group flex flex-col p-5 rounded-3xl border border-slate-100 bg-white hover:border-slate-300 hover:shadow-xl transition-all duration-300">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className={clsx(
                                                            "w-2.5 h-2.5 rounded-full",
                                                            currentLevel === 'none' ? "bg-slate-300" :
                                                                currentLevel === 'view' ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                                                        )} />
                                                        <span className="text-base font-bold text-slate-800">{section.label}</span>
                                                    </div>

                                                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                                                        {(['none', 'view', 'edit'] as PermissionLevel[]).map(level => (
                                                            <button
                                                                key={level}
                                                                type="button"
                                                                onClick={() => handlePermissionChange(sectionId, level)}
                                                                className={clsx(
                                                                    "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                                                                    currentLevel === level
                                                                        ? level === 'edit'
                                                                            ? "bg-white text-emerald-600 shadow-lg border border-emerald-50"
                                                                            : level === 'view'
                                                                                ? "bg-white text-blue-600 shadow-lg border border-blue-50"
                                                                                : "bg-white text-slate-600 shadow-lg border border-slate-100"
                                                                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
                                                                )}
                                                            >
                                                                {level === 'none' && <EyeOff size={14} />}
                                                                {level === 'view' && <Eye size={14} />}
                                                                {level === 'edit' && <Edit3 size={14} />}
                                                                {level === 'none' ? 'Blocked' : level === 'view' ? 'View' : 'Edit'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-4 pt-12">
                            <button
                                type="button"
                                onClick={handleCloseForm}
                                className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-400 rounded-3xl text-sm font-black uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-200 hover:text-slate-600 transition-all shadow-sm"
                            >
                                Back to Roles
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-[2] py-5 bg-[#D32F2F] text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] hover:bg-[#b71c1c] transition-all shadow-2xl shadow-red-100 flex items-center justify-center gap-3 disabled:bg-slate-300 disabled:cursor-not-allowed group active:scale-95 border-none"
                            >
                                {isSaving ? (
                                    <Loader2 size={24} className="animate-spin" />
                                ) : (
                                    <>
                                        {editingRole ? <Check size={20} className="transition-transform group-hover:scale-110" /> : <Plus size={20} className="transition-transform group-hover:rotate-90" />}
                                        {editingRole ? 'Update' : 'Create'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-red-600 rounded-xl shadow-lg shadow-red-100">
                                    <Shield size={22} className="text-white" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Access Roles</h2>
                            </div>
                            <p className="text-sm font-medium text-slate-500 ml-1">Define platform-wide security policies and granular permissions</p>
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-black transition-all shadow-xl shadow-slate-200 group active:scale-95"
                        >
                            <Plus size={18} className="transition-transform group-hover:rotate-90" />
                            Add New Role
                        </button>
                    </div>

                    <div className="px-8 space-y-4 empty:hidden mt-6">
                        {successMessage && (
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-sm font-bold animate-in slide-in-from-top-2">
                                <CheckCircle2 size={18} />
                                {successMessage}
                            </div>
                        )}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold animate-in slide-in-from-top-2">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="p-8 flex-1">
                        {isLoading ? (
                            <div className="py-32 flex flex-col items-center gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-red-600 animate-spin" />
                                    <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-200" size={24} />
                                </div>
                                <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-[10px]">Syncing Security Policies</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {roles.map(role => (
                                    <div
                                        key={role.id}
                                        className={clsx(
                                            "group p-6 rounded-[2rem] border transition-all duration-300",
                                            role.isBuiltIn
                                                ? "bg-slate-50/50 border-slate-100"
                                                : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-black text-slate-900">{role.name}</h3>
                                                    {role.isBuiltIn ? (
                                                        <span className="px-2.5 py-1 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg tracking-widest shadow-lg shadow-slate-100">
                                                            System Default
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-white text-slate-400 text-[9px] font-black uppercase rounded-lg tracking-widest border border-slate-100">
                                                            Custom Role
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-slate-500 mb-6">{role.description}</p>

                                                <div className="flex items-center gap-3 flex-wrap">
                                                    {getPermissionCount(role, 'edit') > 0 && (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-emerald-100/50 shadow-sm">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            {getPermissionCount(role, 'edit')} Sections (Full)
                                                        </span>
                                                    )}
                                                    {getPermissionCount(role, 'view') > 0 && (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-100/50 shadow-sm">
                                                            {getPermissionCount(role, 'view')} Sections (View)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleOpenEdit(role)}
                                                    className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm group/btn"
                                                    title="Edit Role"
                                                >
                                                    <Edit3 size={20} className="transition-transform group-hover/btn:scale-110" />
                                                </button>
                                                {!role.isBuiltIn && (
                                                    <button
                                                        onClick={() => handleDeleteClick(role)}
                                                        className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-2xl transition-all shadow-sm group/btn"
                                                        title="Delete Role"
                                                    >
                                                        <Trash2 size={20} className="transition-transform group-hover/btn:scale-110" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {roles.length === 0 && (
                                    <div className="text-center py-24 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-slate-200/50 border border-slate-100">
                                            <Shield size={32} className="text-slate-200" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">No Roles Active</h4>
                                        <p className="text-sm text-slate-400 mt-1 max-w-[240px] mx-auto font-medium">Create specialized access profiles to manage organization's security</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* View Permissions (Keep as Modal but styled and limited height) */}
            {viewingRole && (
                <ModalPortal>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingRole(null)} />
                    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col mx-4">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
                                    <Shield size={20} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                        {viewingRole.name}
                                        {viewingRole.isBuiltIn && (
                                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-black uppercase rounded tracking-widest leading-none">
                                                System Default
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 leading-none">{viewingRole.description || 'Global Access Policy'}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingRole(null)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide bg-slate-50/30">
                            <div className="space-y-8">
                                {SECTION_GROUPS.map((group, groupIdx) => (
                                    <div key={groupIdx} className="space-y-4">
                                        <div className="flex items-center gap-3 px-1">
                                            <div className="w-10 h-[1px] bg-slate-200"></div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                {group.icon}
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em]">{group.title}</span>
                                            </div>
                                            <div className="flex-1 h-[1px] bg-slate-200"></div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {group.sections.map(sectionId => {
                                                const section = APP_SECTIONS.find(s => s.id === sectionId);
                                                if (!section) return null;

                                                const level = viewingRole.permissions[sectionId] || 'none';

                                                return (
                                                    <div key={sectionId} className="flex flex-col p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{section.label}</span>
                                                        <div className={clsx(
                                                            "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                                                            level === 'edit'
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-50"
                                                                : level === 'view'
                                                                    ? "bg-blue-50 text-blue-700 border-blue-100 shadow-sm shadow-blue-50"
                                                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                                        )}>
                                                            <div className={clsx(
                                                                "w-1.5 h-1.5 rounded-full animate-pulse",
                                                                level === 'edit' ? "bg-emerald-500" : level === 'view' ? "bg-blue-500" : "bg-slate-400"
                                                            )} />
                                                            {level === 'edit' ? 'Full Edit Access' : level === 'view' ? 'Read-Only View' : 'Access Restricted'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-white flex justify-end shrink-0">
                            <button
                                onClick={() => setViewingRole(null)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Delete Confirmation (Stay as Modal) */}
            {confirmDelete.show && confirmDelete.role && (
                <ModalPortal>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDelete({ show: false, role: null })} />
                    <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-6 border border-red-100">
                                <AlertCircle size={40} className="text-red-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Delete this Role?</h3>
                            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                                You are about to remove <span className="text-slate-900 font-bold">"{confirmDelete.role.name}"</span>. This action is irreversible.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDelete({ show: false, role: null })}
                                    className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-100"
                                >
                                    Confirm Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
};

export default RoleManagement;

