# Sparkset 开发待办

> 基于 `spec.md` 拆分的执行清单，完成一项即提交一次。

## 阶段 1：仓库初始化与基础设施

- [x] 配置 turborepo 工作区（package.json、turbo.json、pnpm-workspace.yaml、tsconfig.base.json）
- [x] 配置基础开发工具：ESLint、Prettier、TypeScript、husky 等
- [x] 初始化 MySQL 测试环境并编写基础迁移（数据源、Schema 缓存、会话、消息、动作表）
- [x] 搭建 AdonisJS API 项目骨架（路由、控制器目录、env）
- [x] 搭建 Next.js Dashboard 骨架并接入 shadcn/ui + Tailwind（侧边栏使用 shadcn sidebar block-02）
- [x] 搭建 CLI 项目骨架（命令框架、入口脚本）

## 阶段 2：核心模块

- [x] 数据源管理：API/CLI + Dashboard 表单 + 手动同步入口
- [x] Schema 缓存：信息\_schema 拉取、缓存表写入、API/CLI 查询
- [ ] Action 与工具管理：模型/迁移完成，工具注册表与前端管理待补
- [ ] AI 服务封装：Vercel AI SDK 封装、提示词模板、fallback 配置
- [x] 查询执行器：SQL 只读校验 + 自动 LIMIT 合并（跨源/结构化待补）
- [ ] 会话与消息：API/CLI 接口已通，Dashboard 展示与模板化待做

## 阶段 3：API 与交互层

- [x] 完成 REST API 集成（/query、/actions/:id/execute、会话接口等）
- [ ] Dashboard 页面：数据源管理、查询工作台（已增强），对话记录、模板列表
- [x] CLI 功能：query:run、conversation:list/show、action:exec、--api 覆盖
- [ ] 前后端集成与测试（单测、E2E、错误态与 loading 态）

## 阶段 4：工具生态与 AI 强化

- [ ] 新增 API / 文件读取等工具 handler 并注册
- [ ] 提示词优化与多模型/多提供商实验
- [ ] 高级查询与性能优化（嵌套、聚合、跨库性能）
- [ ] 日志、追踪、监控接入
- [ ] 权限/多租户雏形

## 阶段 5：部署与发布

- [ ] Dockerfile + CI/CD 脚本
- [ ] 文档编写（部署、API、开发指南、用户指南）
- [ ] 压测与 UX 调整
- [ ] 发布 v1 收集反馈

## 更新记录

