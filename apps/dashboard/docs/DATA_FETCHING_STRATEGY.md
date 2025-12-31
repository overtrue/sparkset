# Data Fetching Strategy

## Overview

This document outlines the unified data fetching strategy for the dashboard application, ensuring consistency across Server Components and Client Components.

## Principles

1. **Server Components First**: Use Server Components for initial data loading when possible
2. **SWR for Client Components**: Use SWR hooks for client-side data fetching with caching
3. **Unified Error Handling**: Consistent error handling across all data fetching patterns
4. **Type Safety**: All API calls should be type-safe

## Patterns

### Server Components

Server Components should use the API functions directly from `@/lib/api/*-api.ts`:

```typescript
import { fetchDatasources } from '@/lib/api/datasources-api';

export default async function DatasourcesPage() {
  const result = await fetchDatasources();
  const datasources = result.items || [];

  return <DatasourcesList datasources={datasources} />;
}
```

**When to use Server Components:**

- Initial page load data
- Static or rarely-changing data
- SEO-critical data
- Data that doesn't need real-time updates

### Client Components with SWR

Client Components should use SWR hooks from `@/lib/api/*-hooks.ts`:

```typescript
'use client';
import { useDatasources } from '@/lib/api/datasources-hooks';

export default function DatasourcesList() {
  const { data, error, isLoading, mutate } = useDatasources();
  const datasources = data?.items || [];

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return <DatasourcesTable datasources={datasources} />;
}
```

**When to use Client Components with SWR:**

- Data that needs real-time updates
- Interactive components that trigger data refetching
- Data that changes based on user actions
- Optimistic updates

### Client Components with useApi Hook

For one-off API calls or mutations, use the `useApi` hook:

```typescript
'use client';
import { useApi } from '@/hooks/use-api';
import { createDatasource } from '@/lib/api/datasources-api';

export function CreateDatasourceForm() {
  const {
    execute: create,
    loading,
    error,
  } = useApi(createDatasource, {
    onSuccess: () => {
      toast.success('Datasource created');
      router.push('/dashboard/datasources');
    },
  });

  const handleSubmit = async (data: CreateDatasourceDto) => {
    await create(data);
  };

  // ...
}
```

**When to use useApi:**

- One-off API calls (not for lists)
- Mutations that don't need SWR caching
- Form submissions
- Actions that trigger side effects

## Error Handling

### Server Components

```typescript
export default async function Page() {
  try {
    const result = await fetchDatasources();
    return <Content data={result.items} />;
  } catch (error) {
    return <ErrorState error={error} />;
  }
}
```

### Client Components with SWR

SWR automatically handles errors:

```typescript
const { data, error } = useDatasources();

if (error) {
  return <ErrorState error={error} />;
}
```

### Client Components with useApi

The `useApi` hook handles errors automatically:

```typescript
const { error, execute } = useApi(fetchDatasource, {
  showErrorToast: true, // Automatically shows error toast
});
```

## Loading States

### Server Components

Server Components can use Suspense boundaries:

```typescript
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DatasourcesContent />
    </Suspense>
  );
}
```

### Client Components

Use the loading state from hooks:

```typescript
const { data, isLoading } = useDatasources();

if (isLoading) {
  return <LoadingState />;
}
```

## Empty States

Always handle empty states:

```typescript
const datasources = data?.items || [];

if (datasources.length === 0) {
  return <EmptyState />;
}
```

## Best Practices

1. **Always handle loading, error, and empty states**
2. **Use Server Components when possible** for better performance
3. **Use SWR for lists** that need caching and real-time updates
4. **Use useApi for mutations** and one-off calls
5. **Type all API calls** using types from `@/types/api`
6. **Handle errors gracefully** with user-friendly messages
7. **Use optimistic updates** for better UX when appropriate

## Migration Checklist

When migrating from old patterns:

- [ ] Replace `useState` + `useEffect` with SWR hooks for lists
- [ ] Replace direct API calls in Client Components with SWR hooks
- [ ] Move initial data loading to Server Components when possible
- [ ] Use `useApi` for mutations instead of manual state management
- [ ] Add proper error and loading state handling
- [ ] Update type imports to use `@/types/api`
