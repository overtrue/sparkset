'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import DatasourceDetail from '@/components/datasource/detail';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { fetchDatasourceDetail } from '@/lib/api/datasources-api';
import type { DatasourceDetailDTO } from '@/types/api';

export default function DatasourceDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const datasourceId = useMemo(() => Number(params.id), [params.id]);

  const [datasource, setDatasource] = useState<DatasourceDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(datasourceId) || datasourceId <= 0) {
      router.push('/dashboard/datasources');
      return;
    }

    const loadDatasource = async () => {
      try {
        setLoading(true);
        const data = await fetchDatasourceDetail(datasourceId);
        setDatasource(data);
      } catch (error) {
        toast.error((error as Error)?.message ?? t('Failed to load datasource'));
        router.push('/dashboard/datasources');
      } finally {
        setLoading(false);
      }
    };

    void loadDatasource();
  }, [datasourceId, router, t]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!datasource) {
    return null;
  }

  return <DatasourceDetail initial={datasource} />;
}
