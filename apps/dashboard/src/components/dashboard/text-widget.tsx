'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TextWidgetConfig } from '@/types/dashboard';

interface TextWidgetProps {
  config: TextWidgetConfig;
}

export function TextWidget({ config }: TextWidgetProps) {
  return (
    <div className="h-full w-full overflow-auto p-4 prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{config.content}</ReactMarkdown>
    </div>
  );
}
