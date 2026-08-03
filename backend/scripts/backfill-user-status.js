const db = require("../db/connection");

(async () => {
  try {
    const [columns] = await db.query(
      "SELECT COUNT(*) AS total FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'is_active'",
    );

    if (columns[0].total === 0) {
      await db.query(
        "ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
      );
    }

    await db.query("UPDATE users SET is_active = 1");

    const [stats] = await db.query(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeCount, SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactiveCount FROM users",
    );

    console.log(JSON.stringify(stats[0]));
    await db.end();
  } catch (error) {
    console.error(error);
    try {
      await db.end();
    } catch (closeError) {
      void closeError;
    }
    process.exit(1);
  }
})();
