const express = require('express');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const db = require('./database');
const { generateMultipleCodes, validateRedemptionCodeFormat } = require('./redemptionCodeGenerator');
const XLSX = require('xlsx');
const session = require('express-session');
const cron = require('node-cron');

// 确保backup目录存在
const backupDir = path.join(process.cwd(), 'database', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 数据库备份函数
const backupDatabase = () => {
  try {
    // 创建易读的时间戳备份文件名 (YYYY-MM-DD_HH-mm-ss)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    const backupFilename = `gift_redemption_backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);
    
    // 使用文件复制的方式备份数据库
    const originalDbPath = path.join(process.cwd(), 'database', 'gift_redemption.db');
    fs.copyFile(originalDbPath, backupPath, (err) => {
      if (err) {
        console.error('定时数据库备份失败:', err);
      } else {
        console.log(`定时数据库备份成功: ${backupFilename}`);
      }
    });
  } catch (error) {
    console.error('定时数据库备份异常:', error);
  }
};

const app = express();
const PORT = process.env.PORT || 3001; // 修改端口为3001

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 为所有API请求添加缓存控制头
app.use('/api/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 配置session中间件
app.use(session({
  secret: 'gift-redemption-secret-key', // 实际应用中应使用环境变量
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 开发环境下为false，生产环境应设置为true（使用HTTPS）
    maxAge: 24 * 60 * 60 * 1000 // session有效期24小时
  }
}));

// 登录验证中间件
function ensureAuthenticated(req, res, next) {
  if (req.session.isLoggedIn) {
    return next();
  } else {
    // API请求返回401未授权
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: '未授权访问，请先登录' });
    }
    // 页面请求重定向到登录页
    return res.redirect('/login');
  }
}

// 登录页面路由
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin/login.html'));
});

// 登录API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // 暂时使用硬编码的用户名和密码，实际应用中应该从数据库中获取并验证
  // 注意：实际项目中密码应该加密存储，这里只是示例
  const validUsername = 'HFLXJ';
  const validPassword = 'LXJ#2025ah'; // 实际应用中应该使用bcrypt等工具加密密码
  
  if (username === validUsername && password === validPassword) {
    // 登录成功，设置session
    req.session.isLoggedIn = true;
    req.session.username = username;
    
    res.json({ success: true, message: '登录成功' });
  } else {
    // 登录失败
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

// 登出API
app.post('/api/logout', (req, res) => {
  // 销毁session
  req.session.destroy((err) => {
    if (err) {
      console.error('登出失败:', err);
      res.status(500).json({ success: false, message: '登出失败' });
    } else {
      res.json({ success: true, message: '登出成功' });
      // 重定向到登录页面
      res.redirect('/login');
    }
  });
});

// 保护admin页面路由
app.get('/admin', (req, res) => {
  // 检查用户是否已登录
  if (req.session.isLoggedIn) {
    res.sendFile(path.join(__dirname, '../client/admin/index.html'));
  } else {
    // 未登录，重定向到登录页面
    res.redirect('/login');
  }
});

app.get('/h5', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/h5/index.html'));
});

