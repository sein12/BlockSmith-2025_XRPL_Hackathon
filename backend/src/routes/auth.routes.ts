// src/routes/auth.routes.ts
import { Router } from "express";
import { prisma } from "../repositories/prisma";
import { signupSchema, loginSchema } from "../utils/validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "../env";

export const authRouter = Router();

authRouter.post("/signup", async (req, res, next) => {
  try {
    const body = signupSchema.parse(req.body); // body.walletAddr가 이제 살아 있음

    const exists = await prisma.user.findUnique({
      where: { username: body.username },
    });
    if (exists) return res.status(409).json({ error: "Username taken" });

    if (body.email) {
      const e = await prisma.user.findUnique({ where: { email: body.email } });
      if (e) return res.status(409).json({ error: "Email already used" });
    }

    const hash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        username: body.username,
        passwordHash: hash,
        email: body.email,
        walletAddr: body.walletAddr ?? null,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        walletAddr: true,
      },
    });

    res.status(201).json({ user });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { sub: user.id, username: user.username },
      ENV.JWT_SECRET,
      { expiresIn: "30m" }
    );
    const refreshToken = jwt.sign({ sub: user.id }, ENV.JWT_SECRET, {
      expiresIn: "14d",
    });
    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        walletAddr: user.walletAddr,
      },
    });
  } catch (e) {
    next(e);
  }
});
