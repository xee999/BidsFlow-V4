
import React from 'react';
import { clsx } from 'clsx';
import { BidRecord } from '../types';

interface RichTextProps {
    text: string;
    bids?: BidRecord[];
    onTagClick?: (bidId: string) => void;
    className?: string;
}

const RichText: React.FC<RichTextProps> = ({ text, bids = [], onTagClick, className }) => {
    if (!text) return null;

    // Pattern to match @mentions and #tags
    // @(Name) or #Tag
    const combinedRegex = /(@\w+(?:\s\w+)?|#[\w\s.-]+(?=[\s,.:;!?]|$)|#[\w-]+)/g;

    const parts = text.split(combinedRegex);
    const matches = text.match(combinedRegex) || [];

    let matchIndex = 0;

    return (
        <span className={clsx("whitespace-pre-wrap", className)}>
            {parts.map((part, i) => {
                const currentMatch = matches[matchIndex];

                // If this part is our match
                if (part === currentMatch) {
                    matchIndex++;

                    if (part.startsWith('@')) {
                        return (
                            <span key={i} className="text-blue-600 font-bold bg-blue-50 px-1 rounded mx-0.5">
                                {part}
                            </span>
                        );
                    }

                    if (part.startsWith('#')) {
                        const tagContent = part.slice(1);
                        // Try to find if this matches a bid project name or ID
                        const bid = bids.find(b =>
                            b.id.toLowerCase() === tagContent.toLowerCase() ||
                            b.projectName?.toLowerCase() === tagContent.toLowerCase()
                        );

                        return (
                            <span
                                key={i}
                                onClick={(e) => {
                                    if (bid && onTagClick) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onTagClick(bid.id);
                                    }
                                }}
                                className={clsx(
                                    "font-bold px-1 rounded mx-0.5 transition-all text-xs border border-amber-300",
                                    bid ? "text-amber-700 bg-amber-100 hover:bg-amber-200 cursor-pointer shadow-sm" : "text-amber-600 bg-amber-50"
                                )}
                            >
                                {part}
                            </span>
                        );
                    }
                }

                return <span key={i}>{part}</span>;
            })}
        </span>
    );
};

export default RichText;
