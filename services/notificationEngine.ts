/**
 * Notification Engine Service
 * Core logic for detecting events and creating notifications
 */

import {
    BidRecord,
    BidNotification,
    NotificationType,
    NotificationPriority,
    NotificationPreferences,
    DEFAULT_NOTIFICATION_PREFERENCES,
    CalendarEvent,
    BidStatus
} from '../types';
import { browserNotifications } from './browserNotifications';

// Time constants in milliseconds
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

interface NotificationEngineConfig {
    pollingIntervalMs: number;
    currentUserId?: string;
    onNotificationCreated?: (notification: BidNotification) => void;
    onNavigateToBid?: (bidId: string) => void;
}

class NotificationEngine {
    private config: NotificationEngineConfig;
    private pollingInterval: NodeJS.Timeout | null = null;
    private sentNotifications: Set<string> = new Set(); // Track sent notification IDs to avoid duplicates
    private preferences: Omit<NotificationPreferences, 'userId'> = DEFAULT_NOTIFICATION_PREFERENCES;

    constructor(config: NotificationEngineConfig) {
        this.config = config;
        // Load sent notifications from localStorage to persist across refreshes
        this.loadSentNotifications();
    }

    private loadSentNotifications() {
        try {
            const stored = localStorage.getItem('bidsflow_sent_notifications');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Only keep notifications from the last 24 hours
                const now = Date.now();
                this.sentNotifications = new Set(
                    parsed.filter((item: { id: string; timestamp: number }) =>
                        now - item.timestamp < DAY
                    ).map((item: { id: string }) => item.id)
                );
            }
        } catch (e) {
            console.warn('Failed to load sent notifications from storage');
        }
    }

    private saveSentNotification(id: string) {
        this.sentNotifications.add(id);
        try {
            const items = Array.from(this.sentNotifications).map(id => ({
                id,
                timestamp: Date.now()
            }));
            localStorage.setItem('bidsflow_sent_notifications', JSON.stringify(items));
        } catch (e) {
            console.warn('Failed to save sent notification to storage');
        }
    }

    /**
     * Update notification preferences
     */
    setPreferences(prefs: Partial<Omit<NotificationPreferences, 'userId'>>) {
        this.preferences = { ...this.preferences, ...prefs };
    }

    /**
     * Start the notification polling engine
     */
    start(bids: BidRecord[], calendarEvents: CalendarEvent[]) {
        if (this.pollingInterval) {
            this.stop();
        }

        // Initial check
        this.checkAllEvents(bids, calendarEvents);

        // Set up polling
        this.pollingInterval = setInterval(() => {
            this.checkAllEvents(bids, calendarEvents);
        }, this.config.pollingIntervalMs);
    }

    /**
     * Stop the notification polling engine
     */
    stop() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Check all event sources for notifications
     */
    checkAllEvents(bids: BidRecord[], calendarEvents: CalendarEvent[]) {
        const now = new Date();
        const notifications: BidNotification[] = [];

        // Check bid deadlines
        if (this.preferences.deadlineAlerts.enabled) {
            notifications.push(...this.checkBidDeadlines(bids, now));
        }

        // Check pre-bid meetings
        if (this.preferences.meetingAlerts.enabled) {
            notifications.push(...this.checkPreBidMeetings(bids, now));
        }

        // Check calendar events and reminders
        if (this.preferences.calendarAlerts.enabled) {
            notifications.push(...this.checkCalendarEvents(calendarEvents, now));
        }

        // Check stalled bids
        if (this.preferences.stageAlerts.stalledAlerts) {
            notifications.push(...this.checkStalledBids(bids, now));
        }

        // Check for mentions in notes
        if (this.config.currentUserId) {
            notifications.push(...this.checkNoteMentions(bids, now));
        }

        // Process notifications
        notifications.forEach(notification => {
            this.processNotification(notification);
        });
    }

    /**
     * Check bid deadlines for approaching notifications
     */
    private checkBidDeadlines(bids: BidRecord[], now: Date): BidNotification[] {
        const notifications: BidNotification[] = [];
        const intervals = this.preferences.deadlineAlerts.intervals;

        bids
            .filter(bid => bid.status === BidStatus.ACTIVE && bid.deadline)
            .forEach(bid => {
                const deadline = new Date(bid.deadline);
                const timeRemaining = deadline.getTime() - now.getTime();

                // Skip past deadlines
                if (timeRemaining <= 0) return;

                // Check each interval
                if (intervals.includes('1h') && timeRemaining <= HOUR && timeRemaining > HOUR / 2) {
                    notifications.push(this.createDeadlineNotification(bid, '1 hour', NotificationType.DEADLINE_1H, 'critical'));
                } else if (intervals.includes('2h') && timeRemaining <= 2 * HOUR && timeRemaining > HOUR) {
                    notifications.push(this.createDeadlineNotification(bid, '2 hours', NotificationType.DEADLINE_2H, 'critical'));
                } else if (intervals.includes('12h') && timeRemaining <= 12 * HOUR && timeRemaining > 2 * HOUR) {
                    notifications.push(this.createDeadlineNotification(bid, '12 hours', NotificationType.DEADLINE_12H, 'high'));
                } else if (intervals.includes('24h') && timeRemaining <= DAY && timeRemaining > 12 * HOUR) {
                    notifications.push(this.createDeadlineNotification(bid, '24 hours', NotificationType.DEADLINE_24H, 'high'));
                }
            });

        return notifications;
    }

    /**
     * Check pre-bid meetings for approaching notifications
     */
    private checkPreBidMeetings(bids: BidRecord[], now: Date): BidNotification[] {
        const notifications: BidNotification[] = [];
        const intervals = this.preferences.meetingAlerts.intervals;

        bids
            .filter(bid => bid.status === BidStatus.ACTIVE && bid.preBidMeeting?.date)
            .forEach(bid => {
                const meeting = bid.preBidMeeting!;
                const meetingDate = new Date(`${meeting.date}T${meeting.time || '09:00'}`);
                const timeRemaining = meetingDate.getTime() - now.getTime();

                // Skip past meetings
                if (timeRemaining <= 0) return;

                if (intervals.includes('2h') && timeRemaining <= 2 * HOUR && timeRemaining > HOUR) {
                    notifications.push({
                        id: `meeting-2h-${bid.id}-${meeting.date}`,
                        userId: 'all',
                        type: NotificationType.MEETING_2H,
                        priority: 'critical',
                        title: '🤝 Pre-bid Meeting Soon',
                        message: `Meeting for ${bid.projectName} in 2 hours`,
                        bidId: bid.id,
                        bidName: bid.projectName,
                        isRead: false,
                        isDismissed: false,
                        browserNotificationSent: false,
                        createdAt: now.toISOString()
                    });
                } else if (intervals.includes('1d') && timeRemaining <= DAY && timeRemaining > 2 * HOUR) {
                    notifications.push({
                        id: `meeting-1d-${bid.id}-${meeting.date}`,
                        userId: 'all',
                        type: NotificationType.MEETING_TOMORROW,
                        priority: 'high',
                        title: '📋 Pre-bid Meeting Tomorrow',
                        message: `Meeting for ${bid.projectName} scheduled for tomorrow`,
                        bidId: bid.id,
                        bidName: bid.projectName,
                        isRead: false,
                        isDismissed: false,
                        browserNotificationSent: false,
                        createdAt: now.toISOString()
                    });
                }
            });

        return notifications;
    }

    /**
     * Check calendar events and reminders
     */
    private checkCalendarEvents(events: CalendarEvent[], now: Date): BidNotification[] {
        const notifications: BidNotification[] = [];
        const intervals = this.preferences.calendarAlerts.intervals;

        events
            .filter(event => event.type === 'reminder' || event.type === 'event')
            .forEach(event => {
                const eventDate = new Date(event.date);
                const timeRemaining = eventDate.getTime() - now.getTime();

                // Skip past events
                if (timeRemaining <= 0) return;

                const isReminder = event.type === 'reminder';
                const priority: NotificationPriority = isReminder ? 'critical' : 'medium';

                if (intervals.includes('at_time') && timeRemaining <= 5 * 60 * 1000 && timeRemaining > 0) {
                    // Within 5 minutes of event time
                    notifications.push({
                        id: `event-now-${event.id}`,
                        userId: 'all',
                        type: isReminder ? NotificationType.REMINDER_DUE : NotificationType.EVENT_TODAY,
                        priority,
                        title: isReminder ? '🔔 Reminder' : '📅 Event Now',
                        message: event.title,
                        eventId: event.id,
                        isRead: false,
                        isDismissed: false,
                        browserNotificationSent: false,
                        createdAt: now.toISOString()
                    });
                } else if (intervals.includes('15m') && timeRemaining <= 15 * 60 * 1000 && timeRemaining > 5 * 60 * 1000) {
                    notifications.push({
                        id: `event-15m-${event.id}`,
                        userId: 'all',
                        type: NotificationType.EVENT_TODAY,
                        priority: 'high',
                        title: `📅 ${isReminder ? 'Reminder' : 'Event'} in 15 minutes`,
                        message: event.title,
                        eventId: event.id,
                        isRead: false,
                        isDismissed: false,
                        browserNotificationSent: false,
                        createdAt: now.toISOString()
                    });
                } else if (intervals.includes('1h') && timeRemaining <= HOUR && timeRemaining > 15 * 60 * 1000) {
                    notifications.push({
                        id: `event-1h-${event.id}`,
                        userId: 'all',
                        type: NotificationType.EVENT_TODAY,
                        priority: 'medium',
                        title: `📅 ${isReminder ? 'Reminder' : 'Event'} in 1 hour`,
                        message: event.title,
                        eventId: event.id,
                        isRead: false,
                        isDismissed: false,
                        browserNotificationSent: false,
                        createdAt: now.toISOString()
                    });
                }
            });

        return notifications;
    }

    /**
     * Check for stalled bids (no stage change in threshold days)
     */
    private checkStalledBids(bids: BidRecord[], now: Date): BidNotification[] {
        const notifications: BidNotification[] = [];
        const thresholdDays = this.preferences.stageAlerts.stalledThresholdDays;

        bids
            .filter(bid => bid.status === BidStatus.ACTIVE && bid.stageHistory?.length > 0)
            .forEach(bid => {
                const lastTransition = bid.stageHistory[bid.stageHistory.length - 1];
                const lastTransitionDate = new Date(lastTransition.timestamp);
                const daysSinceTransition = Math.floor((now.getTime() - lastTransitionDate.getTime()) / DAY);

                if (daysSinceTransition >= thresholdDays) {
                    notifications.push({
                        id: `stalled-${bid.id}-${daysSinceTransition}`,
                        userId: 'all',
                        type: NotificationType.BID_STALLED,
                        priority: 'high',
                        title: `⚠️ Bid Stalled`,
                        message: `${bid.projectName} stuck in ${bid.currentStage} for ${daysSinceTransition} days`,
                        bidId: bid.id,
                        bidName: bid.projectName,
                        isRead: false,
                        isDismissed: false,
                        browserNotificationSent: false,
                        createdAt: now.toISOString()
                    });
                }
            });

        return notifications;
    }

    /**
     * Check for mentions of the current user in all bid notes
     */
    private checkNoteMentions(bids: BidRecord[], now: Date): BidNotification[] {
        const notifications: BidNotification[] = [];
        const currentUserId = this.config.currentUserId;
        if (!currentUserId) return [];

        bids.forEach(bid => {
            if (!bid.notes) return;

            bid.notes.forEach(note => {
                // If this note mentions the current user
                if (note.mentionedUserIds?.includes(currentUserId)) {
                    // And we didn't created it ourselves (optional, usually you don't notify yourself)
                    // Note: note might not have creator ID, but we can check name if available
                    // For now, focus on ID-based mention truth

                    const notificationId = `mention-${currentUserId}-${note.id}`;

                    // Check if already processed
                    if (!this.sentNotifications.has(notificationId)) {
                        notifications.push({
                            id: notificationId,
                            userId: currentUserId,
                            type: NotificationType.MENTION,
                            priority: 'high',
                            title: `${note.createdBy || 'Someone'} mentioned you`,
                            message: `You were mentioned in a note on "${bid.projectName}": "${note.content.slice(0, 50)}${note.content.length > 50 ? '...' : ''}"`,
                            bidId: bid.id,
                            bidName: bid.projectName,
                            noteId: note.id,
                            isRead: false,
                            isDismissed: false,
                            browserNotificationSent: false,
                            createdAt: note.createdAt || now.toISOString()
                        });
                    }
                }
            });
        });

        return notifications;
    }

    /**
     * Create a deadline notification
     */
    private createDeadlineNotification(
        bid: BidRecord,
        timeLabel: string,
        type: NotificationType,
        priority: NotificationPriority
    ): BidNotification {
        return {
            id: `deadline-${type}-${bid.id}-${new Date().toDateString()}`,
            userId: 'all',
            type,
            priority,
            title: priority === 'critical' ? '⏰ Deadline Imminent' : '📅 Deadline Approaching',
            message: `${bid.projectName} due in ${timeLabel}`,
            bidId: bid.id,
            bidName: bid.projectName,
            isRead: false,
            isDismissed: false,
            browserNotificationSent: false,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Process a notification - emit to listeners and show browser notification if needed
     */
    private async processNotification(notification: BidNotification) {
        // Skip if already sent
        if (this.sentNotifications.has(notification.id)) {
            return;
        }

        // Mark as sent
        this.saveSentNotification(notification.id);

        // Emit to listeners
        this.config.onNotificationCreated?.(notification);

        // Show browser notification for critical/high priority if enabled
        if (this.preferences.browserNotificationsEnabled && this.shouldShowBrowserNotification(notification)) {
            await this.showBrowserNotification(notification);
        }
    }

    /**
     * Determine if a browser notification should be shown based on type and preferences
     */
    private shouldShowBrowserNotification(notification: BidNotification): boolean {
        switch (notification.type) {
            case NotificationType.DEADLINE_1H:
            case NotificationType.DEADLINE_2H:
            case NotificationType.DEADLINE_12H:
            case NotificationType.DEADLINE_24H:
                return this.preferences.deadlineAlerts.browserPopup;

            case NotificationType.REMINDER_DUE:
            case NotificationType.EVENT_TODAY:
                return this.preferences.calendarAlerts.browserPopup;

            case NotificationType.MEETING_2H:
            case NotificationType.MEETING_TOMORROW:
                return this.preferences.meetingAlerts.browserPopup;

            case NotificationType.STAGE_TRANSITION:
            case NotificationType.BID_STALLED:
                return this.preferences.stageAlerts.browserPopup;

            default:
                return false;
        }
    }

    /**
     * Show browser notification for a notification
     */
    private async showBrowserNotification(notification: BidNotification) {
        const navigate = this.config.onNavigateToBid;

        switch (notification.type) {
            case NotificationType.DEADLINE_1H:
            case NotificationType.DEADLINE_2H:
            case NotificationType.DEADLINE_12H:
            case NotificationType.DEADLINE_24H:
                if (notification.bidId && navigate) {
                    await browserNotifications.showDeadlineAlert(
                        notification.bidName || 'Bid',
                        notification.message.split(' due in ')[1] || '',
                        notification.bidId,
                        navigate
                    );
                }
                break;

            case NotificationType.MEETING_2H:
            case NotificationType.MEETING_TOMORROW:
                if (notification.bidId && navigate) {
                    await browserNotifications.showMeetingAlert(
                        notification.bidName || 'Bid',
                        notification.type === NotificationType.MEETING_2H ? '2 hours' : 'tomorrow',
                        notification.bidId,
                        navigate
                    );
                }
                break;

            case NotificationType.REMINDER_DUE:
            case NotificationType.EVENT_TODAY:
                await browserNotifications.showReminderAlert(notification.message, notification.eventId || '');
                break;

            default:
                await browserNotifications.show({
                    title: notification.title,
                    body: notification.message,
                    tag: notification.id
                });
        }
    }

    /**
     * Manually trigger a stage transition notification
     */
    createStageTransitionNotification(bid: BidRecord, previousStage: string, newStage: string) {
        if (!this.preferences.stageAlerts.transitions) return;

        const notification: BidNotification = {
            id: `stage-${bid.id}-${newStage}-${Date.now()}`,
            userId: 'all',
            type: NotificationType.STAGE_TRANSITION,
            priority: 'medium',
            title: '✅ Stage Transition',
            message: `${bid.projectName} moved from ${previousStage} to ${newStage}`,
            bidId: bid.id,
            bidName: bid.projectName,
            isRead: false,
            isDismissed: false,
            browserNotificationSent: false,
            createdAt: new Date().toISOString()
        };

        this.processNotification(notification);
    }

    /**
     * Manually trigger a new bid notification
     */
    createNewBidNotification(bid: BidRecord) {
        if (!this.preferences.infoAlerts.newBids) return;

        const notification: BidNotification = {
            id: `new-bid-${bid.id}`,
            userId: 'all',
            type: NotificationType.NEW_BID,
            priority: 'low',
            title: '➕ New Bid Created',
            message: `${bid.projectName} has been added`,
            bidId: bid.id,
            bidName: bid.projectName,
            isRead: false,
            isDismissed: false,
            browserNotificationSent: false,
            createdAt: new Date().toISOString()
        };

        this.processNotification(notification);
    }

    /**
     * Manually trigger a status change notification
     */
    createStatusChangeNotification(bid: BidRecord, previousStatus: string, newStatus: string) {
        if (!this.preferences.infoAlerts.statusChanges) return;

        const notification: BidNotification = {
            id: `status-${bid.id}-${newStatus}-${Date.now()}`,
            userId: 'all',
            type: NotificationType.STATUS_CHANGE,
            priority: 'low',
            title: '📊 Status Changed',
            message: `${bid.projectName} is now ${newStatus}`,
            bidId: bid.id,
            bidName: bid.projectName,
            isRead: false,
            isDismissed: false,
            browserNotificationSent: false,
            createdAt: new Date().toISOString()
        };

        this.processNotification(notification);
    }
}

// Factory function to create notification engine
export function createNotificationEngine(config: Partial<NotificationEngineConfig> = {}) {
    return new NotificationEngine({
        pollingIntervalMs: 60000, // 1 minute default
        ...config
    });
}

export type { NotificationEngineConfig };
export { NotificationEngine };
