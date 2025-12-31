# API Migration Guide

## Overview

This guide helps you migrate from the legacy `@/lib/api` to the new modular API structure.

## Why Migrate?

The new modular API structure provides:

- Better type safety with centralized type definitions
- Clearer separation of concerns
- Easier to maintain and extend
- Consistent naming conventions
- Support for both Server Components and Client Components

## Migration Steps

### 1. Update Imports

#### Before (Legacy)

```typescript
import { fetchDatasources, fetchAIProviders, DatasourceDTO } from '@/lib/api';
```

#### After (New)

```typescript
import { fetchDatasources } from '@/lib/api/datasources-api';
import { fetchAIProviders } from '@/lib/api/ai-providers-api';
import type { Datasource } from '@/types/api';
```

### 2. Update Function Calls

#### Datasources

**Before:**

```typescript
const datasources = await fetchDatasources(); // Returns DatasourceDTO[]
```

**After:**

```typescript
const result = await fetchDatasources(); // Returns { items: Datasource[] }
const datasources = result.items;
```

#### AI Providers

**Before:**

```typescript
const providers = await fetchAIProviders(); // Returns AIProviderDTO[]
```

**After:**

```typescript
const result = await fetchAIProviders(); // Returns { items: AIProviderDTO[] }
const providers = result.items;
```

#### Actions

**Before:**

```typescript
const actions = await fetchActions(); // Returns ActionDTO[]
```

**After:**

```typescript
const result = await fetchActions(); // Returns { items: ActionDTO[] }
const actions = result.items;
```

#### Conversations

**Before:**

```typescript
const conversations = await fetchConversations(); // Returns ConversationDTO[]
```

**After:**

```typescript
const result = await fetchConversations(); // Returns { items: ConversationDTO[] }
const conversations = result.items;
```

### 3. Update Type Imports

#### Before

```typescript
import type { DatasourceDTO, ActionDTO, ConversationDTO } from '@/lib/api';
```

#### After

```typescript
import type { Datasource, ActionDTO, ConversationDTO } from '@/types/api';
```

### 4. Use SWR Hooks in Client Components

For Client Components, use the SWR hooks instead of direct API calls:

#### Before

```typescript
'use client';
import { fetchDatasources } from '@/lib/api';
import { useEffect, useState } from 'react';

export function MyComponent() {
  const [datasources, setDatasources] = useState([]);

  useEffect(() => {
    fetchDatasources().then(setDatasources);
  }, []);

  // ...
}
```

#### After

```typescript
'use client';
import { useDatasources } from '@/lib/api/datasources-hooks';

export function MyComponent() {
  const { data, error, isLoading } = useDatasources();
  const datasources = data?.items || [];

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // ...
}
```

## API Module Reference

### Datasources

- **API**: `@/lib/api/datasources-api`
- **Hooks**: `@/lib/api/datasources-hooks`
- **Types**: `Datasource`, `CreateDatasourceDto`, `TestConnectionDto`, etc. from `@/types/api`

### Datasets

- **API**: `@/lib/api/datasets-api`
- **Hooks**: `@/lib/api/datasets-hooks`
- **Types**: `Dataset`, `CreateDatasetDto`, `ResultSet` from `@/types/api`

### Dashboards

- **API**: `@/lib/api/dashboards-api`
- **Hooks**: `@/lib/api/dashboards-hooks`
- **Types**: `Dashboard`, `DashboardWidget`, `CreateDashboardDto`, etc. from `@/types/api`

### Charts

- **API**: `@/lib/api/charts-api`
- **Hooks**: `@/lib/api/charts-hooks`
- **Types**: `Chart`, `ChartSpec`, `CreateChartDto`, etc. from `@/types/api`

### Actions

- **API**: `@/lib/api/actions-api`
- **Hooks**: `@/lib/api/actions-hooks`
- **Types**: `ActionDTO`, `CreateActionInput`, etc. from `@/types/api`

### AI Providers

- **API**: `@/lib/api/ai-providers-api`
- **Hooks**: `@/lib/api/ai-providers-hooks`
- **Types**: `AIProviderDTO`, `CreateAIProviderInput` from `@/types/api`

### Conversations

- **API**: `@/lib/api/conversations-api`
- **Hooks**: `@/lib/api/conversations-hooks`
- **Types**: `ConversationDTO`, `ConversationDetailDTO`, `MessageDTO` from `@/types/api`

## Naming Conventions

The new API follows consistent naming:

- **List functions**: `fetchXxx()` → Returns `{ items: T[] }`
- **Single item functions**: `fetchXxxById()` → Returns `T`
- **Create functions**: `createXxx()`
- **Update functions**: `updateXxx()`
- **Delete functions**: `deleteXxx()`
- **Action functions**: `actionXxx()` (e.g., `syncDatasource`, `setDefaultDatasource`)

## Backward Compatibility

For backward compatibility, some legacy API objects are still available:

```typescript
import { datasourcesApi } from '@/lib/api/datasources-api';
// datasourcesApi.list(), datasourcesApi.get(), etc.
```

However, these will be removed in a future version. Please migrate to the new functions.

## Questions?

If you encounter any issues during migration, please:

1. Check the type definitions in `@/types/api`
2. Review the API module files in `@/lib/api/*-api.ts`
3. Check existing migrated code for examples
