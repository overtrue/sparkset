import { PageHeader } from '@/components/page-header';
import { ChartBuilderClient } from '@/components/charts/builder-client';
import { RiArrowLeftLine } from '@remixicon/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { datasetsApi } from '@/lib/api/datasets';
import { chartsApi } from '@/lib/api/charts';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditChartPage({ params }: Props) {
  const { id } = await params;
  const chartId = Number(id);

  // Validate chart ID
  if (Number.isNaN(chartId) || chartId <= 0) {
    notFound();
  }

  // Fetch chart and datasets in parallel
  const [chartResult, datasetsResult] = await Promise.allSettled([
    chartsApi.get(chartId),
    datasetsApi.list(),
  ]);

  // Handle chart not found
  if (chartResult.status === 'rejected') {
    notFound();
  }

  const chart = chartResult.value;
  const datasets = datasetsResult.status === 'fulfilled' ? datasetsResult.value.items : [];

  // If no datasets exist, redirect to query page
  if (datasets.length === 0) {
    redirect('/query');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="编辑图表"
        description="修改图表配置"
        action={
          <Button variant="outline" asChild>
            <Link href={`/charts/${chartId}`}>
              <RiArrowLeftLine className="h-4 w-4 mr-2" />
              返回详情
            </Link>
          </Button>
        }
      />

      <ChartBuilderClient
        datasets={datasets}
        initialDatasetId={chart.datasetId}
        chartId={chartId}
        initialSpec={chart.specJson}
        initialTitle={chart.title}
        initialDescription={chart.description || ''}
        initialChartType={chart.chartType}
      />
    </div>
  );
}
