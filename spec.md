# Sparkset AI 运营助手设计文档

## 概述

Sparkset 运营助手旨在帮助企业运营团队通过自然语言与数据源交互，自动生成并执行查询，快速获得业务洞察。系统不仅支持统计性问题（例如“本周有多少人取消了订单？”），还支持列出用户列表、分析地区分布等复杂查询，并为未来的 API 调用、文件读取等更多工具类型预留接口。

## 总体架构

整体架构分为数据层、核心服务层和交互层三部分，数据流从左至右贯穿各层：

1. **数据源层**：目前支持 MySQL，未来可扩展至 PostgreSQL、MongoDB 等。所有数据源通过统一的 `DataSource` 抽象管理。

2. **同步与缓存层**：定时或手动同步数据库的 Schema 和统计信息，将结构信息及必要的缓存存入本地缓存或配置表，降低查询时的元数据成本。

3. **AI 与 SQL 引擎**：接收用户的自然语言请求，构造包含数据源上下文的提示词，经由 Vercel AI SDK 调用模型生成 SQL。生成的 SQL 先经 dry‑run 校验，确认只读、安全后再执行；多个 SQL 的组合也在此处理并合并结果。该层同时包含工具调用逻辑，未来可以根据模型返回选择合适的工具执行（例如 API、文件读取）。

4. **API 层（AdonisJS）**：提供统一的 HTTP 接口，负责身份验证、参数校验、调用核心服务并返回结果。所有前端调用均经由此层。

