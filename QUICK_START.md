# 图表模块快速启动指南

## 🚀 快速开始

### 1. 运行数据库迁移

由于 Adonis Ace 问题，需要手动创建表：

```sql
-- 在你的数据库中执行以下 SQL（基于 migrations 文件）

-- 创建 datasets 表
CREATE TABLE datasets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  datasource_id INT NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT NULL,
  query_sql TEXT NOT NULL,
  schema_json JSON NOT NULL,
  schema_hash VARCHAR(64) NOT NULL,
  owner_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_datasets_datasource_id (datasource_id),
  INDEX idx_datasets_owner_id (owner_id),
  INDEX idx_datasets_schema_hash (schema_hash),
  FOREIGN KEY (datasource_id) REFERENCES datasources(id) ON DELETE CASCADE
);

-- 创建 charts 表
CREATE TABLE charts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset_id INT NOT NULL,
  title VARCHAR(128) NOT NULL,
  description TEXT NULL,
  chart_type ENUM('line', 'bar', 'area', 'pie', 'table') NOT NULL,
  spec_json JSON NOT NULL,
  owner_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_charts_dataset_id (dataset_id),
  INDEX idx_charts_owner_id (owner_id),
  FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);
```

### 2. 启动服务

```bash
# 后端（端口 3333）
cd apps/server
pnpm dev

# 前端（端口 3000）
cd apps/dashboard
pnpm dev
```

### 3. 测试功能

#### 方式一：从查询创建图表

1. 打开 http://localhost:3000/query
2. 配置数据源（如果没有）
3. 输入查询，如："查询最近7天的订单"
4. 执行查询
5. 点击"保存为图表"按钮
6. 按向导完成创建

#### 方式二：直接访问图表页面

1. 打开 http://localhost:3000/charts
2. 点击"创建图表"
3. 选择数据集（需要先有数据集）
4. 配置图表参数
5. 预览并保存

## 📸 界面预览

### 侧边栏

```
功能模块
├── 查询
├── 数据集      ← 新增
├── 图表        ← 新增
├── Actions
├── 数据源
└── AI 配置
```

### 查询结果

```
┌─────────────────────────────────────────────┐
│ 查询结果                                    │
│ 返回 100 行数据                             │
│ [保存为 Action] [保存为图表] [SQL] [Schema] │
├─────────────────────────────────────────────┤
│ [数据表格...]                               │
└─────────────────────────────────────────────┘
```

### 图表创建器

```
┌──────────────────┐ ┌──────────────────┐
│ 配置面板         │ │ 预览面板         │
├──────────────────┤ ├──────────────────┤
│ 数据集: [选择]   │ │                  │
│ 标题: [输入]     │ │   [图表渲染]     │
│ 类型: [选择]     │ │                  │
│ X轴: [选择]      │ │                  │
│ Y轴: [多选]      │ │                  │
│ 聚合: [选择]     │ │                  │
│ [预览] [保存]    │ │                  │
└──────────────────┘ └──────────────────┘
```

## 🔧 配置

### 环境变量

```bash
# .env (后端)
DATABASE_URL=mysql://user:pass@localhost:3306/sparkset
PORT=3333

# .env.local (前端)
NEXT_PUBLIC_API_URL=http://localhost:3333
```

### 数据源配置

确保已有数据源：

1. 访问 http://localhost:3000/
2. 创建或选择数据源
3. 同步 Schema

## 🐛 常见问题

### Q: 迁移失败？

A: 手动执行 SQL（见上文）

### Q: 图表预览为空？

A: 检查：

- 数据集是否有数据
- Schema 是否正确
- 字段类型是否匹配

### Q: 保存图表失败？

A: 检查：

- 是否已登录（需要 auth.user）
- 数据集 ID 是否有效
- ChartSpec 是否通过验证

## 📞 技术支持

查看详细文档：

- `IMPLEMENTATION_PLAN.md` - 完整开发计划
- `CHARTS_IMPLEMENTATION.md` - 实现总结

## ✅ 功能清单

- [x] 数据集创建/列表/详情
- [x] 图表创建/预览/保存/列表/详情
- [x] 查询结果保存为图表（两步向导）
- [x] 5 种图表类型
- [x] shadcn/ui 集成
- [x] 实时预览
- [x] 自动 Schema 推断
- [x] 多指标支持
- [x] 分组/聚合
- [x] 样式配置

## 🎯 下一步

1. 测试完整流程
2. 添加数据集编辑功能
3. 添加图表编辑功能
4. 优化性能
5. 添加导出功能

---

**状态**：✅ 可用
**版本**：MVP 1.0
