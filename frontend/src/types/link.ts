export type EffectiveStatus = "ACTIVE" | "DISABLED" | "EXPIRED";
export type RawStatus = "ACTIVE" | "DISABLED";

export interface Link {
  id: string;
  title: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  isCustomAlias: boolean;
  status: EffectiveStatus;
  rawStatus: RawStatus;
  expiresAt: string | null;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  totalLinks: number;
  totalClicks: number;
  activeLinks: number;
  expiredLinks: number;
}

export interface DistributionPoint {
  label: string;
  count: number;
}

export interface DailyClickPoint {
  date: string;
  count: number;
}

export interface LinkAnalytics {
  linkId: string;
  totalClicks: number;
  dailyClicks: DailyClickPoint[];
  topReferrers: DistributionPoint[];
  browserDistribution: DistributionPoint[];
  deviceDistribution: DistributionPoint[];
  countryDistribution: DistributionPoint[];
}

export interface CreateLinkPayload {
  title: string;
  originalUrl: string;
  customAlias?: string | null;
  expiresAt?: string | null;
}

export interface UpdateLinkPayload {
  title?: string;
  originalUrl?: string;
  expiresAt?: string | null;
}

export interface ListLinksParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: EffectiveStatus;
}
