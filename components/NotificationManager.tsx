/**
 * NotificationManager Component (Enhanced)
 * Handles notification engine lifecycle and provides the UI via a portal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BidRecord, CalendarEvent, BidNotification } from '../types';
import { useNotifications } from '../services/useNotifications';
import NotificationBell from './NotificationBell';
import NotificationCenter from './NotificationCenter';

interface NotificationManagerProps {
    bids: BidRecord[];
    events: CalendarEvent[];
    onNavigateToBid?: (bidId: string) => void;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
    bids,
    events,
    onNavigateToBid
}) => {
    const [isCenterOpen, setIsCenterOpen] = useState(false);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

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
    } = useNotifications({
        bids,
        calendarEvents: events,
        onNavigateToBid,
        pollingIntervalMs: 60000 // 1 minute
    });

    // Create portal container for the notification UI
    useEffect(() => {
        // Look for the notification mount point in the DOM
        let container = document.getElementById('notification-portal');

        if (!container) {
            // Create the container if it doesn't exist - position it in a fixed spot
            container = document.createElement('div');
            container.id = 'notification-portal';
            container.style.cssText = 'position: fixed; top: 16px; right: 16px; z-index: 9999;';
            document.body.appendChild(container);
        }

        setPortalContainer(container);

        return () => {
            // Cleanup only if we created it
            if (container && container.parentNode && !document.getElementById('notification-mount-point')) {
                container.parentNode.removeChild(container);
            }
        };
    }, []);

    const handleViewNotification = useCallback((notification: BidNotification) => {
        markAsRead(notification.id);
        if (notification.bidId && onNavigateToBid) {
            onNavigateToBid(notification.bidId);
            setIsCenterOpen(false);
        }
    }, [markAsRead, onNavigateToBid]);

    const toggleCenter = useCallback(() => {
        setIsCenterOpen(prev => !prev);
    }, []);

    const closeCenter = useCallback(() => {
        setIsCenterOpen(false);
    }, []);

    // Don't render anything if portal container isn't ready
    if (!portalContainer) return null;

    return createPortal(
        <div className="relative">
            <NotificationBell
                unreadCount={unreadCount}
                urgentCount={urgentCount}
                isOpen={isCenterOpen}
                onClick={toggleCenter}
            />

            <NotificationCenter
                isOpen={isCenterOpen}
                onClose={closeCenter}
                notifications={notifications}
                onViewNotification={handleViewNotification}
                onDismiss={dismiss}
                onMarkAllAsRead={markAllAsRead}
                onClearAll={clearAll}
                permissionStatus={permissionStatus}
                onRequestPermission={requestPermission}
            />
        </div>,
        portalContainer
    );
};

export default NotificationManager;
