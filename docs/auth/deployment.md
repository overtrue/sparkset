# Sparkset 认证系统部署指南

## 🎯 概述

本指南说明如何在不同环境中配置和部署 Sparkset 的认证系统。

## 📋 数据库状态

### 已完成的迁移

- ✅ `users` 表创建
- ✅ 所有业务表添加 `creator_id` 和 `updater_id`
- ✅ 外键约束和索引
- ✅ 现有数据迁移到系统用户

### 数据库验证

```sql
-- 检查用户表
SELECT COUNT(*) FROM users;

-- 检查业务表关联
SELECT
  'datasources' as table_name,
  COUNT(*) as total,
  COUNT(creator_id) as with_creator
FROM datasources
UNION ALL
SELECT 'actions', COUNT(*), COUNT(creator_id) FROM actions
UNION ALL
SELECT 'datasets', COUNT(*), COUNT(creator_id) FROM datasets
UNION ALL
SELECT 'charts', COUNT(*), COUNT(creator_id) FROM charts
UNION ALL
SELECT 'dashboards', COUNT(*), COUNT(creator_id) FROM dashboards;
```

## 🔧 环境配置

### 1. 内网部署（推荐）

**场景**：企业内网 + Nginx/Apache 反向代理

**环境变量**：

```bash
# 启用 Header 认证
AUTH_HEADER_ENABLED=true

# 信任的代理 IP（支持 CIDR）
AUTH_HEADER_TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# Header 前缀
AUTH_HEADER_PREFIX=X-User-

# 必需的 header（缺少则认证失败）
AUTH_HEADER_REQUIRED=Id
```

**Nginx 配置示例**：

```nginx
server {
    listen 80;
    server_name sparkset.example.com;

    # 内网 IP 白名单（可选）
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    deny all;

    # 上游认证（LDAP/AD）
    auth_request /auth;

    location /auth {
        internal;
        proxy_pass http://ldap-server/verify;
    }

    location / {
        # 注入用户信息
        auth_request_set $user_id $upstream_http_x_user_id;
        auth_request_set $user_name $upstream_http_x_user_name;
        auth_request_set $user_email $upstream_http_x_user_email;
        auth_request_set $user_roles $upstream_http_x_user_roles;

        proxy_set_header X-User-Id $user_id;
        proxy_set_header X-User-Name $user_name;
        proxy_set_header X-User-Email $user_email;
        proxy_set_header X-User-Roles $user_roles;

        proxy_pass http://sparkset-server:3333;
    }
}
```

### 2. 企业部署（OIDC）

**场景**：Keycloak/Authentik/Azure AD SSO

当前版本支持最小 OIDC Authorization Code Flow：生成授权 URL、用加密 httpOnly pending-state cookie 校验 state/nonce、调用 token endpoint、通过短期缓存的 JWKS 校验 RS256 ID Token、校验 issuer/audience/expiry，并同步用户后签发 Sparkset httpOnly session cookie。缓存的 JWKS 如果缺少当前 ID Token 的 `kid`，会重新拉取一次以兼容 key rotation。

生产环境仍建议优先使用 Header Auth 加可信网关；如果直接启用 OIDC，请确保 IdP 只下发最小角色/权限 claim，并配置 HTTPS 回调地址。

**环境变量**：

```bash
# 启用 OIDC 认证
AUTH_OIDC_ENABLED=true

# OIDC 配置
AUTH_OIDC_ISSUER=https://id.example.com/realms/main
AUTH_OIDC_AUTHORIZATION_URL=https://id.example.com/realms/main/protocol/openid-connect/auth
AUTH_OIDC_TOKEN_URL=https://id.example.com/realms/main/protocol/openid-connect/token
AUTH_OIDC_JWKS_URL=https://id.example.com/realms/main/protocol/openid-connect/certs
AUTH_OIDC_CLIENT_ID=sparkset
AUTH_OIDC_CLIENT_SECRET=your_secret

# 回调地址
AUTH_OIDC_REDIRECT_URI=http://sparkset.example.com/auth/oidc/callback
AUTH_OIDC_SUCCESS_REDIRECT_URL=https://sparkset.example.com/dashboard
AUTH_OIDC_FAILURE_REDIRECT_URL=https://sparkset.example.com/login?error=oidc
AUTH_OIDC_SCOPES=openid,profile,email
```

**IdP claim 要求**：

1. `sub`：稳定用户 ID，会映射为 `uid=oidc:{sub}`
2. `preferred_username`：用户名
3. `email`：邮箱，可为空
4. `roles`：字符串数组或逗号分隔字符串
5. `permissions`：字符串数组或逗号分隔字符串

**仍需企业化增强**：

1. OIDC 用户首次登录默认角色模板
2. 登录审计和失败原因检索
3. IdP 组/角色到 Sparkset 权限的可视化映射
4. 管理员侧的 SSO 诊断页面

