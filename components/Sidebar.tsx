import React from 'react';
import { NAV_ITEMS, COLORS } from '../constants.tsx';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, LogOut, Activity, Rocket } from 'lucide-react';
import { USER_ROLE_LABELS, UserRole, AppSection } from '../types.ts';
import { usePermissions } from './PermissionGuard.tsx';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onLogout: () => void;
  user: any;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed, onLogout, user }) => {
  return (
    <div className={clsx(
      "h-screen bg-[#1E3A5F] text-white flex flex-col fixed left-0 top-0 z-[100] shadow-2xl transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-12 w-8 h-8 bg-[#D32F2F] rounded-full flex items-center justify-center text-white shadow-2xl border-4 border-[#1E3A5F] hover:scale-110 active:scale-95 transition-all z-[110]"
        title={isCollapsed ? "Expand Navigation" : "Collapse Navigation"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Branding Section - Polished spacing and adaptive sizing */}
      <div className={clsx("p-6 flex flex-col items-center overflow-hidden transition-all duration-300", isCollapsed ? "px-1" : "p-8")}>
        <h1 className={clsx(
          "font-black tracking-tighter text-white transition-all duration-300 whitespace-nowrap",
          isCollapsed ? "text-[10px] uppercase" : "text-3xl"
        )}>
          Bids<span className="text-[#D32F2F]">Flow</span>
        </h1>
        {!isCollapsed && (
          <p className="text-[10px] text-slate-400 mt-2 text-center uppercase font-bold tracking-widest border-t border-white/10 pt-2 w-full animate-in fade-in">
            Jazz Business Studio
          </p>
        )}
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto scrollbar-hide">
        {(() => {
          let displayItems = [...NAV_ITEMS];

          // Role-based filtering using granular permissions
          const { canView } = usePermissions();
          const userRole = user?.role as UserRole || 'VIEWER';

          // Map nav item IDs to AppSection for permission lookup
          const navToSection: Record<string, AppSection | null> = {
            'dashboard': null, // Dashboard is always visible
            'all-bids': 'bid-stages', // All bids uses bid-stages permission
            'studio': 'studio',
            'vault': 'vault',
            'calculator': 'calculator',
            'approvals': 'approvals',
            'reports': 'reports',
            'risk-watch': 'risk-watch',
            'settings': 'settings',
            'activity-log': 'settings', // Activity log requires settings access
            'user-management': null, // Custom handling below
          };

          // Filter based on permissions (at least 'view' level required)
          displayItems = displayItems.filter(item => {
            const section = navToSection[item.id];

            // Special handling for User Management (Super Admin only)
            if (item.id === 'user-management') {
              return user?.role === 'SUPER_ADMIN';
            }

            if (section === null) return true; // Always show dashboard
            if (!section) return true; // Unknown sections default to visible
            return canView(section);
          });

          if (user?.role === 'SUPER_ADMIN') {
            const settingsIndex = displayItems.findIndex(i => i.id === 'settings');
            const activityLogItem = {
              id: 'activity-log',
              label: 'Activity Log',
              icon: <Activity size={20} />
            };
            if (settingsIndex !== -1) {
              displayItems.splice(settingsIndex, 0, activityLogItem);
            } else {
              displayItems.push(activityLogItem);
            }
          }
          return displayItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : ""}
              className={clsx(
                "w-full flex items-center rounded-xl transition-all duration-200 text-sm font-medium group",
                isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3.5",
                activeTab === item.id
                  ? "bg-[#D32F2F] text-white shadow-xl translate-x-1"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <div className={clsx("shrink-0 transition-transform duration-200 group-hover:scale-110", activeTab === item.id ? "scale-110" : "")}>
                {item.icon}
              </div>
              {!isCollapsed && (
                <span className="truncate animate-in slide-in-from-left-2 duration-300">{item.label}</span>
              )}
            </button>
          ));
        })()}
      </nav>

      {/* Footer Branding Section */}
      <div className={clsx(
        "border-t border-white/10 bg-[#152943] transition-all duration-300 shrink-0",
        isCollapsed ? "p-4 flex flex-col items-center gap-4" : "p-6"
      )}>
        <div className="flex items-center gap-4 overflow-hidden mb-4">
          {user?.avatarType === 'image' && user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-xl object-cover shadow-inner shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#D32F2F] flex items-center justify-center text-white shadow-inner shrink-0">
              <Rocket size={20} />
            </div>
          )}
          {!isCollapsed && (
            <div className="animate-in fade-in duration-500 whitespace-nowrap flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">{user?.roleName || (user?.role ? (USER_ROLE_LABELS[user.role as UserRole] || user.role.replace(/_/g, ' ')) : 'Member')}</p>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          className={clsx(
            "w-full flex items-center gap-3 text-slate-400 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors text-sm font-medium group",
            isCollapsed && "justify-center"
          )}
          title="Logout"
        >
          <LogOut size={18} className="transition-transform group-hover:-translate-x-0.5" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