// 保护需要登录的API端点
app.post('/api/generate-codes', ensureAuthenticated, async (req, res) => {
  try {
    // 获取请求参数
    const count = parseInt(req.body.count) || 1;
    const length = parseInt(req.body.length) || 10;
    const note = req.body.note || '';
    const validFrom = req.body.validFrom || null; // 有效期开始时间
    const validTo = req.body.validTo || null; // 有效期结束时间
    
    if (count <= 0 || count > 10000) {
      return res.status(400).json({ success: false, message: '生成数量必须在1到10000之间' });
    }
    
    if (length < 6 || length > 20) {
      return res.status(400).json({ success: false, message: '兑换码长度必须在6到20之间' });
    }
    
    // 处理有效期时间
    let processedValidFrom = validFrom;
    let processedValidTo = validTo;
    
    // 如果validFrom是日期格式（不含时间），则保留为00:00
    if (validFrom && validFrom.match(/^\d{4}-\d{2}-\d{2}$/)) {
      processedValidFrom += 'T00:00:00';
    }
    
    // 如果validTo是日期格式（不含时间），则设置为23:59:59
    if (validTo && validTo.match(/^\d{4}-\d{2}-\d{2}$/)) {
      processedValidTo += 'T23:59:59';
    }
    
    // 验证有效期格式（如果提供了有效期）
    if (processedValidFrom && isNaN(Date.parse(processedValidFrom))) {
      return res.status(400).json({ success: false, message: '有效期开始时间格式不正确' });
    }
    
    if (processedValidTo && isNaN(Date.parse(processedValidTo))) {
      return res.status(400).json({ success: false, message: '有效期结束时间格式不正确' });
    }
    
    // 验证有效期开始时间不能晚于结束时间
    if (processedValidFrom && processedValidTo && new Date(processedValidFrom) > new Date(processedValidTo)) {
      return res.status(400).json({ success: false, message: '有效期开始时间不能晚于结束时间' });
    }
    
    const codes = generateMultipleCodes(count, length);
    
    // 将兑换码保存到数据库
    const saveCodesToDatabase = () => {
      return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT OR IGNORE INTO redemption_codes (code, note, valid_from, valid_to) VALUES (?, ?, ?, ?)');
        let completedRuns = 0;
        const totalRuns = codes.length;
        
        if (totalRuns === 0) {
          return resolve();
        }
        
        codes.forEach((code) => {
          stmt.run(code, note, processedValidFrom, processedValidTo, (err) => {
            if (err) {
              console.error('保存兑换码到数据库失败:', err);
            }
            
            completedRuns++;
            
            if (completedRuns === totalRuns) {
              stmt.finalize((err) => {
                if (err) {
                  console.error('关闭数据库语句失败:', err);
                  return reject(err);
                }
                
                resolve();
              });
            }
          });
        });
      });
    };
    
    // 保存兑换码到数据库
    await saveCodesToDatabase();
    
    // 返回响应
    res.json({ 
      success: true, 
      message: `成功生成${count}个兑换码`, 
      codes: codes.map(code => ({ code })) 
    });
  } catch (error) {
    console.error('生成兑换码失败:', error);
    return res.status(500).json({ success: false, message: '生成兑换码失败，请稍后重试' });
  }
});

// 清除所有兑换码API（管理功能）
app.delete('/api/clear-all-codes', ensureAuthenticated, (req, res) => {
  try {
    // 首先删除所有兑换记录，因为有外键约束
    db.run('DELETE FROM redemption_records', (err) => {
      if (err) {
        console.error('删除兑换记录失败:', err);
        return res.status(500).json({ success: false, message: '删除兑换记录失败' });
      }
      
      // 然后删除所有兑换码
      db.run('DELETE FROM redemption_codes', (err) => {
        if (err) {
          console.error('删除兑换码失败:', err);
          return res.status(500).json({ success: false, message: '删除兑换码失败' });
        }
        
        // 清理二维码文件目录
        const qrcodesDir = path.join(__dirname, '../public/qrcodes');
        if (fs.existsSync(qrcodesDir)) {
          const files = fs.readdirSync(qrcodesDir);
          files.forEach(file => {
            const filePath = path.join(qrcodesDir, file);
            if (fs.isFile(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
        }
        
        res.json({ success: true, message: '所有兑换码和兑换记录已删除' });
      });
    });
  } catch (error) {
    console.error('清理数据失败:', error);
    return res.status(500).json({ success: false, message: '清理数据失败，请稍后重试' });
  }
});

// 验证兑换码API（H5用户功能，不需要保护）
app.get('/api/verify-code/:code', (req, res) => {
  const { code } = req.params;
  
  // 统一转换为大写
  const upperCode = code.toUpperCase();
  
  // 先验证兑换码格式是否有效
  if (!validateRedemptionCodeFormat(upperCode)) {
    return res.status(400).json({ success: false, message: '请输入正确的兑换码' });
  }
  
  db.get('SELECT id, is_used, valid_from, valid_to FROM redemption_codes WHERE code = ?', [upperCode], (err, row) => {
    if (err) {
      console.error('验证兑换码失败:', err);
      return res.status(500).json({ success: false, message: '数据库错误' });
    }
    
    if (!row) {
      return res.status(400).json({ success: false, message: '请输入正确的兑换码' });
    }
    
    if (row.is_used) {
      return res.status(400).json({ success: false, message: '该兑换码已兑换' });
    }
    
    const now = new Date();
    
    // 检查是否已到有效期开始时间
    if (row.valid_from) {
      const validFrom = new Date(row.valid_from);
      if (now < validFrom) {
        return res.status(400).json({ success: false, message: '暂未开启兑换' });
      }
    }
    
    // 检查是否已过有效期结束时间
    if (row.valid_to) {
      const validTo = new Date(row.valid_to);
      if (now > validTo) {
        return res.status(400).json({ success: false, message: '兑换有效期已过' });
      }
    }
    
    res.json({ 
      success: true, 
      message: '兑换码有效', 
      codeId: row.id
    });
  });
});

// 提交收货信息API（H5用户功能，不需要保护）
app.post('/api/submit-shipping', (req, res) => {
  const { codeId, name, phone, company, province, city, district, address, fullAddress } = req.body;
  
  if (!codeId || !name || !phone || !company || !province || !city || !district || !address) {
    return res.status(400).json({ success: false, message: '请填写完整的收货信息' });
  }
  
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ success: false, message: '请输入正确的手机号码' });
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    db.run('UPDATE redemption_codes SET is_used = 1 WHERE id = ?', [codeId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        console.error('更新兑换码状态失败:', err);
        return res.status(500).json({ success: false, message: '提交失败，请稍后重试' });
      }
      
      db.run('INSERT INTO redemption_records (code_id, name, phone, company, province, city, district, address, detailed_address, full_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
        [codeId, name, phone, company, province, city, district, address, address, fullAddress], (err) => {
          if (err) {
            db.run('ROLLBACK');
            console.error('插入兑换记录失败:', err);
            return res.status(500).json({ success: false, message: '提交失败，请稍后重试' });
          }
          
          db.run('COMMIT');
          res.json({ success: true, message: '提交成功，我们将尽快为您安排发货' });
        });
    });
  });
});

