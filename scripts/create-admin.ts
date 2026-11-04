/**
 * Create (or reset the password of) an admin user.
 *   npm run admin:create -- owner@example.com "Full Name" OWNER
 * The password is asked for interactively and never stored in shell history.
 */
import { PrismaClient, type AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";

const prisma = new PrismaClient();
const ROLES = ["OWNER", "MANAGER", "FULFILMENT", "EDITOR"];

async function main() {
  const [emailArg, nameArg, roleArg = "OWNER"] = process.argv.slice(2);
  if (!emailArg) throw new Error('Usage: npm run admin:create -- email@example.com "Name" [OWNER|MANAGER|FULFILMENT|EDITOR]');
  if (!ROLES.includes(roleArg)) throw new Error(`Role must be one of ${ROLES.join(", ")}`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = process.env.ADMIN_PASSWORD || (await rl.question("Password (min 10 characters): "));
  rl.close();
  if (password.length < 10) throw new Error("Password must be at least 10 characters.");
  const email = emailArg.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, name: nameArg || "Admin", role: roleArg as AdminRole, passwordHash },
    update: { passwordHash, active: true },
  });
  console.log(`Admin ${email} is ready. Sign in at /admin/login`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
