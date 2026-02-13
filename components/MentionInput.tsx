import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { User, BidRecord } from '../types';

interface MentionInputProps {
    value: string;
    onChange: (value: string, mentionedUserIds: string[], taggedBidIds: string[]) => void;
    placeholder?: string;
    users: User[];
    bids?: BidRecord[];
    onSubmit?: () => void;
    className?: string;
    autoFocus?: boolean;
    rows?: number;
}

type TriggerType = '@' | '#';

const MentionInput: React.FC<MentionInputProps> = ({
    value,
    onChange,
    placeholder = "Type something... Use @ for users, # for bids",
    users,
    bids = [],
    onSubmit,
    className,
    autoFocus = false,
    rows = 4
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [activeTrigger, setActiveTrigger] = useState<TriggerType | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter users (exclude inactive)
    const filteredUsers = users
        .filter(user => user.isActive !== false)
        .filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

    // Filter bids
    const filteredBids = bids
        .filter(bid =>
            bid.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bid.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bid.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const filteredItems = activeTrigger === '#' ? filteredBids : filteredUsers;

    // Extract mentioned user IDs from text
    const extractMentionedUserIds = useCallback((text: string): string[] => {
        const mentionRegex = /@(\w+(?:\s\w+)?)/g;
        const mentions: string[] = [];
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            const mentionName = match[1];
            const user = users.find(u =>
                u.name.toLowerCase().replace(/\s+/g, ' ').trim() === mentionName.toLowerCase().replace(/\s+/g, ' ').trim()
            );
            if (user) {
                mentions.push(user.id);
            }
        }

        return [...new Set(mentions)];
    }, [users]);

    // Extract tagged bid IDs from text
    const extractTaggedBidIds = useCallback((text: string): string[] => {
        if (!bids || bids.length === 0) return [];

        const foundIds: string[] = [];

        // 1. Match IDs (like #bid-123)
        const idRegex = /#([\w-]+)/g;
        let idMatch;
        while ((idMatch = idRegex.exec(text)) !== null) {
            const tagId = idMatch[1];
            const bid = bids.find(b => b.id.toLowerCase() === tagId.toLowerCase());
            if (bid) foundIds.push(bid.id);
        }

        // 2. Match Project Names (like #Project Name) - Case insensitive
        // Sort bids by name length descending to handle overlapping names (e.g. "Apple" vs "Apple Pie")
        const sortedBids = [...bids].sort((a, b) => (b.projectName?.length || 0) - (a.projectName?.length || 0));

        sortedBids.forEach(bid => {
            if (!bid.projectName) return;
            const escapedName = bid.projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Look for # followed by the exact project name, ending at a space or end of string
            const nameRegex = new RegExp(`#${escapedName}(?=\\s|$)`, 'gi');
            if (nameRegex.test(text)) {
                foundIds.push(bid.id);
            }
        });

        return [...new Set(foundIds)];
    }, [bids]);

    // Handle text change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursor = e.target.selectionStart;
        setCursorPosition(cursor);

        // Check if we should show the dropdown
        const textBeforeCursor = newValue.slice(0, cursor);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        const lastHashIndex = textBeforeCursor.lastIndexOf('#');

        // Determine which trigger is more recent and valid
        const triggerPos = Math.max(lastAtIndex, lastHashIndex);

        if (triggerPos !== -1) {
            const trigger = textBeforeCursor[triggerPos] as TriggerType;
            const textAfterTrigger = textBeforeCursor.slice(triggerPos + 1);

            // Only show dropdown if there's no space after trigger or if we're still typing a name
            if (!textAfterTrigger.includes('\n') && !textAfterTrigger.includes(' ') && textAfterTrigger.length <= 30) {
                setSearchQuery(textAfterTrigger);
                setShowDropdown(true);
                setSelectedIndex(0);
                setActiveTrigger(trigger);

                // Calculate dropdown position
                if (textareaRef.current) {
                    const lineHeight = 20;
                    const lines = textBeforeCursor.split('\n');
                    const currentLine = lines.length - 1;
                    const rect = textareaRef.current.getBoundingClientRect();

                    setDropdownPosition({
                        top: (currentLine + 1) * lineHeight + 8,
                        left: Math.min((triggerPos % 50) * 8, rect.width - 220)
                    });
                }
            } else {
                setShowDropdown(false);
                setActiveTrigger(null);
            }
        } else {
            setShowDropdown(false);
            setActiveTrigger(null);
        }

        const mentionedIds = extractMentionedUserIds(newValue);
        const taggedIds = extractTaggedBidIds(newValue);
        onChange(newValue, mentionedIds, taggedIds);
    };

    // Insert mention at cursor position
    const insertItem = (item: User | BidRecord) => {
        if (!textareaRef.current) return;

        const isBid = 'projectName' in item;
        const trigger = isBid ? '#' : '@';
        const displayValue = isBid ? (item as BidRecord).projectName : (item as User).name;

        const textBeforeCursor = value.slice(0, cursorPosition);
        const textAfterCursor = value.slice(cursorPosition);
        const lastTriggerIndex = textBeforeCursor.lastIndexOf(trigger);

        if (lastTriggerIndex !== -1) {
            const newValue =
                textBeforeCursor.slice(0, lastTriggerIndex) +
                `${trigger}${displayValue} ` +
                textAfterCursor;

            const mentionedIds = extractMentionedUserIds(newValue);
            const taggedIds = extractTaggedBidIds(newValue);
            onChange(newValue, mentionedIds, taggedIds);
            setShowDropdown(false);
            setActiveTrigger(null);

            // Focus and set cursor after the mention
            setTimeout(() => {
                if (textareaRef.current) {
                    const newCursor = lastTriggerIndex + displayValue.length + 2;
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newCursor, newCursor);
                }
            }, 0);
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showDropdown && filteredItems.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredItems.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredItems.length - 1
                );
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertItem(filteredItems[selectedIndex]);
            } else if (e.key === 'Escape') {
                setShowDropdown(false);
                setActiveTrigger(null);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit?.();
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
                setActiveTrigger(null);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDropdown]);

    // Scroll selected item into view
    useEffect(() => {
        if (showDropdown && dropdownRef.current) {
            const selectedEl = dropdownRef.current.children[selectedIndex] as HTMLElement;
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, showDropdown]);

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                rows={rows}
                className={clsx(
                    "w-full resize-none outline-none",
                    className
                )}
            />

            {/* Dropdown */}
            {showDropdown && filteredItems.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 py-2 w-72 max-h-64 overflow-y-auto z-[10200]"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    {filteredItems.slice(0, 8).map((item, index) => {
                        const isBid = 'projectName' in item;
                        const user = !isBid ? (item as User) : null;
                        const bid = isBid ? (item as BidRecord) : null;

                        return (
                            <button
                                key={item.id}
                                onClick={() => insertItem(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                                    index === selectedIndex
                                        ? "bg-blue-50"
                                        : "hover:bg-gray-50"
                                )}
                            >
                                {isBid ? (
                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 text-xs font-bold shrink-0 border border-red-100">
                                        BD
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {user?.avatarType === 'image' && user?.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {isBid ? bid?.projectName : user?.name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide truncate">
                                        {isBid ? `${bid?.id} • ${bid?.customerName}` : (user?.roleName || user?.role?.replace(/_/g, ' '))}
                                    </p>
                                </div>
                            </button>
                        );
                    })}

                    {filteredItems.length > 8 && (
                        <div className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100 mt-1">
                            +{filteredItems.length - 8} more items
                        </div>
                    )}
                </div>
            )}

            {/* No results message */}
            {showDropdown && filteredItems.length === 0 && searchQuery.length > 0 && (
                <div
                    className="absolute bg-white rounded-xl shadow-lg border border-gray-200 py-3 px-4 w-56 z-[10200]"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    <p className="text-sm text-gray-500">No {activeTrigger === '#' ? 'bids' : 'users'} found</p>
                </div>
            )}
        </div>
    );
};

export default MentionInput;
