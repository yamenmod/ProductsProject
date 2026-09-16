const bcrypt = require("bcryptjs");
const db = require("../db/connection");

const BCRYPT_HASH = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/;

const migratePasswords = async () => {
  try {
    const [users] = await db.query("SELECT id, password FROM users");
    let migratedCount = 0;

    for (const user of users) {
      if (typeof user.password !== "string" || BCRYPT_HASH.test(user.password)) {
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.query("UPDATE users SET password = ? WHERE id = ?", [
        hashedPassword,
        user.id,
      ]);
      migratedCount += 1;
    }

    console.log(`Migrated ${migratedCount} plaintext password(s).`);
  } catch (error) {
    console.error("Password migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
};

migratePasswords();