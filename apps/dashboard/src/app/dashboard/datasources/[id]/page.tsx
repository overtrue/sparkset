import { notFound } from 'next/navigation';

import DatasourceDetail from '@/components/datasource/detail';
import { fetchDatasourceDetail } from '@/lib/api/datasources-api';

interface PageProps {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;

  const datasourceId = Number(id);

  if (Number.isNaN(datasourceId) || datasourceId <= 0) {
    notFound();
  }

  try {
    const datasource = await fetchDatasourceDetail(datasourceId);
    if (!datasource || !datasource.id) {
      notFound();
    }
    return <DatasourceDetail initial={datasource} />;
  } catch (error) {
    console.error('Failed to fetch datasource detail:', error);
    notFound();
  }
};

export default Page;
