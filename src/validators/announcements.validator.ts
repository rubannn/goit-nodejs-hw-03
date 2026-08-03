import { z } from "zod";

const CATEGORIES = ["sale", "service", "job", "other"] as const;

export const announcementIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listAnnouncementsQuerySchema = z.object({
  search: z.string().optional(),
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
  page: z.coerce.number().int().positive().optional().default(1),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(5).max(50),
  description: z.string().min(10),
  price: z.number().positive(),
  category: z.enum(CATEGORIES),
});

const updateAnnouncementObjectSchema = z.object({
  title: z.string().min(5).max(50).optional(),
  description: z.string().min(10).optional(),
  price: z.number().positive().optional(),
  category: z.enum(CATEGORIES).optional(),
});

export const updateAnnouncementSchema = updateAnnouncementObjectSchema.refine(
  (data: z.infer<typeof updateAnnouncementObjectSchema>) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" },
);
