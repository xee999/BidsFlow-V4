import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckCircle2,
  BarChart3,
  AlertTriangle,
  Settings,
  Archive,
  Edit3,
  Calculator,
  Search,
  Layers,
  Sparkles,
  Users,
  Trash2,
  Calendar
} from 'lucide-react';

export const COLORS = {
  jazzRed: '#D32F2F',
  jazzNavy: '#1E3A5F',
  jazzYellow: '#FFC107',
  bgGray: '#F8FAFC'
};

export const SOLUTION_OPTIONS = [
  'Quantica',
  'GSM Data',
  'M2M (Devices Only)',
  'IoT',
  'IT Devices (Laptop/Desktop)',
  'Mobile Devices (Phone or Tablet)',
  'CPaaS',
  'Cloud & IT',
  'Managed Services',
  'Fixed Connectivity',
  'System Integration'
];
export const SOLUTION_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  'Quantica': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  'GSM Data': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  'M2M (Devices Only)': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  'IoT': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'IT Devices (Laptop/Desktop)': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  'Mobile Devices (Phone or Tablet)': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  'CPaaS': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  'Cloud & IT': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Managed Services': { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  'Fixed Connectivity': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  'System Integration': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' }
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'all-bids', label: 'All Bids', icon: <FileText size={20} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
  { id: 'studio', label: 'Proposal Studio', icon: <Edit3 size={20} /> },
  { id: 'vault', label: 'Corporate Vault', icon: <Archive size={20} /> },
  { id: 'calculator', label: 'Margin Calculator', icon: <Calculator size={20} /> },
  { id: 'approvals', label: 'Approvals', icon: <CheckCircle2 size={20} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} /> },
  { id: 'risk-watch', label: 'Risk Watch', icon: <AlertTriangle size={20} /> },
  { id: 'delete-manager', label: 'Delete Bids', icon: <Trash2 size={20} /> },
  { id: 'user-management', label: 'User Management', icon: <Users size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> }
];


export const STAGE_ICONS: Record<string, React.ReactNode> = {
  'Intake': <FileText size={18} />,
  'Qualification': <Layers size={18} />,
  'Solutioning': <Edit3 size={18} />,
  'Pricing': <Calculator size={18} />,
  'Compliance': <CheckCircle2 size={18} />,
  'Final Review': <CheckCircle2 size={18} />
};
