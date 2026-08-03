import crypto from "node:crypto";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import prisma from "../../prisma/client.ts";
import type { AuthTokenPayload } from "../middleware/authenticate.ts";

const SALT_ROUNDS = 10;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function generateTokenPair(userId: number): TokenPair {
  const secret = process.env.JWT_SECRET!;

  const accessToken = jwt.sign({ sub: userId, type: "access", jti: crypto.randomUUID() }, secret, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ sub: userId, type: "refresh", jti: crypto.randomUUID() }, secret, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
}

function toPublicUser(user: { id: number; username: string; email: string; name: string }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
  };
}

export async function register(req: Request, res: Response) {
  const { username, email, password, name } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existingUser) {
    return res.status(409).json({ error: "Username or email already taken" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { username, email, password: passwordHash, name },
  });

  const { accessToken, refreshToken } = generateTokenPair(user.id);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id },
  });

  res.status(201).json({
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  });
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { accessToken, refreshToken } = generateTokenPair(user.id);

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id },
  });

  res.status(200).json({
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  let payload: AuthTokenPayload;

  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET!) as unknown as AuthTokenPayload;
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  if (payload.type !== "refresh") {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!storedToken) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const tokens = generateTokenPair(payload.sub);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: storedToken.id } }),
    prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: payload.sub },
    }),
  ]);

  res.status(200).json(tokens);
}

export async function logout(req: Request, res: Response) {
  await prisma.refreshToken.deleteMany({ where: { userId: req.user!.sub } });
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  });
}
