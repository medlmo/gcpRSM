import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users } from "@shared/schema";

const SALT_ROUNDS = 10;

const seedUsers = [
  {
    username: "admin",
    email: "admin@example.com",
    fullName: "Administrateur",
    role: "admin",
    password: "admin123",
  },
  {
    username: "marches_manager",
    email: "marches.manager@example.com",
    fullName: "Gestionnaire des Marchés",
    role: "marches_manager",
    password: "ChangeMe123!",
  },
  {
    username: "ordonnateur",
    email: "ordonnateur@example.com",
    fullName: "Ordonnateur",
    role: "ordonnateur",
    password: "ChangeMe123!",
  },
  {
    username: "technical_service",
    email: "technical.service@example.com",
    fullName: "Service Technique",
    role: "technical_service",
    password: "ChangeMe123!",
  },
];

async function main() {
  console.log("Seeding users...");

  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

    await db
      .insert(users)
      .values({
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        password: passwordHash,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          password: passwordHash,
        },
      });

    console.log(`Upserted user ${user.email} (${user.role})`);
  }

  console.log("Seeding complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed data:", error);
    process.exit(1);
  });

