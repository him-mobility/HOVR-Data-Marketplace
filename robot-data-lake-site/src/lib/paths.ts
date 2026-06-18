// Server-only. Filesystem location of the seeded SQLite database.
import path from "node:path";

export const DB_PATH = path.join(process.cwd(), "data", "robot-data-lake.sqlite");
