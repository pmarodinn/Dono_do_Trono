const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Tabela de Produtos
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      active INTEGER DEFAULT 1
    )
  `);

  // Tabela de Pedidos
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_cpf TEXT,
      amount_cents INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      mp_preference_id TEXT,
      mp_payment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);

  // Inserir produtos iniciais se não existirem
  const insertProduct = db.prepare(`INSERT OR IGNORE INTO products (id, name, description, price_cents, active) VALUES (?, ?, ?, ?, ?)`);
  
  // Preços em centavos (ex: 3990 = R$ 39,90)
  insertProduct.run('kit-test-drive', 'Kit Test Drive — 3 Pacotes', '3 Pacotes', 3990, 1);
  insertProduct.run('o-arsenal', 'O Arsenal — 10 Pacotes', '10 Pacotes + Frete Grátis', 8990, 1);
  insertProduct.run('clube-do-trono', 'Clube do Trono (Assinatura)', 'Assinatura Mensal', 7190, 1);
  
  insertProduct.finalize();
});

module.exports = db;
