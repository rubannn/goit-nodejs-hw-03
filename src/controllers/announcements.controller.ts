import fs from "node:fs/promises";
import type { Request, Response } from "express";

import prisma from "../../prisma/client.ts";
import cloudinary from "../cloudinary.ts";
import logger from "../logger.ts";

const PER_PAGE = 10;

const AUTHOR_SELECT = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

async function uploadPhoto(file: Express.Multer.File) {
  try {
    const result = await cloudinary.uploader.upload(file.path, { folder: "announcements" });

    logger.info({ imageUrl: result.secure_url }, "Photo uploaded to Cloudinary");

    return result.secure_url;
  } finally {
    await fs.unlink(file.path);
  }
}

// Announcement.imageUrl only stores the Cloudinary URL (per spec), so the
// public_id needed to delete the asset has to be recovered from that URL.
function extractPublicId(imageUrl: string): string {
  const afterUpload = imageUrl.split("/upload/")[1] ?? "";
  const withoutVersion = afterUpload.replace(/^v\d+\//, "");

  return withoutVersion.replace(/\.[^./]+$/, "");
}

async function deleteCloudinaryPhoto(imageUrl: string) {
  try {
    await cloudinary.uploader.destroy(extractPublicId(imageUrl));
  } catch (err) {
    logger.error({ err, imageUrl }, "Failed to delete photo from Cloudinary");
  }
}

export async function list(req: Request, res: Response) {
  const { search, sort, page } = req.query as unknown as {
    search?: string;
    sort: "newest" | "oldest";
    page: number;
  };

  const where = search ? { title: { contains: search, mode: "insensitive" as const } } : {};
  const skip = (page - 1) * PER_PAGE;

  const [data, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
      skip,
      take: PER_PAGE,
      include: { user: { select: AUTHOR_SELECT } },
    }),
    prisma.announcement.count({ where }),
  ]);

  res.status(200).json({
    data,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / PER_PAGE),
      perPage: PER_PAGE,
    },
  });
}

export async function getById(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: { user: { select: AUTHOR_SELECT } },
  });

  if (!announcement) {
    return res.status(404).json({ error: "Announcement not found" });
  }

  res.status(200).json(announcement);
}

export async function create(req: Request, res: Response) {
  const { title, description, price, category } = req.body;

  const imageUrl = req.file ? await uploadPhoto(req.file) : undefined;

  const announcement = await prisma.announcement.create({
    data: { title, description, price, category, imageUrl, userId: req.user!.sub },
    include: { user: { select: AUTHOR_SELECT } },
  });

  logger.info({ announcementId: announcement.id, userId: req.user!.sub }, "Announcement created");

  res.status(201).json(announcement);
}

export async function update(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };

  const announcement = await prisma.announcement.findUnique({ where: { id } });

  if (!announcement) {
    return res.status(404).json({ error: "Announcement not found" });
  }

  if (announcement.userId !== req.user!.sub) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (Object.keys(req.body).length === 0 && !req.file) {
    return res.status(400).json({ error: "At least one field must be provided" });
  }

  const imageUrl = req.file ? await uploadPhoto(req.file) : undefined;

  const updated = await prisma.announcement.update({
    where: { id },
    data: { ...req.body, ...(imageUrl ? { imageUrl } : {}) },
    include: { user: { select: AUTHOR_SELECT } },
  });

  if (imageUrl && announcement.imageUrl) {
    await deleteCloudinaryPhoto(announcement.imageUrl);
  }

  res.status(200).json(updated);
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };

  const announcement = await prisma.announcement.findUnique({ where: { id } });

  if (!announcement) {
    return res.status(404).json({ error: "Announcement not found" });
  }

  if (announcement.userId !== req.user!.sub) {
    return res.status(403).json({ error: "Access denied" });
  }

  await prisma.announcement.delete({ where: { id } });

  if (announcement.imageUrl) {
    await deleteCloudinaryPhoto(announcement.imageUrl);
  }

  res.status(204).end();
}
