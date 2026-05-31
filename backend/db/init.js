const db = require("./connection");

const initDatabase = async () => {
  try {
    console.log("🗄️  Initializing database...");

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        weight DECIMAL(6, 2) DEFAULT NULL,
        height DECIMAL(6, 2) DEFAULT NULL,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Users table verified/created");

    // Add weight column if it doesn't exist
    const [weightColumn] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
          AND column_name = 'weight'
      `,
    );

    if (weightColumn[0]?.total === 0) {
      console.log("➕ Adding weight column...");
      await db.query(
        `ALTER TABLE users ADD COLUMN weight DECIMAL(6, 2) DEFAULT NULL`,
      );
      console.log("✅ Weight column added");
    } else {
      console.log("✅ Weight column exists");
    }

    // Add height column if it doesn't exist
    const [heightColumn] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
          AND column_name = 'height'
      `,
    );

    if (heightColumn[0]?.total === 0) {
      console.log("➕ Adding height column...");
      await db.query(
        `ALTER TABLE users ADD COLUMN height DECIMAL(6, 2) DEFAULT NULL`,
      );
      console.log("✅ Height column added");
    } else {
      console.log("✅ Height column exists");
    }

    // Drop reset_code column if it exists (no longer needed)
    const [resetCodeColumn] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
          AND column_name = 'reset_code'
      `,
    );

    if (resetCodeColumn[0]?.total > 0) {
      console.log("🗑️  Dropping reset_code column...");
      await db.query(`ALTER TABLE users DROP COLUMN reset_code`);
      console.log("✅ Reset_code column dropped");
    }

    // Drop reset_code_expires column if it exists (no longer needed)
    const [resetCodeExpiresColumn] = await db.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'users'
          AND column_name = 'reset_code_expires'
      `,
    );

    if (resetCodeExpiresColumn[0]?.total > 0) {
      console.log("🗑️  Dropping reset_code_expires column...");
      await db.query(`ALTER TABLE users DROP COLUMN reset_code_expires`);
      console.log("✅ Reset_code_expires column dropped");
    }

    // Verify final users table structure
    const [tableColumns] = await db.query(`DESCRIBE users`);
    console.log(
      "📊 Current users table structure:",
      tableColumns.map((c) => ({ field: c.Field, type: c.Type })),
    );

    await db.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      size VARCHAR(10) NOT NULL DEFAULT '',
      quantity INT NOT NULL DEFAULT 1,
      UNIQUE KEY unique_user_product_size (user_id, product_id, size),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

    const [cartTableRows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'cart_items'
    `,
    );

    if (cartTableRows[0]?.total > 0) {
      const [cartSizeColumnRows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'cart_items'
          AND column_name = 'size'
      `,
      );

      if (cartSizeColumnRows[0]?.total === 0) {
        await db.query(`
        ALTER TABLE cart_items
        ADD COLUMN size VARCHAR(10) NOT NULL DEFAULT '' AFTER product_id
      `);
      }

      const [cartUniqueRows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'cart_items'
          AND index_name = 'unique_user_product_size'
      `,
      );

      if (cartUniqueRows[0]?.total === 0) {
        await db.query(`
        ALTER TABLE cart_items
        DROP INDEX unique_user_product,
        ADD UNIQUE KEY unique_user_product_size (user_id, product_id, size)
      `);
      }
    }

    await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      total DECIMAL(10, 2) NOT NULL DEFAULT 0,
      customer_email VARCHAR(255) NULL DEFAULT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

    const [orderCustomerEmailColumnRows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'orders'
        AND column_name = 'customer_email'
    `,
    );

    if (orderCustomerEmailColumnRows[0]?.total === 0) {
      await db.query(`
      ALTER TABLE orders
      ADD COLUMN customer_email VARCHAR(255) NULL DEFAULT NULL AFTER total
    `);
    }

    await db.query(`
      ALTER TABLE orders
      MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'
    `);

    await db.query(`
      UPDATE orders
      SET status = CASE
        WHEN LOWER(TRIM(status)) IN ('paid', 'completed', 'success', 'successful') THEN 'success'
        WHEN LOWER(TRIM(status)) IN ('pending', 'processing', 'awaiting_payment', 'open', 'draft') THEN 'pending'
        ELSE 'unsuccessful'
      END
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

    await db.query(`
      UPDATE payments
      SET status = CASE
        WHEN LOWER(TRIM(status)) IN ('paid', 'completed', 'success', 'successful') THEN 'success'
        WHEN LOWER(TRIM(status)) IN ('pending', 'processing', 'awaiting_payment', 'open', 'draft') THEN 'pending'
        ELSE 'unsuccessful'
      END
    `);

    await db.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      order_id INT DEFAULT NULL,
      paypal_order_id VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      raw_response LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
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

      const [boardHeightColumnRows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'board_height'
      `,
      );

      if (boardHeightColumnRows[0]?.total === 0) {
        await db.query(`
        ALTER TABLE products
        ADD COLUMN board_height DECIMAL(5, 2) NULL DEFAULT NULL
      `);
      }

      const [heightColumnRows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'height'
      `,
      );

      if (heightColumnRows[0]?.total === 0) {
        await db.query(`
        ALTER TABLE products
        ADD COLUMN height DECIMAL(5, 2) NULL DEFAULT NULL
      `);
      }

      const [boardVolumeColumnRows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'board_volume'
      `,
      );

      if (boardVolumeColumnRows[0]?.total === 0) {
        await db.query(`
        ALTER TABLE products
        ADD COLUMN board_volume DECIMAL(5, 2) NULL DEFAULT NULL
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

      const [sizeColumnRows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'size'
      `,
      );

      if (sizeColumnRows[0]?.total === 0) {
        await db.query(`
        ALTER TABLE products
        ADD COLUMN size VARCHAR(10) NULL DEFAULT NULL
      `);
      }

      const [sizeStockColumnRows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'products'
          AND column_name = 'size_stock'
      `,
      );

      if (sizeStockColumnRows[0]?.total === 0) {
        await db.query(`
        ALTER TABLE products
        ADD COLUMN size_stock LONGTEXT NULL DEFAULT NULL
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
      const defaultVatRate = Number(process.env.DEFAULT_VAT_RATE || 0);
      await db.query(
        "INSERT INTO settings (key_name, value) VALUES ('vat_rate', ?)",
        [String(defaultVatRate)],
      );
    }

    console.log("✅ Database initialization complete!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

module.exports = initDatabase;
