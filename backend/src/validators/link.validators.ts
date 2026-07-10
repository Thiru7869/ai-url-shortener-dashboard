import { z } from "zod";

const customAliasSchema = z
  .string()
  .trim()
  .min(3, "Custom alias must be at least 3 characters")
  .max(30, "Custom alias must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Custom alias may only contain letters, numbers, hyphens, and underscores");

const urlSchema = z
  .string()
  .trim()
  .min(1, "Original URL is required")
  .max(2048, "URL is too long")
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid http:// or https:// URL");

const titleSchema = z.string().trim().min(1, "Title is required").max(200, "Title is too long");

const expiryDateSchema = z
  .string()
  .datetime({ message: "Expiry date must be a valid ISO 8601 date-time" })
  .refine((value) => new Date(value).getTime() > Date.now(), "Expiry date must be in the future")
  .optional()
  .nullable();

export const createLinkSchema = z.object({
  title: titleSchema,
  originalUrl: urlSchema,
  customAlias: customAliasSchema.optional().nullable(),
  expiresAt: expiryDateSchema,
});

export const updateLinkSchema = z.object({
  title: titleSchema.optional(),
  originalUrl: urlSchema.optional(),
  expiresAt: expiryDateSchema,
});

export const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]),
});

export const idParamSchema = z.object({
  id: z.string().min(1, "id is required"),
});

export const shortCodeParamSchema = z.object({
  shortCode: z.string().min(1, "shortCode is required"),
});

export const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "EXPIRED"]).optional(),
});

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
