# Database migrations (bootstrap)

存放基础表结构的 SQL 脚本，优先支持 MySQL 8.x。后续可接入 AdonisJS / Knex 的迁移系统。

包含的表：

- `datasources`：数据源配置与同步时间
- `table_schemas`、`column_definitions`：Schema 缓存
- `actions`：可复用的动作模板
- `conversations`、`conversation_messages`：会话与消息记录

使用方式（手动）：

```sh
mysql -u<user> -p<password> <database> < apps/api/database/migrations/0001_base_tables.sql
```

后续会添加自动迁移脚本与多数据库支持。
