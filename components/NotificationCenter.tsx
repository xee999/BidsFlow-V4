/**
 * NotificationCenter Component (Facebook-style)
 * Dropdown panel with All/Unread tabs
 */

import React, { useRef, useEffect, useState } from 'react';
import { BellOff, CheckCheck, MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import { BidNotification } from '../types';
import NotificationItem from './NotificationItem';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: BidNotification[];
    onViewNotification: (notification: BidNotification) => void;
    onDismiss: (id: string) => void;
    onMarkAllAsRead: () => void;
    onClearAll: () => void;
    onOpenSettings?: () => void;
    permissionStatus: 'granted' | 'denied' | 'default';
    onRequestPermission: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
    isOpen,
    onClose,
    notifications,
    onViewNotification,
    onDismiss,
    onMarkAllAsRead,
    onClearAll,
    onOpenSettings,
    permissionStatus,
    onRequestPermission
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
    const [showMenu, setShowMenu] = useState(false);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
                setShowMenu(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                setShowMenu(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Filter notifications based on active tab
    const filteredNotifications = activeTab === 'unread'
        ? notifications.filter(n => !n.isRead)
        : notifications;

    // Group by time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const newNotifications = filteredNotifications.filter(n => {
        const created = new Date(n.createdAt);
        return created >= today;
    });

    const earlierNotifications = filteredNotifications.filter(n => {
        const created = new Date(n.createdAt);
        return created < today;
    });

    const hasUnread = notifications.some(n => !n.isRead);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div
            ref={panelRef}
            className="absolute top-full right-0 mt-2 w-[380px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[9999]"
            style={{
                animation: 'fadeInDown 0.15s ease-out',
                boxShadow: '0 12px 28px 0 rgba(0, 0, 0, 0.2), 0 2px 4px 0 rgba(0, 0, 0, 0.1)'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <MoreHorizontal size={20} />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10">
                            <button
                                onClick={() => { onMarkAllAsRead(); setShowMenu(false); }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <CheckCheck size={16} />
                                Mark all as read
                            </button>
                            {onOpenSettings && (
                                <button
                                    onClick={() => { onOpenSettings(); setShowMenu(false); onClose(); }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Notification settings
                                </button>
                            )}
                            <button
                                onClick={() => { onClearAll(); setShowMenu(false); }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                                Clear all notifications
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs - Facebook Style */}
            <div className="flex gap-2 px-4 pb-2">
                <button
                    onClick={() => setActiveTab('all')}
                    className={clsx(
                        "px-4 py-2 rounded-full text-sm font-semibold transition-all",
                        activeTab === 'all'
                            ? "bg-[#E7F3FF] text-[#1877F2]"
                            : "text-gray-600 hover:bg-gray-100"
                    )}
                >
                    All
                </button>
                <button
                    onClick={() => setActiveTab('unread')}
                    className={clsx(
                        "px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5",
                        activeTab === 'unread'
                            ? "bg-[#E7F3FF] text-[#1877F2]"
                            : "text-gray-600 hover:bg-gray-100"
                    )}
                >
                    Unread
                    {unreadCount > 0 && (
                        <span className="bg-[#D32F2F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Browser Permission Banner */}
            {permissionStatus !== 'granted' && (
                <div className="mx-4 mb-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700 font-medium">
                        Enable browser notifications for real-time alerts
                    </p>
                    <button
                        onClick={onRequestPermission}
                        className="mt-2 px-3 py-1.5 bg-[#1877F2] text-white text-xs font-bold rounded-md hover:bg-blue-600 transition-colors"
                    >
                        Enable
                    </button>
                </div>
            )}

            {/* Notification List */}
            <div className="max-h-[420px] overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <BellOff size={28} className="text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-700">
                            {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            {activeTab === 'unread'
                                ? "You're all caught up!"
                                : "We'll notify you when something needs your attention."
                            }
                        </p>
                    </div>
                ) : (
                    <div className="pb-2">
                        {/* New Section */}
                        {newNotifications.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between px-4 py-2">
                                    <h3 className="text-sm font-bold text-gray-900">New</h3>
                                    {hasUnread && activeTab === 'all' && (
                                        <button
                                            onClick={onMarkAllAsRead}
                                            className="text-xs font-semibold text-[#1877F2] hover:underline"
                                        >
                                            See all
                                        </button>
                                    )}
                                </div>
                                {newNotifications.map(notification => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onView={onViewNotification}
                                        onDismiss={onDismiss}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Earlier Section */}
                        {earlierNotifications.length > 0 && (
                            <div>
                                <div className="px-4 py-2">
                                    <h3 className="text-sm font-bold text-gray-900">Earlier</h3>
                                </div>
                                {earlierNotifications.map(notification => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onView={onViewNotification}
                                        onDismiss={onDismiss}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Animation keyframes */}
            <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
};

export default NotificationCenter;
