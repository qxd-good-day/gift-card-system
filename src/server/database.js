const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'database', 'gift_redemption.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS redemption_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    qr_code_path TEXT,
    is_used INTEGER DEFAULT 0,
    is_shipped INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    valid_from DATETIME, -- 有效期开始时间
    valid_to DATETIME -- 有效期结束时间
  )`);
  
  // 为已存在的表添加is_shipped字段（如果不存在）
  // 简化处理，直接尝试添加字段，如果已存在会报错但不影响程序运行
  db.run(`ALTER TABLE redemption_codes ADD COLUMN is_shipped INTEGER DEFAULT 0` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      // 如果不是因为字段已存在的错误，则输出错误信息
      console.error('添加is_shipped字段失败:', err);
    }
  });
  
  // 为已存在的表添加shipped_at字段（如果不存在）
  db.run(`ALTER TABLE redemption_codes ADD COLUMN shipped_at DATETIME` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      // 如果不是因为字段已存在的错误，则输出错误信息
      console.error('添加shipped_at字段失败:', err);
    }
  });
  
  // 为已存在的表添加note字段（如果不存在）
  db.run(`ALTER TABLE redemption_codes ADD COLUMN note TEXT` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      // 如果不是因为字段已存在的错误，则输出错误信息
      console.error('添加note字段失败:', err);
    }
  });
  
  // 为已存在的表添加valid_from字段（有效期开始时间）
  db.run(`ALTER TABLE redemption_codes ADD COLUMN valid_from DATETIME` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加valid_from字段失败:', err);
    }
  });
  
  // 为已存在的表添加valid_to字段（有效期结束时间）
  db.run(`ALTER TABLE redemption_codes ADD COLUMN valid_to DATETIME` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加valid_to字段失败:', err);
    }
  });
  
  // 从已存在的表中删除gift_image字段
  db.run(`ALTER TABLE redemption_codes DROP COLUMN gift_image` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      // 如果不是因为字段不存在的错误，则输出错误信息
      console.error('删除gift_image字段失败:', err);
    }
  });
  
  db.run(`CREATE TABLE IF NOT EXISTS redemption_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_id INTEGER,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT,
    province TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    detailed_address TEXT NOT NULL,
    full_address TEXT NOT NULL,
    zip_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_shipped INTEGER DEFAULT 0,
    shipped_at DATETIME,
    FOREIGN KEY (code_id) REFERENCES redemption_codes (id)
  )`);
  
  // 为已存在的表添加company字段（如果不存在）
  db.run(`ALTER TABLE redemption_records ADD COLUMN company TEXT` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加company字段失败:', err);
    }
  });
  
  // 为已存在的表添加province字段（如果不存在）
  db.run(`ALTER TABLE redemption_records ADD COLUMN province TEXT` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加province字段失败:', err);
    }
  });
  
  // 为已存在的表添加city字段（如果不存在）
  db.run(`ALTER TABLE redemption_records ADD COLUMN city TEXT` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加city字段失败:', err);
    }
  });
  
  // 为已存在的表添加district字段（如果不存在）
  db.run(`ALTER TABLE redemption_records ADD COLUMN district TEXT` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加district字段失败:', err);
    }
  });
  
  // 为已存在的表添加full_address字段（如果不存在）
  db.run(`ALTER TABLE redemption_records ADD COLUMN full_address TEXT` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加full_address字段失败:', err);
    }
  });
  
  // 为已存在的表添加detailed_address字段（如果不存在）
  db.run(`ALTER TABLE redemption_records ADD COLUMN detailed_address TEXT` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加detailed_address字段失败:', err);
    }
  });
  
  // 为已存在的表添加is_shipped字段（如果不存在）
  db.run(`ALTER TABLE redemption_records ADD COLUMN is_shipped INTEGER DEFAULT 0` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加is_shipped字段失败:', err);
    }
  });
  
  // 为已存在的表添加shipped_at字段（如果不存在）
  db.run(`ALTER TABLE redemption_records ADD COLUMN shipped_at DATETIME` , (err) => {
    if (err && err.code !== 'SQLITE_ERROR') {
      console.error('添加shipped_at字段失败:', err);
    }
  });
  
  // 添加数据库索引以提高查询效率
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_codes_is_used ON redemption_codes (is_used)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_codes_is_shipped ON redemption_codes (is_shipped)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_codes_created_at ON redemption_codes (created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_codes_valid_from ON redemption_codes (valid_from)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_codes_valid_to ON redemption_codes (valid_to)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_records_code_id ON redemption_records (code_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_records_is_shipped ON redemption_records (is_shipped)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_records_created_at ON redemption_records (created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_records_phone ON redemption_records (phone)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_redemption_records_company ON redemption_records (company)`);
});

module.exports = db;
