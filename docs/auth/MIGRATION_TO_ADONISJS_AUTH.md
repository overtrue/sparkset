# 迁移到 AdonisJS Auth 包

## 当前实现

当前项目使用自定义的 `AccessTokenGuard` 实现，位于 `app/guards/access_token_guard.ts`。这个实现：

- 手动管理 Access Token 的生成和验证
- 使用 `AccessToken` 模型存储令牌
- 在每个需要认证的请求中手动实例化 Guard

## 推荐迁移方案

### 1. 安装 AdonisJS Auth 包

```bash
node ace add @adonisjs/auth
```

### 2. 配置 Auth

创建 `config/auth.ts`：

```typescript
import { defineConfig } from '@adonisjs/auth';
import { tokensGuard, tokensUserProvider } from '@adonisjs/auth/access_tokens';
import type { InferAuthEvents, Authenticators } from '@adonisjs/auth/types';

const authConfig = defineConfig({
  default: 'api',
  guards: {
    api: tokensGuard({
      provider: tokensUserProvider({
        model: () => import('#models/user'),
        tokens: 'accessTokens',
      }),
    }),
  },
});

export default authConfig;

declare module '@adonisjs/auth/types' {
  interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
```

### 3. 更新 User 模型

```typescript
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { compose } from '@adonisjs/core/helpers';
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['username', 'email'],
  passwordColumnName: 'passwordHash',
});

export default class User extends compose(BaseModel, AuthFinder) {
  // ... existing columns ...

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    prefix: 'spk_',
    table: 'access_tokens',
  });
}
```

### 4. 更新 Controller

```typescript
// Before (current)
const guard = new AccessTokenGuard(ctx);
const user = await guard.authenticate();

// After (with @adonisjs/auth)
const user = await ctx.auth.use('api').authenticate();
```

### 5. 更新路由中间件

```typescript
// routes.ts
import router from '@adonisjs/core/services/router';
import { middleware } from '#start/kernel';

router
  .group(() => {
    // Protected routes
  })
  .use(middleware.auth({ guards: ['api'] }));
```

### 6. 登录/注册流程

```typescript
// Login
const user = await User.verifyCredentials(username, password);
const token = await User.accessTokens.create(user);

// Response
return response.ok({
  token: token.value!.release(),
  user: {
    id: user.id,
    username: user.username,
    // ...
  },
});
```

## 迁移优势

1. **标准化**: 使用 AdonisJS 官方认证方案，更容易维护
2. **安全性**: 官方包经过广泛测试和安全审计
3. **功能丰富**: 支持多种 Guard（session、token、basic）
4. **更好的类型支持**: 完整的 TypeScript 类型定义
5. **易于测试**: 内置测试工具和模拟支持

## 迁移步骤（建议顺序）

1. [ ] 安装并配置 @adonisjs/auth
2. [ ] 更新 User 模型使用 AuthFinder mixin
3. [ ] 创建迁移脚本将现有 access_tokens 表格式化
4. [ ] 更新 LocalAuthController 使用新的认证 API
5. [ ] 更新所有受保护路由使用官方中间件
6. [ ] 移除旧的 AccessTokenGuard 和相关代码
7. [ ] 更新测试用例

## 注意事项

- 迁移过程中需要确保现有令牌的兼容性
- 建议在开发环境充分测试后再部署到生产环境
- 可以考虑同时支持两种认证方式，逐步过渡

## 参考链接

- [AdonisJS Auth 文档](https://docs.adonisjs.com/guides/authentication/introduction)
- [Access Tokens Guard](https://docs.adonisjs.com/guides/authentication/access-tokens-guard)
