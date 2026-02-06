'use client';

import { useTranslations } from '@/i18n/use-translations';
import { RiMagicLine, RiPlayLine } from '@remixicon/react';
import type { ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartCategory, ChartStyleConfig, ChartVariant } from './types';
import { ChartFrame, ChartRenderer } from './renderer';

interface ChartPreviewPanelProps {
  chartType: ChartCategory;
  variant?: ChartVariant;
  previewData: Record<string, unknown>[];
  previewConfig: ChartConfig;
  previewStyle: ChartStyleConfig;
  isPreviewLoading: boolean;
  isSubmitting: boolean;
  showActions: boolean;
  onGeneratePreview: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
}

export function ChartPreviewPanel({
  chartType,
  variant,
  previewData,
  previewConfig,
  previewStyle,
  isPreviewLoading,
  isSubmitting,
  showActions,
  onGeneratePreview,
  onSave,
}: ChartPreviewPanelProps) {
  const t = useTranslations();

  return (
    <div className="space-y-4 lg:min-w-0">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>{t('Live Preview')}</CardTitle>
            <CardDescription>{t('View chart effect')}</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void onGeneratePreview();
            }}
            disabled={isPreviewLoading}
          >
            <RiPlayLine className="h-4 w-4" aria-hidden="true" />
            {isPreviewLoading ? t('Executing…') : t('Generate Preview')}
          </Button>
        </CardHeader>
        <CardContent>
          {previewData.length > 0 && Object.keys(previewConfig).length > 0 ? (
            <ChartFrame chartType={chartType}>
              <ChartRenderer
                chartType={chartType}
                variant={variant}
                data={previewData}
                config={previewConfig}
                style={previewStyle}
                className="h-full w-full"
              />
            </ChartFrame>
          ) : (
            <ChartFrame
              chartType={chartType}
              className="flex items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground"
            >
              <div className="text-center">
                <RiMagicLine className="mx-auto mb-2 h-12 w-12 opacity-50" aria-hidden="true" />
                <p>{t('Configure chart and generate preview')}</p>
              </div>
            </ChartFrame>
          )}
        </CardContent>
        {showActions && (
          <div className="flex gap-2 p-4 pt-0">
            <Button
              type="button"
              onClick={() => {
                void onSave();
              }}
              disabled={isSubmitting}
              className="flex-1"
            >
              <RiMagicLine className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? t('Saving…') : t('Save Chart')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
