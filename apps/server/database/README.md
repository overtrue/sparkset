# Database migrations

使用 AdonisJS Lucid 迁移系统管理数据库结构。

包含的表：

- `datasources`：数据源配置与同步时间
- `table_schemas`、`column_definitions`：Schema 缓存
- `actions`：可复用的动作模板
- `conversations`、`conversation_messages`：会话与消息记录

## 运行迁移

使用 AdonisJS ace 命令运行迁移：

```bash
cd apps/api
node ace migration:run
```

或者回滚迁移：

```bash
node ace migration:rollback
```
