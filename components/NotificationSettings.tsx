/**
 * NotificationSettings Component
 * Preferences panel for configuring notification behavior
 * Self-contained with internal state management using localStorage
 */

import React, { useState, useEffect } from 'react';
import { Bell, Clock, Calendar, Users, AlertTriangle, FileText, BellRing, BellOff } from 'lucide-react';
import { clsx } from 'clsx';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../types';
import { browserNotifications } from '../services/browserNotifications';

const PREFS_STORAGE_KEY = 'bidsflow_notification_prefs';

interface NotificationSettingsProps {
    // All props are optional - component manages its own state
    externalPreferences?: Omit<NotificationPreferences, 'userId'>;
    onExternalUpdate?: (updates: Partial<Omit<NotificationPreferences, 'userId'>>) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
    externalPreferences,
    onExternalUpdate
}) => {
    // Internal state - either use external props or localStorage
    const [preferences, setPreferences] = useState<Omit<NotificationPreferences, 'userId'>>(
        externalPreferences || DEFAULT_NOTIFICATION_PREFERENCES
    );
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default'>('default');

    // Load preferences from localStorage on mount
    useEffect(() => {
        if (!externalPreferences) {
            try {
                const stored = localStorage.getItem(PREFS_STORAGE_KEY);
                if (stored) {
                    setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) });
                }
            } catch (e) {
                console.warn('Failed to load notification preferences');
            }
        }
        setPermissionStatus(browserNotifications.getPermissionStatus());
    }, [externalPreferences]);

    // Save preferences to localStorage when they change
    useEffect(() => {
        if (!externalPreferences) {
            try {
                localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
            } catch (e) {
                console.warn('Failed to save notification preferences');
            }
        }
    }, [preferences, externalPreferences]);

    const onUpdate = (updates: Partial<Omit<NotificationPreferences, 'userId'>>) => {
        if (externalPreferences && onExternalUpdate) {
            onExternalUpdate(updates);
        } else {
            setPreferences(prev => ({ ...prev, ...updates }));
        }
    };

    const onRequestPermission = async () => {
        const status = await browserNotifications.requestPermission();
        setPermissionStatus(status);
    };

    const isPermissionGranted = permissionStatus === 'granted';


    const SectionCard: React.FC<{
        title: string;
        icon: React.ReactNode;
        iconColor: string;
        children: React.ReactNode;
    }> = ({ title, icon, iconColor, children }) => (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", iconColor)}>
                    {icon}
                </div>
                <h4 className="text-sm font-bold text-gray-700">{title}</h4>
            </div>
            <div className="p-4 space-y-4">
                {children}
            </div>
        </div>
    );

    const Toggle: React.FC<{
        label: string;
        checked: boolean;
        onChange: (checked: boolean) => void;
        description?: string;
    }> = ({ label, checked, onChange, description }) => (
        <div className="flex items-start justify-between gap-4">
            <div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
                {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={clsx(
                    "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
                    checked ? "bg-blue-500" : "bg-gray-200"
                )}
            >
                <span
                    className={clsx(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
                        checked && "translate-x-5"
                    )}
                />
            </button>
        </div>
    );

    const IntervalSelector: React.FC<{
        options: { value: string; label: string }[];
        selected: string[];
        onChange: (selected: string[]) => void;
    }> = ({ options, selected, onChange }) => (
        <div className="flex flex-wrap gap-2">
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => {
                        const newSelected = selected.includes(option.value)
                            ? selected.filter(v => v !== option.value)
                            : [...selected, option.value];
                        onChange(newSelected);
                    }}
                    className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        selected.includes(option.value)
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Browser Permission Banner */}
            {!isPermissionGranted && (
                <div className={clsx(
                    "flex items-center gap-4 p-4 rounded-xl border",
                    permissionStatus === 'denied'
                        ? "bg-red-50 border-red-200"
                        : "bg-blue-50 border-blue-200"
                )}>
                    <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        permissionStatus === 'denied' ? "bg-red-100" : "bg-blue-100"
                    )}>
                        {permissionStatus === 'denied' ? (
                            <BellOff size={20} className="text-red-500" />
                        ) : (
                            <BellRing size={20} className="text-blue-500" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h4 className={clsx(
                            "text-sm font-bold",
                            permissionStatus === 'denied' ? "text-red-700" : "text-blue-700"
                        )}>
                            {permissionStatus === 'denied'
                                ? "Browser Notifications Blocked"
                                : "Enable Browser Notifications"
                            }
                        </h4>
                        <p className={clsx(
                            "text-xs mt-0.5",
                            permissionStatus === 'denied' ? "text-red-600" : "text-blue-600"
                        )}>
                            {permissionStatus === 'denied'
                                ? "You've blocked notifications. Please enable them in your browser settings."
                                : "Get notified about deadlines and events even when this tab is in the background."
                            }
                        </p>
                    </div>
                    {permissionStatus !== 'denied' && (
                        <button
                            onClick={onRequestPermission}
                            className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Enable
                        </button>
                    )}
                </div>
            )}

            {/* Master Toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <Toggle
                    label="Browser Notifications"
                    description="Show system notifications for urgent events"
                    checked={preferences.browserNotificationsEnabled}
                    onChange={(checked) => onUpdate({ browserNotificationsEnabled: checked })}
                />
            </div>

            {/* Deadline Alerts */}
            <SectionCard
                title="Bid Deadlines"
                icon={<Clock size={16} className="text-white" />}
                iconColor="bg-red-500"
            >
                <Toggle
                    label="Enable deadline alerts"
                    checked={preferences.deadlineAlerts.enabled}
                    onChange={(enabled) => onUpdate({
                        deadlineAlerts: { ...preferences.deadlineAlerts, enabled }
                    })}
                />

                {preferences.deadlineAlerts.enabled && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                                Alert me before deadline
                            </label>
                            <IntervalSelector
                                options={[
                                    { value: '24h', label: '24 hours' },
                                    { value: '12h', label: '12 hours' },
                                    { value: '2h', label: '2 hours' },
                                    { value: '1h', label: '1 hour' }
                                ]}
                                selected={preferences.deadlineAlerts.intervals}
                                onChange={(intervals) => onUpdate({
                                    deadlineAlerts: { ...preferences.deadlineAlerts, intervals: intervals as any }
                                })}
                            />
                        </div>

                        <Toggle
                            label="Show browser popup"
                            description="Display system notification"
                            checked={preferences.deadlineAlerts.browserPopup}
                            onChange={(browserPopup) => onUpdate({
                                deadlineAlerts: { ...preferences.deadlineAlerts, browserPopup }
                            })}
                        />
                    </>
                )}
            </SectionCard>

            {/* Calendar Events */}
            <SectionCard
                title="Calendar Events & Reminders"
                icon={<Calendar size={16} className="text-white" />}
                iconColor="bg-blue-500"
            >
                <Toggle
                    label="Enable calendar alerts"
                    checked={preferences.calendarAlerts.enabled}
                    onChange={(enabled) => onUpdate({
                        calendarAlerts: { ...preferences.calendarAlerts, enabled }
                    })}
                />

                {preferences.calendarAlerts.enabled && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                                Alert me before event
                            </label>
                            <IntervalSelector
                                options={[
                                    { value: '1d', label: '1 day' },
                                    { value: '1h', label: '1 hour' },
                                    { value: '15m', label: '15 min' },
                                    { value: 'at_time', label: 'At time' }
                                ]}
                                selected={preferences.calendarAlerts.intervals}
                                onChange={(intervals) => onUpdate({
                                    calendarAlerts: { ...preferences.calendarAlerts, intervals: intervals as any }
                                })}
                            />
                        </div>

                        <Toggle
                            label="Show browser popup"
                            checked={preferences.calendarAlerts.browserPopup}
                            onChange={(browserPopup) => onUpdate({
                                calendarAlerts: { ...preferences.calendarAlerts, browserPopup }
                            })}
                        />
                    </>
                )}
            </SectionCard>

            {/* Pre-bid Meetings */}
            <SectionCard
                title="Pre-bid Meetings"
                icon={<Users size={16} className="text-white" />}
                iconColor="bg-purple-500"
            >
                <Toggle
                    label="Enable meeting alerts"
                    checked={preferences.meetingAlerts.enabled}
                    onChange={(enabled) => onUpdate({
                        meetingAlerts: { ...preferences.meetingAlerts, enabled }
                    })}
                />

                {preferences.meetingAlerts.enabled && (
                    <>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                                Alert me before meeting
                            </label>
                            <IntervalSelector
                                options={[
                                    { value: '1d', label: '1 day' },
                                    { value: '2h', label: '2 hours' }
                                ]}
                                selected={preferences.meetingAlerts.intervals}
                                onChange={(intervals) => onUpdate({
                                    meetingAlerts: { ...preferences.meetingAlerts, intervals: intervals as any }
                                })}
                            />
                        </div>

                        <Toggle
                            label="Show browser popup"
                            checked={preferences.meetingAlerts.browserPopup}
                            onChange={(browserPopup) => onUpdate({
                                meetingAlerts: { ...preferences.meetingAlerts, browserPopup }
                            })}
                        />
                    </>
                )}
            </SectionCard>

            {/* Stage Progress */}
            <SectionCard
                title="Bid Stage Progress"
                icon={<AlertTriangle size={16} className="text-white" />}
                iconColor="bg-orange-500"
            >
                <Toggle
                    label="Stage transitions"
                    description="Notify when a bid moves to a new stage"
                    checked={preferences.stageAlerts.transitions}
                    onChange={(transitions) => onUpdate({
                        stageAlerts: { ...preferences.stageAlerts, transitions }
                    })}
                />

                <Toggle
                    label="Stalled bid alerts"
                    description="Warn when bids haven't moved stages"
                    checked={preferences.stageAlerts.stalledAlerts}
                    onChange={(stalledAlerts) => onUpdate({
                        stageAlerts: { ...preferences.stageAlerts, stalledAlerts }
                    })}
                />

                {preferences.stageAlerts.stalledAlerts && (
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                            Alert after (days without progress)
                        </label>
                        <div className="flex items-center gap-2">
                            {[2, 3, 5, 7].map(days => (
                                <button
                                    key={days}
                                    onClick={() => onUpdate({
                                        stageAlerts: { ...preferences.stageAlerts, stalledThresholdDays: days }
                                    })}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                        preferences.stageAlerts.stalledThresholdDays === days
                                            ? "bg-orange-500 text-white"
                                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    )}
                                >
                                    {days} days
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <Toggle
                    label="Show browser popup"
                    checked={preferences.stageAlerts.browserPopup}
                    onChange={(browserPopup) => onUpdate({
                        stageAlerts: { ...preferences.stageAlerts, browserPopup }
                    })}
                />
            </SectionCard>

            {/* Informational */}
            <SectionCard
                title="Informational Alerts"
                icon={<FileText size={16} className="text-white" />}
                iconColor="bg-gray-500"
            >
                <Toggle
                    label="New bids created"
                    checked={preferences.infoAlerts.newBids}
                    onChange={(newBids) => onUpdate({
                        infoAlerts: { ...preferences.infoAlerts, newBids }
                    })}
                />

                <Toggle
                    label="Bid status changes"
                    description="Won, Lost, No-Bid updates"
                    checked={preferences.infoAlerts.statusChanges}
                    onChange={(statusChanges) => onUpdate({
                        infoAlerts: { ...preferences.infoAlerts, statusChanges }
                    })}
                />

                <Toggle
                    label="Document uploads"
                    checked={preferences.infoAlerts.documents}
                    onChange={(documents) => onUpdate({
                        infoAlerts: { ...preferences.infoAlerts, documents }
                    })}
                />

                <Toggle
                    label="Team notes"
                    checked={preferences.infoAlerts.notes}
                    onChange={(notes) => onUpdate({
                        infoAlerts: { ...preferences.infoAlerts, notes }
                    })}
                />
            </SectionCard>

            {/* Reset to Defaults */}
            <button
                onClick={() => onUpdate(DEFAULT_NOTIFICATION_PREFERENCES)}
                className="w-full py-3 text-center text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
                Reset to Default Settings
            </button>
        </div>
    );
};

export default NotificationSettings;
