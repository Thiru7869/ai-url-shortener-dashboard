import { apiClient } from "./client";
import {
  CreateLinkPayload,
  DashboardStats,
  Link,
  LinkAnalytics,
  ListLinksParams,
  PaginationMeta,
  RawStatus,
  UpdateLinkPayload,
} from "../types/link";

interface Envelope<T> {
  success: true;
  data: T;
  meta?: { pagination?: PaginationMeta };
}

export async function fetchLinks(
  params: ListLinksParams,
): Promise<{ items: Link[]; pagination: PaginationMeta }> {
  const { data } = await apiClient.get<Envelope<Link[]>>("/links", { params });
  return { items: data.data, pagination: data.meta!.pagination! };
}

export async function fetchLink(id: string): Promise<Link> {
  const { data } = await apiClient.get<Envelope<Link>>(`/links/${id}`);
  return data.data;
}

export async function createLink(payload: CreateLinkPayload): Promise<Link> {
  const { data } = await apiClient.post<Envelope<Link>>("/links", payload);
  return data.data;
}

export async function updateLink(id: string, payload: UpdateLinkPayload): Promise<Link> {
  const { data } = await apiClient.put<Envelope<Link>>(`/links/${id}`, payload);
  return data.data;
}

export async function updateLinkStatus(id: string, status: RawStatus): Promise<Link> {
  const { data } = await apiClient.patch<Envelope<Link>>(`/links/${id}/status`, { status });
  return data.data;
}

export async function deleteLink(id: string): Promise<void> {
  await apiClient.delete(`/links/${id}`);
}

export async function fetchLinkAnalytics(id: string, days = 30): Promise<LinkAnalytics> {
  const { data } = await apiClient.get<Envelope<LinkAnalytics>>(`/links/${id}/analytics`, { params: { days } });
  return data.data;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<Envelope<DashboardStats>>("/dashboard/stats");
  return data.data;
}
