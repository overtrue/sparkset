好，那我直接给你一份可以作为 sparkset 官方设计文档的 Auth Spec。
这份 spec 的目标是：工程可落地、可以直接丢给 AI 或人写代码、不掺杂实现细节但足够精确。

你可以把它放在：

docs/specs/auth.md

或者作为 AUTHENTICATION.md。

⸻

Sparkset Authentication Specification

1. 设计目标（Design Goals）

Sparkset 的认证系统遵循以下原则：1. 不内置完整账号体系 2. 不绑定具体身份提供方（IdP）3. 支持企业内网、OIDC、本地演示等多种部署形态 4. 以最小实现成本覆盖最大使用场景 5. 认证（Authentication）与授权（Authorization）解耦

Sparkset 只负责识别“当前用户是谁”，不负责账号生命周期管理、密码策略、多因子认证等能力。

⸻

2. 核心概念

2.1 Authentication Provider

Authentication Provider（简称 Provider）是一种独立的身份认证方式，例如：
• Header Authentication（反向代理 / 内网网关）
• OpenID Connect（OIDC）
• Local Authentication（仅用于 demo）

每个 Provider：
• 独立启用/禁用
• 按配置顺序执行
• 互不依赖

⸻

2.2 Auth Chain（责任链）

Sparkset 使用 Auth Chain 机制处理请求认证：1. 按顺序遍历所有启用的 Provider 2. 判断 Provider 是否可以处理当前请求 3. 第一个成功返回用户上下文的 Provider 即为认证结果 4. 若所有 Provider 均未返回用户，则视为未认证

⸻

3. UserContext（统一用户模型）

无论用户来自哪种认证方式，最终都会被映射为统一的 UserContext。

UserContext {
uid: string // 稳定唯一标识（external id）
username: string
email?: string
display_name?: string

roles: string[]
permissions: string[]

provider: string // header | oidc | local | ...
raw?: Record<string, any> // 原始 claims / headers
}

说明
• uid 必须在同一 Provider 内保持全局唯一
• Sparkset 不存储密码
• roles / permissions 可来自外部系统或本地映射
• raw 仅用于调试或扩展，不参与核心逻辑

⸻

4. AuthProvider 接口规范

所有 Provider 必须实现以下接口：

interface AuthProvider {
name: string

enabled(): boolean

canHandle(req: Request): boolean

authenticate(req: Request): Promise<UserContext | null>
}

方法语义
• enabled()
• 是否启用该 Provider
• 由配置驱动
• canHandle(req)
• 判断该 Provider 是否“可能”处理当前请求
• 不做实际认证逻辑
• authenticate(req)
• 执行实际认证
• 成功返回 UserContext
• 失败或不适用返回 null
• 不抛异常（除非是系统错误）

⸻

5. AuthManager（认证调度器）

AuthManager 负责协调多个 Provider 的执行顺序。

行为规则 1. 按配置顺序遍历 Provider 2. 跳过未启用的 Provider 3. 跳过 canHandle() 返回 false 的 Provider 4. 返回第一个成功认证的 UserContext 5. 若全部失败，返回 null

⸻

6. 内置 Authentication Providers

6.1 Header Authentication Provider（推荐）

使用场景
• 内网部署
• APISIX / Nginx / Envoy 等网关
• 上游已完成身份认证

配置示例

auth:
header:
enabled: true

    trusted_proxies:
      - 127.0.0.1
      - 10.0.0.0/8

    headers:
      uid: X-User-Id
      username: X-User-Name
      email: X-User-Email
      roles: X-User-Roles
      permissions: X-User-Permissions

行为规范
• 若缺少 uid header，直接跳过该 Provider
• 请求必须来自 trusted_proxies
• roles / permissions 使用逗号分隔
• Header 数据原样写入 raw

⸻

6.2 OIDC Authentication Provider（推荐）

使用场景
• 企业部署
• 内部 OA / SSO
• 公有云 IdP

支持的 IdP 示例
• Keycloak
• Authentik
• Zitadel
• Azure AD / Okta

配置示例

auth:
oidc:
enabled: true

    issuer_url: https://id.example.com/realms/main
    client_id: sparkset
    client_secret: xxx

    scopes:
      - openid
      - profile
      - email

    claim_mapping:
      uid: sub
      username: preferred_username
      email: email
      roles: roles
      permissions: permissions

行为规范
• 使用 OIDC Authorization Code Flow
• 校验 id_token 签名与 issuer
• 根据 claim_mapping 映射用户字段
• 不依赖 access_token 的权限校验

⸻

6.3 Local Authentication Provider（可选）

使用场景
• 本地开发
• Demo
• 开源用户快速体验

限制说明
• 不支持 MFA
• 不支持 SSO
• 不推荐生产使用

行为规范
• 使用本地数据库校验用户名密码
• 密码必须使用安全哈希算法
• 明确在文档中标注为非生产方案

⸻

7. 用户同步策略

7.1 自动用户创建
• Sparkset 不要求预先创建用户
• 用户首次登录时自动创建本地用户记录
• 唯一键：provider + uid

7.2 用户禁用策略
• 外部 IdP 删除用户 ≠ Sparkset 删除用户
• Sparkset 仅标记用户为 disabled
• 历史数据仍然保留

⸻

8. 认证与授权的关系

Sparkset 明确区分：
• Authentication：用户是谁
• Authorization：用户能做什么

认证系统只负责返回 UserContext
授权系统（RBAC / ACL）独立实现。

⸻

9. 官方推荐部署方式

场景 推荐方案
内网部署 Header Authentication
企业部署 OIDC（Keycloak / Authentik）
开发测试 Local Authentication

⸻

10. 扩展性说明

新增认证方式只需要：1. 实现 AuthProvider 接口 2. 注册到 AuthManager 3. 提供配置 schema

无需修改已有 Provider。

⸻

11. 非目标（Non-Goals）

Sparkset 明确不提供：
• 账号生命周期管理
• 密码策略 / 重置
• 多因子认证
• 用户注册流程
• 身份联合逻辑

上述能力应由外部身份系统提供。

⸻

如果你愿意，下一步我可以继续帮你做三件“直接省你时间”的事之一：1. 把这个 spec 拆成代码 TODO（逐文件）2. 给你一个 Header Provider 的完整参考实现 3. 按这个 spec 帮你设计 auth 配置的 schema 校验

这套 spec 是“Grafana 思路 + 为 sparkset 收敛过的版本”，非常适合你这个项目定位。
