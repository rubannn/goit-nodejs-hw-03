import type { Request, Response } from "express";

import prisma from "../../prisma/client.ts";

const PER_PAGE = 10;

const AUTHOR_SELECT = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

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

  const announcement = await prisma.announcement.create({
    data: { title, description, price, category, userId: req.user!.sub },
    include: { user: { select: AUTHOR_SELECT } },
  });

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

  const updated = await prisma.announcement.update({
    where: { id },
    data: req.body,
    include: { user: { select: AUTHOR_SELECT } },
  });

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

  res.status(204).end();
}
