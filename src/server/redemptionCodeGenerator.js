function generateRedemptionCode(length = 10) {
  // 优化字符集：移除相似字符（0和O，1和I）以提高用户体验
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const charsLength = characters.length;
  let code = '';
  
  // 使用更安全的加密随机数替代Math.random()
  for (let i = 0; i < length; i++) {
    // 生成加密安全的随机字节
    const randomBytes = require('crypto').randomBytes(4);
    const randomInt = randomBytes.readUInt32BE(0);
    
    // 使用模运算确保索引在字符集范围内
    const randomIndex = randomInt % charsLength;
    code += characters.charAt(randomIndex);
  }
  
  return code;
}

function generateMultipleCodes(count = 1, length = 10) {
  const codes = new Set();
  
  // 确保生成指定数量的不重复兑换码
  while (codes.size < count) {
    const newCode = generateRedemptionCode(length);
    codes.add(newCode);
  }
  
  return Array.from(codes);
}

// 验证兑换码格式是否有效
function validateRedemptionCodeFormat(code, length = 10) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  // 统一转换为大写
  const upperCode = code.toUpperCase();
  
  // 验证长度
  if (upperCode.length !== length) {
    return false;
  }
  
  // 验证字符是否在允许的字符集中
  const allowedCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const charPattern = new RegExp(`^[${allowedCharacters}]+$`);
  
  return charPattern.test(upperCode);
}

module.exports = {
  generateRedemptionCode,
  generateMultipleCodes,
  validateRedemptionCodeFormat
};
