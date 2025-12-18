## 基础部署

SparkSet 支持多种部署方式：Docker、Docker Compose、Kubernetes、Helm 等。

### Docker 部署

#### 拉取镜像

```bash
# API 服务器
docker pull ghcr.io/sparkset/api:latest

# Dashboard
docker pull ghcr.io/sparkset/dashboard:latest
```

#### 运行 API 容器

```bash
docker run -d \
  --name sparkset-api \
  -p 3333:3333 \
  -e DATABASE_URL="mysql://user:password@host:3306/sparkset" \
  sparkset/api:latest
# Note: AI providers are configured through the database after startup
# Use the dashboard at http://localhost:3333/ai-providers to configure providers
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

### 快速开始

1. **克隆仓库**

```bash
git clone https://github.com/sparkset/sparkset.git
cd sparkset
```

2. **编辑 `.env` 文件**

根据你的需求修改环境 variables，特别是：

- `MYSQL_ROOT_PASSWORD`: MySQL root 密码
- `MYSQL_PASSWORD`: MySQL 用户密码

注意：AI 提供商现在通过数据库配置，不再需要这些环境变量：

- ~~`AI_API_KEY`~~ - 已废弃
- ~~`AI_PROVIDER`~~ - 已废弃

3. **启动所有服务**

```bash
docker-compose up -d
```

4. **运行数据库迁移**

```bash
docker-compose exec api node ace migration:run
```

5. **访问应用**

- Dashboard: http://localhost:3000
- API: http://localhost:3333
- MySQL: localhost:3306

6. **配置 AI Providers**

访问 Dashboard → AI Providers 页面，添加你的 AI Provider（OpenAI、Anthropic 等）并设置 API Key。

### 环境变量说明

#### API 服务器

| 变量名         | 说明              | 默认值        | 必需 |
| -------------- | ----------------- | ------------- | ---- |
| `NODE_ENV`     | Node 环境         | `development` | 是   |
| `PORT`         | API 端口          | `3333`        | 否   |
| `HOST`         | API 主机          | `0.0.0.0`     | 否   |
| `APP_KEY`      | AdonisJS 应用密钥 | -             | 是   |
| `LOG_LEVEL`    | 日志级别          | `info`        | 否   |
| `SPARKSET_ENV` | 环境类型          | `dev`         | 否   |
| `DATABASE_URL` | 数据库连接 URL    | -             | 是\* |
| `DB_HOST`      | 数据库主机        | -             | 是\* |
| `DB_PORT`      | 数据库端口        | `3306`        | 是\* |
| `DB_USER`      | 数据库用户        | -             | 是\* |
| `DB_PASSWORD`  | 数据库密码        | -             | 是\* |
| `DB_NAME`      | 数据库名称        | -             | 是\* |
| `API_KEY`      | API 认证密钥      | -             | 否   |

_可以使用 `DATABASE_URL` 或分别使用 `DB\_\_` 变量_

**注意：** 以下AI相关环境变量已废弃，现在通过数据库管理AI配置：

- ~~`AI_PROVIDER`~~
- ~~`AI_API_KEY`~~
- ~~`AI模型`~~
- ~~`AI_BASE_URL`~~
- ~~`AI_FALLBACK_MODELS`~~

通过 Dashboard 的 AI Providers 页面配置 AI 能力。

#### Dashboard 环境变量

| 变量名                | 说明           | 默认值                  | 必需 |
| --------------------- | -------------- | ----------------------- | ---- |
| `NEXT_PUBLIC_API_URL` | API 服务器 URL | `http://localhost:3333` | 是   |
| `NODE_ENV`            | Node 环境      | `production`            | 否   |

#### MySQL 环境变量（Docker Compose）

| 变量名                | 说明      | 默认值     | 必需 |
| --------------------- | --------- | ---------- | ---- |
| `MYSQL_ROOT_PASSWORD` | Root 密码 | -          | 是   |
| `MYSQL_DATABASE`      | 数据库名  | `sparkset` | 否   |
| `MYSQL_USER`          | 用户名    | `sparkset` | 否   |
| `MYSQL_PASSWORD`      | 用户密码  | -          | 是   |

## Kubernetes 部署

### 使用原生 Kubernetes YAML

1. **创建 Namespace**

```bash
kubectl create namespace sparkset
```

2. **创建 ConfigMap 和 Secret**

```bash
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secret.yaml
```

3. **创建 PersistentVolumeClaim (如果需要)**

```bash
kubectl apply -f kubernetes/pvc.yaml
```

4. **创建 Deployment 和 Service**