// 获取兑换数据API（管理功能）
app.get('/api/redemption-data', ensureAuthenticated, (req, res) => {
  const sql = `
    SELECT 
      rc.code,
      rr.name,
      rr.phone,
      rr.company,
      rr.province,
      rr.city,
      rr.district,
      rr.detailed_address,
      rr.full_address,
      rr.zip_code,
      rr.created_at as redemption_time,
      rr.is_shipped,
      rr.shipped_at as shipping_time
    FROM redemption_records rr
    JOIN redemption_codes rc ON rr.code_id = rc.id
    ORDER BY rr.redemption_time DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('获取兑换数据失败:', err);
      return res.status(500).json({ message: '获取数据失败，请稍后重试' });
    }
    
    res.json(rows);
  });
});

// 标记发货状态API（管理功能）
app.put('/api/mark-shipped/:recordId', ensureAuthenticated, (req, res) => {
  const { recordId } = req.params;
  
  // 更新兑换记录的发货状态和发货时间
  db.run('UPDATE redemption_records SET is_shipped = 1, shipped_at = CURRENT_TIMESTAMP WHERE id = ?', [recordId], (err) => {
    if (err) {
      console.error('标记发货失败:', err);
      return res.status(500).json({ success: false, message: '标记发货失败，请稍后重试' });
    }
    
    // 同时更新兑换码表的发货状态和发货时间
    db.run('UPDATE redemption_codes SET is_shipped = 1, shipped_at = CURRENT_TIMESTAMP WHERE id IN (SELECT code_id FROM redemption_records WHERE id = ?)', [recordId], (err) => {
      if (err) {
        console.error('更新兑换码发货状态失败:', err);
        return res.status(500).json({ success: false, message: '标记发货失败，请稍后重试' });
      }
      
      res.json({ success: true, message: '标记发货成功' });
    });
  });
});

// 导出数据API（管理功能）
app.get('/api/export-data', ensureAuthenticated, (req, res) => {
  const sql = `
    SELECT 
      rc.code AS '兑换码',
      rr.name AS '姓名',
      rr.phone AS '手机号',
      rr.company AS '公司全称',
      rr.province AS '省份',
      rr.city AS '城市',
      rr.district AS '区县',
      rr.full_address AS '完整地址',
      rr.created_at AS '兑换时间',
      rc.valid_from AS '有效期开始',
      rc.valid_to AS '有效期结束'
    FROM redemption_records rr
    JOIN redemption_codes rc ON rr.code_id = rc.id
    ORDER BY rr.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('导出数据失败:', err);
      return res.status(500).json({ message: '导出数据失败，请稍后重试' });
    }
    
    // 格式化日期字段，仅显示日期部分
    const formattedRows = rows.map(row => {
      // 处理有效期开始时间
      let validFrom = '无';
      if (row['有效期开始']) {
        // 处理不同格式的日期时间字符串
        if (row['有效期开始'].includes('T')) {
          // 处理ISO格式：2025-12-15T16:04
          validFrom = row['有效期开始'].split('T')[0];
        } else if (row['有效期开始'].includes(' ')) {
          // 处理普通格式：2025-12-15 16:04
          validFrom = row['有效期开始'].split(' ')[0];
        } else {
          // 已经是日期格式：2025-12-15
          validFrom = row['有效期开始'];
        }
      }
      
      // 处理有效期结束时间
      let validTo = '无';
      if (row['有效期结束']) {
        // 处理不同格式的日期时间字符串
        if (row['有效期结束'].includes('T')) {
          // 处理ISO格式：2025-12-15T16:04
          validTo = row['有效期结束'].split('T')[0];
        } else if (row['有效期结束'].includes(' ')) {
          // 处理普通格式：2025-12-15 16:04
          validTo = row['有效期结束'].split(' ')[0];
        } else {
          // 已经是日期格式：2025-12-15
          validTo = row['有效期结束'];
        }
      }
      
      // 处理兑换时间，仅显示日期部分
      let redemptionTime = '';
      if (row['兑换时间']) {
        if (row['兑换时间'].includes('T')) {
          redemptionTime = row['兑换时间'].split('T')[0];
        } else if (row['兑换时间'].includes(' ')) {
          redemptionTime = row['兑换时间'].split(' ')[0];
        } else {
          redemptionTime = row['兑换时间'];
        }
      }
      
      return {
        ...row,
        '兑换时间': redemptionTime,
        '有效期开始': validFrom,
        '有效期结束': validTo
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '兑换记录');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
  });
});

