/**
 * Browser Notifications Service
 * Wrapper for the Web Notification API
 */

export type NotificationPermission = 'granted' | 'denied' | 'default';

export interface BrowserNotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    onClick?: () => void;
}

class BrowserNotificationService {
    private permissionStatus: NotificationPermission = 'default';

    constructor() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this.permissionStatus = Notification.permission as NotificationPermission;
        }
    }

    /**
     * Check if browser notifications are supported
     */
    isSupported(): boolean {
        return typeof window !== 'undefined' && 'Notification' in window;
    }

    /**
     * Get current permission status
     */
    getPermissionStatus(): NotificationPermission {
        if (!this.isSupported()) return 'denied';
        return Notification.permission as NotificationPermission;
    }

    /**
     * Request notification permission from user
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) {
            console.warn('Browser notifications not supported');
            return 'denied';
        }

        try {
            const permission = await Notification.requestPermission();
            this.permissionStatus = permission as NotificationPermission;
            return this.permissionStatus;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'denied';
        }
    }

    /**
     * Show a browser notification
     */
    async show(options: BrowserNotificationOptions): Promise<boolean> {
        if (!this.isSupported()) {
            console.warn('Browser notifications not supported');
            return false;
        }

        if (this.permissionStatus !== 'granted') {
            const permission = await this.requestPermission();
            if (permission !== 'granted') {
                console.warn('Notification permission not granted');
                return false;
            }
        }

        try {
            const notification = new Notification(options.title, {
                body: options.body,
                icon: options.icon || '/favicon.ico',
                tag: options.tag,
                requireInteraction: options.requireInteraction ?? false,
            });

            if (options.onClick) {
                notification.onclick = () => {
                    window.focus();
                    options.onClick?.();
                    notification.close();
                };
            }

            // Auto-close after 10 seconds if not requiring interaction
            if (!options.requireInteraction) {
                setTimeout(() => notification.close(), 10000);
            }

            return true;
        } catch (error) {
            console.error('Error showing notification:', error);
            return false;
        }
    }

    /**
     * Show a deadline notification
     */
    async showDeadlineAlert(bidName: string, timeRemaining: string, bidId: string, onNavigate: (id: string) => void): Promise<boolean> {
        return this.show({
            title: '⏰ Deadline Alert',
            body: `${bidName} due in ${timeRemaining}!`,
            tag: `deadline-${bidId}`,
            requireInteraction: true,
            onClick: () => onNavigate(bidId)
        });
    }

    /**
     * Show a reminder notification
     */
    async showReminderAlert(title: string, eventId: string, onClick?: () => void): Promise<boolean> {
        return this.show({
            title: '🔔 Reminder',
            body: title,
            tag: `reminder-${eventId}`,
            requireInteraction: false,
            onClick
        });
    }

    /**
     * Show a meeting notification
     */
    async showMeetingAlert(bidName: string, timeRemaining: string, bidId: string, onNavigate: (id: string) => void): Promise<boolean> {
        return this.show({
            title: '🤝 Pre-bid Meeting',
            body: `Meeting for ${bidName} in ${timeRemaining}`,
            tag: `meeting-${bidId}`,
            requireInteraction: true,
            onClick: () => onNavigate(bidId)
        });
    }
}

// Export singleton instance
export const browserNotifications = new BrowserNotificationService();
export default browserNotifications;
