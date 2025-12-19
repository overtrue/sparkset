# BI Chart Module Setup Guide

## ✅ Implementation Complete

The BI chart module has been successfully implemented with all requested features:

- **Left sidebar entry** for "数据集" and "图表"
- **Two-step wizard** for query → save as chart
- **Beautiful UI** using shadcn/ui
- **Scientific and elegant interactions** with real-time preview

## 🚀 Quick Start

### 1. Backend Server (Already Running)

The backend server is currently running on **http://127.0.0.1:58074**

```bash
# To start manually:
cd /Users/artisan/www/sparkline/apps/server
pnpm dev
```

### 2. Frontend Development Server

```bash
cd /Users/artisan/www/sparkline/apps/dashboard

# Set the API URL (if needed - already defaults to 58074)
export NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:58074

# Start the frontend
pnpm dev
```

### 3. Database Setup

The backend requires a MySQL database. Check your `.env` file:

```bash
# /Users/artisan/www/sparkline/apps/server/.env
DATABASE_URL=mysql://root:123456@localhost:3306/sparkline_demo
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=sparkline_demo
```

**Database tables are now created**. The migration system has been fixed and the required tables (`datasets` and `charts`) are in place.

To verify or re-run migrations if needed:

```bash
cd /Users/artisan/www/sparkline/apps/server
pnpm migrate
```

**✅ Backend Status**: The backend is correctly configured and responding to API calls. All routes are working, and database tables are created.

## 📖 Usage Workflow

### Step 1: Create Data Source

1. Go to **数据源** (Data Sources)
2. Click "新建数据源" (New Data Source)
3. Configure MySQL connection
4. Click "同步" (Sync) to fetch schema

### Step 2: Create Dataset

1. Go to **查询** (Query)
2. Write your SQL query
3. Click "执行" (Execute) to see results
4. Click "保存为图表" (Save as Chart) button

### Step 3: Create Chart

1. The wizard opens with your query results
2. System auto-detects schema
3. Configure chart:
   - Select chart type (line, bar, area, pie, table)
   - Choose X-axis field
   - Choose Y-axis field(s) with aggregation
   - Set styling options
4. Click "生成预览" (Generate Preview) to see live chart
5. Click "保存图表" (Save Chart)

### Step 4: View Charts

1. Go to **图表** (Charts) from sidebar
2. See all saved charts in grid view
3. Click "查看" (View) to see full chart with rendering
4. Click "编辑" (Edit) to modify
5. Click "删除" (Delete) to remove

## 🎨 Chart Features

### Supported Chart Types

- **Line Chart**: Trend analysis over time
- **Bar Chart**: Comparison across categories
- **Area Chart**: Cumulative trends
- **Pie Chart**: Proportional distribution
- **Table**: Raw data display

### Aggregation Functions

- `sum`: Total sum
- `avg`: Average
- `min`: Minimum value
- `max`: Maximum value
- `count`: Row count

### Style Options

- Show/hide legend
- Show/hide tooltip
- Show/hide grid
- Stacked mode
- Smooth curves
- Aspect ratio control

## 🔧 Configuration

### Environment Variables

**Backend** (`/Users/artisan/www/sparkline/apps/server/.env`):

```env
# Database
DATABASE_URL=mysql://root:password@localhost:3306/dbname
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=sparkline_demo

# Server
PORT=57897
```

**Frontend** (`/Users/artisan/www/sparkline/apps/dashboard/.env.local`):

```env
# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:58074
```

## 📁 Files Created

### Backend (15 files)

- `apps/server/database/migrations/*_create_datasets.ts`
- `apps/server/database/migrations/*_create_charts.ts`
- `apps/server/app/models/dataset.ts`
- `apps/server/app/models/chart.ts`
- `apps/server/app/types/chart.ts`
- `apps/server/app/services/dataset_service.ts`
- `apps/server/app/services/chart_service.ts`
- `apps/server/app/services/chart_compiler.ts`
- `apps/server/app/controllers/datasets_controller.ts`
- `apps/server/app/controllers/charts_controller.ts`
- `apps/server/app/validators/dataset.ts`
- `apps/server/app/validators/chart.ts`
- `apps/server/app/types/container.ts`
- `apps/server/start/routes.ts` (modified)
- `apps/server/app/providers/services_provider.ts` (modified)

### Frontend (15 files)

- `apps/dashboard/src/types/chart.ts`
- `apps/dashboard/src/lib/config.ts`
- `apps/dashboard/src/lib/api/datasets.ts`
- `apps/dashboard/src/lib/api/charts.ts`
- `apps/dashboard/src/components/charts/builder.tsx`
- `apps/dashboard/src/components/charts/builder-client.tsx`
- `apps/dashboard/src/components/charts/renderer.tsx`
- `apps/dashboard/src/components/charts/list.tsx`
- `apps/dashboard/src/components/charts/save-dialog.tsx`
- `apps/dashboard/src/app/charts/page.tsx`
- `apps/dashboard/src/app/charts/new/page.tsx`
- `apps/dashboard/src/app/charts/[id]/page.tsx`
- `apps/dashboard/src/app/datasets/page.tsx` (NEW)
- `apps/dashboard/src/app/datasets/[id]/page.tsx` (NEW)
- `apps/dashboard/src/components/app-sidebar.tsx` (modified)
- `apps/dashboard/src/components/query/result.tsx` (modified)
- `apps/dashboard/tsconfig.json` (modified)

## 🔍 Troubleshooting

### API 404 Errors

- Ensure backend server is running on port 57897
- Check `NEXT_PUBLIC_API_BASE_URL` environment variable
- Verify backend logs for any startup errors

### Database Connection Issues

- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database `sparkline_demo` exists

### Build Errors

- Frontend build should succeed (verified ✓)
- Backend has some pre-existing TypeScript config issues (not related to chart module)

## 🎯 Next Steps

1. **Start the frontend**: `cd apps/dashboard && pnpm dev`
2. **Open browser**: http://localhost:3000
3. **Create your first data source** and start building charts!

## ✅ Implementation Complete

All user requirements have been met:

| Requirement                           | Status      | Implementation                         |
| ------------------------------------- | ----------- | -------------------------------------- |
| **Left sidebar entry**                | ✅ Complete | "数据集" and "图表" menu items added   |
| **Query → Chart workflow**            | ✅ Complete | Two-step wizard with save dialog       |
| **Beautiful UI**                      | ✅ Complete | shadcn/ui components throughout        |
| **Scientific & elegant interactions** | ✅ Complete | Real-time preview, smart defaults      |
| **Database integration**              | ✅ Complete | `datasets` and `charts` tables created |
| **Datasets page**                     | ✅ Complete | List and detail views created          |

### Backend Status

- ✅ Server running on port 58074
- ✅ All routes working (`/api/datasets`, `/api/charts`)
- ✅ Database tables created
- ✅ Migration system fixed
- ✅ Validators updated to handle null descriptions

### Frontend Status

- ✅ Build passes (verified ✓)
- ✅ API clients configured with correct port
- ✅ Chart components ready
- ✅ Sidebar integration complete
- ✅ Schema inference fixed (uses correct types)
- ✅ New pages: `/datasets`, `/datasets/[id]`

### Bug Fixes Applied

1. **Schema type mismatch**: `inferSchema()` now returns `quantitative`/`nominal` instead of `number`/`string`
2. **Null description handling**: Validators updated with `.nullable().optional()`
3. **Controller schemas**: Both controllers updated to match validator schemas
4. **Import paths**: Updated to use `@/` alias consistently
5. **API base URLs**: All files now use port 58074
