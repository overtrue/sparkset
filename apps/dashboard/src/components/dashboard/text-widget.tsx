'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TextWidgetConfig } from '@/types/dashboard';
import { useTranslations } from '@/i18n/use-translations';

interface TextWidgetProps {
  config: TextWidgetConfig;
}

export function TextWidget({ config }: TextWidgetProps) {
  const t = useTranslations();
  const content = config.content.trim();

  if (!content) {
    return <div className="h-full w-full p-4 text-sm text-muted-foreground">{t('No content')}</div>;
  }

  return (
    <div className="h-full w-full overflow-auto p-4 prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
