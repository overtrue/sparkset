'use client';
import { RiCodeSSlashLine, RiAlignJustify, RiAlignLeft } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { useMemo, useState } from 'react';
import { format } from 'sql-formatter';
import { CodeViewer } from '@/components/code-viewer';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface SqlViewerProps {
  sql: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SqlViewer({ sql, trigger, open, onOpenChange }: SqlViewerProps) {
  const t = useTranslations();
  const [isMultiLine, setIsMultiLine] = useState(true);

  const formattedSql = useMemo(() => {
    if (!isMultiLine) {
      // 单行模式：压缩 SQL，移除多余空格和换行
      return sql.replace(/\s+/g, ' ').trim();
    }
    try {
      // 多行模式：格式化 SQL
      return format(sql, {
        language: 'sql',
        tabWidth: 2,
        useTabs: false,
        keywordCase: 'upper',
        indentStyle: 'standard',
      });
    } catch (err) {
      // 如果格式化失败，返回原始 SQL
      console.warn('SQL formatting failed:', err);
      return sql;
    }
  }, [sql, isMultiLine]);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <RiCodeSSlashLine className="h-4 w-4" />
      {t('View SQL')}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <RiCodeSSlashLine className="h-5 w-5" />
                {t('SQL Statement')}
              </SheetTitle>
              <SheetDescription className="mt-2">
                {t('AI-generated SQL query statement')}
              </SheetDescription>
            </div>
            <Button
              size="sm"
              variant={isMultiLine ? 'default' : 'ghost'}
              className="gap-2"
              onClick={() => setIsMultiLine(!isMultiLine)}
              title={isMultiLine ? t('Switch to single line mode') : t('Switch to multi-line mode')}
            >
              {isMultiLine ? (
                <>
                  <RiAlignJustify className="h-4 w-4" />
                  {t('Multi-line')}
                </>
              ) : (
                <>
                  <RiAlignLeft className="h-4 w-4" />
                  {t('Single line')}
                </>
              )}
            </Button>
          </div>
        </SheetHeader>
        <div className="p-6">
          <CodeViewer
            code={formattedSql}
            language="sql"
            showLineNumbers={isMultiLine}
            wrapLines={isMultiLine}
            wrapLongLines={!isMultiLine}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
