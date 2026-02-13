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
import CalendarView from './components/CalendarView.tsx';
import { BidRecord, BidStatus, BidStage, RiskLevel, User, ActivityLog, TechnicalDocument, CalendarEvent } from './types.ts';
import { NAV_ITEMS, SOLUTION_OPTIONS } from './constants.tsx';
import { Search, X, Calendar, Filter, Clock, Send, Trophy, ZapOff, Ban, Briefcase, ChevronDown, Zap, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { bidApi, vaultApi, auditApi, calendarApi } from './services/api.ts';
import { authService, userService } from './services/authService.ts';
import { useNotifications } from './services/useNotifications.ts';
import { auditActions, loadAuditLogs, saveAuditLogs } from './services/auditService.ts';
import { PermissionProvider, PermissionGuard } from './components/PermissionGuard.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { NotificationManager } from './components/NotificationManager.tsx';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [vaultAssets, setVaultAssets] = useState<TechnicalDocument[]>([]);
  const [auditTrail, setAuditTrail] = useState<ActivityLog[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]); // Calendar events
  const [viewingBidId, setViewingBidId] = useState<string | null>(null);
  const [showIntake, setShowIntake] = useState(false);
  const [editingBid, setEditingBid] = useState<BidRecord | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [initialStatusFilter, setInitialStatusFilter] = useState<string>('All');

  const {
    notifications,
    unreadCount,
    urgentCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    permissionStatus,
    requestPermission,
    triggerMention,
    triggerStageTransition,
    triggerStatusChange,
    triggerNewBid
  } = useNotifications({
    bids,
    calendarEvents,
    currentUser,
    onNavigateToBid: setViewingBidId,
    pollingIntervalMs: 60000
  });

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
        const [fetchedBids, fetchedVault, fetchedAudit, fetchedEvents] = await Promise.all([
          bidApi.getAll(),
          vaultApi.getAll(),
          auditApi.getAll(),
          // Fetch calendar events - assume api.ts will support this or fetch manually if not
          fetch('/api/calendar-events').then(res => res.ok ? res.json() : [])
        ]);

        setBids(fetchedBids);
        setVaultAssets(fetchedVault);
        setCalendarEvents(fetchedEvents);

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
        setCalendarEvents([]);
        // Load from localStorage as fallback
        setAuditTrail(loadAuditLogs());
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Periodic Silent Refresh for background sync (mentions, status updates, etc)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      try {
        const [fetchedBids, fetchedEvents] = await Promise.all([
          bidApi.getAll(),
          fetch('/api/calendar-events').then(res => res.ok ? res.json() : [])
        ]);
        
        // Only update if we are not currently viewing a bid to avoid flashing/resetting local state if they are editing
        // Or we can be smarter, but simple replacement is what's used here
        setBids(prev => {
          // Intelligent merge: Update properties but preserve loaded documents/checklists if missing in new data
          // This prevents heavy fields from "disappearing" when the summary GET /api/bids (which excludes them) runs.
          const heavyFields = [
            'technicalDocuments', 
            'vendorQuotations', 
            'financialFormats', 
            'proposalSections', 
            'technicalQualificationChecklist', 
            'complianceChecklist',
            'deliverablesSummary',
            'notes',
            'strategicRiskAssessment',
            'finalRiskAssessment',
            'solutioningAIAnalysis'
          ];

          const newBids = fetchedBids.map((newBid: BidRecord) => {
            const existing = prev.find(p => p.id === newBid.id);
            if (!existing) return newBid;

            const merged = { ...newBid };
            heavyFields.forEach(field => {
              // @ts-ignore - dynamic field access
              if (existing[field] && (!newBid[field] || (Array.isArray(newBid[field]) && newBid[field].length === 0))) {
                // @ts-ignore
                merged[field] = existing[field];
              }
            });
            return merged;
          });
          
          if (JSON.stringify(prev) === JSON.stringify(newBids)) return prev;
          return newBids;
        });
        
        setCalendarEvents(prev => {
          if (JSON.stringify(prev) === JSON.stringify(fetchedEvents)) return prev;
          return fetchedEvents;
        });
      } catch (err) {
        console.warn('Periodic data sync failed:', err);
      }
    }, 60000); // Sync every minute

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleUpdateBid = async (updatedBid: BidRecord) => {
    try {
      // Find the original bid to see if the ID is changing
      const originalBid = bids.find(b => b.projectName === updatedBid.projectName || b.customerName === updatedBid.customerName);
      // However, a more reliable way is to store the editing bid's ID
      const oldId = editingBid?.id || updatedBid.id;
      
      setBids(prev => prev.map(b => b.id === oldId ? updatedBid : b));
      
      // Fire and forget the update to the server (or handle errors in background)
      bidApi.update(updatedBid, oldId).then(async () => {
          // Sync calendar events in background
          const updatedEvents = await calendarApi.getAll();
          setCalendarEvents(updatedEvents);
      }).catch(err => {
          console.error('Background update failed:', err);
          // Revert state if needed, or show error toast
      });
    } catch (err) {
      console.error('Failed to update bid state:', err);
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
    // Cascade delete in state: remove events linked to the deleted bid
    setCalendarEvents(prev => prev.filter(event => 
      !event.taggedBidIds || !event.taggedBidIds.includes(deletedId)
    ));
    
    if (currentUser) {
      const log = auditActions.bidUpdated(currentUser.name, currentUser.role, deletedId, 'Permanently Deleted');
      addAuditLog(log);
    }
  };

  const handleSaveCalendarEvent = async (event: CalendarEvent) => {
    try {
      setCalendarEvents(prev => [...prev, event]);
      await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (err) {
      console.error('Failed to save calendar event:', err);
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

  const handleSetViewingBidId = async (id: string | null) => {
    if (!id) {
      setViewingBidId(null);
      return;
    }

    // Checking if we already have the full bid with technicalDocuments
    const currentBid = bids.find(b => b.id === id);
    if (currentBid && currentBid.technicalDocuments) {
      setViewingBidId(id);
      return;
    }

    // If not loaded, fetch the full details from the server
    setIsLoadingData(true);
    try {
      const fullBid = await bidApi.getById(id);
      if (!fullBid) {
        setViewingBidId(id);
        return;
      }

      // Update local bids collection with the full data, but preserve local notes if they haven't synced yet
      setBids(prev => prev.map(b => {
        if (b.id === id) {
          // Intelligent merge for notes to handle race condition (Optimistic UI vs Stale Server Data)
          let mergedNotes = fullBid.notes || [];
          if (b.notes && b.notes.length > 0) {
            // If we have local notes that aren't in the server response yet, keep them
            const serverNoteIds = new Set(mergedNotes.map(n => n.id));
            const missingNotes = b.notes.filter(n => !serverNoteIds.has(n.id));
            if (missingNotes.length > 0) {
              mergedNotes = [...mergedNotes, ...missingNotes];
            }
          }

          return {
            ...fullBid,
            notes: mergedNotes
          };
        }
        return b;
      }));
      setViewingBidId(id);
    } catch (err) {
      console.error('Failed to fetch full bid details:', err);
      // Fallback: still show what we have, but maybe warn
      setViewingBidId(id);
    } finally {
      setIsLoadingData(false);
    }
  };


  return (
    <ErrorBoundary>
      <PermissionProvider role={currentUser.role} customPermissions={currentUser.permissions}>
        <NotificationManager
          notifications={notifications}
          unreadCount={unreadCount}
          urgentCount={urgentCount}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          dismiss={dismiss}
          clearAll={clearAll}
          permissionStatus={permissionStatus}
          requestPermission={requestPermission}
          onNavigateToBid={handleSetViewingBidId}
        />
        <div className="flex bg-[#F1F5F9] min-h-screen overflow-x-hidden relative">
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
                <BidIntake
                  initialBid={editingBid || undefined}
                  onCancel={() => {
                    setShowIntake(false);
                    setEditingBid(null);
                  }}
                  onInitiate={handleInitiateBid}
                  onUpdate={(updated) => {
                    handleUpdateBid(updated);
                    setShowIntake(false);
                    setEditingBid(null);
                    setViewingBidId(updated.id);
                  }}
                />
              </PermissionGuard>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <Dashboard bids={bids} user={currentUser} auditTrail={auditTrail} onNewBid={() => setShowIntake(true)} onViewBid={handleSetViewingBidId} onNavigateToFilter={handleNavigateToFilter} />
                )}

                {activeTab === 'activity-log' && (
                  <ActivityLogView auditTrail={auditTrail} />
                )}

                {activeTab === 'all-bids' && (
                  <AllBids
                    bids={bids}
                    onViewBid={handleSetViewingBidId}
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
                    <RiskWatchView bids={bids} onViewBid={handleSetViewingBidId} />
                  </PermissionGuard>
                )}
                {activeTab === 'calendar' && (
                  <PermissionGuard section="calendar" requiredLevel="view">
                    <CalendarView
                      bids={bids}
                      currentUser={currentUser}
                      onUpdateBid={handleUpdateBid}
                      onViewBid={handleSetViewingBidId}
                      events={calendarEvents}
                      setEvents={setCalendarEvents}
                      triggerMention={triggerMention}
                    />
                  </PermissionGuard>
                )}
                {activeTab === 'approvals' && (
                  <PermissionGuard section="approvals" requiredLevel="view">
                    <ApprovalsView bids={bids} onViewBid={handleSetViewingBidId} />
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
        {viewingBidId && (
          <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl overflow-y-auto"
            style={{ zIndex: 1000000 }}
          >
            {(() => {
              const currentBid = bids.find(b => b.id === viewingBidId);
              return currentBid ? (
                <BidLifecycle
                  bid={currentBid}
                  onUpdate={handleUpdateBid}
                  onClose={() => setViewingBidId(null)}
                  onEditIntake={() => {
                    setEditingBid(currentBid);
                    setViewingBidId(null);
                    setShowIntake(true);
                  }}
                  userRole={currentUser.role}
                  addAuditLog={addAuditLog}
                  currentUser={currentUser}
                  triggerMention={triggerMention}
                  onViewBid={handleSetViewingBidId}
                  onAddCalendarEvent={handleSaveCalendarEvent}
                  bids={bids}
                />
              ) : null;
            })()}
          </div>
        )}
      </PermissionProvider>
    </ErrorBoundary>
  );
};

export default App;
