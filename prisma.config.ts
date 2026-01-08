// Prisma Config for dev-OS Platform
// npm install --save-dev prisma dotenv
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations (session mode, direct connection)
    // At runtime, DATABASE_URL is used via Prisma Accelerate or direct connection
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
