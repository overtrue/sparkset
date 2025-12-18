'use client';

import { Database, Zap, Search, Plus } from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';

interface DataTableEmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export function DataTableEmptyState({ message = '暂无数据', icon }: DataTableEmptyStateProps) {
  let primaryText = message;
  let instructionText = '';
  let selectedIcon = icon;

  // Pattern: "暂无 X，点击右上角 Y"
  // Examples: "暂无 Action，点击右上角新建", "暂无数据源，点击右上角添加"
  const match = message.match(/暂无(.+?)[，,]\s*点击右上角(.+)/);
  if (match) {
    const itemType = match[1].trim();
    const action = match[2].trim();
    primaryText = `暂无${itemType}`;
    instructionText = `点击右上角 "${action}"`;

    // Auto-select appropriate icon based on item type
    if (!selectedIcon) {
      if (itemType.includes('Action') || itemType.includes('Provider')) {
        selectedIcon = <Zap className="h-6 w-6 text-yellow-500" />;
      } else if (itemType.includes('数据源')) {
        selectedIcon = <Database className="h-6 w-6 text-blue-500" />;
      } else if (itemType.includes('数据')) {
        selectedIcon = <Database className="h-6 w-6 text-gray-500" />;
      } else {
        selectedIcon = <Plus className="h-6 w-6 text-primary" />;
      }
    }
  }
  // Pattern: "无匹配结果" - Search results
  else if (message.includes('无匹配结果')) {
    primaryText = '未找到匹配结果';
    instructionText = '尝试更换搜索词或清除过滤器';
    selectedIcon = selectedIcon || <Search className="h-6 w-6 text-purple-500" />;
  }
  // Pattern: "暂无数据" - Generic empty
  else if (message === '暂无数据') {
    primaryText = '暂无数据';
    instructionText = '点击右上角按钮开始';
    selectedIcon = selectedIcon || <Database className="h-6 w-6" />;
  }
  // Fallback for any other message
  else {
    selectedIcon = selectedIcon || <Database className="h-6 w-6" />;
    // If message contains action instruction, extract it
    if (message.includes('点击')) {
      const actionMatch = message.match(/点击(.+)/);
      if (actionMatch) {
        instructionText = `点击${actionMatch[1]}`;
      }
    }
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{selectedIcon}</EmptyMedia>
        <EmptyDescription className="text-base font-semibold text-foreground">
          {primaryText}
        </EmptyDescription>
        {instructionText && <p className="text-muted-foreground text-sm mt-1">{instructionText}</p>}
      </EmptyHeader>
      <EmptyContent className="opacity-40">
        <span className="text-xs tracking-widest">•••</span>
      </EmptyContent>
    </Empty>
  );
}
