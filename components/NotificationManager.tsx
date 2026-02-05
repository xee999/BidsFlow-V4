
import React, { useEffect } from 'react';
import { BidRecord, CalendarEvent } from '../types';
import { sanitizeDateValue } from '../services/utils';

interface NotificationManagerProps {
    bids: BidRecord[];
    events: CalendarEvent[];
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ bids, events }) => {

    useEffect(() => {
        // Request permission on mount
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const checkDueItems = () => {
            if (Notification.permission !== 'granted') return;

            const now = new Date();
            // Local YYYY-MM-DD
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            console.log(`[NotificationManager] Checking for items due on ${todayStr}`);

            // 1. Check Bids
            bids.forEach(bid => {
                const bidDate = sanitizeDateValue(bid.deadline);
                if (bidDate === todayStr) {
                    sendNotification(
                        `Bid Deadline Today`,
                        `Project: ${bid.projectName} is due today.`
                    );
                }
            });

            // 2. Check Calendar Events
            events.forEach(event => {
                const eventDate = sanitizeDateValue(event.date); // Assuming event.date is string YYYY-MM-DD or comparable
                if (eventDate === todayStr) {
                    sendNotification(
                        `Event Today: ${event.title}`,
                        event.description || 'You have an event scheduled for today.'
                    );
                }
            });
        };

        const sendNotification = (title: string, body: string) => {
            // Prevent spamming the same notification on every refresh/render
            // Store a key with today's date
            const todayKey = new Date().toDateString(); // "Thu Feb 05 2026"
            const storageKey = `notif_sent_${todayKey}_${title.replace(/\s/g, '_')}`;

            if (localStorage.getItem(storageKey)) {
                console.log(`[NotificationManager] Notification already sent for: ${title}`);
                return;
            }

            try {
                // Determine icon based on platform or default
                const icon = '/vite.svg'; // Default vite icon or any asset we have

                const notification = new Notification(title, {
                    body: body,
                    icon: icon,
                    requireInteraction: false, // Disappears automatically
                });

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                // Mark as sent
                localStorage.setItem(storageKey, 'true');
                console.log(`[NotificationManager] Sent notification: ${title}`);

            } catch (err) {
                console.error("[NotificationManager] Failed to send notification:", err);
            }
        };

        // Run check on mount and whenever bids/events change
        // We also want to ensure we don't run it too aggressively if data re-fetches often
        // But for now, simple effect dependency is fine.
        if (bids.length > 0 || events.length > 0) {
            checkDueItems();
        }

    }, [bids, events]);

    return null; // Logic-only component
};
