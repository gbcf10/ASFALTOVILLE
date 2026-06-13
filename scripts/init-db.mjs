import Database from 'better-sqlite3';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DB_PATH = join(ROOT, 'data', 'asfaltoville.db');

if (!existsSync(join(ROOT, 'data'))) mkdirSync(join(ROOT, 'data'), { recursive: true });

if (existsSync(DB_PATH)) {
  rmSync(DB_PATH);
  console.log('Banco anterior removido, recriando...');
}

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

console.log('Criando 256 lotes (001 a 256)...');
const insertLot = db.prepare(`INSERT INTO lots (display_id) VALUES (?)`);
const insertMany = db.transaction(() => {
  for (let i = 1; i <= 256; i++) insertLot.run(String(i).padStart(3, '0'));
});
insertMany();
console.log('✓ 256 lotes criados.');

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
console.log('✓ Banco inicializado com sucesso!');
console.log('  Síndico: sindico / Sindico@2024');
console.log('  Admin:   admin   / Admin@2024');
