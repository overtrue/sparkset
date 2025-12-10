import { ChartBar, Database, LayoutDashboard, MessagesSquare, Play, Sparkles } from 'lucide-react';

export type NavItem = {
  title: string;
  label?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'ghost';
  url: string;
};

export const mainNav: NavItem[] = [
  {
    title: '数据源',
    label: 'DS',
    icon: Database,
    url: '/',
  },
  {
    title: '查询工作台',
    label: 'QL',
    icon: ChartBar,
    url: '/query',
  },
  {
    title: '模板',
    label: 'TP',
    icon: LayoutDashboard,
    url: '/templates',
  },
  {
    title: '对话记录',
    label: 'CV',
    icon: MessagesSquare,
    url: '/conversations',
  },
];

export const secondaryNav: NavItem[] = [
  {
    title: '快速执行',
    label: 'Run',
    icon: Play,
    url: '/templates',
    variant: 'ghost',
  },
  {
    title: 'AI 助手',
    label: 'AI',
    icon: Sparkles,
    url: '/query',
    variant: 'ghost',
  },
];
