# Stage 3: Local Authentication Implementation

## ✅ 已完成的工作

### 1. 数据库迁移

**文件**: `database/migrations/1766989500000_add_password_to_users.ts`

- 添加 `password_hash` 字段到 users 表
- 添加索引优化查询性能
- 插入默认管理员账号

**手动 SQL**: 如果迁移失败，使用 `database/manual_add_password.sql`

### 2. User 模型更新

**文件**: `app/models/user.ts`

```typescript
@column()
declare passwordHash: string | null;
```

### 3. LocalAuthProvider

**文件**: `app/providers/local_auth_provider.ts`

- 支持用户名密码登录
- 支持用户注册
- 支持 session 认证
- 密码使用 bcrypt 哈希存储

### 4. LocalAuthController

**文件**: `app/controllers/local_auth_controller.ts`

- `POST /auth/local/login` - 登录
- `POST /auth/local/register` - 注册
- `POST /auth/local/logout` - 登出
- `GET /auth/local/status` - 状态检查

### 5. 验证器

**文件**: `app/validators/local_auth.ts`

- 登录验证：用户名/密码必填
- 注册验证：用户名≥3字符，密码≥6字符，邮箱格式验证

### 6. AuthManager 更新

**文件**: `app/services/auth_manager.ts`

- 注册 LocalAuthProvider
- 保持责任链模式

### 7. Routes 更新

**文件**: `start/routes.ts`

```typescript
// Local Auth routes (public)
router.get('/auth/local/status', [LocalAuthController, 'status']);
router.post('/auth/local/login', [LocalAuthController, 'login']);
router.post('/auth/local/register', [LocalAuthController, 'register']);
router.post('/auth/local/logout', [LocalAuthController, 'logout']);
```

### 8. 前端认证库更新

**文件**: `dashboard/src/lib/auth.ts`

- 更新 `loginWithCredentials()` 使用正确端点
- 新增 `registerWithCredentials()` 函数
- 更新 `logout()` 使用本地登出

### 9. AuthContext 更新

**文件**: `dashboard/src/contexts/AuthContext.tsx`

- 新增 `register()` 方法
- 集成注册成功后的状态管理

### 10. 登录页面重构

**文件**: `dashboard/src/app/login/page.tsx`

- Tab 切换：登录/注册
- 完整的表单验证
- 错误提示
- 响应式设计

## 🔧 配置

### 环境变量

```env
# Local Authentication (Development Only)
AUTH_LOCAL_ENABLED=true
AUTH_LOCAL_ALLOW_REGISTRATION=true
AUTH_LOCAL_DEFAULT_ROLES=viewer
AUTH_LOCAL_DEFAULT_PERMISSIONS=read:datasource,read:action,read:conversation
```

### 数据库配置

**文件**: `apps/server/.env.example`

已更新包含本地认证相关配置。

## 🚀 使用方法

### 1. 数据库设置

如果迁移失败，手动运行 SQL：

```bash
mysql -u root -p sparkset < database/manual_add_password.sql
```

### 2. 启动后端

```bash
cd apps/server
npm run dev
```

### 3. 启动前端

```bash
cd apps/dashboard
npm run dev
```

### 4. 访问登录页面

```
http://localhost:3000/login
```

### 5. 登录或注册

**默认管理员账号**：

- 用户名: `admin`
- 密码: `admin123`

**注册新用户**：

- 点击"注册" Tab
- 填写用户名、密码、邮箱
- 自动登录并跳转到首页

## 🔐 认证流程

### 登录流程

1. 用户填写用户名密码
2. 前端调用 `/auth/local/login`
3. LocalAuthProvider 验证：
   - 查找用户（provider=local, username匹配）
   - 验证密码哈希（bcrypt）
   - 检查用户状态（isActive）
4. 设置 session：`auth_provider=local`, `user_id=xxx`
5. 返回用户信息
6. 前端更新状态并跳转

### 注册流程

1. 用户填写注册表单
2. 前端调用 `/auth/local/register`
3. LocalAuthProvider 处理：
   - 验证输入（长度、格式）
   - 检查用户名冲突
   - bcrypt 哈希密码
   - 创建用户记录
   - 设置 session
