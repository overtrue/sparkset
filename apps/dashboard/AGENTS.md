# i18n 架构变更规则

@extends ../../AGENTS.md

## 核心原则

**无需任何向后兼容性** - 这是一个未发布的项目，所有变更都是破坏性的，直接应用新设计。

## 当前架构

- **语言存储**: localStorage (`app-locale` 键)
- **URL 结构**: 无语言前缀，如 `/charts` 而非 `/zh-CN/charts`
- **路由**: 使用 `@/i18n/routing` 导出的钩子
- **翻译**: 通过根布局的 `TranslationsProvider` 提供

## 强制规则

### 0. 禁止修改 shadcn UI 组件

- ❌ **绝对禁止修改 `src/components/ui/` 目录下的任何组件**
- 这些是 shadcn 原子组件，通过 CLI 维护，可能被自动更新/替换
- 直接修改会在通过 CLI 更新 shadcn 组件时产生冲突
- 重新生成组件时修改会丢失

**自定义方式**:

- ✅ 在业务页面/组件级别应用自定义样式（使用 `className`、`style` props 或包装组件）
- ✅ 在 `src/components/`（非 `src/components/ui/`）创建扩展或组合 shadcn 组件的高阶组件
- ✅ 在 `src/components/{module}/` 创建模块特定的包装组件

### 1. 禁止使用旧模式

- ❌ 禁止在 URL 中使用语言前缀
- ❌ 禁止从 `params` 中读取 `locale`
- ❌ 禁止使用 `getLocaleFromPathname()` 等旧函数
- ❌ 禁止修改 `next.config.mjs` 添加 locale 重写

### 2. 必须使用新 API

- ✅ 客户端: `useLocale()`, `useSetLocale()`, `usePathname()`, `useRouter()` from `@/i18n/routing`
- ✅ 服务器端: `getLocaleFromRequest()` from `@/i18n/server-utils`
- ✅ 翻译: `useTranslations()` from `@/i18n/use-translations`

### 3. 页面结构

- 所有页面必须在根路径，如 `/charts/page.tsx`（不是 `/[locale]/charts/page.tsx`）
- 根布局 (`/app/layout.tsx`) 负责所有语言处理
- 页面组件不应关心语言，只负责渲染

### 4. 语言切换

- 使用 `useSetLocale()` 更新 localStorage
- 自动刷新页面应用变更
- 无需重定向，路径保持不变

### 5. 错误处理

- 如果 localStorage 不可用，回退到默认语言
- 如果 cookie 不存在，使用 Accept-Language 或默认
- 不要尝试兼容旧 URL，直接拒绝访问

## 文件清单

- `/src/i18n/locale-storage.ts` - localStorage 管理
- `/src/i18n/client-routing.tsx` - 客户端路由钩子
- `/src/i18n/server-utils.ts` - 服务器端工具
- `/src/i18n/routing.ts` - 公共 API
- `/src/middleware.ts` - 语言切换和旧 URL 重定向
- `/src/app/layout.tsx` - 根布局（获取语言，提供翻译）

## 变更原则

1. **直接变更**: 不要保留旧代码
2. **破坏性**: 不需要兼容旧版本
3. **简洁**: 移除所有条件分支和兼容逻辑
4. **明确**: 如果不支持，直接报错而不是回退