app.get('/api/redemption-records', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  // 先获取总数
  const countSql = `
    SELECT COUNT(*) AS total
    FROM redemption_records rr
    JOIN redemption_codes rc ON rr.code_id = rc.id
  `;
  
  db.get(countSql, [], (err, countRow) => {
    if (err) {
      console.error('获取兑换记录总数失败:', err);
      return res.status(500).json({ success: false, message: '获取兑换记录失败，请稍后重试' });
    }
    
    const total = countRow.total;
    
    // 获取分页数据
    const dataSql = `
      SELECT 
        rr.id,
        rc.code,
        rr.name,
        rr.phone,
        rr.company,
        rr.province,
        rr.city,
        rr.district,
        rr.detailed_address,
        rr.full_address,
        rr.zip_code,
        rr.created_at as redemption_time,
        rr.is_shipped,
        rr.shipped_at as shipping_time
      FROM redemption_records rr
      JOIN redemption_codes rc ON rr.code_id = rc.id
      ORDER BY rr.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(dataSql, [limit, offset], (err, rows) => {
      if (err) {
        console.error('获取兑换记录数据失败:', err);
        return res.status(500).json({ success: false, message: '获取兑换记录失败，请稍后重试' });
      }
      
      res.json({ 
        success: true, 
        records: rows, 
        total: total, 
        page: page, 
        limit: limit, 
        totalPages: Math.ceil(total / limit) 
      });
    });
  });
});

// 获取兑换码API（管理功能）
app.get('/api/all-codes', ensureAuthenticated, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  // 先获取总数
  const countSql = `
    SELECT COUNT(*) AS total
    FROM redemption_codes rc
  `;
  
  db.get(countSql, [], (err, countRow) => {
    if (err) {
      console.error('获取兑换码总数失败:', err);
      return res.status(500).json({ success: false, message: '获取兑换码失败，请稍后重试' });
    }
    
    const total = countRow.total;
    
    // 获取分页数据
    const dataSql = `
      SELECT 
        rc.id, 
        rc.code, 
        rc.qr_code_path, 
        rc.is_used, 
        rc.created_at,
        rc.is_shipped,
        rc.shipped_at,
        rc.valid_from,
        rc.valid_to
      FROM redemption_codes rc
      ORDER BY rc.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(dataSql, [limit, offset], (err, rows) => {
      if (err) {
        console.error('获取兑换码数据失败:', err);
        return res.status(500).json({ success: false, message: '获取兑换码失败，请稍后重试' });
      }
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      
      // 返回分页的兑换码数据
      res.json({ 
        success: true, 
        codes: rows, 
        total: total, 
        page: page, 
        limit: limit, 
        totalPages: Math.ceil(total / limit) 
      });
    });
  });
});