4. 返回用户信息
5. 自动登录并跳转

### Session 认证

1. 访问受保护路由
2. AuthMiddleware 检查 session
3. LocalAuthProvider 通过 session 认证
4. 返回用户对象

## 🛡️ 安全特性

1. **密码哈希**: 使用 bcrypt (cost=10)
2. **输入验证**: Zod 验证器
3. **会话管理**: AdonisJS session
4. **用户状态**: 软删除支持 (isActive)
5. **权限控制**: 角色和权限系统

## 📊 数据结构

### 新增用户记录

```json
{
  "uid": "local:username",
  "provider": "local",
  "username": "username",
  "email": "user@example.com",
  "displayName": "User Name",
  "passwordHash": "$2b$10$...",
  "roles": ["viewer"],
  "permissions": ["read:datasource"],
  "isActive": true,
  "createdAt": "2025-12-29T...",
  "updatedAt": "2025-12-29T..."
}
```

## 🎯 认证优先级

系统按以下顺序尝试认证：

1. **Header Auth** (最高优先级)
   - 适用于内网部署
   - 通过反向代理注入用户信息

2. **Local Auth** (开发/演示)
   - 用户名密码登录
   - 支持注册

3. **OIDC Auth** (待实现)
   - 企业单点登录

## 🔧 故障排除

### 问题: "用户名已存在"

**原因**: 用户名已存在或已被其他 provider 使用

**解决**: 使用不同的用户名

### 问题: "密码至少需要6个字符"

**原因**: 密码太短

**解决**: 使用更长的密码

### 问题: "本地认证未启用"

**原因**: `AUTH_LOCAL_ENABLED` 不是 `true`

**解决**: 在 `.env` 中设置 `AUTH_LOCAL_ENABLED=true`

### 问题: 数据库连接失败

**原因**: 数据库未启动或配置错误

**解决**:

1. 检查 MySQL 是否运行
2. 验证 `.env` 中的数据库配置
3. 创建数据库：`CREATE DATABASE sparkset;`

## 📝 下一步

### 可选功能

- **密码重置**: 通过邮箱重置密码
- **邮箱验证**: 注册时验证邮箱
- **2FA**: 双因素认证
- **密码策略**: 复杂度要求
- **用户管理**: 管理员界面

### 安全增强

- 登录尝试限制
- 会话超时
- 密码过期策略
- 审计日志

## 📚 相关文件

| 类型       | 文件路径                                                     | 说明           |
| ---------- | ------------------------------------------------------------ | -------------- |
| 迁移       | `database/migrations/1766989500000_add_password_to_users.ts` | 数据库变更     |
| SQL        | `database/manual_add_password.sql`                           | 手动SQL脚本    |
| 模型       | `app/models/user.ts`                                         | User 模型      |
| 提供者     | `app/providers/local_auth_provider.ts`                       | Local 认证逻辑 |
| 控制器     | `app/controllers/local_auth_controller.ts`                   | HTTP 处理      |
| 验证器     | `app/validators/local_auth.ts`                               | 输入验证       |
| 路由       | `start/routes.ts`                                            | 路由配置       |
| 类型       | `app/types/auth.ts`                                          | 类型定义       |
| 前端库     | `dashboard/src/lib/auth.ts`                                  | API 客户端     |
| 前端上下文 | `dashboard/src/contexts/AuthContext.tsx`                     | 状态管理       |
| 登录页面   | `dashboard/src/app/login/page.tsx`                           | UI 界面        |

## ✅ 测试清单

- [ ] 数据库迁移成功
- [ ] 默认管理员账号可登录
- [ ] 新用户注册成功
- [ ] 注册后自动登录
- [ ] 登出功能正常
- [ ] 受保护路由需要认证
- [ ] 密码错误时显示错误
- [ ] 用户名冲突时显示错误
- [ ] 表单验证正常工作
- [ ] Session 持久化正常

---

**实现日期**: 2025-12-29
**状态**: ✅ 完成
