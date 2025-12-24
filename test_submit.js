const fs = require('fs');
const http = require('http');

// 读取500个兑换码
const codes = JSON.parse(fs.readFileSync('./test_codes.json', 'utf8'));

// 北京地址数据
const beijingAddress = {
  province: "北京市",
  city: "北京市",
  district: "朝阳区",
  address: "建国路88号"
};

// 发送HTTP请求的函数
function sendRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 验证兑换码并获取codeId
async function verifyCode(code) {
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/verify-code/${code}`,
      method: 'GET'
    };

    const response = await sendRequest(options);
    if (response.statusCode === 200) {
      const result = JSON.parse(response.data);
      if (result.success) {
        return result.data.id;
      }
    }
    return null;
  } catch (error) {
    console.error(`验证兑换码 ${code} 失败:`, error.message);
    return null;
  }
}

// 提交收货信息
async function submitShipping(codeId, index) {
  try {
    const postData = JSON.stringify({
      codeId: codeId,
      name: `测试用户${index}`,
      phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      company: `测试公司${index}`,
      province: beijingAddress.province,
      city: beijingAddress.city,
      district: beijingAddress.district,
      address: beijingAddress.address,
      fullAddress: `${beijingAddress.province}${beijingAddress.city}${beijingAddress.district}${beijingAddress.address}`
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/submit-shipping',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const response = await sendRequest(options, postData);
    if (response.statusCode === 200) {
      const result = JSON.parse(response.data);
      return result.success;
    }
    return false;
  } catch (error) {
    console.error(`提交收货信息失败 (codeId: ${codeId}):`, error.message);
    return false;
  }
}

// 主函数
async function main() {
  console.log('开始批量提交测试...');
  console.log(`共 ${codes.length} 个兑换码需要处理`);
  
  let successCount = 0;
  let failureCount = 0;

  // 逐个处理兑换码
  for (let i = 0; i < codes.length; i++) {
    const { id, code } = codes[i];
    console.log(`\n处理第 ${i + 1}/${codes.length} 个兑换码: ${code}`);
    
    // 由于我们已经有了id，可以直接使用，不需要再次验证
    // const codeId = await verifyCode(code);
    const codeId = id;
    
    if (codeId) {
      const success = await submitShipping(codeId, i + 1);
      if (success) {
        console.log(`✓ 提交成功`);
        successCount++;
      } else {
        console.log(`✗ 提交失败`);
        failureCount++;
      }
    } else {
      console.log(`✗ 验证失败`);
      failureCount++;
    }

    // 每处理10个请求，休息500毫秒，避免服务器压力过大
    if ((i + 1) % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n\n测试完成!`);
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${failureCount}`);
  console.log(`总处理数: ${codes.length}`);
}

// 运行主函数
main();
