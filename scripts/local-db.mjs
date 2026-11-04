// Runs a local PostgreSQL without Docker (uses the embedded-postgres binaries).
// Usage: npm run db:local   (keep it running in its own terminal)
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const dataDir = "./.pgdata";
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "phalnama",
  password: "phalnama",
  port: 5432,
  persistent: true,
});

const fresh = !existsSync(dataDir);
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("phalnama");
console.log("Postgres running on postgresql://phalnama:phalnama@localhost:5432/phalnama");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
