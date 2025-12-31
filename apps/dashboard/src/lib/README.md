# API Layer Documentation

## Overview

新的 API 层提供了统一的 fetch 封装和 SWR hooks，避免了到处写 `credentials: 'include'`。

## 文件结构

```
src/lib/
├── fetch.ts           # 统一的 fetch 封装（核心）
├── api.ts             # 旧的 API（兼容层，内部使用 fetch.ts）
├── auth.ts            # 认证相关 API
├── query.ts           # 查询 API + useRunQuery hook
├── api/
│   ├── datasets.ts    # 数据集 API + useDatasets hooks
│   ├── dashboards.ts  # 仪表板 API + useDashboards hooks
│   └── charts.ts      # 图表 API + useCharts hooks
```

## 核心 fetch 封装

### `fetch.ts` 提供的函数

```typescript
// GET 请求
await apiGet('/api/datasets');

// POST 请求
await apiPost('/api/datasets', { name: 'test' });

// PUT 请求
await apiPut('/api/datasets/1', { name: 'updated' });

// DELETE 请求
await apiDelete('/api/datasets/1');

// 自定义请求
await apiRequest('/api/custom', { method: 'PATCH', body: JSON.stringify(data) });
```

**所有函数自动包含 `credentials: 'include'`，无需手动添加！**

## SWR Hooks

### 1. 数据集 (Datasets)

```typescript
import { useDatasets, useDataset, useCreateDataset } from '@/lib/api/datasets';

// 列表查询（自动缓存、自动刷新）
function MyComponent() {
  const { data, error, isLoading } = useDatasets();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data?.items.map(d => d.name)}</div>;
}

// 单个详情查询
function DatasetDetail({ id }: { id: number }) {
  const { data } = useDataset(id);
  return <div>{data?.name}</div>;
}

// 创建 mutation
function CreateDatasetForm() {
  const { trigger, isMutating } = useCreateDataset();

  const handleSubmit = async (data: CreateDatasetDto) => {
    await trigger(data);
    // 自动重新验证列表
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// 更新 mutation
function UpdateDataset({ id }: { id: number }) {
  const { trigger } = useUpdateDataset();

  const handleUpdate = async (data: Partial<CreateDatasetDto>) => {
    await trigger({ id, data });
  };

  return <button onClick={() => handleUpdate({ name: 'new' })}>Update</button>;
}

// 删除 mutation
function DeleteDataset({ id }: { id: number }) {
  const { trigger } = useDeleteDataset();

  return <button onClick={() => trigger(id)}>Delete</button>;
}
```

### 2. 仪表板 (Dashboards)

```typescript
import {
  useDashboards,
  useDashboard,
  useCreateDashboard,
  useAddWidget,
  useUpdateLayout,
} from '@/lib/api/dashboards';

// 列表
const { data } = useDashboards();

// 详情
const { data } = useDashboard(1);

// 创建
const { trigger: create } = useCreateDashboard();
await create({ title: 'My Dashboard' });

// 添加 Widget
const { trigger: addWidget } = useAddWidget();
await addWidget({
  dashboardId: 1,
  data: { title: 'Chart', type: 'chart', x: 0, y: 0, w: 2, h: 2, config: {} },
});

// 更新布局
const { trigger: updateLayout } = useUpdateLayout();
await updateLayout({
  dashboardId: 1,
  data: { layouts: [{ id: 1, x: 0, y: 0, w: 2, h: 2 }] },
});
```

### 3. 图表 (Charts)

```typescript
import { useCharts, useChart, useCreateChart, usePreviewChart } from '@/lib/api/charts';

// 列表（支持 dataset 过滤）
const { data } = useCharts(); // 所有图表
const { data } = useCharts(1); // 指定数据集的图表

// 详情
const { data } = useChart(1);

// 创建
const { trigger: create } = useCreateChart();
await create({
  datasetId: 1,
  title: 'My Chart',
  chartType: 'bar',
  spec: { ... }
});

// 预览（不保存）
const { trigger: preview } = usePreviewChart();
const result = await preview({
  datasetRef: { datasetId: 1 },
  spec: { chartType: 'bar', ... }
});
```

### 4. 查询 (Query)

