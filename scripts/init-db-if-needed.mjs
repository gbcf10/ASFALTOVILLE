// Runs on every production startup. Only creates the DB if it doesn't exist.
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB_PATH = join(ROOT, 'data', 'asfaltoville.db');

if (existsSync(DB_PATH)) {
  console.log('✓ Banco de dados encontrado, iniciando normalmente.');
  process.exit(0);
}

console.log('Banco de dados não encontrado. Criando pela primeira vez...');
if (!existsSync(join(ROOT, 'data'))) mkdirSync(join(ROOT, 'data'), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_id TEXT NOT NULL UNIQUE,
    owner_name TEXT,
    password_hash TEXT,
    is_empty INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER NOT NULL REFERENCES lots(id),
    donor_name TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    reference_month TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    confirmed_at TEXT,
    confirmed_by TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT DEFAULT 'geral',
    expense_date TEXT NOT NULL,
    reference_month TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

const insertLot = db.prepare(`INSERT INTO lots (display_id) VALUES (?)`);
db.transaction(() => {
  for (let i = 1; i <= 256; i++) insertLot.run(String(i).padStart(3, '0'));
})();

function hashPassword(plain) {
  return createHash('sha256').update('AsfaltoVille2024_Salt_' + plain).digest('hex');
}

db.prepare(`INSERT INTO admins (username, name, password_hash, role) VALUES (?, ?, ?, ?)`).run(
  'sindico', 'Elton de Jesus Rodrigues', hashPassword('Sindico@2024'), 'admin'
);
db.prepare(`INSERT INTO admins (username, name, password_hash, role) VALUES (?, ?, ?, ?)`).run(
  'admin', 'Gabriel', hashPassword('Admin@2024'), 'superadmin'
);

db.close();
console.log('✓ Banco de dados criado com sucesso!');
console.log('  Acesse /login para entrar.');
