import ActionTable from '../../components/action-table';
import { fetchActions } from '../../lib/api';

const TemplatesPage = async () => {
  const actions = await fetchActions().catch(() => []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-300">模板</p>
          <h1 className="text-3xl font-semibold tracking-tight">可复用查询模板</h1>
        </div>
        <p className="text-xs text-slate-500">
          模板来源于 /actions 接口，可在 CLI 或 API 创建，前端支持一键执行。
        </p>
      </div>
      <ActionTable actions={actions} />
    </div>
  );
};

export default TemplatesPage;