// 获取合并的兑换码列表API（管理功能）
app.get('/api/combined-codes', ensureAuthenticated, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const phone = req.query.phone || '';
  const code = req.query.code || '';
  const redeemStatus = req.query.redeemStatus || '';
  const deliveryStatus = req.query.deliveryStatus || '';
  const company = req.query.company || '';
  const offset = (page - 1) * limit;
  
  // 构建多字段搜索条件
  let whereConditions = [];
  let whereParams = [];
  
  if (phone) {
    whereConditions.push('rr.phone LIKE ?');
    whereParams.push(`%${phone}%`);
  }
  
  if (code) {
    whereConditions.push('rc.code LIKE ?');
    whereParams.push(`%${code}%`);
  }
  
  if (redeemStatus) {
    whereConditions.push('rc.is_used = ?');
    whereParams.push(parseInt(redeemStatus));
  }
  
  if (deliveryStatus) {
    whereConditions.push('rc.is_shipped = ?');
    whereParams.push(parseInt(deliveryStatus));
  }
  
  if (company) {
    whereConditions.push('rr.company LIKE ?');
    whereParams.push(`%${company}%`);
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  // 先获取总数（带搜索条件）
  const countSql = `
    SELECT COUNT(*) AS total
    FROM redemption_codes rc
    LEFT JOIN redemption_records rr ON rc.id = rr.code_id
    ${whereClause}
  `;
  
  db.get(countSql, whereParams, (err, countRow) => {
    if (err) {
      console.error('获取合并数据总数失败:', err);
      return res.status(500).json({ success: false, message: '获取数据失败，请稍后重试' });
    }
    
    const total = countRow.total;
    
    // 获取合并数据（兑换码 + 兑换记录）（带搜索条件）
    const dataSql = `
      SELECT 
        rc.id, 
        rc.code, 
        rc.is_used, 
        rc.is_shipped, 
        rc.created_at, 
        rc.valid_from,
        rc.valid_to,
        rr.id as record_id,
        rr.name, 
        rr.phone, 
        rr.company, 
        rr.province, 
        rr.city, 
        rr.district, 
        rr.detailed_address, 
        rr.full_address, 
        rr.zip_code, 
        rr.created_at as redemption_time
      FROM redemption_codes rc
      LEFT JOIN redemption_records rr ON rc.id = rr.code_id
      ${whereClause}
      ORDER BY rc.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...whereParams, limit, offset];
    db.all(dataSql, dataParams, (err, rows) => {
      if (err) {
        console.error('获取合并数据失败:', err);
        return res.status(500).json({ success: false, message: '获取数据失败，请稍后重试' });
      }
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      // 确保不缓存响应
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // 返回分页的合并数据
      res.json({ 
        success: true, 
        codes: rows, 
        total: total, 
        page: page, 
        limit: limit, 
        totalPages: Math.ceil(total / limit) 
      });
    });
  });
});

app.get('/api/statistics', ensureAuthenticated, (req, res) => {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM redemption_codes) AS total, -- 总数
      (SELECT COUNT(*) FROM redemption_codes WHERE is_used = 1) AS redeemed, -- 已兑换
      (SELECT COUNT(*) FROM redemption_codes WHERE is_shipped = 1) AS shipped -- 已发货
    FROM redemption_codes
    LIMIT 1
  `;
  
  db.get(sql, [], (err, row) => {
    if (err) {
      console.error('获取统计数据失败:', err);
      return res.status(500).json({ message: '获取统计数据失败，请稍后重试' });
    }
    
    // 如果没有数据，返回默认值
    if (!row) {
      row = {
        total: 0,
        redeemed: 0,
        shipped: 0
      };
    }
    
    // 转换为测试用例和admin页面期望的格式
    res.json({
      total_codes: row.total,
      used_codes: row.redeemed, // 测试用例期望used_codes字段
      total_redemptions: row.redeemed, // 测试用例期望total_redemptions字段
      shipped_redemptions: row.shipped, // 测试用例期望shipped_redemptions字段
      redeemed_codes: row.redeemed, // admin页面期望redeemed_codes字段
      shipped_codes: row.shipped // admin页面期望shipped_codes字段
    });
  });
});

// 导出兑换码API（管理功能）
app.get('/api/export-codes', ensureAuthenticated, (req, res) => {
  const sql = `
    SELECT 
      ROW_NUMBER() OVER (ORDER BY rc.created_at DESC) AS '序号',
      rc.code AS '兑换码',
      DATE(rc.created_at) AS '生成时间',
      CASE WHEN rc.is_used = 1 THEN '已兑换' ELSE '未兑换' END AS '兑换状态',
      DATE(rc.valid_from) AS '有效期开始',
      DATE(rc.valid_to) AS '有效期结束'
    FROM redemption_codes rc
    LEFT JOIN redemption_records rr ON rc.id = rr.code_id
    ORDER BY rc.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('导出兑换码失败:', err);
      return res.status(500).json({ message: '导出兑换码失败，请稍后重试' });
    }
    
    const formattedRows = rows;
    
    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '兑换码信息');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=codes.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
  });
});

// 数据库备份API
app.get('/api/backup-db', ensureAuthenticated, (req, res) => {
  try {
    // 创建易读的时间戳备份文件名 (YYYY-MM-DD_HH-mm-ss)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    const backupFilename = `gift_redemption_backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);
    
    // 使用文件复制的方式备份数据库
    const originalDbPath = path.join(process.cwd(), 'database', 'gift_redemption.db');
    fs.copyFile(originalDbPath, backupPath, (err) => {
      if (err) {
        console.error('数据库备份失败:', err);
        return res.status(500).json({ success: false, message: '数据库备份失败' });
      }
      
      res.json({ 
        success: true, 
        message: '数据库备份成功', 
        backupFile: backupFilename,
        backupPath: backupPath,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('数据库备份异常:', error);
    res.status(500).json({ success: false, message: '数据库备份异常' });
  }
});

// 备份文件列表API
app.get('/api/list-backups', ensureAuthenticated, (req, res) => {
  try {
    // 读取备份目录
    const files = fs.readdirSync(backupDir);
    
    // 过滤出.db文件并获取详细信息
    const backupFiles = files
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // 按创建时间降序排序
    
    res.json({ 
      success: true, 
      backups: backupFiles
    });
  } catch (error) {
    console.error('获取备份列表失败:', error);
    res.status(500).json({ success: false, message: '获取备份列表失败' });
  }
});

// 恢复数据库API
app.post('/api/restore-db', ensureAuthenticated, (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ success: false, message: '请提供备份文件名' });
    }
    
    const backupPath = path.join(backupDir, filename);
    const originalDbPath = path.join(process.cwd(), 'database', 'gift_redemption.db');
    
    // 检查备份文件是否存在
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, message: '备份文件不存在' });
    }
    
    // 复制备份文件到原始数据库位置
    fs.copyFile(backupPath, originalDbPath, (err) => {
      if (err) {
        console.error('恢复数据库失败:', err);
        return res.status(500).json({ success: false, message: '恢复数据库失败' });
      }
      
      res.json({ 
        success: true, 
        message: '数据库恢复成功'
      });
    });
  } catch (error) {
    console.error('恢复数据库异常:', error);
    res.status(500).json({ success: false, message: '恢复数据库异常' });
  }
});

// 设置每天凌晨3点执行数据库备份
cron.schedule('0 3 * * *', () => {
  console.log('执行定时数据库备份...');
  backupDatabase();
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`H5 page: http://localhost:${PORT}/h5`);
  console.log(`Admin page: http://localhost:${PORT}/admin`);
  console.log(`Generate codes: http://localhost:${PORT}/api/generate-codes`);
  console.log('Connected to SQLite database.');
  console.log('已设置每天凌晨3点执行数据库备份任务');
});

// 导出app对象供测试使用
module.exports = app;