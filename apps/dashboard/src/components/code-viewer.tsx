'use client';
import { RiCheckLine, RiFileCopyLine } from '@remixicon/react';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';

interface CodeViewerProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  wrapLines?: boolean;
  wrapLongLines?: boolean;
  className?: string;
}

export function CodeViewer({
  code,
  language = 'text',
  showLineNumbers = true,
  wrapLines = true,
  wrapLongLines = false,
  className = '',
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-lg border overflow-hidden bg-muted/30 relative group ${className}`}>
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="secondary" className="gap-2 h-8 shadow-sm" onClick={handleCopy}>
          {copied ? (
            <>
              <RiCheckLine className="h-3.5 w-3.5" />
              已复制
            </>
          ) : (
            <>
              <RiFileCopyLine className="h-3.5 w-3.5" />
              复制
            </>
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: '1.6',
          background: 'transparent',
          borderRadius: '0.5rem',
        }}
        showLineNumbers={showLineNumbers}
        wrapLines={wrapLines}
        wrapLongLines={wrapLongLines}
        lineNumberStyle={{
          minWidth: '3em',
          paddingRight: '1em',
          color: '#858585',
          userSelect: 'none',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
