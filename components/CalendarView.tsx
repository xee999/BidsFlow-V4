
import React, { useState, useMemo, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Plus, X,
    StickyNote, Calendar as CalendarIcon,
    Clock, Tag, Pin, Rocket, Archive,
    Search, Trash2, FileText, Pencil, ChevronDown, Package
} from 'lucide-react';
import { SOLUTION_COLORS } from '../constants.tsx';
import { BidRecord, BidNote, CalendarEvent, User, BidStage, BidStatus } from '../types.ts';
import { clsx } from 'clsx';
import { sanitizeDateValue } from '../services/utils';
import MentionInput from './MentionInput';
import { userService } from '../services/authService.ts';
import { calendarApi } from '../services/api.ts';

const STAGE_COLORS: Record<string, { bg: string, text: string, border: string }> = {
    [BidStage.INTAKE]: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
    [BidStage.QUALIFICATION]: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    [BidStage.SOLUTIONING]: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
    [BidStage.PRICING]: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    [BidStage.COMPLIANCE]: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    [BidStage.FINAL_REVIEW]: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
};


interface CalendarViewProps {
    bids: BidRecord[];
    currentUser: User | null;
    onUpdateBid: (bid: BidRecord) => Promise<void>;
    onViewBid: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ bids, currentUser, onUpdateBid, onViewBid }) => {
    // DEBUG: Log received bids for calendar
    React.useEffect(() => {
        console.log("CalendarView mounted. Received bids:", bids.length);
        console.log("Sample Output Dates:", bids.slice(0, 3).map(b => `${b.projectName}: ${b.deadline}`));
    }, [bids]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedBid, setSelectedBid] = useState<BidRecord | null>(null);
    const [showNotePad, setShowNotePad] = useState<{ bidId: string, note?: BidNote } | null>(null);
    const [hoveredBid, setHoveredBid] = useState<{ bid: BidRecord, x: number, y: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, date: string } | null>(null);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [showAddEvent, setShowAddEvent] = useState<{ date: string, type?: 'note' | 'event' | 'reminder' } | null>(null);
    const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [activeSegment, setActiveSegment] = useState('Month');
    const [expandedDeliverables, setExpandedDeliverables] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [noteContent, setNoteContent] = useState('');
    const [noteMentionedUserIds, setNoteMentionedUserIds] = useState<string[]>([]);

    // Fetch users for @mention dropdown
    useEffect(() => {
        userService.getAll()
            .then(users => setAllUsers(users))
            .catch(err => console.warn('Failed to load users for mentions:', err));
    }, []);

    // Role-based permission check
    const isViewer = currentUser?.role === 'VIEWER';

    // Calendar Logic
    const monthData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        // Start from Sunday before the 1st
        const startDate = new Date(monthStart);
        startDate.setDate(monthStart.getDate() - monthStart.getDay());

        // End on Saturday after the last day
        const endDate = new Date(monthEnd);
        const daysToAdd = 6 - monthEnd.getDay();
        endDate.setDate(monthEnd.getDate() + daysToAdd);

        const days = [];
        const current = new Date(startDate);

        // Generate exactly 42 cells (6 weeks)
        while (days.length < 42) {
            const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
            days.push({
                day: current.getDate(),
                currentMonth: current.getMonth() === month,
                date: dateStr,
                monthAbbr: current.toLocaleString('default', { month: 'short' })
            });
            current.setDate(current.getDate() + 1);
        }

        return days;
    }, [currentDate]);

    const bidsByDate = useMemo(() => {
        const map: Record<string, BidRecord[]> = {};
        bids.forEach(bid => {
            const date = sanitizeDateValue(bid.deadline);
            if (date) {
                if (!map[date]) map[date] = [];
                map[date].push(bid);
            }
        });
        return map;
    }, [bids]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        calendarEvents.forEach(event => {
            const date = event.date.split('T')[0];
            if (!map[date]) map[date] = [];
            map[date].push(event);
        });
        return map;
    }, [calendarEvents]);

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToday = () => setCurrentDate(new Date());

    const handleDayContextMenu = (e: React.MouseEvent, date: string) => {
        if (isViewer) return; // VIEWER users cannot add events
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, date });
    };

    // Close context menu on any click outside
    React.useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        if (contextMenu) {
            window.addEventListener('mousedown', closeMenu);
            window.addEventListener('touchstart', closeMenu);
        }
        return () => {
            window.removeEventListener('mousedown', closeMenu);
            window.removeEventListener('touchstart', closeMenu);
        };
    }, [contextMenu]);

    // Fetch events from backend
    React.useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await calendarApi.getAll();
                setCalendarEvents(data);
            } catch (error) {
                console.error("Failed to fetch events", error);
            }
        };
        fetchEvents();
    }, []);

    const handleAddCalendarEvent = async () => {
        if (!currentUser || !showAddEvent || !newEventTitle) return;
        const type = showAddEvent.type || 'event';
        const newEvent: CalendarEvent = {
            id: `evt-${Date.now()}`,
            title: newEventTitle,
            date: showAddEvent.date,
            type,
            color: type === 'note' ? '#FBBF24' : type === 'event' ? '#3B82F6' : '#EF4444',
            createdBy: currentUser.name
        };

        setCalendarEvents([...calendarEvents, newEvent]);

        try {
            await calendarApi.create(newEvent);
        } catch (error) {
            console.error("Failed to save event", error);
        }

        setShowAddEvent(null);
        setNewEventTitle('');
    };

    const handleDeleteEvent = async () => {
        if (!viewingEvent || isViewer) return; // VIEWER users cannot delete
        setCalendarEvents(prev => prev.filter(e => e.id !== viewingEvent.id));
        setViewingEvent(null);

        try {
            await calendarApi.remove(viewingEvent.id);
        } catch (error) {
            console.error("Failed to delete event", error);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-white overflow-hidden select-none font-sans relative">
            {/* Compact Month Navigation */}
            <div className="flex items-center justify-center py-2 border-b border-gray-100 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-sm font-bold min-w-[140px] text-center text-gray-800 tracking-tight">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Weekday Headers */}
            <div className="border-b border-gray-200 bg-white shrink-0 w-full" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="text-[10px] font-bold text-gray-400 text-center py-2 tracking-wider uppercase">{day}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 w-full relative overflow-hidden" style={{ backgroundColor: '#EBEBEB' }}>
                <div
                    className="absolute inset-0 h-full w-full grid"
                    style={{
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                        gridTemplateRows: 'repeat(6, 1fr)',
                        gap: '1px'
                    }}
                >
                    {monthData.map((dayObj, i) => {
                        const dayBids = bidsByDate[dayObj.date] || [];
                        const dayEvents = eventsByDate[dayObj.date] || [];
                        const d = new Date();
                        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const isToday = dayObj.date === todayStr;
                        const isCurrentMonth = dayObj.currentMonth;
                        const isWeekend = i % 7 === 0 || i % 7 === 6; // Sunday (0) or Saturday (6)

                        return (
                            <div
                                key={i}
                                onContextMenu={(e) => handleDayContextMenu(e, dayObj.date)}
                                className={clsx(
                                    "relative group flex flex-col p-2 h-full w-full",
                                    !isCurrentMonth ? "text-gray-400" : "text-gray-800"
                                )}
                                style={{
                                    backgroundColor: isWeekend ? '#F2F2F2' : '#FFFFFF'
                                }}
                            >
                                {/* Date Number */}
                                <div
                                    className={clsx(
                                        "text-[11px] mb-1 transition-all self-end",
                                        dayObj.day === 1 ? "font-bold text-gray-900" : "font-medium text-gray-500",
                                        isToday && "w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                    )}
                                    style={isToday ? {
                                        backgroundColor: 'oklch(85.5% 0.138 181.071)',
                                        color: '#044E3B',
                                        fontWeight: '800'
                                    } : {}}
                                >
                                    {dayObj.day === 1 ? `${dayObj.monthAbbr} ${dayObj.day}` : dayObj.day}
                                </div>

                                {/* Events/Bids Container */}
                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                                    {/* Bids - Status-dependent color pills */}
                                    {dayBids.map(bid => (
                                        <div
                                            key={bid.id}
                                            onClick={(e) => { e.stopPropagation(); setSelectedBid(bid); }}
                                            onMouseEnter={(e) => setHoveredBid({ bid, x: e.clientX, y: e.clientY })}
                                            onMouseMove={(e) => setHoveredBid(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                                            onMouseLeave={() => setHoveredBid(null)}
                                            className={clsx(
                                                "flex items-center gap-1.5 px-2 py-1 text-white text-[10px] font-semibold cursor-pointer transition-all truncate rounded-full shadow-sm",
                                                bid.status === BidStatus.NO_BID ? "bg-slate-400 hover:bg-slate-500" : "bg-red-500 hover:bg-red-600"
                                            )}
                                        >
                                            <FileText size={10} className="shrink-0" />
                                            <span className="truncate">{bid.projectName}</span>
                                        </div>
                                    ))}

                                    {/* Events/Reminders/Notes - Distinct styles for each type */}
                                    {dayEvents.map(evt => {
                                        // Events: Blue rectangle
                                        if (evt.type === 'event') {
                                            return (
                                                <div
                                                    key={evt.id}
                                                    onClick={(e) => { e.stopPropagation(); setViewingEvent(evt); }}
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-blue-500 text-white text-[10px] font-semibold cursor-pointer hover:bg-blue-600 transition-all truncate rounded shadow-sm"
                                                >
                                                    <CalendarIcon size={10} className="shrink-0" />
                                                    <span className="truncate">{evt.title}</span>
                                                </div>
                                            );
                                        }
                                        // Reminders: Purple with circle dot
                                        if (evt.type === 'reminder') {
                                            return (
                                                <div
                                                    key={evt.id}
                                                    onClick={(e) => { e.stopPropagation(); setViewingEvent(evt); }}
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-semibold cursor-pointer hover:bg-purple-200 transition-all truncate rounded shadow-sm"
                                                >
                                                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full shrink-0" />
                                                    <Clock size={10} className="shrink-0" />
                                                    <span className="truncate">{evt.title}</span>
                                                </div>
                                            );
                                        }
                                        // Notes: Amber sticky note style
                                        return (
                                            <div
                                                key={evt.id}
                                                onClick={(e) => { e.stopPropagation(); setViewingEvent(evt); }}
                                                className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-semibold cursor-pointer hover:bg-amber-200 transition-all truncate rounded-sm shadow-sm relative"
                                                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)' }}
                                            >
                                                <Pencil size={10} className="shrink-0" />
                                                <span className="truncate">{evt.title}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Quick Add Button - Hidden for VIEWER */}
                                {isCurrentMonth && !isViewer && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowAddEvent({ date: dayObj.date }); }}
                                        className="absolute opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-gray-400 transition-all"
                                        style={{ bottom: '4px', right: '4px' }}
                                    >
                                        <Plus size={14} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bid Detail Modal */}
            {selectedBid && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-gray-200 relative overflow-hidden flex flex-col">
                        <div className="p-8 space-y-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{selectedBid.id}</span>
                                        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                        <span className={clsx(
                                            "px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider border",
                                            selectedBid.status === BidStatus.NO_BID ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-red-50 text-red-600 border-red-100"
                                        )}>
                                            {selectedBid.status === BidStatus.NO_BID ? 'No Bid' : 'Live Bid'}
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900 leading-snug">{selectedBid.projectName}</h2>
                                    <p className="text-gray-500 font-medium text-xs">{selectedBid.customerName}</p>
                                </div>
                                <button onClick={() => { setSelectedBid(null); setExpandedDeliverables(false); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="py-4 border-y border-gray-100 space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                    {/* Deadline Column */}
                                    <div className="flex items-start gap-2">
                                        <Clock size={12} className="text-gray-400 mt-1" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Deadline</span>
                                            <span className={clsx(
                                                "text-[11px] font-semibold leading-tight",
                                                selectedBid.status === BidStatus.NO_BID ? "text-slate-500" : "text-red-600"
                                            )}>
                                                {sanitizeDateValue(selectedBid.deadline) || selectedBid.deadline}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stage Column */}
                                    <div className="flex items-start gap-2">
                                        <Archive size={12} className="text-gray-400 mt-1" />
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Stage</span>
                                            {(() => {
                                                const stageColor = STAGE_COLORS[selectedBid.currentStage] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
                                                return (
                                                    <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border whitespace-nowrap", stageColor.bg, stageColor.text, stageColor.border)}>
                                                        {selectedBid.currentStage}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Solution Column */}
                                    <div className="flex items-start gap-2">
                                        <Tag size={12} className="text-gray-400 mt-1" />
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Solution</span>
                                            {(() => {
                                                const solutionName = selectedBid.requiredSolutions?.[0] || 'IT Services';
                                                const solutionColor = SOLUTION_COLORS[solutionName] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
                                                return (
                                                    <span className={clsx("px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border whitespace-nowrap", solutionColor.bg, solutionColor.text, solutionColor.border)}>
                                                        {solutionName}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Key Deliverables - Compact Full Width */}
                                {selectedBid.deliverablesSummary && selectedBid.deliverablesSummary.length > 0 && (
                                    <div className="pt-3 border-t border-gray-50">
                                        <div className="flex flex-wrap items-center gap-1.5 w-full">
                                            <div className="flex items-center gap-1 mr-1">
                                                <Package size={12} className="text-gray-400" />
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">Deliverables:</span>
                                            </div>
                                            {selectedBid.deliverablesSummary.slice(0, 15).map((d, i) => (
                                                <span key={i} className="px-1.5 py-0.5 bg-blue-50/50 text-blue-600 text-[9px] font-semibold rounded border border-blue-100/50 whitespace-nowrap">
                                                    {d.item} {d.quantity && `(${d.quantity})`}
                                                </span>
                                            ))}
                                            {selectedBid.deliverablesSummary.length > 15 && (
                                                <span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 text-[9px] font-bold rounded border border-gray-200">
                                                    +{selectedBid.deliverablesSummary.length - 15}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    onClick={() => onViewBid(selectedBid.id)}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold tracking-tight hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Rocket size={18} />
                                    Open Bid Lifecycle
                                </button>
                                {/* Add Note Button - Hidden for VIEWER */}
                                {!isViewer && (
                                    <button
                                        onClick={() => setShowNotePad({ bidId: selectedBid.id })}
                                        className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl flex items-center justify-center hover:bg-amber-100 transition-all active:scale-95"
                                    >
                                        <StickyNote size={20} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notes Preview */}
                        {selectedBid.notes && selectedBid.notes.length > 0 && (
                            <div className="bg-gray-50 p-6 border-t border-gray-200 flex flex-col gap-3">
                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Team Sticky Notes</span>
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {selectedBid.notes.map(note => (
                                        <div
                                            key={note.id}
                                            onClick={() => !isViewer && setShowNotePad({ bidId: selectedBid.id, note })}
                                            className={clsx(
                                                "min-w-[160px] p-3 bg-amber-100 border border-amber-200 rounded-lg shadow-sm group transition-all flex flex-col gap-2 relative",
                                                isViewer ? "cursor-default" : "cursor-pointer hover:shadow-md"
                                            )}
                                        >
                                            {/* Delete button - hidden for VIEWER */}
                                            {!isViewer && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const updatedNotes = selectedBid.notes?.filter(n => n.id !== note.id);
                                                        const updatedBid = { ...selectedBid, notes: updatedNotes };
                                                        setSelectedBid(updatedBid);
                                                        onUpdateBid(updatedBid);
                                                    }}
                                                    className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-400 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                                >
                                                    <X size={10} strokeWidth={3} />
                                                </button>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <Pin size={10} className="text-amber-400" />
                                                <span className="text-[8px] font-bold text-amber-700/50">{note.createdBy}</span>
                                            </div>
                                            <p className="text-[10px] font-semibold text-amber-900 leading-relaxed italic line-clamp-2">"{note.content}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sticky Note Popover */}
            {
                showNotePad && (
                    <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-[10100] flex items-center justify-center p-6">
                        <div className="bg-amber-50 w-80 min-h-[280px] p-6 shadow-2xl border border-amber-200 flex flex-col relative rounded-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[9px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5"><Pin size={12} /> {showNotePad.note ? 'Edit Note' : 'Post-it Note'}</span>
                                <button onClick={() => { setShowNotePad(null); setNoteContent(''); setNoteMentionedUserIds([]); }} className="p-1 hover:bg-amber-200 rounded text-amber-800/40"><X size={16} /></button>
                            </div>
                            <MentionInput
                                value={noteContent || showNotePad.note?.content || ''}
                                onChange={(value, userIds) => {
                                    setNoteContent(value);
                                    setNoteMentionedUserIds(userIds);
                                }}
                                users={allUsers}
                                placeholder="Type something... Use @ to mention team members"
                                autoFocus
                                rows={6}
                                className="flex-1 bg-transparent border-none text-amber-900 font-semibold text-sm leading-relaxed outline-none resize-none placeholder:text-amber-800/50"
                                onSubmit={() => {
                                    if (isViewer) return;
                                    const bid = bids.find(b => b.id === showNotePad.bidId);
                                    if (bid && currentUser) {
                                        const content = noteContent || showNotePad.note?.content || '';
                                        if (!content.trim()) return;
                                        let updatedNotes = bid.notes || [];

                                        if (showNotePad.note) {
                                            updatedNotes = updatedNotes.map(n =>
                                                n.id === showNotePad.note!.id ? { ...n, content, mentionedUserIds: noteMentionedUserIds } : n
                                            );
                                        } else {
                                            const newNote: BidNote = {
                                                id: `note-${Date.now()}`,
                                                content,
                                                color: '#FEF3C7',
                                                createdAt: new Date().toISOString(),
                                                createdBy: currentUser.name,
                                                mentionedUserIds: noteMentionedUserIds
                                            };
                                            updatedNotes = [...updatedNotes, newNote];
                                        }

                                        const updatedBid = { ...bid, notes: updatedNotes };
                                        if (selectedBid && selectedBid.id === bid.id) {
                                            setSelectedBid(updatedBid);
                                        }
                                        onUpdateBid(updatedBid);
                                    }
                                    setShowNotePad(null);
                                    setNoteContent('');
                                    setNoteMentionedUserIds([]);
                                }}
                            />
                            <div className="pt-3 border-t border-amber-800/10">
                                <p className="text-[8px] text-amber-800 font-bold uppercase text-center opacity-40 italic">Hit enter to {showNotePad.note ? 'update' : 'pin'} note • Use @ to mention</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Event Modal */}
            {
                showAddEvent && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-6">
                        <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border border-gray-200 relative flex flex-col gap-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {showAddEvent.type === 'note' ? 'New Note' : showAddEvent.type === 'event' ? 'New Event' : 'Add Reminder'}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium mt-1">
                                        {new Date(showAddEvent.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                                <button onClick={() => setShowAddEvent(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-all"><X size={20} /></button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                                    {[
                                        { id: 'event', label: 'Event', icon: <CalendarIcon size={14} /> },
                                        { id: 'reminder', label: 'Reminder', icon: <Clock size={14} /> },
                                        { id: 'note', label: 'Note', icon: <StickyNote size={14} /> }
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setShowAddEvent({ ...showAddEvent, type: t.id as any })}
                                            className={clsx(
                                                "flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
                                                showAddEvent.type === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:bg-gray-200/50"
                                            )}
                                        >
                                            {t.icon}
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Description / Title</label>
                                    <textarea
                                        autoFocus
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none resize-none placeholder:text-gray-400"
                                        placeholder={showAddEvent.type === 'note' ? "Write your note here..." : "What is this event about?"}
                                        rows={4}
                                        value={newEventTitle}
                                        onChange={(e) => setNewEventTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (newEventTitle.trim()) handleAddCalendarEvent();
                                            }
                                        }}
                                    />
                                    <div className="mt-2 flex justify-end px-1">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest opacity-60">Press enter to save</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* View Event Modal */}
            {
                viewingEvent && (
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] flex items-center justify-center p-6">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-200 relative flex flex-col gap-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{
                                            backgroundColor: viewingEvent.color + '20',
                                            color: viewingEvent.color
                                        }}
                                    >
                                        {viewingEvent.type === 'note' ? <StickyNote size={20} /> :
                                            viewingEvent.type === 'event' ? <CalendarIcon size={20} /> :
                                                <Clock size={20} />}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{viewingEvent.type}</span>
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight">{viewingEvent.title}</h3>
                                    </div>
                                </div>
                                <button onClick={() => setViewingEvent(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                            </div>

                            <div className="py-2">
                                <p className="text-sm font-medium text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    {viewingEvent.title}
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                                <span className="text-[10px] font-bold text-gray-400">Created by {viewingEvent.createdBy}</span>
                                <button
                                    onClick={handleDeleteEvent}
                                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all"
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Hover Tooltip for Bid Stage */}
            {hoveredBid && (
                <div
                    className="fixed z-[12000] pointer-events-none transition-opacity duration-150"
                    style={{
                        top: hoveredBid.y + 15,
                        left: hoveredBid.x + 15,
                    }}
                >
                    <div className={clsx(
                        "px-2 py-1 rounded-md shadow-lg border text-[10px] font-bold uppercase tracking-wider",
                        STAGE_COLORS[hoveredBid.bid.currentStage]?.bg || 'bg-white',
                        STAGE_COLORS[hoveredBid.bid.currentStage]?.text || 'text-gray-700',
                        STAGE_COLORS[hoveredBid.bid.currentStage]?.border || 'border-gray-200'
                    )}>
                        {hoveredBid.bid.currentStage}
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {
                contextMenu && (
                    <div
                        className="fixed bg-white border border-gray-200 shadow-2xl p-1.5 rounded-xl w-56 overflow-hidden select-none"
                        style={{
                            top: contextMenu.y,
                            left: contextMenu.x,
                            zIndex: 11000,
                            pointerEvents: 'auto'
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <div className="px-3 py-2 text-[10px] font-black text-gray-400 border-b border-gray-100 mb-1 flex items-center justify-between bg-gray-50/50 rounded-t-lg uppercase tracking-[0.15em]">
                            {contextMenu.date}
                        </div>
                        {[
                            { id: 'event', label: 'New Event', icon: <Plus size={16} />, color: 'text-blue-500' },
                            { id: 'reminder', label: 'Set Reminder', icon: <Clock size={16} />, color: 'text-red-500' },
                            { id: 'note', label: 'Quick Note', icon: <StickyNote size={16} />, color: 'text-amber-500' }
                        ].map(item => (
                            <div
                                key={item.id}
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const savedDate = contextMenu.date;
                                    setShowAddEvent({ date: savedDate, type: item.id as any });
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-[12px] font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer group active:bg-blue-100"
                            >
                                <span className={clsx(item.color, "transition-transform group-hover:scale-110")}>{item.icon}</span>
                                {item.label}
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
};

export default CalendarView;
