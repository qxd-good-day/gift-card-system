// H5页面主逻辑
class GiftRedemption {
    constructor() {
        this.codeId = null;
        this.addressData = null;
        this.init();
    }

    init() {
        // 从URL获取兑换码
        this.getCodeFromUrl();
        
        // 绑定事件
        this.bindEvents();
        
        // 页面加载时初始化验证按钮状态
        this.updateVerifyButtonState();
        
        // 页面加载完成后显示兑换码输入页（包含礼品展示部分）
        this.showSection('codeVerification');
    }

    // 加载地址数据
    async loadAddressData() {
        try {
            const response = await fetch('/data/address.json');
            const data = await response.json();
            this.addressData = data; // 读取新的数据结构
            this.renderProvinces();
        } catch (error) {
            console.error('加载地址数据失败:', error);
        }
    }

    // 渲染省份选择框
    renderProvinces() {
        const provinceSelect = document.getElementById('province');
        provinceSelect.innerHTML = '<option value="">请选择省份</option>';
        
        Object.keys(this.addressData).forEach(province => {
            const option = document.createElement('option');
            option.value = province; // 使用名称作为值
            option.textContent = province;
            provinceSelect.appendChild(option);
        });
    }

    // 渲染城市选择框
    renderCities(provinceName) {
        const citySelect = document.getElementById('city');
        const districtSelect = document.getElementById('district');
        
        // 清空城市和区县选择框
        citySelect.innerHTML = '<option value="">请选择城市</option>';
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        // 如果选择了省份，则启用城市选择框
        if (provinceName && this.addressData[provinceName]) {
            citySelect.disabled = false;
            
            Object.keys(this.addressData[provinceName]).forEach(city => {
                const option = document.createElement('option');
                option.value = city; // 使用名称作为值
                option.textContent = city;
                citySelect.appendChild(option);
            });
        } else {
            // 如果没有选择省份，则禁用城市和区县选择框
            citySelect.disabled = true;
            districtSelect.disabled = true;
        }
    }

    // 渲染区县选择框
    renderDistricts(provinceName, cityName) {
        const districtSelect = document.getElementById('district');
        
        // 清空区县选择框
        districtSelect.innerHTML = '<option value="">请选择区县</option>';
        
        // 如果选择了城市，则启用区县选择框
        if (cityName && this.addressData[provinceName] && this.addressData[provinceName][cityName]) {
            districtSelect.disabled = false;
            
            this.addressData[provinceName][cityName].forEach(district => {
                const option = document.createElement('option');
                option.value = district; // 使用区县名称作为值
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        } else {
            // 如果没有选择城市，则禁用区县选择框
            districtSelect.disabled = true;
        }
    }

    // 从URL参数中获取兑换码
    getCodeFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            document.getElementById('redemptionCode').value = code;
        }
    }

