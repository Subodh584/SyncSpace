import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  // Imported dynamically so env vars are loaded before db/index.ts runs.
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db, client } = await import("./index");
  console.log("⏳ Running migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ Migrations applied.");
  client.close();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
