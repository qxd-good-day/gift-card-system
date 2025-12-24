const http = require('http');

// 登录信息
const loginData = JSON.stringify({
  username: 'HFLXJ',
  password: 'LXJ#2025ah'
});

// 登录请求选项
const loginOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
};

// 发送登录请求
const loginReq = http.request(loginOptions, (loginRes) => {
  // 获取登录响应中的set-cookie头
  const cookies = loginRes.headers['set-cookie'] || [];
  console.log('登录响应状态码:', loginRes.statusCode);
  console.log('登录响应头:', loginRes.headers);
  
  // 如果登录成功（200 OK），则发送/api/combined-codes请求
  if (loginRes.statusCode === 200) {
    // 组合请求头，包括登录后的cookie
    const combinedOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/combined-codes',
      method: 'GET',
      headers: {
        'Cookie': cookies.join('; ')
      }
    };
    
    console.log('\n发送/api/combined-codes请求...');
    
    // 发送/api/combined-codes请求
    const combinedReq = http.request(combinedOptions, (combinedRes) => {
      console.log('API响应状态码:', combinedRes.statusCode);
      console.log('API响应头:', combinedRes.headers);
      
      // 读取响应体
      let combinedResData = '';
      combinedRes.on('data', (chunk) => {
        combinedResData += chunk;
      });
      
      combinedRes.on('end', () => {
        console.log('\nAPI响应体长度:', combinedResData.length);
        console.log('API响应体（前500字符）:', combinedResData.substring(0, 500));
        
        // 检查响应状态码是否为200
        if (combinedRes.statusCode === 200) {
          console.log('\n✅ 测试成功：/api/combined-codes返回200状态码，没有返回304。');
        } else if (combinedRes.statusCode === 304) {
          console.log('\n❌ 测试失败：/api/combined-codes仍然返回304状态码。');
        } else {
          console.log(`\n⚠️  测试结果：/api/combined-codes返回${combinedRes.statusCode}状态码。`);
        }
      });
    });
    
    combinedReq.on('error', (e) => {
      console.error('\n❌ API请求错误:', e);
    });
    
    combinedReq.end();
  } else {
    console.log('\n❌ 登录失败，无法测试API。');
  }
});

loginReq.on('error', (e) => {
  console.error('❌ 登录请求错误:', e);
});

// 发送登录数据
loginReq.write(loginData);
loginReq.end();
