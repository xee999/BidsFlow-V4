/**
 * MentionInput Component
 * Textarea with @mention autocomplete functionality
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { User } from '../types';

interface MentionInputProps {
    value: string;
    onChange: (value: string, mentionedUserIds: string[]) => void;
    placeholder?: string;
    users: User[];
    onSubmit?: () => void;
    className?: string;
    autoFocus?: boolean;
    rows?: number;
}

const MentionInput: React.FC<MentionInputProps> = ({
    value,
    onChange,
    placeholder = "Type something... Use @ to mention users",
    users,
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter users (exclude inactive)
    const filteredUsers = users
        .filter(user => user.isActive !== false)
        .filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

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

    // Handle text change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursor = e.target.selectionStart;
        setCursorPosition(cursor);

        // Check if we should show the dropdown
        const textBeforeCursor = newValue.slice(0, cursor);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
            // Only show dropdown if there's no space after @ or if we're still typing a name
            if (!textAfterAt.includes('\n') && textAfterAt.length <= 30) {
                setSearchQuery(textAfterAt);
                setShowDropdown(true);
                setSelectedIndex(0);

                // Calculate dropdown position
                if (textareaRef.current) {
                    const lineHeight = 20;
                    const lines = textBeforeCursor.split('\n');
                    const currentLine = lines.length - 1;
                    const rect = textareaRef.current.getBoundingClientRect();

                    setDropdownPosition({
                        top: (currentLine + 1) * lineHeight + 8,
                        left: Math.min((lastAtIndex % 50) * 8, rect.width - 220)
                    });
                }
            } else {
                setShowDropdown(false);
            }
        } else {
            setShowDropdown(false);
        }

        const mentionedIds = extractMentionedUserIds(newValue);
        onChange(newValue, mentionedIds);
    };

    // Insert mention at cursor position
    const insertMention = (user: User) => {
        if (!textareaRef.current) return;

        const textBeforeCursor = value.slice(0, cursorPosition);
        const textAfterCursor = value.slice(cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const newValue =
                textBeforeCursor.slice(0, lastAtIndex) +
                `@${user.name} ` +
                textAfterCursor;

            const mentionedIds = extractMentionedUserIds(newValue);
            onChange(newValue, mentionedIds);
            setShowDropdown(false);

            // Focus and set cursor after the mention
            setTimeout(() => {
                if (textareaRef.current) {
                    const newCursor = lastAtIndex + user.name.length + 2;
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newCursor, newCursor);
                }
            }, 0);
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showDropdown && filteredUsers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredUsers.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredUsers.length - 1
                );
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(filteredUsers[selectedIndex]);
            } else if (e.key === 'Escape') {
                setShowDropdown(false);
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

            {/* Mention Dropdown */}
            {showDropdown && filteredUsers.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 py-2 w-56 max-h-48 overflow-y-auto z-[10200]"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    {filteredUsers.slice(0, 8).map((user, index) => (
                        <button
                            key={user.id}
                            onClick={() => insertMention(user)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={clsx(
                                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                                index === selectedIndex
                                    ? "bg-blue-50"
                                    : "hover:bg-gray-50"
                            )}
                        >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {user.avatarType === 'image' && user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                                )}
                            </div>

                            {/* User info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {user.name}
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide truncate">
                                    {user.roleName || user.role?.replace(/_/g, ' ')}
                                </p>
                            </div>
                        </button>
                    ))}

                    {filteredUsers.length > 8 && (
                        <div className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-100 mt-1">
                            +{filteredUsers.length - 8} more users
                        </div>
                    )}
                </div>
            )}

            {/* No results message */}
            {showDropdown && filteredUsers.length === 0 && searchQuery.length > 0 && (
                <div
                    className="absolute bg-white rounded-xl shadow-lg border border-gray-200 py-3 px-4 w-56 z-[10200]"
                    style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                >
                    <p className="text-sm text-gray-500">No users found</p>
                </div>
            )}
        </div>
    );
};

export default MentionInput;
