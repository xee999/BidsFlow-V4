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
  Users
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
  'Cloud Solutions',
  'Fixed Connectivity',
  'System Integration'
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'all-bids', label: 'All Bids', icon: <FileText size={20} /> },
  { id: 'studio', label: 'Proposal Studio', icon: <Edit3 size={20} /> },
  { id: 'vault', label: 'Corporate Vault', icon: <Archive size={20} /> },
  { id: 'calculator', label: 'Margin Calculator', icon: <Calculator size={20} /> },
  { id: 'approvals', label: 'Approvals', icon: <CheckCircle2 size={20} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} /> },
  { id: 'risk-watch', label: 'Risk Watch', icon: <AlertTriangle size={20} /> },
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
