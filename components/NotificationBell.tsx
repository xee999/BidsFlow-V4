/**
 * NotificationBell Component
 * Bell icon with badge counter for the header
 */

import React from 'react';
import { Bell } from 'lucide-react';
import { clsx } from 'clsx';

interface NotificationBellProps {
    unreadCount: number;
    urgentCount: number;
    isOpen: boolean;
    onClick: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
    unreadCount,
    urgentCount,
    isOpen,
    onClick
}) => {
    const hasNotifications = unreadCount > 0;
    const hasUrgent = urgentCount > 0;

    return (
        <button
            onClick={onClick}
            className={clsx(
                "relative p-2 rounded-xl transition-all duration-200",
                isOpen
                    ? "bg-blue-100 text-blue-600"
                    : "hover:bg-gray-100 text-gray-500 hover:text-gray-700",
                hasUrgent && !isOpen && "animate-pulse"
            )}
            aria-label={`Notifications${hasNotifications ? ` (${unreadCount} unread)` : ''}`}
        >
            <Bell
                size={20}
                className={clsx(
                    "transition-transform",
                    hasUrgent && "text-red-500"
                )}
            />

            {/* Badge */}
            {hasNotifications && (
                <span
                    className={clsx(
                        "absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full shadow-sm border-2 border-white",
                        hasUrgent
                            ? "bg-red-500 text-white"
                            : "bg-blue-500 text-white"
                    )}
                >
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}

            {/* Pulse ring for urgent notifications */}
            {hasUrgent && !isOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-400 rounded-full animate-ping opacity-75" />
            )}
        </button>
    );
};

export default NotificationBell;
