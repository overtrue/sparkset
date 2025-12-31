import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  fetchDashboards,
  fetchDashboardById,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  addWidget,
  updateWidget,
  deleteWidget,
  updateLayout,
  refreshWidget,
  CreateDashboardDto,
  CreateWidgetDto,
  UpdateLayoutDto,
} from './dashboards-api';

// SWR Hooks - only for client components
export function useDashboards() {
  return useSWR('/api/dashboards', fetchDashboards);
}

export function useDashboard(id: number | null) {
  return useSWR(id ? `/api/dashboards/${id}` : null, () => fetchDashboardById(id!));
}

// Mutations
export function useCreateDashboard() {
  return useSWRMutation('/api/dashboards', async (_, { arg }: { arg: CreateDashboardDto }) => {
    return createDashboard(arg);
  });
}

export function useUpdateDashboard() {
  return useSWRMutation(
    '/api/dashboards',
    async (_, { arg }: { arg: { id: number; data: Partial<CreateDashboardDto> } }) => {
      return updateDashboard(arg.id, arg.data);
    },
  );
}

export function useDeleteDashboard() {
  return useSWRMutation('/api/dashboards', async (_, { arg }: { arg: number }) => {
    return deleteDashboard(arg);
  });
}

export function useAddWidget() {
  return useSWRMutation(
    '/api/dashboards',
    async (_, { arg }: { arg: { dashboardId: number; data: CreateWidgetDto } }) => {
      return addWidget(arg.dashboardId, arg.data);
    },
  );
}

export function useUpdateWidget() {
  return useSWRMutation(
    '/api/dashboards',
    async (
      _,
      { arg }: { arg: { dashboardId: number; widgetId: number; data: Partial<CreateWidgetDto> } },
    ) => {
      return updateWidget(arg.dashboardId, arg.widgetId, arg.data);
    },
  );
}

export function useDeleteWidget() {
  return useSWRMutation(
    '/api/dashboards',
    async (_, { arg }: { arg: { dashboardId: number; widgetId: number } }) => {
      return deleteWidget(arg.dashboardId, arg.widgetId);
    },
  );
}

export function useUpdateLayout() {
  return useSWRMutation(
    '/api/dashboards',
    async (_, { arg }: { arg: { dashboardId: number; data: UpdateLayoutDto } }) => {
      return updateLayout(arg.dashboardId, arg.data);
    },
  );
}

export function useRefreshWidget() {
  return useSWRMutation(
    '/api/dashboards',
    async (_, { arg }: { arg: { dashboardId: number; widgetId: number } }) => {
      return refreshWidget(arg.dashboardId, arg.widgetId);
    },
  );
}