- 2026-02-06：修复 Dashboard 构建缺失的 Form 组件与 react-resizable-panels 别名导出，解除 turbo build 阻塞
- 2026-02-03：Dashboard 数据源模块重构（拆分列表组件与 Schema 编辑器、统一日期格式、占位符与可访问性改进）
- 2026-02-03：Chart Builder 可访问性与占位符一致性优化，补齐 i18n 文案
- 2026-02-03：Chart Builder 与 Schema 编辑器补齐示例占位符（含省略号）与新文案
- 2026-02-03：Schema 编辑器补齐表单 `name`/`aria-label` 提示
- 2026-02-03：Chart Builder 拆分预览面板组件（builder-preview）
- 2026-02-04：Chart Builder 拆分配置表单组件（builder-form），简化主组件与表单提交流程
- 2026-02-04：Chart Builder 配置表单补齐 `autocomplete` 与系列标签可访问性
- 2026-02-04：移除未使用的 Datasource Manager 组件文件
- 2026-02-04：SchemaService 提取语义描述更新重试逻辑，减少重复分支
- 2026-02-04：BotProcessor 拆分会话与路由流程，移除简化兼容处理器
- 2026-02-04：AI Provider 配置与连通性检测拆分常量与辅助函数
- 2026-02-04：移除 Dashboard 旧 API 兼容层与 Chart Recharts 兼容字段
- 2026-02-04：服务端移除本地认证旧 Cookie 路径与 BotQueryProcessor 旧会话写入
- 2026-02-04：QueryService 移除无执行器回退并改为强依赖执行器，Action Manager 并行删除与表单可访问性改进
- 2026-02-04：移除服务端无数据库回退与 BotProcessor 兼容分支，Action 相关占位符与加载态文案统一为省略号并补齐表单可访问性
- 2026-02-04：AI Provider 管理器精简状态与批量删除逻辑，统一加载态文案与占位符省略号，表单补齐可访问性与输入语义
- 2026-02-04：Chart Builder 逻辑去重与校验收敛（useWatch/getValues）、预览请求防抖防竞态、变体默认样式初始化优化
- 2026-02-04：Schema Editor 抽离状态更新逻辑与编辑互斥，统一忙碌态禁用与反馈消息结构，移除嵌套卡片并补齐表名截断
- 2026-02-04：Datasource 创建/编辑弹窗与详情编辑表单重构连接字段验证重置逻辑，补齐忙碌态禁用与输入语义
- 2026-02-04：Chart Selector 拆分计算与选择状态同步，补齐无障碍属性并优化小图预览渲染
- 2026-02-04：Chart Builder 配置表单抽离 Y 字段更新逻辑，收敛类型判断与聚合选项
- 2026-02-04：数据源详情页改为客户端加载与错误重定向，避免服务端鉴权请求导致 500
- 2026-02-04：Dashboard Selector 收敛列表渲染与加载逻辑，补齐无障碍标注与新增添加中状态文案
- 2026-02-04：Query History Drawer 收敛加载/展开逻辑、补齐无障碍标注、本地化日期与滚动容器规范
- 2026-02-04：Dataset 详情页收敛加载/保存/预览逻辑，统一日期格式、表单语义与未保存提示
- 2026-02-04：Charts 页面收敛列定义与图标映射，统一加载/空态文案与无障碍标注
- 2026-02-04：Datasource 详情页抽离回调与忙碌态，编辑弹窗关闭重置与表单禁用
- 2026-02-04：Bot 日志表收敛筛选排序逻辑与状态映射，补齐无障碍与 URL 状态同步
- 2026-02-04：DataTable 行为支持链接导航，列表页改为 href 行为并补齐图标无障碍标注
- 2026-02-04：EmptyState 支持链接动作，列表创建入口改为 Link 并统一省略号占位符
- 2026-02-04：表格列表补齐文本截断与换行处理，避免长字段溢出
- 2026-02-04：补齐按钮与菜单文案 Title Case，保持交互文案一致性
- 2026-02-04：用户菜单与组件菜单使用 Link 导航，Loading/Search 文案统一省略号
- 2026-02-04：Bot 详情/编辑/日志页面简化派生状态并补齐图标无障碍标注
- 2026-02-04：Query 空态与表单语义重构，统一 Loading 文案与导航入口
- 2026-02-04：Query 运行器错误解析收敛与图标无障碍补齐
- 2026-02-04：Bot 表单状态收敛与选择/勾选组件统一，补齐平台选择占位符
- 2026-02-04：Query 结果表与 SQL/Schema 抽屉补齐可访问性与空态结构
- 2026-02-04：Chart Builder 默认数据源/变体逻辑修复与预览按钮文案统一
- 2026-02-04：Query 表单输入限制与空态组件样式统一
- 2026-02-04：Onboarding 与 ChartList 导航统一 Link，图标间距与无障碍修正
- 2026-02-04：ErrorState 图标间距与无障碍修正
- 2026-02-04：数据源/AI Provider 选择器补齐无障碍标注与文案一致性
- 2026-02-04：Dashboard 详情页状态收敛与空态结构统一，Widget 关联查找优化
- 2026-02-04：Dashboard AddWidget 弹窗加载与列表渲染优化，Loading 文案统一
- 2026-02-04：Dashboard 编辑弹窗表单语义补齐与空态文案补全
- 2026-02-04：Dashboard 数据集/文本 Widget 空态国际化与加载逻辑收敛
- 2026-02-05：Bot 测试抽屉与 Token 管理文案/无障碍优化，统一省略号文案并补齐 i18n，EventLogs 内容截断统一
- 2026-02-05：AI 提示词集中到 core，移除 Action SQL 生成的非 JSON fallback，Schema/Intent 生成统一走 Vercel AI SDK 工厂，前端认证 API 基地址统一
- 2026-02-05：Schema Editor 表/列列表增量渲染与长文案折行，Bot 日志表虚拟滚动与列截断/对齐优化
- 2026-02-05：Charts 预览与详情统一自适应布局，Radial/Pie 渲染简化并去除调试代码，Builder 状态同步去轮询
- 2026-02-05：修复 core AI 提示词模板结尾字符串闭合错误，恢复编译
- 2026-02-05：Chart Builder 状态回传加保护，避免表单状态联动引发渲染循环
- 2026-02-05：DashboardSelector 加载仪表盘使用稳定翻译引用，避免弹出层打开时触发无限更新
- 2026-02-05：useTranslations 返回 memoized 函数，避免翻译函数变动触发副作用循环
- 2026-02-05：Dataset 详情页翻译引用稳定化，避免加载/保存回调重复创建
- 2026-02-05：Button 组件恢复 forwardRef，确保 Popover/Dropdown 等 asChild 触发器可稳定挂载
- 2026-02-05：客户端路由钩子返回值 memoize，避免依赖 router 的回调重复创建
- 2026-02-05：Popover 触发器改为业务侧按钮样式直出，避免 asChild 依赖导致的 Popper 循环更新
- 2026-02-05：DataTable 移除 TableSpacer 引用，适配更新后的 table 组件导出
- 2026-02-05：DatasetWidget 计算列/行的 hook 提前，修复 hooks 顺序变化
- 2026-02-05：Schema Editor 移除 TableSpacer 引用，适配更新后的 table 组件导出
- 2026-02-05：Datasource API 统一归一化 isDefault，避免列表渲染出现 “0”
- 2026-02-05：AI Provider 选择器触发器文本左对齐，避免居中错位
- 2026-02-05：AI Provider 编辑弹窗类型选择触发器左对齐，防止值居中
- 2026-02-05：Datasource 选择器触发器文本左对齐，避免居中错位
- 2026-02-05：Actions 列表执行按钮外露，执行结果改为弹窗展示
