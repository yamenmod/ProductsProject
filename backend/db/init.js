const db = require("./connection");

const initDatabase = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      reset_code VARCHAR(6) DEFAULT NULL,
      reset_code_expires DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  const [resetCodeColumn] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = 'reset_code'
    `,
  );

  if (resetCodeColumn[0]?.total === 0) {
    await db.query(`ALTER TABLE users ADD COLUMN reset_code VARCHAR(6) DEFAULT NULL`);
  }

  const [resetCodeExpiresColumn] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = 'reset_code_expires'
    `,
  );

  if (resetCodeExpiresColumn[0]?.total === 0) {
    await db.query(`ALTER TABLE users ADD COLUMN reset_code_expires DATETIME DEFAULT NULL`);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      UNIQUE KEY unique_user_product (user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      total DECIMAL(10, 2) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'paid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      quantity INT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )
  `);

  const [productTableRows] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'products'
    `,
  );

  if (productTableRows[0]?.total > 0) {
    await db.query(`
      ALTER TABLE products
      MODIFY COLUMN image_url MEDIUMTEXT NULL
    `);

    const [genderColumnRows] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'gender'
      `,
    );

    if (genderColumnRows[0]?.total === 0) {
      await db.query(`
        ALTER TABLE products
        ADD COLUMN gender VARCHAR(20) NOT NULL DEFAULT 'unisex'
      `);
    }

    await db.query(`
      UPDATE products
      SET gender = CASE
        WHEN LOWER(TRIM(gender)) IN ('female', 'women', 'womens') THEN 'female'
        WHEN LOWER(TRIM(gender)) IN ('male', 'men', 'mens') THEN 'male'
        WHEN LOWER(TRIM(gender)) = 'unisex' THEN 'unisex'
        ELSE 'unisex'
      END
    `);

    await db.query(`
      ALTER TABLE products
      MODIFY COLUMN gender ENUM('male', 'female', 'unisex') NOT NULL DEFAULT 'unisex'
    `);

    // Add board_length and volume columns if they don't exist
    const [boardLengthColumnRows] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'board_length'
      `,
    );

    if (boardLengthColumnRows[0]?.total === 0) {
      await db.query(`
        ALTER TABLE products
        ADD COLUMN board_length DECIMAL(5, 2) NULL DEFAULT NULL
      `);
    }

    const [volumeColumnRows] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'volume'
      `,
    );

    if (volumeColumnRows[0]?.total === 0) {
      await db.query(`
        ALTER TABLE products
        ADD COLUMN volume DECIMAL(5, 2) NULL DEFAULT NULL
      `);
    }
  }

  // Create settings table for VAT and other configs
  await db.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      key_name VARCHAR(100) NOT NULL UNIQUE,
      value LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Initialize VAT rate if not already set
  const [existingVat] = await db.query(
    "SELECT * FROM settings WHERE key_name = 'vat_rate'",
  );

  if (!existingVat || existingVat.length === 0) {
    await db.query(
      "INSERT INTO settings (key_name, value) VALUES ('vat_rate', '0.18')",
    );
  }
};

module.exports = initDatabase;