### 3. 开发/演示环境

**场景**：本地开发、演示、开源用户快速体验

**环境变量**：

```bash
# 启用 Local 认证（仅开发环境）
AUTH_LOCAL_ENABLED=true

# 或者依赖 NODE_ENV
# NODE_ENV=development 会自动启用 Local Auth
```

**预设账号**：

- 用户名：`admin`，密码：`admin123`，角色：`admin`
- 用户名：`analyst`，密码：`analyst123`，角色：`analyst`

⚠️ **警告**：Local Auth 仅用于开发/演示，严禁生产使用！

## 🚀 部署步骤

### 1. 准备环境变量

创建 `.env` 文件：

```bash
# 认证配置（选择一种）
AUTH_HEADER_ENABLED=true
AUTH_HEADER_TRUSTED_PROXIES=127.0.0.1,10.0.0.0/8

# 或者（OIDC）
# AUTH_OIDC_ENABLED=true
# AUTH_OIDC_ISSUER=...
# AUTH_OIDC_AUTHORIZATION_URL=...
# AUTH_OIDC_TOKEN_URL=...
# AUTH_OIDC_JWKS_URL=...
# AUTH_OIDC_CLIENT_ID=...
# AUTH_OIDC_CLIENT_SECRET=...
# AUTH_OIDC_REDIRECT_URI=...

# 或者（仅开发）
# AUTH_LOCAL_ENABLED=true
```

### 2. 验证数据库

```bash
# 检查迁移状态
cd apps/server
npm run migrate:status

# 如果需要手动运行迁移
npm run migrate
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 4. 验证认证

测试本地 cookie session 状态端点：

```bash
curl http://localhost:3333/auth/local/status
```

如果配置了 Header Auth，使用 curl 访问受保护 API：

```bash
curl -H "X-User-Id: 123" \
     -H "X-User-Name: zhangsan" \
     -H "X-User-Email: zhangsan@example.com" \
     -H "X-User-Roles: admin,analyst" \
     http://localhost:3333/datasources
```

## 🔍 故障排查

### 问题 1：所有请求返回 401

**检查**：

1. 环境变量是否正确设置
2. Header 前缀是否匹配
3. 必需的 header 是否存在
4. IP 是否在信任代理列表中

**调试**：

```bash
# 检查环境变量
echo $AUTH_HEADER_ENABLED
echo $AUTH_HEADER_TRUSTED_PROXIES

# 测试 Header Auth 是否能进入受保护 API
curl -v -H "X-User-Id: test" http://localhost:3333/datasources
```

### 问题 2：用户无法创建/更新数据

**检查**：

1. 认证中间件是否正确应用到路由
2. ctx.auth.user 是否正确绑定
3. 控制器中是否正确使用 user.id

**调试**：

```typescript
// 在控制器中添加调试
console.log('Current user:', ctx.auth.user);
```

### 问题 3：数据库外键错误

**检查**：

1. users 表是否存在
2. creator_id/updater_id 字段是否正确添加
3. 外键约束是否创建

**修复**：

```sql
-- 检查外键
SELECT * FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'datasources'
AND REFERENCED_TABLE_NAME = 'users';
```

## 📊 监控和维护

### 日志监控

认证系统会输出以下日志：

- `✅ Auth success via header: zhangsan` - 认证成功
- `❌ All auth providers failed` - 所有提供者失败
- `Auth error from header: ...` - 提供者错误

### 数据清理

如果需要清理测试数据：

```sql
-- 删除测试用户（保留系统用户）
DELETE FROM users WHERE uid LIKE 'header:%' AND uid != 'system:anonymous';

-- 重置业务表关联（可选）
UPDATE datasources SET creator_id = NULL, updater_id = NULL;
```

## 🛡️ 安全建议

1. **内网部署**：严格限制 trusted_proxies，仅允许内网网段
2. **OIDC 部署**：使用 HTTPS 回调地址，限制 IdP 下发的角色和权限 claim
3. **Local Auth**：仅限开发环境，生产环境必须禁用
4. **Header Auth**：确保上游网关已完成身份验证

## 📝 配置示例

### Docker Compose

```yaml
services:
  sparkset:
    image: sparkset:latest
    environment:
      - AUTH_HEADER_ENABLED=true
      - AUTH_HEADER_TRUSTED_PROXIES=172.16.0.0/12
      - AUTH_HEADER_PREFIX=X-User-
    ports:
      - '3333:3333'
```

### Helm Values

```yaml
auth:
  header:
    enabled: true
    trustedProxies:
      - '10.0.0.0/8'
      - '172.16.0.0/12'
    headerPrefix: 'X-User-'
```

## 🔗 相关文档

- [认证系统设计](../auth-spect.md) - 架构设计
- [实施计划](../IMPLEMENTATION_PLAN.md) - 开发计划
- [API 文档](./api.md) - 接口说明
