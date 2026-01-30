import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import BidIntake from './components/BidIntake.tsx';
import BidLifecycle from './components/BidLifecycle.tsx';
import ReportsView from './components/ReportsView.tsx';
import RiskWatchView from './components/RiskWatchView.tsx';
import ApprovalsView from './components/ApprovalsView.tsx';
import ProposalStudio from './components/ProposalStudio.tsx';
import CorporateVault from './components/CorporateVault.tsx';
import MarginCalculator from './components/MarginCalculator.tsx';
import AllBids from './components/AllBids.tsx';
import Settings from './components/Settings.tsx';
import ActivityLogView from './components/ActivityLogView.tsx';
import UserManagementPanel from './components/UserManagementPanel.tsx';
import Login from './components/Login.tsx';
import DeleteBidsView from './components/DeleteBidsView.tsx';
import { BidRecord, BidStatus, BidStage, RiskLevel, User, ActivityLog, TechnicalDocument } from './types.ts';
import { NAV_ITEMS, SOLUTION_OPTIONS } from './constants.tsx';
import { Search, X, Calendar, Filter, Clock, Send, Trophy, ZapOff, Ban, Briefcase, ChevronDown, Zap, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { bidApi, vaultApi, auditApi } from './services/api.ts';
import { authService, userService } from './services/authService.ts';
import { auditActions, loadAuditLogs, saveAuditLogs } from './services/auditService.ts';
import { PermissionProvider, PermissionGuard } from './components/PermissionGuard.tsx';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [vaultAssets, setVaultAssets] = useState<TechnicalDocument[]>([]);
  const [auditTrail, setAuditTrail] = useState<ActivityLog[]>([]);
  const [viewingBidId, setViewingBidId] = useState<string | null>(null);
  const [showIntake, setShowIntake] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [initialStatusFilter, setInitialStatusFilter] = useState<string>('All');

  // Add audit log function - passed to components
  const addAuditLog = useCallback((log: ActivityLog) => {
    setAuditTrail(prev => {
      const newLogs = [log, ...prev];
      saveAuditLogs(newLogs); // Persist to localStorage
      return newLogs;
    });
    // Also try to save to backend
    auditApi.create(log).catch(err => console.warn('Failed to save audit log to backend:', err));
  }, []);

  // Auth Check on Mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await authService.me();
        setCurrentUser(data.user);
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // Initial Data Load when user is logged in
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [fetchedBids, fetchedVault, fetchedAudit] = await Promise.all([
          bidApi.getAll(),
          vaultApi.getAll(),
          auditApi.getAll()
        ]);

        setBids(fetchedBids);
        setVaultAssets(fetchedVault);

        // Merge backend audit logs with localStorage (localStorage as fallback)
        const localLogs = loadAuditLogs();
        const mergedLogs = [...fetchedAudit];
        // Add local logs that aren't in backend (by id)
        const backendIds = new Set(fetchedAudit.map(l => l.id));
        localLogs.forEach(l => {
          if (!backendIds.has(l.id)) mergedLogs.push(l);
        });
        // Sort by timestamp (most recent first)
        mergedLogs.sort((a, b) => b.id.localeCompare(a.id));
        setAuditTrail(mergedLogs);
      } catch (err) {
        console.error('Error loading data:', err);
        setBids([]);
        setVaultAssets([]);
        // Load from localStorage as fallback
        setAuditTrail(loadAuditLogs());
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [currentUser]);

  const handleUpdateBid = async (updatedBid: BidRecord) => {
    try {
      setBids(prev => prev.map(b => b.id === updatedBid.id ? updatedBid : b));
      await bidApi.update(updatedBid);
    } catch (err) {
      console.error('Failed to update bid:', err);
    }
  };

  const handleInitiateBid = async (newBid: BidRecord) => {
    try {
      setBids(prev => [newBid, ...prev]);
      await bidApi.create(newBid);
      setShowIntake(false);
      setViewingBidId(newBid.id);

      // Log bid creation using audit service
      if (currentUser) {
        const log = auditActions.bidCreated(currentUser.name, currentUser.role, newBid.projectName, newBid.id);
        addAuditLog(log);
      }
    } catch (err) {
      console.error('Failed to initiate bid:', err);
    }
  };

  const handleDeleteBid = (deletedId: string) => {
    setBids(prev => prev.filter(b => b.id !== deletedId));
    if (currentUser) {
      const log = auditActions.bidUpdated(currentUser.name, currentUser.role, deletedId, 'Permanently Deleted');
      addAuditLog(log);
    }
  };

  const handleSetVaultAssets = async (assets: TechnicalDocument[]) => {
    setVaultAssets(assets);
    if (assets.length > vaultAssets.length && currentUser) {
      const newAsset = assets[0];
      const log = auditActions.documentUploaded(
        currentUser.name,
        currentUser.role,
        'Corporate Vault',
        '',
        newAsset.name,
        newAsset.category || 'Asset'
      );
      addAuditLog(log);
    }
  };

  // Login success handler - logs login event
  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    // Log login event
    const log = auditActions.userLogin(user.name, user.role);
    addAuditLog(log);
  }, [addAuditLog]);

  const handleNavigateToFilter = (status: string) => {
    setInitialStatusFilter(status);
    setActiveTab('all-bids');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      setCurrentUser(updatedUser);
      if (updatedUser.id) {
        await userService.update(updatedUser.id, updatedUser);
      }
    } catch (err) {
      console.error('Failed to update user profile:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
      setViewingBidId(null);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">Initializing Security Layer</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (viewingBidId) {
    const currentBid = bids.find(b => b.id === viewingBidId);
    if (currentBid) return <BidLifecycle bid={currentBid} onUpdate={handleUpdateBid} onClose={() => setViewingBidId(null)} userRole={currentUser.role} addAuditLog={addAuditLog} currentUser={currentUser} />;
  }

  return (
    <PermissionProvider role={currentUser.role} customPermissions={currentUser.permissions}>
      <div className="flex bg-[#F1F5F9] min-h-screen overflow-x-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onLogout={handleLogout}
          user={currentUser}
        />

        <main className={clsx("flex-1 min-h-screen transition-all duration-300 ease-in-out", isSidebarCollapsed ? "ml-20" : "ml-64")}>
          {showIntake ? (
            <PermissionGuard section="bid-intake" requiredLevel="edit">
              <BidIntake onCancel={() => setShowIntake(false)} onInitiate={handleInitiateBid} />
            </PermissionGuard>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard bids={bids} user={currentUser} auditTrail={auditTrail} onNewBid={() => setShowIntake(true)} onViewBid={setViewingBidId} onNavigateToFilter={handleNavigateToFilter} />
              )}

              {activeTab === 'activity-log' && (
                <ActivityLogView auditTrail={auditTrail} />
              )}

              {activeTab === 'all-bids' && (
                <AllBids
                  bids={bids}
                  onViewBid={setViewingBidId}
                  initialStatus={initialStatusFilter}
                />
              )}

              {activeTab === 'studio' && (
                <PermissionGuard section="studio" requiredLevel="view">
                  <ProposalStudio bids={bids} onUpdateBid={handleUpdateBid} vaultAssets={vaultAssets} />
                </PermissionGuard>
              )}
              {activeTab === 'vault' && (
                <PermissionGuard section="vault" requiredLevel="view">
                  <CorporateVault assets={vaultAssets} setAssets={setVaultAssets} userRole={currentUser?.role} />
                </PermissionGuard>
              )}
              {activeTab === 'calculator' && (
                <PermissionGuard section="calculator" requiredLevel="view">
                  <MarginCalculator bids={bids} onUpdate={handleUpdateBid} />
                </PermissionGuard>
              )}
              {activeTab === 'reports' && (
                <PermissionGuard section="reports" requiredLevel="view">
                  <ReportsView bids={bids} />
                </PermissionGuard>
              )}
              {activeTab === 'risk-watch' && (
                <PermissionGuard section="risk-watch" requiredLevel="view">
                  <RiskWatchView bids={bids} onViewBid={setViewingBidId} />
                </PermissionGuard>
              )}
              {activeTab === 'approvals' && (
                <PermissionGuard section="approvals" requiredLevel="view">
                  <ApprovalsView bids={bids} onViewBid={setViewingBidId} />
                </PermissionGuard>
              )}
              {activeTab === 'delete-manager' && (
                <>
                  {console.log('Rendering DeleteBidsView directly (Guard Bypassed)')}
                  <DeleteBidsView bids={bids} onDeleteSuccess={handleDeleteBid} />
                </>
              )}
              {activeTab === 'user-management' && currentUser?.role === 'SUPER_ADMIN' && <UserManagementPanel />}
              {activeTab === 'settings' && currentUser && (
                <Settings
                  currentUser={currentUser}
                  onUpdateUser={handleUpdateUser}
                />
              )}
            </>
          )}
        </main>
      </div>
    </PermissionProvider>
  );
};

export default App;
