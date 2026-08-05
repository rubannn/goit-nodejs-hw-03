import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.ts";
import { generateTokenPair } from "../src/controllers/auth.controller.ts";

function uniqueUser() {
  const suffix = crypto.randomUUID().slice(0, 8);

  return {
    username: `test_${suffix}`,
    email: `test_${suffix}@example.com`,
    password: "Passw0rd!",
    name: "Test User",
  };
}

describe("password hashing", () => {
  it("hashes a password and verifies it with bcrypt.compare", async () => {
    const password = "Sup3rSecret!";
    const hash = await bcrypt.hash(password, 10);

    expect(hash).not.toBe(password);
    await expect(bcrypt.compare(password, hash)).resolves.toBe(true);
    await expect(bcrypt.compare("wrong-password", hash)).resolves.toBe(false);
  });
});

describe("generateTokenPair", () => {
  it("returns a valid access and refresh token pair", () => {
    const { accessToken, refreshToken } = generateTokenPair(42);

    const accessPayload = jwt.verify(accessToken, process.env.JWT_SECRET!) as jwt.JwtPayload;
    const refreshPayload = jwt.verify(refreshToken, process.env.JWT_SECRET!) as jwt.JwtPayload;

    expect(accessPayload).toMatchObject({ sub: 42, type: "access" });
    expect(refreshPayload).toMatchObject({ sub: 42, type: "refresh" });
  });
});

describe("POST /auth/register", () => {
  it("returns 201 and a token pair for valid data", async () => {
    const user = uniqueUser();

    const res = await request(app).post("/auth/register").send(user);

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(user.username);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
  });
});

describe("POST /auth/login", () => {
  it("returns 401 for an invalid password", async () => {
    const user = uniqueUser();

    await request(app).post("/auth/register").send(user);

    const res = await request(app)
      .post("/auth/login")
      .send({ username: user.username, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
  });
});
