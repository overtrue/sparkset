import Link from 'next/link';
import { PageHeader } from '../../components/page-header';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Card, CardContent } from '../../components/ui/card';
import { fetchAIProviders, fetchDatasources } from '../../lib/api';
import QueryRunner from './query-runner';

const QueryPage = async () => {
  const datasources = await fetchDatasources().catch(() => []);
  const aiProviders = await fetchAIProviders().catch(() => []);

  if (datasources.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="查询" description="使用自然语言查询数据库，AI 自动生成 SQL 并执行" />
        <Card className="shadow-none">
          <CardContent className="pt-6">
            <Alert>
              <AlertDescription className="space-y-3">
                <div>未获取到数据源，请确认 API 运行并至少存在一个数据源。</div>
                <Link href="/" className="text-primary hover:underline text-sm font-medium">
                  前往数据源页查看
                </Link>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <QueryRunner datasources={datasources} aiProviders={aiProviders} initialResult={null} />;
};

export default QueryPage;
