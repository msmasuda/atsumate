import "dotenv/config";
import { defineConfig } from "prisma/config";

process.env.DATABASE_URL ??=
  "postgresql://atsumate:development-only@127.0.0.1:5433/atsumate";

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