5. **交互层**：
   - **Dashboard**：基于 Next.js 和 shadcn/ui，实现管理界面，提供数据源管理、查询工作台、对话记录、模板列表等模块。采用可折叠的侧边栏布局[ui-thing.behonbaker.com](https://ui-thing.behonbaker.com/blocks/sidebar#:~:text=More%20options%20for%20header%20links)方便导航。

6. **持久化存储**：用于存储会话和动作模板，便于复用和审计。会话记录按消息拆分存储，动作模板记录生成的 SQL 或其他工具调用参数。

Motia 的设计强调通过单一原语“Step”统一 API、队列和工作流[motia.dev](https://www.motia.dev/docs#:~:text=Why%20Motia%3F)，这一思想可借鉴到我们的系统中：各类动作（SQL 查询、API 调用等）都是可插拔的工具，每个工具实现固定接口，系统根据上下文调用相应工具。

Vercel AI Gateway 提供模型与提供商切换的能力，可根据成本或性能需要选择不同模型，并支持配置默认提供者和回退机制[vercel.com](https://vercel.com/docs/ai-gateway/models-and-providers#:~:text=between%20different%20AI%20models%20,ensure%20high%20availability%20and%20reliability)[vercel.com](https://vercel.com/docs/ai-gateway/models-and-providers#:~:text=Specifying%20the%20model)。

## 技术栈选择

- **TypeScript**：统一前后端语言，提高类型安全和开发效率。

- **AdonisJS**：成熟的 Node.js MVC 框架，提供完善的路由、ORM、验证和中间件体系，适合快速构建 API。

- **Next.js + shadcn/ui**：前端框架，支持服务器端渲染和客户端渲染混合。shadcn/ui 提供现代化 UI 组件和多种侧边栏布局供参考[ui-thing.behonbaker.com](https://ui-thing.behonbaker.com/blocks/sidebar#:~:text=More%20options%20for%20header%20links)。

- **Vercel AI SDK (v6)**：用于调用多模型，多提供商的语言模型，可在每次调用或全局指定模型与提供商，支持自动回退[vercel.com](https://vercel.com/docs/ai-gateway/models-and-providers#:~:text=between%20different%20AI%20models%20,ensure%20high%20availability%20and%20reliability)[vercel.com](https://vercel.com/docs/ai-gateway/models-and-providers#:~:text=Specifying%20the%20model)。

- **Turborepo**：monorepo 构建工具，对多包项目进行任务缓存与并行化，提升编译效率。

- **数据库**：初期使用 MySQL，通过 open‑source 的连接库统一接口；后续可扩展其他数据库。

## 目录结构与模块拆分

项目采用 monorepo 管理，根目录包含 `turbo.json` 和工作区配置，子目录划分如下：

text

复制代码

`├── apps │   ├── server             # AdonisJS 项目，提供后端 REST API │   │   ├── app/controllers │   │   ├── app/services   # 业务逻辑：数据源管理、AI 调用、查询执行 │   │   ├── app/db          # Repository 接口定义和实现 │   │   ├── routes.ts      # API 路由 │   │   ├── config         # 配置文件 │   │   └── database       # 迁移和种子 │   └── dashboard         # Next.js 前端应用 │       ├── app/           # 页面或路由 │       ├── components     # 通用 UI 组件 │       ├── lib            # API 调用封装、hook │       └── public ├── packages │   ├── core              # 核心逻辑：数据源管理、查询构建、执行器，包含 DBClient 接口 │   ├── ai                # AI 提供者注册、提示词拼装、调用封装 │   ├── models            # 公共类型定义（DataSource、Action 等） │   ├── utils             # 工具函数与通用逻辑 │   └── config            # 公共配置加载 └── README.md`

### 命名与代码规范

为保持代码优雅、易读且易于维护，项目遵循以下原则：

1. **避免无意义后缀**：在命名模块、函数、变量时，尽量避免使用诸如 `info`、`data`、`list` 等泛泛的后缀，除非确实具有特定含义。例：使用 `queries` 表示查询集合，而非 `queryList`；使用 `dataSource` 表示数据源对象，而非 `dataInfo`。

2. **命名优雅美观**：目录、文件、变量和函数名称应简洁且具描述性。统一采用约定俗成的大小写风格：目录使用 kebab‑case，变量使用 camelCase，类与接口使用 PascalCase。

3. **代码组织合理**：逻辑相关的功能聚合在一起，避免不同层次代码混杂。例如数据库 Repository 接口定义在 `apps/server/src/app/db/interfaces.ts`，DBClient 接口在 `packages/core/src/db/types.ts`，AI 调用封装在 `packages/ai`，各类业务模块在 `app/services`（也可命名为 `app/modules`）中分层实现。

4. **逻辑简洁严谨**：实现核心流程时保持逻辑清晰，避免过度嵌套和重复代码；对复杂步骤提供必要的注释，以便后续维护。

5. **UI 组件使用规范**：前端组件尽量使用 shadcn 内置组件，非必要不自造组件；新增组件必须通过官方命令 `pnpm dlx shadcn@latest add <component>` 安装，组件列表参考 https://ui.shadcn.com/llms.txt，高阶页面/布局优先参考 https://ui.shadcn.com/blocks 示例实现。

### 开发要求与用户体验

此外，项目在开发过程中需遵循以下体验和设计原则：

1. **界面简洁美观**：UI 设计应保持干净整洁，组件布局合理，色彩搭配协调，不堆砌无关信息，避免复杂多余的操作流程。

2. **交互直观易用**：操作路径短、反馈及时，输入框、按钮等交互元素符合用户预期。查询结果清晰呈现，支持下载或复制。

3. **用户体验优先**：优先考虑用户使用场景与效率，错误提示友好且具指导性，加载过程显示进度或占位提示。

4. **需求明确优先**：没有明确指定的功能不要擅自添加，例如前期未要求给数据源打标签，则不在 UI 或 API 中额外设计 tag 字段；遵循敏捷开发的迭代原则，需求变化时再添加新特性。

其中 **packages/core** 中包含 Action 执行器，它会根据 Action 的 `type` 字段分发到对应的工具实现，例如 `sql`、`api` 或 `file`。新增工具只需在 **packages/ai** 或专用包中实现，并在注册表中声明。

## 数据模型设计

### DataSource

定义连接信息、缓存状态和元数据：

ts

复制代码

`interface DataSource {   id: number;   name: string;   type: 'mysql' | 'postgres' | string;   host: string;   port: number;   username: string;   password: string;   database: string;   lastSyncAt?: Date; }`

### Schema 缓存

在同步时读取每个数据源的表结构与字段注释，存入缓存表：

ts

复制代码

`interface TableSchema {   id: number;   datasourceId: number;   tableName: string;   columns: ColumnDefinition[];   updatedAt: Date; }  interface ColumnDefinition {   name: string;   type: string;   comment?: string; }`

### Action

用于描述可复用的动作（查询或其他工具调用）：

ts

复制代码

`interface Action {   id: number;   name: string;   description?: string;   type: 'sql' | 'api' | 'file' | string;   payload: any;       // SQL 列表、API 请求定义或文件路径等   parameters?: any;   // 可传入的动态参数   createdAt: Date;   updatedAt: Date; }`

### Conversation 与 Messages

记录用户与 AI 的交互，会话可以保存为模板复用：

ts

复制代码

`interface Conversation {   id: number;   userId?: number;   title?: string;   createdAt: Date;   updatedAt: Date; }  interface Message {   id: number;   conversationId: number;   role: 'user' | 'assistant' | 'system';   content: string;   metadata?: any; // 保存生成的 SQL、结果摘要等   createdAt: Date; }`

### Tool 定义

未来系统会内置多种工具，AI 根据自然语言决定调用哪个工具。工具注册表定义如下：

ts

复制代码

`interface ToolDefinition {   id: string;   name: string;   description: string;   type: 'sql' | 'api' | 'file' | 'custom';   inputSchema: any;    // 用于约束参数结构   handler: (args: any) => Promise<any>; // 执行函数 }`

## 关键模块说明

1. **DataSource Manager**：负责新增、编辑和删除数据源，提供同步接口。同步任务可以定时触发或通过 API 手动触发，更新 Schema 缓存表。

2. **AI Service**：封装 Vercel AI SDK，支持多模型/多提供商选择、fallback 策略[vercel.com](https://vercel.com/docs/ai-gateway/models-and-providers#:~:text=between%20different%20AI%20models%20,ensure%20high%20availability%20and%20reliability)。负责构造系统提示词，将 Schema 信息嵌入提示，生成 SQL 或指令。

3. **Query Builder & Executor**：在 AI 返回 SQL 后先进行 dry‑run 校验，再按 Action 定义顺序执行，支持跨数据源查询和结果合并。对于 `api` 或 `file` 类型，调用对应工具的 handler。

4. **Action Runner**：根据 Action 的 `type` 分发到不同处理器。支持持久化保存动作模板和参数，复用时直接读取并执行。

5. **Tool Registry**：注册系统内置工具，包含类型、描述、参数定义和 handler。AI 提示词中提供工具列表信息，模型根据上下文选择合适工具。

6. **API 层**：提供 RESTful 接口，包括数据源管理、动作执行、会话记录、模板管理等。中间件负责鉴权、日志和异常处理。

7. **Dashboard**：
   - Dashboard 提供可视化的查询工作台、结果展示、会话历史、模板管理等。利用 shadcn/ui 的侧边栏布局[ui-thing.behonbaker.com](https://ui-thing.behonbaker.com/blocks/sidebar#:~:text=More%20options%20for%20header%20links)实现良好用户体验。

## 流程说明

1. 用户通过 Dashboard 提出自然语言问题，系统在会话表中记录请求。

2. API 层调用 AI Service，根据数据源 Schema 拼装提示词，交由模型生成 SQL 或选择合适工具。

3. 对于 `sql` 类型，Query Builder 解析并执行生成的 SQL 列表；对于其他类型，调用对应工具处理。

4. 执行结果返回 API 层，再反馈给前端；同时将结果摘要、生成的 SQL 和其他元数据保存到消息表，方便追溯。

5. 用户可将某次成功的查询保存为 Action 模板，后续在同一或不同会话中直接复用。

## 安全与错误处理

- 对所有生成的 SQL 必须先执行 dry‑run，确认为只读查询且不会修改数据。

- 对跨数据源查询使用事务或临时表隔离，防止部分成功部分失败。

- 工具注册时可以设置安全等级，AI 调用前需检查当前用户或场景是否有权限使用。

- 日志和追踪系统对每次查询的执行情况进行记录，便于审计和故障排查。

## 扩展与迭代

- **数据源扩展**：通过在 `apps/server/src/app/db/lucid-db-client.ts` 中实现新的连接逻辑，更新 DataSource 类型，即可支持新的数据库。

- **工具生态**：新增文件处理、外部 API 调用、数据清洗等工具，只需实现对应 handler 并在 Tool Registry 中注册，AI 即可选择使用。

- **权限与多租户**：后续可在会话和动作记录中增加用户和租户字段，引入身份验证和权限控制模块。

- **观测性**：借鉴 Motia 的工作台理念[motia.dev](https://www.motia.dev/docs#:~:text=Why%20Motia%3F)，在 Dashboard 中引入实时日志和链路追踪，提升调试效率。

## 开发计划

为了确保项目顺利推进，以下提供一套详细的开发计划，涵盖前期研究、任务拆分和验收标准。

### 研究准备

在正式编码前，需要深入阅读和理解以下文档和资料：

1. **Motia 官方文档**：尤其是核心概念中的 Step、状态管理和工作流部分[motia.dev](https://www.motia.dev/docs#:~:text=Why%20Motia%3F)，了解其原子化思想及如何在我们的系统中借鉴。

2. **Vercel AI Gateway/SDK 文档**：学习模型与提供商切换、fallback 配置等[vercel.com](https://vercel.com/docs/ai-gateway/models-and-providers#:~:text=between%20different%20AI%20models%20,ensure%20high%20availability%20and%20reliability)[vercel.com](https://vercel.com/docs/ai-gateway/models-and-providers#:~:text=Specifying%20the%20model)；了解如何调用不同模型并管理 API Key。

3. **AdonisJS 文档**：重点研究路由定义、控制器、服务、ORM、数据库迁移和测试指南，确保 API 层设计规范。

4. **Next.js 文档**：包括 App Router、API Routes、数据获取和部署流程，便于构建 Dashboard。

5. **shadcn/ui 组件库**：了解组件 API，重点查看侧边栏布局和表格组件[ui-thing.behonbaker.com](https://ui-thing.behonbaker.com/blocks/sidebar#:~:text=More%20options%20for%20header%20links)。

6. **Turborepo 文档**：掌握任务缓存、构建管道配置，合理组织 monorepo。

7. **MySQL 官方文档和驱动库**：熟悉连接和查询方式，为跨数据源查询打下基础。

### 任务拆分

开发过程可以按照以下阶段进行，每个阶段对应若干任务和交付物：

#### 阶段 1：仓库初始化与基础设施

1. 创建 Git 仓库并配置 Turborepo 工作区；初始化 `apps` 和 `packages` 目录结构。

2. 配置基础开发工具：ESLint、Prettier、TypeScript、husky 等，统一代码风格和检查规则，遵循命名规范。

3. 搭建 MySQL 测试环境，编写数据库迁移脚本，建立基础表结构（数据源、Schema 缓存、会话、消息、动作）。

4. 搭建 AdonisJS 项目基础：配置路由、控制器目录、环境变量加载。

5. 初始化 Next.js 项目：配置 Tailwind CSS，安装 shadcn/ui 并演示基础布局。

#### 阶段 2：核心模块开发

1. **数据源管理用例**：
   - 实现 `POST /datasources`、`PUT /datasources/:id`、`DELETE /datasources/:id` 接口，支持创建、修改和删除数据源，并进行基础校验（名称唯一、连接信息完整）。

   - Dashboard 中开发添加/编辑数据源的表单页面，提交后调用 API 并显示结果；在数据源列表页提供删除按钮。

   - 实现 `POST /datasources/:id/sync` API，用于手动同步 Schema；编写计划任务在后台定时同步。

2. **Schema 缓存用例**：
   - 编写同步任务，连接数据库读取 `information_schema`，将表名、字段名、字段类型和注释存入 `table_schema` 和 `column_definition` 缓存表。

   - 提供 API `GET /schemas/:datasourceId` 返回缓存结构供 AI 模块使用。

3. **Action 和工具管理用例**：
   - 定义 Action 模型并创建 `actions` 表，包含 `id`、`name`、`type`、`payload` 等字段。

   - 实现 `POST /actions`、`GET /actions/:id`、`GET /actions` 接口用于保存和查询模板。

   - 实现工具注册表数据结构，提供 `GET /tools` 接口列出可用工具名称、描述和输入结构。

4. **AI 服务封装用例**：
   - 封装 Vercel AI SDK，支持在调用时指定 `model` 和 `provider` 字符串或实例；实现全局默认提供者配置及回退机制。

   - 设计提示词模板：包含用户请求、Schema 信息、已注册工具列表等，并在生成 SQL 时插入上下文。

5. **查询执行用例**：
   - 编写查询执行器：根据 Action 类型读取 SQL 列表或工具定义；先对 SQL 执行 dry‑run，通过解析 AST 确保无写入或危险操作。

   - 支持跨数据源查询：拆分 SQL 到不同数据库执行，再根据关联字段在内存中合并结果（如用户与订单）；确保执行顺序和错误回滚。

   - 返回结构化结果供前端渲染或 CLI 输出。

6. **会话与消息用例**：
   - 在 `conversations` 和 `conversation_messages` 表实现增删查接口；记录每次查询的请求、生成的 SQL、返回结果。

   - 提供 `POST /conversations` 创建会话、`POST /conversations/:id/messages` 追加消息。

   - 在 Dashboard 中展示对话列表，点击可展开查看每条消息和 SQL 详情；支持保存为模板的操作按钮。

#### 阶段 3：API 与交互层

1. **API 集成用例**：
   - 根据核心模块完成所有 RESTful API 实现，确保前端调用的数据格式和错误信息统一。

   - 实现 `POST /query` 接口，接收自然语言请求，调用 AI 服务并返回查询结果；支持分页和筛选参数。

   - 实现 `POST /actions/:id/execute` 接口，通过模板运行查询并返回结果。

   - 暴露 `GET /conversations`、`GET /conversations/:id` 接口用于查询历史会话和消息。

2. **Dashboard 开发用例**：
   - **数据源管理页面**：列表展示现有数据源，提供新增、编辑、删除和手动同步按钮；表单中校验必填项，操作结果以通知反馈。

   - **查询工作台**：提供输入框让用户输入自然语言查询，提交后调用 `/query` 并展示表格结果；支持将查询保存为模板。

   - **对话记录页面**：按时间顺序列出会话，点击展开可查看每条消息内容、生成的 SQL 和执行摘要。

   - **模板列表页面**：展示保存的 Action 模板，支持搜索、执行、删除。

   - 使用 shadcn/ui 的侧边栏和表格组件组织布局，保持交互简单、美观。

   - `action:exec <id>` 命令：执行已有模板并展示结果。

   - `help` 命令提供帮助信息，所有命令输出均符合交互体验要求。

3. **前后端集成和测试**：
   - 制定接口文档并在前端调用时遵循；对常见错误状态码进行处理和用户提示。

   - 编写单元测试覆盖 API 控制器与服务逻辑；编写端到端测试验证 UI 的主要用例。

   - 确保页面加载时有合适的 loading 状态，发生错误时展示友好的提示。

#### 阶段 4：工具生态与AI强化

1. 新增 API 和文件读取等工具，实现对应的 handler；在工具注册表中配置描述和输入/输出规范。

2. 优化提示词，使 AI 能根据场景自动选择合适工具；实验不同模型与提供者，记录结果与成本。

3. 针对复杂查询，增加嵌套查询、聚合统计等支持；优化跨数据库查询的性能。

4. 引入日志、追踪和监控，提供可视化的执行流程和错误信息。

5. 如果业务需要，可引入简易权限系统，为后期多租户奠定基础。

#### 阶段 5：部署与发布

1. 编写 Dockerfile、CI/CD 脚本，自动构建并部署 API 和 Dashboard；确保环境变量和秘密安全管理。

2. 完成文档编写，包括部署文档、API 文档、开发规范和用户指南。

3. 进行压力测试和用户体验测试，调整性能瓶颈和 UI 细节。

4. 正式发布第一个版本，收集反馈并规划后续迭代。

### 验收条件

每个任务或阶段的完成需符合以下条件：

1. **功能完整**：对应的 API 或界面可以按预期工作，例如添加数据源后能查询并同步 Schema，AI 可以生成 SQL 并返回正确结果，CLI 命令可正常执行。

2. **代码规范**：遵守命名与代码规范，代码通过 eslint/prettier 检查且有必要的单元测试覆盖。

3. **安全可靠**：SQL 查询经过 dry‑run 验证，无注入风险；外部工具调用经过权限检查。

4. **文档完善**：相关模块有清晰的文档或注释，方便他人理解和维护。

5. **用户体验**：Dashboard 页面布局合理、反馈及时。

6. **扩展性验证**：新增一种工具或数据源类型时，不需要大改现有框架即可集成，证明设计具有扩展性。

## 结语

本文档提出的设计兼顾当前需求和未来扩展性，通过统一的抽象与模块化拆分，为 AI 运营助手提供稳定、安全、可迭代的技术基础。开发团队可据此开展系统实现，后续根据业务需求逐步完善各模块功能。
