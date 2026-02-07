/**
 * NotificationItem Component (Facebook-style)
 * Individual notification row in the dropdown
 */

import React from 'react';
import {
    Clock, Calendar, AlertTriangle, CheckCircle2,
    FileText, Bell, Users, AtSign
} from 'lucide-react';
import { clsx } from 'clsx';
import { BidNotification, NotificationType } from '../types';

interface NotificationItemProps {
    notification: BidNotification;
    onView?: (notification: BidNotification) => void;
    onDismiss?: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
    notification,
    onView,
    onDismiss
}) => {
    // Get icon and colors based on notification type
    const getNotificationStyle = () => {
        switch (notification.type) {
            case NotificationType.DEADLINE_1H:
            case NotificationType.DEADLINE_2H:
                return {
                    icon: <Clock size={20} className="text-white" />,
                    bgColor: 'bg-red-500'
                };
            case NotificationType.DEADLINE_12H:
            case NotificationType.DEADLINE_24H:
                return {
                    icon: <Clock size={20} className="text-white" />,
                    bgColor: 'bg-amber-500'
                };
            case NotificationType.MEETING_2H:
            case NotificationType.MEETING_TOMORROW:
                return {
                    icon: <Users size={20} className="text-white" />,
                    bgColor: 'bg-purple-500'
                };
            case NotificationType.REMINDER_DUE:
                return {
                    icon: <Bell size={20} className="text-white" />,
                    bgColor: 'bg-blue-500'
                };
            case NotificationType.EVENT_TODAY:
                return {
                    icon: <Calendar size={20} className="text-white" />,
                    bgColor: 'bg-sky-500'
                };
            case NotificationType.STAGE_TRANSITION:
                return {
                    icon: <CheckCircle2 size={20} className="text-white" />,
                    bgColor: 'bg-emerald-500'
                };
            case NotificationType.BID_STALLED:
                return {
                    icon: <AlertTriangle size={20} className="text-white" />,
                    bgColor: 'bg-orange-500'
                };
            case NotificationType.NOTE_ADDED:
                return {
                    icon: <AtSign size={20} className="text-white" />,
                    bgColor: 'bg-[#1877F2]'
                };
            case NotificationType.NEW_BID:
            case NotificationType.STATUS_CHANGE:
            case NotificationType.DOCUMENT_UPLOADED:
            default:
                return {
                    icon: <FileText size={20} className="text-white" />,
                    bgColor: 'bg-gray-500'
                };
        }
    };

    const style = getNotificationStyle();

    // Format relative time (Facebook-style)
    const getRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays === 1) return '1d';
        if (diffDays < 7) return `${diffDays}d`;
        if (diffWeeks === 1) return '1w';
        return `${diffWeeks}w`;
    };

    // Parse message to highlight mentions and bid names
    const renderMessage = () => {
        const { message, bidName } = notification;

        // Check for @mentions in message
        const mentionRegex = /@(\w+(?:\s\w+)?)/g;
        const parts = message.split(mentionRegex);

        return parts.map((part, i) => {
            // Check if this part is a mention (odd indices after split)
            if (i % 2 === 1) {
                return <span key={i} className="font-bold text-gray-900">@{part}</span>;
            }
            // Highlight bid name if present
            if (bidName && part.includes(bidName)) {
                const subParts = part.split(bidName);
                return subParts.map((subPart, j) => (
                    <React.Fragment key={`${i}-${j}`}>
                        {subPart}
                        {j < subParts.length - 1 && (
                            <span className="font-bold text-gray-900">{bidName}</span>
                        )}
                    </React.Fragment>
                ));
            }
            return part;
        });
    };

    return (
        <div
            onClick={() => onView?.(notification)}
            className={clsx(
                "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                !notification.isRead
                    ? "bg-[#E7F3FF] hover:bg-[#DEEBF7]"
                    : "hover:bg-gray-50"
            )}
        >
            {/* Icon with badge overlay */}
            <div className="relative shrink-0">
                <div className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    style.bgColor
                )}>
                    {style.icon}
                </div>
                {/* Type indicator badge */}
                <div className={clsx(
                    "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white",
                    notification.priority === 'critical' ? 'bg-red-500' :
                        notification.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'
                )}>
                    {notification.type === NotificationType.NOTE_ADDED ? (
                        <AtSign size={10} className="text-white" />
                    ) : notification.type.includes('deadline') ? (
                        <Clock size={10} className="text-white" />
                    ) : (
                        <Bell size={10} className="text-white" />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-[13px] text-gray-700 leading-snug">
                    {renderMessage()}
                </p>
                <span className={clsx(
                    "text-xs font-semibold mt-1 block",
                    !notification.isRead ? "text-[#1877F2]" : "text-gray-400"
                )}>
                    {getRelativeTime(notification.createdAt)}
                </span>
            </div>

            {/* Unread indicator */}
            {!notification.isRead && (
                <div className="shrink-0 self-center">
                    <div className="w-3 h-3 bg-[#1877F2] rounded-full" />
                </div>
            )}
        </div>
    );
};

export default NotificationItem;
