import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import mysql from "mysql2/promise";

let migrationDone = false;

async function ensureMigration() {
  if (migrationDone) return;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("[Auth] No DATABASE_URL, skipping migration");
    migrationDone = true;
    return;
  }
  try {
    console.log("[Auth] Running passwordHash migration...");
    const conn = await mysql.createConnection(dbUrl);
    
    // Check if column exists first
    const [rows] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'passwordHash' AND TABLE_SCHEMA = DATABASE()`
    );
    
    if (Array.isArray(rows) && rows.length === 0) {
      await conn.execute(`ALTER TABLE users ADD COLUMN passwordHash varchar(255) DEFAULT NULL`);
      console.log("[Auth] ✅ passwordHash column created");
    } else {
      console.log("[Auth] ⏭️  passwordHash column already exists");
    }
    
    // Also check loginMethod column
    const [rows2] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'loginMethod' AND TABLE_SCHEMA = DATABASE()`
    );
    
    if (Array.isArray(rows2) && rows2.length === 0) {
      await conn.execute(`ALTER TABLE users ADD COLUMN loginMethod varchar(50) DEFAULT 'email'`);
      console.log("[Auth] ✅ loginMethod column created");
    }
    
    await conn.end();
    migrationDone = true;
    console.log("[Auth] Migration complete");
  } catch (error: any) {
    console.error("[Auth] Migration error:", error.message);
    // Mark as done to avoid retrying on every request
    migrationDone = true;
  }
}

export function registerAuthRoutes(app: Express) {
  // ==========================================
  // POST /api/auth/register
  // ==========================================
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
      return;
    }

    if (typeof name !== "string" || name.trim().length < 2) {
      res.status(400).json({ error: "Nome deve ter pelo menos 2 caracteres" });
      return;
    }

    if (typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Email inválido" });
      return;
    }

    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      return;
    }

    try {
      // Ensure migration ran before any Drizzle query
      await ensureMigration();

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Banco de dados não disponível" });
        return;
      }

      // Check if email already exists
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existing.length > 0) {
        res.status(409).json({ error: "Este email já está cadastrado" });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate unique openId for this user
      const openId = `local_${randomUUID()}`;

      // Insert user
      await db.insert(users).values({
        openId,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        loginMethod: "email",
        role: "user",
        isActive: true,
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.signSession(
        {
          openId,
          appId: "prontei",
          name: name.trim(),
        },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.status(201).json({
        success: true,
        user: {
          name: name.trim(),
          email: normalizedEmail,
        },
      });
    } catch (error: any) {
      console.error("[Auth] Register failed:", error);
      const detail = error?.message || String(error);
      res.status(500).json({ error: "Erro ao criar conta: " + detail });
    }
  });

  // ==========================================
  // POST /api/auth/login
  // ==========================================
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios" });
      return;
    }

    try {
      // Ensure migration ran before any Drizzle query
      await ensureMigration();

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Banco de dados não disponível" });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (result.length === 0) {
        res.status(401).json({ error: "Email ou senha incorretos" });
        return;
      }

      const user = result[0];

      if (!user.passwordHash) {
        res.status(401).json({
          error: "Esta conta não possui senha. Tente outro método de login.",
        });
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Email ou senha incorretos" });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: "Conta desativada" });
        return;
      }

      // Update last signed in
      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      // Create session token
      const sessionToken = await sdk.signSession(
        {
          openId: user.openId,
          appId: "prontei",
          name: user.name || "",
        },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        success: true,
        user: {
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "Erro ao fazer login. Tente novamente." });
    }
  });
}
