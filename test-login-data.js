const http = require('http');

// 辅助函数：发送HTTP请求
function sendRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ status: res.statusCode, headers: res.headers, body: data });
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

async function testLoginAndData() {
    try {
        console.log('=== 开始测试登录和数据获取功能 ===\n');
        
        // 创建一个保持会话的cookie jar
        const cookies = new Map();
        
        // 辅助函数：处理cookie
        function handleCookies(headers) {
            const setCookieHeaders = headers['set-cookie'];
            if (setCookieHeaders) {
                setCookieHeaders.forEach(cookieHeader => {
                    const cookieStr = cookieHeader.split(';')[0];
                    const [name, value] = cookieStr.split('=');
                    cookies.set(name, value);
                    console.log(`已保存cookie: ${name}=${value}`);
                });
            }
        }
        
        // 辅助函数：获取当前的cookie字符串
        function getCookiesString() {
            return Array.from(cookies.entries())
                .map(([name, value]) => `${name}=${value}`)
                .join('; ');
        }
        
        // 1. 测试登录
        console.log('1. 测试登录...');
        const loginOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        
        const loginPostData = JSON.stringify({
            username: 'HFLXJ',
            password: 'LXJ#2025ah'
        });
        
        const loginResult = await sendRequest(loginOptions, loginPostData);
        console.log(`   登录响应状态: ${loginResult.status}`);
        handleCookies(loginResult.headers);
        
        let loginBody;
        try {
            loginBody = JSON.parse(loginResult.body);
            console.log(`   登录响应结果: ${JSON.stringify(loginBody, null, 2)}`);
        } catch (e) {
            console.log(`   登录响应结果(非JSON): ${loginResult.body}`);
        }
        
        if (!loginBody || !loginBody.success) {
            console.log('   登录失败，测试终止');
            return;
        }
        
        console.log('   登录成功！\n');
        
        // 2. 测试获取数据
        console.log('2. 测试获取数据...');
        const dataOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/combined-codes?page=1&limit=20',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cookie': getCookiesString()
            }
        };
        
        const dataResult = await sendRequest(dataOptions);
        console.log(`   数据响应状态: ${dataResult.status}`);
        
        if (dataResult.status === 401) {
            console.log('   未授权访问（401），可能是cookie问题');
            return;
        }
        
        let dataBody;
        try {
            dataBody = JSON.parse(dataResult.body);
            console.log(`   数据响应结果: ${JSON.stringify(dataBody, null, 2)}`);
        } catch (e) {
            console.log(`   数据响应结果(非JSON): ${dataResult.body}`);
        }
        
        if (dataBody && dataBody.success) {
            console.log(`\n   数据获取成功！共 ${dataBody.total || 0} 条数据`);
            if (dataBody.codes && dataBody.codes.length > 0) {
                console.log(`   第1页数据: ${dataBody.codes.length} 条`);
                console.log('   示例数据:', JSON.stringify(dataBody.codes[0], null, 2));
            } else {
                console.log('   当前没有数据');
            }
        } else if (dataBody) {
            console.log('   数据获取失败:', dataBody.message);
        } else {
            console.log('   无法解析数据响应');
        }
        
        // 3. 测试统计数据
        console.log('\n3. 测试获取统计数据...');
        const statsOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/statistics',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cookie': getCookiesString()
            }
        };
        
        const statsResult = await sendRequest(statsOptions);
        console.log(`   统计数据响应状态: ${statsResult.status}`);
        
        let statsBody;
        try {
            statsBody = JSON.parse(statsResult.body);
            console.log(`   统计数据响应结果: ${JSON.stringify(statsBody, null, 2)}`);
        } catch (e) {
            console.log(`   统计数据响应结果(非JSON): ${statsResult.body}`);
        }
        
        console.log('\n=== 测试完成 ===');
        
    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
        console.error(error.stack);
    }
}

testLoginAndData();
