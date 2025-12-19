import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RiAddLine, RiBarChartLine, RiExternalLinkLine } from '@remixicon/react';
import Link from 'next/link';
import { ChartList } from '@/components/charts/list';
import { chartsApi } from '@/lib/api/charts';
import { datasetsApi } from '@/lib/api/datasets';

export const dynamic = 'force-dynamic';

export default async function ChartsPage() {
  // Fetch data from API
  const [datasetsResult, chartsResult] = await Promise.allSettled([
    datasetsApi.list(),
    chartsApi.list(),
  ]);

  const datasets = datasetsResult.status === 'fulfilled' ? datasetsResult.value : { items: [] };
  const charts = chartsResult.status === 'fulfilled' ? chartsResult.value : { items: [] };

  // Show empty state if no datasets
  if (datasets.items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="图表管理"
          description="创建和管理基于数据集的可视化图表"
          action={
            <Button asChild>
              <Link href="/query">
                <RiAddLine className="h-4 w-4 mr-2" />
                去创建数据集
              </Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>暂无数据集</CardTitle>
            <CardDescription>请先从查询页面创建数据集，然后才能创建图表</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/query">
                <RiAddLine className="h-4 w-4 mr-2" />
                执行查询并创建数据集
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="图表管理"
        description="创建和管理基于数据集的可视化图表"
        action={
          <Button asChild>
            <Link href="/charts/new">
              <RiAddLine className="h-4 w-4 mr-2" />
              创建图表
            </Link>
          </Button>
        }
      />

      <ChartList datasets={datasets.items} charts={charts.items} />
    </div>
  );
}