```bash
kubectl apply -f kubernetes/deployment-api.yaml
kubectl apply -f kubernetes/deployment-dashboard.yaml
kubectl apply -f kubernetes/deployment-mysql.yaml
kubectl apply -f kubernetes/service.yaml
```

5. **验证部署**

```bash
kubectl get pods -n sparkset
kubectl get services -n sparkset
```

### Helm Chart 部署

#### 前置条件

- Kubernetes 集群 (v1.19+)
- Helm 3+
- kubectl

#### 1. 添加仓库

```bash
helm repo add sparkset https://charts.sparkset.io
helm repo update
```

#### 2. 配置部署

创建 `my-values.yaml`：

```yaml
mysql:
  auth:
    rootPassword: 'your-secure-password'
    password: 'your-secure-password'

api:
  env:
    # Note: AI providers are configured through the database
    # Configure via dashboard at http://<your-api-url>/ai-providers

dashboard:
  env:
    NEXT_PUBLIC_API_URL: 'http://sparkset-api:3333'
```

#### 3. 安装 Chart

```bash
helm install sparkset sparkset/sparkset -f my-values.yaml -n sparkset
```

#### 4. 访问服务

**Port Forward (开发环境):**

```bash
# Dashboard
kubectl port-forward -n sparkset svc/sparkset-dashboard 3000:80

# API
kubectl port-forward -n sparkset svc/sparkset-api 3333:3333
```

访问 http://localhost:3000 即可使用。

**Ingress (生产环境):**

创建 `ingress.yaml`：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sparkset-ingress
  namespace: sparkset
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: dashboard.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: sparkset-dashboard
                port:
                  number: 80
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: sparkset-api
                port:
                  number: 3333
```

应用配置:

```bash
kubectl apply -f ingress.yaml -n sparkset
```

#### 5. 升级和回滚

**升级:**

```bash
helm upgrade sparkset sparkset/sparkset -f my-values.yaml -n sparkset
```

**回滚:**

```bash
helm rollback sparkset -n sparkset
```

**删除:**

```bash
helm uninstall sparkset -n sparkset
```

## 环境特定配置

### 开发环境

使用 Docker Compose 快速启动：

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 生产环境

推荐使用：

1. **优化配置**
   - 设置 `LOG_LEVEL=warn`
   - 使用外部数据库（RDS 等）
   - 启用 HTTPS
   - 配置 CDN 加速静态资源

2. **监控和日志**
   - 集成监控系统（Prometheus + Grafana）
   - 配置日志聚合（ELK/EFK Stack）
   - 设置告警规则

3. **负载均衡和高可用**
   - API 服务多实例部署
   - 使用 Kubernetes HPA（水平自动扩缩容）
   - MySQL 主从复制

## 域名和 HTTPS 配置

### 建议域名结构

- `api.yourdomain.com` - API 服务器
- `app.yourdomain.com` - Dashboard
- `db.yourdomain.com` - 数据库（如果需要外网访问）

### SSL/TLS 证书

**使用 Let's Encrypt:**

```bash
# 使用 certbot
certbot certonly --dns-cloudflare -d yourdomain.com -d *.yourdomain.com

# 在 Nginx 中配置
```

**在 Kubernetes 中使用 cert-manager:**

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true
```

## 常见问题

### Q: 数据库连接失败怎么办？

检查：

1. 数据库服务是否正常运行
2. 网络连接和端口是否开放
3. 数据库配置是否正确
4. 用户权限是否足够

### Q: AI Provider 配置后不生效？

1. 重启 API 服务
2. 检查 AI Provider 的 API Key 是否有效
3. 查看日志确认是否有错误信息

### Q: Dashboard 无法连接 API？

1. 确认 `NEXT_PUBLIC_API_URL` 环境变量正确
2. 检查 API 服务是否正常运行
3. 验证跨域配置（CORS）

## 故障排查

### API 服务启动失败

```bash
# 查看日志
docker-compose logs api
kubectl logs -n sparkset -l app=sparkset-api
```

### 迁移失败

```bash
# 手动运行迁移
docker-compose exec api node ace migration:run

# 查看迁移状态
docker-compose exec api node ace migration:status
```

### Dashboard 构建失败

```bash
# 查看构建日志
docker-compose logs dashboard
```

### 性能调优

**API 服务器:**

- 增加 Node.js 内存限制：`NODE_OPTIONS=--max-old-space-size=4096`
- 调整数据库连接池大小
- 启用 Redis 缓存

**Dashboard:**

- 启用 Next.js ISR (增量静态再生)
- 配置图片优化
- 使用 CDN 加速静态资源
