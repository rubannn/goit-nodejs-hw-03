import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import {
  createAnnouncementSchema,
  announcementIdParamSchema,
  listAnnouncementsQuerySchema,
  updateAnnouncementSchema,
} from "./validators/announcements.validator.ts";
import { loginSchema, refreshSchema, registerSchema } from "./validators/auth.validator.ts";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const errorResponseSchema = z.object({
  error: z.string(),
});

const userResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  name: z.string(),
});

const meResponseSchema = userResponseSchema.extend({
  createdAt: z.string().datetime(),
});

const authResponseSchema = z.object({
  user: userResponseSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

const announcementResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.enum(["sale", "service", "job", "other"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: userResponseSchema,
});

const announcementListResponseSchema = z.object({
  data: z.array(announcementResponseSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
    perPage: z.number(),
  }),
});

const bearerAuth = [{ bearerAuth: [] }];

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: { content: { "application/json": { schema: registerSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: authResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: errorResponseSchema } } },
    409: {
      description: "Username or email already taken",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in with username and password",
  request: {
    body: { content: { "application/json": { schema: loginSchema } } },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: authResponseSchema } } },
    401: { description: "Invalid credentials", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Exchange a refresh token for a new token pair",
  request: {
    body: { content: { "application/json": { schema: refreshSchema } } },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: tokenPairSchema } } },
    401: {
      description: "Invalid or expired refresh token",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Log out the current user",
  security: bearerAuth,
  responses: {
    204: { description: "No Content" },
    401: { description: "Authentication required", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get the current user's profile",
  security: bearerAuth,
  responses: {
    200: { description: "OK", content: { "application/json": { schema: meResponseSchema } } },
    401: { description: "Authentication required", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "List announcements with search, sort and pagination",
  request: {
    query: listAnnouncementsQuerySchema,
  },
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: announcementListResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get a single announcement by id",
  request: {
    params: announcementIdParamSchema,
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: announcementResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create an announcement",
  security: bearerAuth,
  request: {
    body: { content: { "application/json": { schema: createAnnouncementSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: announcementResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Authentication required", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Partially update an announcement (owner only)",
  security: bearerAuth,
  request: {
    params: announcementIdParamSchema,
    body: { content: { "application/json": { schema: updateAnnouncementSchema } } },
  },
  responses: {
    200: { description: "OK", content: { "application/json": { schema: announcementResponseSchema } } },
    400: { description: "Validation failed", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Access denied", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete an announcement (owner only)",
  security: bearerAuth,
  request: {
    params: announcementIdParamSchema,
  },
  responses: {
    204: { description: "No Content" },
    403: { description: "Access denied", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Your API",
      version: "1.0.0",
      description: "REST API for your project",
    },
    servers: [{ url: "http://localhost:3000" }],
  });
}
