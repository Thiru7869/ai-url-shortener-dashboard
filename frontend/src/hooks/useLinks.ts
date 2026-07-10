import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/links";
import { CreateLinkPayload, ListLinksParams, RawStatus, UpdateLinkPayload } from "../types/link";

export const linkKeys = {
  all: ["links"] as const,
  list: (params: ListLinksParams) => ["links", "list", params] as const,
  detail: (id: string) => ["links", "detail", id] as const,
  analytics: (id: string, days: number) => ["links", "analytics", id, days] as const,
  dashboardStats: ["dashboard", "stats"] as const,
};

export function useLinksList(params: ListLinksParams) {
  return useQuery({
    queryKey: linkKeys.list(params),
    queryFn: () => api.fetchLinks(params),
    placeholderData: (previous) => previous,
  });
}

export function useLink(id: string | undefined) {
  return useQuery({
    queryKey: linkKeys.detail(id ?? ""),
    queryFn: () => api.fetchLink(id as string),
    enabled: Boolean(id),
  });
}

export function useLinkAnalytics(id: string | undefined, days: number) {
  return useQuery({
    queryKey: linkKeys.analytics(id ?? "", days),
    queryFn: () => api.fetchLinkAnalytics(id as string, days),
    enabled: Boolean(id),
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: linkKeys.dashboardStats,
    queryFn: api.fetchDashboardStats,
    refetchInterval: 15000,
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLinkPayload) => api.createLink(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linkKeys.all });
      queryClient.invalidateQueries({ queryKey: linkKeys.dashboardStats });
    },
  });
}

export function useUpdateLink(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateLinkPayload) => api.updateLink(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linkKeys.all });
    },
  });
}

export function useUpdateLinkStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RawStatus }) => api.updateLinkStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linkKeys.all });
      queryClient.invalidateQueries({ queryKey: linkKeys.dashboardStats });
    },
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linkKeys.all });
      queryClient.invalidateQueries({ queryKey: linkKeys.dashboardStats });
    },
  });
}
