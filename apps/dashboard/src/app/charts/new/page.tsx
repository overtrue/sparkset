import { PageHeader } from '@/components/page-header';
import { ChartBuilderClient } from '@/components/charts/builder-client';
import { RiArrowLeftLine } from '@remixicon/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="创建图表"
        description="基于数据集配置并创建可视化图表"
        action={
          <Button variant="outline" asChild>
            <Link href="/charts">
              <RiArrowLeftLine className="h-4 w-4 mr-2" />
              返回列表
            </Link>
          </Button>
        }
      />

      <ChartBuilderClient datasets={result.items} initialDatasetId={datasetId} />
    </div>
  );
}
