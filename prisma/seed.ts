import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Idempotent: krijon vetëm përdoruesit që mungojnë, nuk prek fjalëkalimet ekzistuese.
 *   ADMIN_PASSWORD  (i detyrueshëm herën e parë, min. 10 karaktere)
 *   ADMIN_EMAIL     (default admin@praniabesnike.com)
 *   ADMIN_USERNAME  (default admin)
 *   SEED_DEMO=true  shton recepsion/perfaqesues me fjalëkalim Prania2026! (vetëm për test)
 */
async function ensureUser(u: {
  email: string;
  username: string;
  name: string;
  role: Role;
  orgUnit?: string | null;
  password: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: u.email }, { username: u.username }] },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.user.create({
    data: {
      email: u.email,
      username: u.username,
      name: u.name,
      role: u.role,
      orgUnit: u.orgUnit ?? null,
      passwordHash: await bcrypt.hash(u.password, 12),
    },
  });
  return true;
}

async function main() {
  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminCount === 0) {
    if (!adminPassword || adminPassword.length < 10) {
      console.warn(
        "KUJDES: Nuk ka admin. Vendosni ADMIN_PASSWORD (min. 10 karaktere) dhe rinisni.",
      );
    } else {
      const username = process.env.ADMIN_USERNAME || "admin";
      await ensureUser({
        email: (process.env.ADMIN_EMAIL || "admin@praniabesnike.com").toLowerCase(),
        username,
        name: "Administrator",
        role: Role.ADMIN,
        password: adminPassword,
      });
      console.log(`Admini u krijua: ${username}`);
    }
  }

  if (process.env.SEED_DEMO === "true") {
    const demo = [
      {
        email: "recepsion@praniabesnike.com",
        username: "recepsion",
        name: "Recepsion",
        role: Role.RECEPSION,
      },
      {
        email: "perfaqesues@praniabesnike.com",
        username: "perfaqesues",
        name: "Përfaqësues Drejtorie",
        role: Role.PERFAQESUES,
        orgUnit: "Drejtoria e Politikave Sociale",
      },
    ];
    for (const u of demo) {
      if (await ensureUser({ ...u, password: "Prania2026!" })) {
        console.log(`Përdorues demo: ${u.username} / Prania2026!`);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