    // 绑定事件监听器
    bindEvents() {
        // 验证兑换码按钮
        document.getElementById('verifyBtn').addEventListener('click', () => {
            this.verifyCode();
        });

        // 兑换码输入框回车事件
        document.getElementById('redemptionCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.verifyCode();
            }
        });

        // 兑换码输入框实时验证和错误提示隐藏
        document.getElementById('redemptionCode').addEventListener('input', () => {
            this.updateVerifyButtonState();
            // 隐藏错误提示
            const errorElement = document.getElementById('codeError');
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        });

        // 初始化按钮状态
        this.updateVerifyButtonState();

        // 表单输入框事件 - 在用户输入时隐藏错误提示
        const formInputs = ['company', 'name', 'phone', 'address'];
        formInputs.forEach(inputId => {
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.addEventListener('input', () => {
                    const errorElement = document.getElementById('formError');
                    errorElement.textContent = '';
                    errorElement.style.display = 'none';
                });
            }
        });

        // 省市区选择事件
        document.getElementById('province').addEventListener('change', (e) => {
            this.renderCities(e.target.value);
        });

        document.getElementById('city').addEventListener('change', (e) => {
            const provinceCode = document.getElementById('province').value;
            this.renderDistricts(provinceCode, e.target.value);
        });

        // 提交按钮
        document.getElementById('submitBtn').addEventListener('click', () => {
            this.submitForm();
        });

        // 返回按钮
        document.getElementById('backBtn').addEventListener('click', () => {
            // 清空表单数据
            this.clearFormData();
            this.showSection('codeVerification');
        });
    }

    // 更新验证按钮状态 - 只要有输入就点亮按钮，无输入则置灰
    updateVerifyButtonState() {
        const verifyBtn = document.getElementById('verifyBtn');
        const redemptionCode = document.getElementById('redemptionCode').value.trim();
        
        // 只要有输入就启用按钮，没有输入就禁用按钮
        verifyBtn.disabled = !redemptionCode;
    }

    // 验证兑换码
    async verifyCode() {
        const redemptionCode = document.getElementById('redemptionCode').value.trim();
        const errorElement = document.getElementById('codeError');
        const verifyBtn = document.getElementById('verifyBtn');
        
        // 清除之前的错误提示
        errorElement.textContent = '';
        errorElement.style.display = 'none';
        
        // 检查兑换码是否为空
        if (!redemptionCode) {
            errorElement.textContent = '请输入兑换码';
            errorElement.style.display = 'block';
            return;
        }
        
        // 更严格的兑换码格式验证
        const validCode = redemptionCode.toUpperCase(); // 统一转换为大写
        
        // 验证长度为10位
        if (validCode.length !== 10) {
            errorElement.textContent = '兑换码长度不正确';
            errorElement.style.display = 'block';
            return;
        }
        
        // 验证字符是否在允许的字符集中（排除相似字符0和O、1和I）
        const allowedCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const charPattern = new RegExp(`^[${allowedCharacters}]+$`);
        
        if (!charPattern.test(validCode)) {
            errorElement.textContent = '兑换码包含无效字符';
            errorElement.style.display = 'block';
            return;
        }
        
        // 添加加载状态
        verifyBtn.classList.add('loading');
        verifyBtn.textContent = '验证中';
        
        try {
            const response = await fetch(`/api/verify-code/${encodeURIComponent(validCode)}`);
            const data = await response.json();
            
            if (data.success) {
                this.codeId = data.codeId;
                
                // 加载地址数据
                await this.loadAddressData();
                
                // 清空表单数据
                this.clearFormData();
                
                this.showSection('shippingForm');
            } else {
                errorElement.textContent = data.message || '兑换码无效，请重新输入';
                errorElement.style.display = 'block';
            }
        } catch (error) {
            errorElement.textContent = '验证失败，请检查网络连接后重试';
            errorElement.style.display = 'block';
            console.error('验证兑换码失败:', error);
        } finally {
            // 移除加载状态
            verifyBtn.classList.remove('loading');
            verifyBtn.textContent = '立刻兑换';
        }
    }

    // 提交表单
    async submitForm() {
        const formData = this.collectFormData();
        const errorElement = document.getElementById('formError');
        const submitBtn = document.getElementById('submitBtn');
        
        // 清除之前的错误提示
        errorElement.textContent = '';
        errorElement.style.display = 'none';
        
        // 表单验证
        if (!this.validateForm(formData)) {
            errorElement.textContent = '请填写所有必填项并确保手机号格式正确';
            errorElement.style.display = 'block';
            return;
        }
        
        // 添加加载状态并禁用按钮
        submitBtn.classList.add('loading');
        submitBtn.textContent = '提交中';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/submit-shipping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    codeId: this.codeId,
                    ...formData
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 显示成功消息
                this.showSuccessMessage();
                
                // 1秒后跳转到成功页面（缩短延迟时间）
                setTimeout(() => {
                    this.showSection('successMessage');
                }, 1000);
            } else {
                errorElement.textContent = data.message || '提交失败，请稍后重试';
                errorElement.style.display = 'block';
                
                // 恢复按钮状态
                submitBtn.classList.remove('loading');
                submitBtn.textContent = '提交';
                submitBtn.disabled = false;
            }
        } catch (error) {
            errorElement.textContent = '网络错误，请检查连接后重试';
            errorElement.style.display = 'block';
            console.error('提交表单失败:', error);
            
            // 恢复按钮状态
            submitBtn.classList.remove('loading');
            submitBtn.textContent = '提交';
            submitBtn.disabled = false;
        } finally {
            // 即使在成功的情况下也要恢复按钮状态
            // 因为用户可能会刷新页面或使用浏览器导航返回
            setTimeout(() => {
                submitBtn.classList.remove('loading');
                submitBtn.textContent = '提交';
                submitBtn.disabled = false;
            }, 1000);
        }
    }

    // 收集表单数据
    collectFormData() {
        const province = document.getElementById('province').value;
        const city = document.getElementById('city').value;
        const district = document.getElementById('district').value;
        const address = document.getElementById('address').value.trim();
        
        // 构建完整地址
        const fullAddress = [province, city, district, address].filter(Boolean).join(' ');
        
        return {
            company: document.getElementById('company').value.trim(),
            name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            province: province,
            city: city,
            district: district,
            address: address,
            fullAddress: fullAddress
        };
    }

    // 验证表单数据
    validateForm(formData) {
        if (!formData.name || !formData.phone || !formData.province || !formData.city || !formData.address) {
            return false;
        }
        
        // 验证手机号格式
        return this.validatePhone(formData.phone);
    }

    // 验证手机号格式
    validatePhone(phone) {
        // 中国大陆手机号格式验证（11位数字，以1开头）
        const phonePattern = /^1[3-9]\d{9}$/;
        return phonePattern.test(phone);
    }

    // 清空表单数据
    clearFormData() {
        document.getElementById('company').value = '';
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('province').value = '';
        document.getElementById('city').value = '';
        document.getElementById('district').value = '';
        document.getElementById('address').value = '';
        
        // 禁用城市和区县选择框
        document.getElementById('city').disabled = true;
        document.getElementById('district').disabled = true;
    }

    // 显示成功消息
    showSuccessMessage() {
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = '提交成功！即将跳转到成功页面...';
        document.body.appendChild(successMessage);
        
        // 3秒后移除成功消息
        setTimeout(() => {
            if (successMessage.parentNode) {
                successMessage.parentNode.removeChild(successMessage);
            }
        }, 3000);
    }

    // 显示指定的页面部分
    showSection(sectionId) {
        // 隐藏所有部分
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
        
        // 显示指定的部分
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        // 控制礼品展示部分的显示和隐藏
        const giftSection = document.querySelector('.gift-section');
        if (giftSection) {
            // 在兑换码输入页显示礼品展示部分，在其他页面隐藏
            if (sectionId === 'codeVerification') {
                giftSection.style.display = 'block';
            } else {
                giftSection.style.display = 'none';
            }
        }
        
        // 控制返回按钮的显示和隐藏
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            // 在兑换码输入页（第一个页面）隐藏返回按钮，其他页面显示
            if (sectionId === 'codeVerification') {
                backBtn.style.display = 'none';
            } else {
                backBtn.style.display = 'flex';
            }
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new GiftRedemption();
});