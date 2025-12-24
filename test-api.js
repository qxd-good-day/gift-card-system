const fetch = require('node-fetch');

async function testApi() {
    try {
        const response = await fetch('http://localhost:3001/api/combined-codes?page=1&limit=20', {
            headers: {
                'Accept': 'application/json'
            },
            redirect: 'manual' // 不自动跟随重定向
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // 如果不是重定向，尝试解析JSON
        if (response.status !== 302) {
            const result = await response.json();
            console.log('Response body:', JSON.stringify(result, null, 2));
        } else {
            console.log('Redirected to:', response.headers.get('location'));
        }
    } catch (error) {
        console.error('Error calling API:', error);
    }
}

testApi();