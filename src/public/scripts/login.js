document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 清除之前的错误信息
        loginError.textContent = '';
        loginError.classList.remove('show');
        
        // 获取输入值
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // 简单的前端验证
        if (!username || !password) {
            loginError.textContent = '请输入用户名和密码';
            loginError.classList.add('show');
            return;
        }
        
        // 禁用登录按钮并显示加载状态
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
        
        try {
            // 发送登录请求
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 登录成功，跳转到管理页面
                window.location.href = '/admin';
            } else {
                // 登录失败，显示错误信息
                loginError.textContent = result.message || '登录失败，请检查用户名和密码';
                loginError.classList.add('show');
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            loginError.textContent = '登录请求失败，请稍后重试';
            loginError.classList.add('show');
        } finally {
            // 恢复登录按钮状态
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登录';
        }
    });
});