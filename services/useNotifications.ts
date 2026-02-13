/**
 * useNotifications Hook
 * React hook for managing notification state and engine
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    CalendarEvent,
    NotificationPreferences,
    DEFAULT_NOTIFICATION_PREFERENCES,
    User,
    NotificationType,
    BidRecord,
    BidNotification
} from '../types';
import { createNotificationEngine, NotificationEngine } from './notificationEngine';
import { browserNotifications } from './browserNotifications';

interface UseNotificationsOptions {
    bids: BidRecord[];
    calendarEvents: CalendarEvent[];
    currentUser?: User | null;
    onNavigateToBid?: (bidId: string) => void;
    pollingIntervalMs?: number;
}

interface UseNotificationsReturn {
    // Notification state
    notifications: BidNotification[];
    unreadCount: number;
    urgentCount: number;

    // Actions
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    dismiss: (id: string) => void;
    clearAll: () => void;

    // Browser notification permission
    permissionStatus: 'granted' | 'denied' | 'default';
    requestPermission: () => Promise<void>;

    // Preferences
    preferences: Omit<NotificationPreferences, 'userId'>;
    updatePreferences: (updates: Partial<Omit<NotificationPreferences, 'userId'>>) => void;

    // Engine control
    isRunning: boolean;
    start: () => void;
    stop: () => void;

    // Manual triggers
    triggerStageTransition: (bid: BidRecord, previousStage: string, newStage: string) => void;
    triggerNewBid: (bid: BidRecord) => void;
    triggerStatusChange: (bid: BidRecord, previousStatus: string, newStatus: string) => void;
    triggerMention: (mentionedUserId: string, mentionerName: string, bid: BidRecord, noteId: string, noteContent: string) => void;
}

const STORAGE_KEY = 'bidsflow_notifications';
const PREFS_STORAGE_KEY = 'bidsflow_notification_prefs';
const MAX_NOTIFICATIONS = 50;

export function useNotifications(options: UseNotificationsOptions): UseNotificationsReturn {
    const { bids, calendarEvents, currentUser, onNavigateToBid, pollingIntervalMs = 60000 } = options;

    // State
    const [notifications, setNotifications] = useState<BidNotification[]>([]);
    const [preferences, setPreferences] = useState<Omit<NotificationPreferences, 'userId'>>(DEFAULT_NOTIFICATION_PREFERENCES);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default'>('default');
    const [isRunning, setIsRunning] = useState(false);

    // Engine ref
    const engineRef = useRef<NotificationEngine | null>(null);

    // Load notifications and preferences from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setNotifications(parsed.slice(0, MAX_NOTIFICATIONS));
            }

            const storedPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
            if (storedPrefs) {
                setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(storedPrefs) });
            }
        } catch (e) {
            console.warn('Failed to load notifications from storage');
        }

        // Check browser permission status
        setPermissionStatus(browserNotifications.getPermissionStatus());
    }, []);

    // Save notifications to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
        } catch (e) {
            console.warn('Failed to save notifications to storage');
        }
    }, [notifications]);

    // Save preferences to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
        } catch (e) {
            console.warn('Failed to save preferences to storage');
        }
    }, [preferences]);

    // Handle new notification from engine
    const handleNotificationCreated = useCallback((notification: BidNotification) => {
        setNotifications(prev => {
            // Check if notification already exists
            if (prev.some(n => n.id === notification.id)) {
                return prev;
            }
            // Add to beginning and trim to max
            return [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
        });
    }, []);

    // Initialize engine
    useEffect(() => {
        engineRef.current = createNotificationEngine({
            pollingIntervalMs,
            currentUserId: currentUser?.id,
            onNotificationCreated: handleNotificationCreated,
            onNavigateToBid
        });

        // Apply preferences
        engineRef.current.setPreferences(preferences);

        return () => {
            engineRef.current?.stop();
        };
    }, [pollingIntervalMs, handleNotificationCreated, onNavigateToBid]);

    // Update engine when bids/events change (if running)
    useEffect(() => {
        if (isRunning && engineRef.current) {
            engineRef.current.stop();
            engineRef.current.start(bids, calendarEvents);
        }
    }, [bids, calendarEvents, isRunning]);

    // Update engine preferences when they change
    useEffect(() => {
        engineRef.current?.setPreferences(preferences);
    }, [preferences]);

    // Computed values
    const unreadCount = notifications.filter(n => !n.isRead && !n.isDismissed).length;
    const urgentCount = notifications.filter(n =>
        !n.isRead &&
        !n.isDismissed &&
        (n.priority === 'critical' || n.priority === 'high')
    ).length;

    // Actions
    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        ));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const dismiss = useCallback((id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, isDismissed: true } : n
        ));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const requestPermission = useCallback(async () => {
        const status = await browserNotifications.requestPermission();
        setPermissionStatus(status);
    }, []);

    const updatePreferences = useCallback((updates: Partial<Omit<NotificationPreferences, 'userId'>>) => {
        setPreferences(prev => ({ ...prev, ...updates }));
    }, []);

    const start = useCallback(() => {
        engineRef.current?.start(bids, calendarEvents);
        setIsRunning(true);
    }, [bids, calendarEvents]);

    const stop = useCallback(() => {
        engineRef.current?.stop();
        setIsRunning(false);
    }, []);

    // Manual triggers
    const triggerStageTransition = useCallback((bid: BidRecord, previousStage: string, newStage: string) => {
        engineRef.current?.createStageTransitionNotification(bid, previousStage, newStage);
    }, []);

    const triggerNewBid = useCallback((bid: BidRecord) => {
        engineRef.current?.createNewBidNotification(bid);
    }, []);

    const triggerStatusChange = useCallback((bid: BidRecord, previousStatus: string, newStatus: string) => {
        engineRef.current?.createStatusChangeNotification(bid, previousStatus, newStatus);
    }, []);

    const triggerMention = useCallback((
        mentionedUserId: string,
        mentionerName: string,
        bid: BidRecord,
        noteId: string,
        noteContent: string
    ) => {
        // Only show notification if the current user is the one mentioned
        if (!currentUser || mentionedUserId !== currentUser.id) {
            return;
        }

        const notification: BidNotification = {
            id: `mention-${mentionedUserId}-${noteId}`,
            userId: mentionedUserId,
            type: 'mention' as any, // NotificationType.MENTION
            priority: 'high',
            title: `${mentionerName} mentioned you`,
            message: `You were mentioned in a note on "${bid.projectName}": "${noteContent.slice(0, 50)}${noteContent.length > 50 ? '...' : ''}"`,
            bidId: bid.id,
            bidName: bid.projectName,
            noteId: noteId,
            isRead: false,
            isDismissed: false,
            browserNotificationSent: false,
            createdAt: new Date().toISOString()
        };
        handleNotificationCreated(notification);

        // Also show browser notification
        if (preferences.browserNotificationsEnabled && permissionStatus === 'granted') {
            browserNotifications.show({
                title: `${mentionerName} mentioned you`,
                body: `On bid "${bid.projectName}": ${noteContent.slice(0, 80)}...`,
                icon: '/vite.svg',
                tag: notification.id,
                onClick: () => {
                    window.focus();
                    onNavigateToBid?.(bid.id);
                }
            });
        }
    }, [handleNotificationCreated, preferences.browserNotificationsEnabled, permissionStatus, onNavigateToBid]);

    // Auto-start as soon as bids are available
    useEffect(() => {
        if (bids.length > 0 && !isRunning) {
            start();
        }
    }, [bids.length, isRunning, start]);

    return {
        notifications: notifications.filter(n => !n.isDismissed),
        unreadCount,
        urgentCount,
        markAsRead,
        markAllAsRead,
        dismiss,
        clearAll,
        permissionStatus,
        requestPermission,
        preferences,
        updatePreferences,
        isRunning,
        start,
        stop,
        triggerStageTransition,
        triggerNewBid,
        triggerStatusChange,
        triggerMention
    };
}

export default useNotifications;
