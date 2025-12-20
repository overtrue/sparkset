import { ChartFormWrapper } from '@/components/charts/chart-form-wrapper';
import { datasetsApi } from '@/lib/api/datasets';
import { chartsApi } from '@/lib/api/charts';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import type { Dataset, ChartSpec } from '@/types/chart';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

async function EditChartContent({ params }: Props) {
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
    <ChartFormWrapper
      mode="edit"
      datasets={datasets}
      chartId={chartId}
      initialDatasetId={chart.datasetId}
      initialSpec={chart.specJson}
      initialTitle={chart.title}
      initialDescription={chart.description || ''}
    />
  );
}

export default function EditChartPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="space-y-6">加载中...</div>}>
      <EditChartContent params={params} />
    </Suspense>
  );
}
