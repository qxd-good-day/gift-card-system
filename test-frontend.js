// 测试前端验证提示逻辑
const http = require('http');

// 测试1: 访问H5页面，检查是否包含错误提示元素
console.log('测试1: 检查H5页面是否包含错误提示元素');
http.get('http://localhost:3000/h5', (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        // 检查是否包含codeError元素
        if (data.includes('id="codeError"')) {
            console.log('✓ 页面包含codeError元素');
        } else {
            console.log('✗ 页面不包含codeError元素');
        }
        
        // 检查是否包含formError元素
        if (data.includes('id="formError"')) {
            console.log('✓ 页面包含formError元素');
        } else {
            console.log('✗ 页面不包含formError元素');
        }
        
        // 检查是否包含error-message类的样式
        if (data.includes('error-message')) {
            console.log('✓ 页面包含error-message类');
        } else {
            console.log('✗ 页面不包含error-message类');
        }
        
        console.log('\n测试2: 检查JavaScript文件是否包含验证提示逻辑');
        checkJavaScriptFile();
    });
    
    res.on('error', (err) => {
        console.error('✗ 访问H5页面失败:', err.message);
    });
});

// 检查JavaScript文件是否包含验证提示逻辑
function checkJavaScriptFile() {
    http.get('http://localhost:3000/scripts/h5.js', (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            // 检查是否包含verifyCode函数
            if (data.includes('async verifyCode()')) {
                console.log('✓ JavaScript文件包含verifyCode函数');
            } else {
                console.log('✗ JavaScript文件不包含verifyCode函数');
            }
            
            // 检查是否包含错误提示显示逻辑
            if (data.includes('errorElement.classList.add(\'show\')')) {
                console.log('✓ JavaScript文件包含错误提示显示逻辑');
            } else {
                console.log('✗ JavaScript文件不包含错误提示显示逻辑');
            }
            
            // 检查是否包含错误提示隐藏逻辑
            if (data.includes('errorElement.classList.remove(\'show\')')) {
                console.log('✓ JavaScript文件包含错误提示隐藏逻辑');
            } else {
                console.log('✗ JavaScript文件不包含错误提示隐藏逻辑');
            }
            
            console.log('\n测试3: 检查CSS文件是否包含error-message样式');
            checkCSSFile();
        });
        
        res.on('error', (err) => {
            console.error('✗ 访问JavaScript文件失败:', err.message);
        });
    });
}

// 检查CSS文件是否包含error-message样式
function checkCSSFile() {
    http.get('http://localhost:3000/styles/h5.css', (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            // 检查是否包含error-message基础样式
            if (data.includes('.error-message {')) {
                console.log('✓ CSS文件包含error-message基础样式');
            } else {
                console.log('✗ CSS文件不包含error-message基础样式');
            }
            
            // 检查是否包含error-message.show样式
            if (data.includes('.error-message.show {')) {
                console.log('✓ CSS文件包含error-message.show样式');
            } else {
                console.log('✗ CSS文件不包含error-message.show样式');
            }
            
            // 检查error-message.show样式是否设置了display: block
            if (data.includes('.error-message.show {') && data.includes('display: block;')) {
                console.log('✓ CSS文件包含正确的error-message.show样式（display: block）');
            } else {
                console.log('✗ CSS文件的error-message.show样式不正确');
            }
            
            console.log('\n所有测试完成！');
        });
        
        res.on('error', (err) => {
            console.error('✗ 访问CSS文件失败:', err.message);
        });
    });
}
