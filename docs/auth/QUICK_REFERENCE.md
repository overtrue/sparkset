# Sparkset 认证系统快速参考

## 🚀 快速开始

### 1. 配置环境变量（内网部署）

```bash
# .env
AUTH_HEADER_ENABLED=true
AUTH_HEADER_TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8
```

### 2. 验证数据库

```bash
cd apps/server
npm run migrate:status
```

### 3. 启动服务

```bash
npm run dev
```

### 4. 测试认证

```bash
# 模拟内网请求
curl -H "X-User-Id: 123" \
     -H "X-User-Name: testuser" \
     http://localhost:3333/auth/status
```

## 📋 数据库结构

### Users 表

```sql
users
├── id: INT (PK)
├── uid: VARCHAR(191) UNIQUE  -- "provider:external_id"
├── provider: ENUM('header', 'oidc', 'local', 'system')
├── username: VARCHAR(191)
├── email: VARCHAR(191)
├── display_name: VARCHAR(191)
├── roles: JSON                -- ["admin", "analyst"]
├── permissions: JSON          -- ["datasource:read", "query:write"]
├── is_active: BOOLEAN
└── created_at, updated_at
```

### 业务表变更（10个）

每个表添加：

- `creator_id` (FK → users.id, nullable)
- `updater_id` (FK → users.id, nullable)

**影响表**：

- datasources, actions, ai_providers
- table_schemas, column_definitions
- dashboard_widgets, messages
- datasets, charts, dashboards

## 🔧 环境变量速查

| 变量名                        | 说明             | 示例                   |
| ----------------------------- | ---------------- | ---------------------- |
| `AUTH_HEADER_ENABLED`         | 启用 Header 认证 | `true`                 |
| `AUTH_HEADER_TRUSTED_PROXIES` | 信任代理         | `127.0.0.1,10.0.0.0/8` |
| `AUTH_HEADER_PREFIX`          | Header 前缀      | `X-User-`              |
| `AUTH_HEADER_REQUIRED`        | 必需字段         | `Id`                   |
| `AUTH_LOCAL_ENABLED`          | 启用 Local 认证  | `true` (仅开发)        |
| `AUTH_OIDC_ENABLED`           | 启用 OIDC        | `false`                |

## 🎯 认证流程

```
请求 → Header Auth → 创建/查找用户 → 返回 User → 业务逻辑
```

**Header 示例**：

```
X-User-Id: 123
X-User-Name: zhangsan
X-User-Email: zhangsan@example.com
X-User-Roles: admin,analyst
```

## 📝 控制器中使用用户

```typescript
// 创建记录时自动设置 creator_id
async store({ auth, request }: HttpContext) {
  const user = auth.user!
  const data = request.all()

  return await Model.create({
    ...data,
    creatorId: user.id,      // 自动设置创建者
    updaterId: user.id,      // 自动设置更新者
  })
}

// 更新记录时自动更新 updater_id
async update({ auth, params }: HttpContext) {
  const user = auth.user!
  const model = await Model.findOrFail(params.id)

  model.merge({
    ...request.all(),
    updaterId: user.id,      // 更新更新者
  })

  await model.save()
  return model
}
```

## 🔍 调试技巧

### 检查当前用户

```typescript
console.log('User:', ctx.auth.user);
```

### 查看数据库状态

```sql
-- 检查用户
SELECT * FROM users;

-- 检查业务表关联
SELECT table_name, COUNT(creator_id) as with_creator, COUNT(*) as total
FROM information_schema.tables
WHERE table_name IN ('datasources', 'actions', 'datasets')
GROUP BY table_name;
```

### 测试认证

```bash
# 1. 检查认证状态
curl http://localhost:3333/auth/status

# 2. 模拟内网请求
curl -H "X-User-Id: 999" \
     -H "X-User-Name: debug" \
     -H "X-User-Roles: admin" \
     http://localhost:3333/datasources

# 3. 检查响应
# 401 = 未认证
# 403 = 用户被禁用
# 200 = 认证成功
```

## ⚠️ 常见问题

### Q: 所有请求返回 401

**A**: 检查：

1. `AUTH_HEADER_ENABLED=true`
2. Header 前缀正确（默认 X-User-）
3. IP 在 trusted_proxies 中

### Q: 数据库迁移失败

**A**: 检查：

1. MySQL 版本（需要 5.7+）
2. 数据库连接
3. 手动执行迁移 SQL

### Q: TypeScript 类型错误

**A**: 这是现有项目的预存问题，不影响运行。可暂时忽略或：

```bash
cd apps/server
npm run typecheck 2>&1 | grep -v "luxon"  # 过滤已知错误
```

## 🎨 前端使用示例

### 保护路由

```typescript
// app/[locale]/my-page/page.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function MyPage() {
  return (
    <ProtectedRoute requireRoles={['admin']}>
      <MyContent />
    </ProtectedRoute>
  );
}
```

### 权限检查

```typescript
import { usePermission } from '@/hooks/usePermission';

function AdminPanel() {
  const { hasRole, hasPermission } = usePermission();

  if (!hasRole('admin')) return null;

  return (
    <div>
      {hasPermission('datasource:write') && <CreateButton />}
    </div>
  );
}
```

### 访问用户信息

```typescript
import { useAuth, useUser } from '@/contexts/AuthContext';

function Profile() {
  const { user, authenticated, loading } = useAuth();
  // 或 const user = useUser();

  if (loading) return <Spinner />;
  if (!user) return <div>未登录</div>;

  return (
    <div>
      <h1>{user.username}</h1>
      <p>角色: {user.roles.join(', ')}</p>
    </div>
  );
}
```

### 登录/登出

```typescript
import { useAuth } from '@/contexts/AuthContext';

function AuthButton() {
  const { login, logout, authenticated } = useAuth();

  if (authenticated) {
    return <button onClick={logout}>退出</button>;
  }

  return (
    <button onClick={() => login('username', 'password')}>
      登录
    </button>
  );
}
```

## 📞 下一步

1. ✅ **基础完成**：前后端认证系统已就绪
2. ⏳ **可选功能**：Local/OIDC Auth (Phase 3-4)
3. ⏳ **权限系统**：RBAC (Phase 5)
4. 🚀 **部署生产**：验证测试后可直接部署

## 📚 文档索引

- `auth-spect.md` - 完整设计文档
- `IMPLEMENTATION_PLAN.md` - 详细实施计划
- `implementation_summary.md` - 实施总结
- `STAGE2_IMPLEMENTATION.md` - 前端实施总结
- `deployment.md` - 部署指南
- `QUICK_REFERENCE.md` - 快速参考（本文档）
