# Sparkset 部署指南

本文档介绍如何使用 Docker、docker-compose 和 Helm 部署 Sparkset。

## 目录

- [Docker 部署](#docker-部署)
- [Docker Compose 部署](#docker-compose-部署)
- [Helm Chart 部署](#helm-chart-部署)
- [环境变量参考](#环境变量参考)

## Docker 部署

### 构建镜像

#### 构建 API 镜像

```bash
docker build -f apps/server/Dockerfile -t sparkset/server:latest .
```

#### 构建 Dashboard 镜像

```bash
docker build -f apps/dashboard/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3333 \
  -t sparkset/dashboard:latest .
```

### 运行容器

#### 运行 API 容器

```bash
docker run -d \
  --name sparkset-api \
  -p 3333:3333 \
  -e DATABASE_URL="mysql://user:password@host:3306/sparkset" \
  -e AI_API_KEY="your-api-key" \
  -e AI_PROVIDER="openai" \
  sparkset/api:latest
```

#### 运行 Dashboard 容器

```bash
docker run -d \
  --name sparkset-dashboard \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL="http://localhost:3333" \
  sparkset/dashboard:latest
```

## Docker Compose 部署

Docker Compose 是最简单的部署方式，它会自动编排所有服务（MySQL、API、Dashboard）。

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 快速开始

1. **复制环境变量文件**

```bash
cp .env.example .env
```

2. **编辑 `.env` 文件**

根据你的需求修改环境变量，特别是：

- `MYSQL_ROOT_PASSWORD`: MySQL root 密码
- `MYSQL_PASSWORD`: MySQL 用户密码
- `AI_API_KEY`: AI 提供商的 API 密钥
- `AI_PROVIDER`: AI 提供商（openai 或 anthropic）

3. **启动所有服务**

```bash
docker-compose up -d
```

4. **查看服务状态**

```bash
docker-compose ps
```

5. **查看日志**

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f api
docker-compose logs -f dashboard
docker-compose logs -f mysql
```

6. **运行数据库迁移**

```bash
# 进入 API 容器
docker-compose exec api sh

# 在容器内运行迁移
node ace migration:run
```

7. **访问应用**

- Dashboard: http://localhost:3000
- API: http://localhost:3333
- API Health Check: http://localhost:3333/health

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（注意：这会删除数据库数据）
docker-compose down -v
```

### 重新构建镜像

```bash
# 重新构建所有镜像
docker-compose build

# 重新构建特定服务
docker-compose build api
docker-compose build dashboard

# 重新构建并启动
docker-compose up -d --build
```

### 数据持久化

MySQL 数据存储在 Docker volume `mysql_data` 中，即使容器停止，数据也会保留。

查看 volumes：

```bash
docker volume ls
docker volume inspect sparkset_mysql_data
```

## Helm Chart 部署

Helm Chart 用于在 Kubernetes 集群中部署 Sparkset。

### 前置要求

- Kubernetes 1.19+
- Helm 3.0+
- kubectl 配置正确

### 快速开始

1. **添加自定义 values 文件（可选）**

创建 `my-values.yaml`：

```yaml
mysql:
  auth:
    rootPassword: 'your-secure-password'
    password: 'your-secure-password'

api:
  env:
    AI_API_KEY: 'your-ai-api-key'
    AI_PROVIDER: 'openai'

dashboard:
  env:
    NEXT_PUBLIC_API_URL: 'http://sparkset-api:3333'
```

2. **安装 Chart**

```bash
# 使用默认配置
helm install sparkset ./helm/sparkset

# 使用自定义 values
helm install sparkset ./helm/sparkset -f my-values.yaml

# 指定命名空间
helm install sparkset ./helm/sparkset -n sparkset --create-namespace
```

3. **查看部署状态**

```bash
# 查看所有资源
kubectl get all -l app.kubernetes.io/name=sparkset

# 查看 Pod 状态
kubectl get pods -l app.kubernetes.io/name=sparkset

# 查看服务
kubectl get svc -l app.kubernetes.io/name=sparkset
```

4. **查看日志**

```bash
# API 日志
kubectl logs -l app.kubernetes.io/component=api

# Dashboard 日志
kubectl logs -l app.kubernetes.io/component=dashboard

# MySQL 日志
kubectl logs -l app.kubernetes.io/component=mysql
```

5. **运行数据库迁移**

```bash
# 进入 API Pod
kubectl exec -it deployment/sparkset-api -- sh

# 运行迁移
cd apps/server && node ace migration:run
```

### 更新部署

```bash
# 更新配置
helm upgrade sparkset ./helm/sparkset -f my-values.yaml

# 回滚到上一个版本
helm rollback sparkset
```

### 卸载

```bash
helm uninstall sparkset

# 如果使用了命名空间
helm uninstall sparkset -n sparkset
```

### 配置说明

#### 使用外部数据库

如果使用外部 MySQL 数据库，可以禁用内置 MySQL：

```yaml
mysql:
  enabled: false

api:
  env:
    DB_HOST: 'your-external-mysql-host'
    DB_PORT: '3306'
    DB_USER: 'your-user'
    DB_PASSWORD: 'your-password'
    DB_NAME: 'sparkset'
```

#### 配置 Ingress

启用 Ingress 以通过域名访问：

```yaml
ingress:
  enabled: true
  className: 'nginx'
  hosts:
    - host: sparkset.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: sparkset-tls
      hosts:
        - sparkset.example.com
```

#### 配置资源限制

```yaml
api:
  resources:
    requests:
      memory: '512Mi'
      cpu: '250m'
    limits:
      memory: '1Gi'
      cpu: '500m'
```

#### 配置 Secret

敏感信息（如 API 密钥）应通过 Secret 管理：

```bash
# 创建 Secret
kubectl create secret generic sparkset-api-secrets \
  --from-literal=ai-api-key=your-key \
  --from-literal=api-key=your-api-key

# 在 values.yaml 中引用
api:
  env:
    AI_API_KEY: ""  # 留空，从 Secret 读取
```

然后修改 `helm/sparkset/templates/api/deployment.yaml` 以从 Secret 读取。

### 生产环境建议

1. **使用外部数据库**: 生产环境建议使用托管的 MySQL 服务（如 AWS RDS、Google Cloud SQL）

2. **配置持久化存储**: 确保 MySQL PVC 使用可靠的存储类

3. **设置资源限制**: 根据实际负载调整 requests 和 limits

4. **启用监控**: 配置 ServiceMonitor 用于 Prometheus 监控

5. **配置备份**: 定期备份 MySQL 数据

6. **使用 TLS**: 配置 Ingress TLS 证书

7. **配置 HPA**: 根据负载自动扩缩容

## 环境变量参考

### API 环境变量

| 变量名               | 说明             | 默认值        | 必需 |
| -------------------- | ---------------- | ------------- | ---- |
| `PORT`               | API 服务端口     | `3333`        | 否   |
| `HOST`               | API 服务监听地址 | `0.0.0.0`     | 否   |
| `SPARKSET_ENV`       | 环境类型         | `dev`         | 否   |
| `LOG_LEVEL`          | 日志级别         | `info`        | 否   |
| `DATABASE_URL`       | 数据库连接 URL   | -             | 是\* |
| `DB_HOST`            | 数据库主机       | -             | 是\* |
| `DB_PORT`            | 数据库端口       | `3306`        | 是\* |
| `DB_USER`            | 数据库用户       | -             | 是\* |
| `DB_PASSWORD`        | 数据库密码       | -             | 是\* |
| `DB_NAME`            | 数据库名称       | -             | 是\* |
| `AI_PROVIDER`        | AI 提供商        | `openai`      | 否   |
| `AI_API_KEY`         | AI API 密钥      | -             | 是   |
| `AI_MODEL`           | AI 模型          | `gpt-4o-mini` | 否   |
| `AI_BASE_URL`        | AI API 基础 URL  | -             | 否   |
| `AI_FALLBACK_MODELS` | 回退模型（JSON） | -             | 否   |
| `API_KEY`            | API 认证密钥     | -             | 否   |

\_可以使用 `DATABASE_URL` 或分别使用 `DB\__` 变量

### Dashboard 环境变量

| 变量名                | 说明           | 默认值                  | 必需 |
| --------------------- | -------------- | ----------------------- | ---- |
| `NEXT_PUBLIC_API_URL` | API 服务器 URL | `http://localhost:3333` | 是   |
| `NODE_ENV`            | Node 环境      | `production`            | 否   |

### MySQL 环境变量（Docker Compose）

| 变量名                | 说明      | 默认值     | 必需 |
| --------------------- | --------- | ---------- | ---- |
| `MYSQL_ROOT_PASSWORD` | Root 密码 | -          | 是   |
| `MYSQL_DATABASE`      | 数据库名  | `sparkset` | 否   |
| `MYSQL_USER`          | 用户名    | `sparkset` | 否   |
| `MYSQL_PASSWORD`      | 用户密码  | -          | 是   |
| `MYSQL_PORT`          | 端口映射  | `3306`     | 否   |

## 故障排查

### Docker Compose

**问题：服务无法启动**

```bash
# 查看详细日志
docker-compose logs

# 检查服务健康状态
docker-compose ps
```

**问题：数据库连接失败**

- 确保 MySQL 服务已启动并健康
- 检查 `DATABASE_URL` 或 `DB_*` 环境变量是否正确
- 在 docker-compose 中，使用服务名 `mysql` 作为主机名

**问题：Dashboard 无法连接 API**

- 检查 `NEXT_PUBLIC_API_URL` 是否正确
- 在 docker-compose 中，Dashboard 可以通过服务名 `api` 访问 API
- 确保 API 服务已启动并健康

### Helm

**问题：Pod 无法启动**

```bash
# 查看 Pod 状态
kubectl describe pod <pod-name>

# 查看事件
kubectl get events --sort-by='.lastTimestamp'
```

**问题：数据库连接失败**

- 检查 ConfigMap 和 Secret 是否正确创建
- 验证数据库服务是否可达
- 检查网络策略是否允许连接

**问题：镜像拉取失败**

- 确保镜像已构建并推送到镜像仓库
- 检查 `imagePullSecrets` 配置
- 验证镜像标签是否正确

## 下一步

- 查看 [README.md](../README.md) 了解项目概览
- 查看 [README.zh-CN.md](../README.zh-CN.md) 了解中文文档
- 查看 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解如何贡献代码
