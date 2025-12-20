import { ChartFormWrapper } from '@/components/charts/chart-form-wrapper';
import { datasetsApi } from '@/lib/api/datasets';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{
    datasetId?: string;
  }>;
}

export default async function NewChartPage({ searchParams }: Props) {
  const params = await searchParams;
  const datasetId = params.datasetId ? Number(params.datasetId) : undefined;

  // Fetch datasets from API
  const result = await datasetsApi.list().catch(() => ({ items: [] }));

  // If no datasets exist, redirect to query page to create one
  if (result.items.length === 0) {
    redirect('/query');
  }

  // If a datasetId is provided via query param, verify it exists
  if (datasetId) {
    const datasetExists = result.items.some((d) => d.id === datasetId);
    if (!datasetExists) {
      // Dataset not found, but we still pass the list to the builder
      // The builder will handle the invalid datasetId
    }
  }

  return <ChartFormWrapper mode="create" datasets={result.items} initialDatasetId={datasetId} />;
}