```typescript
import { useRunQuery } from '@/lib/query';

function QueryComponent() {
  const { trigger, isMutating, data } = useRunQuery();

  const handleQuery = async (question: string) => {
    const result = await trigger({
      question,
      datasource: 1,
      limit: 100
    });
    // result contains { sql, rows, summary }
  };

  return <button onClick={() => handleQuery('Show me sales data')}>Run Query</button>;
}
```

## 传统 API 调用（不使用 SWR）

如果不需要缓存和自动重新验证，可以直接调用函数：

```typescript
import { fetchDatasets, createDataset, updateDataset, deleteDataset } from '@/lib/api/datasets';

// 列表
const { items } = await fetchDatasets();

// 详情
const dataset = await fetchDataset(1);

// 创建
const newDataset = await createDataset({ ... });

// 更新
const updated = await updateDataset(1, { name: 'new' });

// 删除
await deleteDataset(1);
```

## 优势

### 1. **不再重复写 `credentials: 'include'`**

```typescript
// ❌ 旧方式 - 到处重复
fetch('/api/datasets', { credentials: 'include' });
fetch('/api/dashboards', { credentials: 'include' });
fetch('/api/charts', { credentials: 'include' });

// ✅ 新方式 - 一次定义，处处使用
await apiGet('/api/datasets');
await apiGet('/api/dashboards');
await apiGet('/api/charts');
```

### 2. **自动缓存和自动刷新 (SWR)**

```typescript
// 自动缓存，重复请求不发网络
// 组件重新聚焦时自动刷新
// 焦点重新验证、网络重新连接时自动刷新
const { data, isLoading, error } = useDatasets();
```

### 3. **自动重新验证**

```typescript
// 创建后自动刷新列表
await createDataset(data); // 列表自动更新

// 删除后自动刷新列表
await deleteDataset(id); // 列表自动更新
```

### 4. **类型安全**

```typescript
const { data } = useDatasets(); // data: { items: Dataset[] } | undefined
const { trigger } = useCreateDataset(); // trigger: (data: CreateDatasetDto) => Promise<Dataset>
```

## 迁移指南

### 从旧 API 迁移

**旧代码：**

```typescript
import { datasetsApi } from '@/lib/api/datasets';

const res = await fetch('/api/datasets', { credentials: 'include' });
const data = await res.json();
```

**新代码：**

```typescript
import { fetchDatasets } from '@/lib/api/datasets';

const data = await fetchDatasets();
```

### 从手动 fetch 迁移

**旧代码：**

```typescript
const res = await fetch('/api/dashboards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  credentials: 'include',
});
```

**新代码：**

```typescript
import { apiPost } from '@/lib/fetch';

const result = await apiPost('/api/dashboards', data);
```

### 使用 SWR 优化

**旧代码：**

```typescript
const [datasets, setDatasets] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/datasets', { credentials: 'include' })
    .then((res) => res.json())
    .then((data) => {
      setDatasets(data.items);
      setLoading(false);
    });
}, []);
```

**新代码：**

```typescript
import { useDatasets } from '@/lib/api/datasets';

const { data, isLoading, error } = useDatasets();
// data 自动缓存、自动刷新、错误处理
```

## 最佳实践

### 1. 在组件中使用 SWR Hooks

```typescript
function DashboardList() {
  const { data, isLoading, error } = useDashboards();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <DashboardGrid dashboards={data.items} />;
}
```

### 2. 在表单中使用 Mutations

```typescript
function CreateDashboardForm() {
  const { trigger, isMutating, error } = useCreateDashboard();
  const router = useRouter();

  const handleSubmit = async (data: CreateDashboardDto) => {
    const result = await trigger(data);
    router.push(`/dashboard/${result.id}`);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 3. 组合使用

```typescript
function DashboardPage({ id }: { id: number }) {
  // 获取仪表板详情
  const { data: dashboard } = useDashboard(id);

  // 获取关联的图表
  const { data: charts } = useCharts();

  // 更新布局
  const { trigger: updateLayout } = useUpdateLayout();

  // 运行查询
  const { trigger: runQuery } = useRunQuery();

  // ...
}
```

## 总结

- ✅ **统一 fetch 封装**：`apiGet`, `apiPost`, `apiPut`, `apiDelete`
- ✅ **SWR Hooks**：自动缓存、自动刷新、类型安全
- ✅ **Mutations**：自动重新验证、乐观更新
- ✅ **向后兼容**：旧代码依然可用

**从此告别 `credentials: 'include'`！** 🎉
