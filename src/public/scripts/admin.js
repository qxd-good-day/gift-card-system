// 管理后台主逻辑
class AdminPanel {
    constructor() {
        this.combinedCodes = []; // 合并后的兑换码数据
        this.codes = []; // 所有兑换码数据
        this.records = []; // 兑换记录数据
        this.stats = {
            total: 0,
            redeemed: 0,
            shipped: 0
        };
        // 合并数据分页相关
        this.currentCombinedPage = 1;
        this.combinedPerPage = 20;
        this.totalCombinedPages = 1;
        this.totalCombinedCodes = 0; // 总数量
        // 所有兑换码分页相关
        this.currentCodesPage = 1;
        this.codesPerPage = 20;
        this.totalCodesPages = 1;
        // 兑换记录分页相关
        this.currentRecordsPage = 1;
        this.recordsPerPage = 20;
        this.totalRecordsPages = 1;
        // 搜索相关
        this.currentSearchKeyword = ''; // 当前搜索关键字（为向后兼容保留）
        this.currentSearchParams = {}; // 当前多字段搜索参数
        // 自动刷新相关
        this.autoRefreshTimer = null;
        // 加载状态标志
        this.isLoading = false;
        this.isCodesLoading = false;
    }

    init() {
        // 绑定事件
        this.bindEvents();
        
        // 页面加载时获取数据（直接刷新数据）
        this.refreshData();
        
        // 启动自动刷新，每5秒刷新一次（已关闭）
        // this.startAutoRefresh();
    }
    
    // 启动自动刷新
    startAutoRefresh() {
        // 清除之前的定时器
        this.stopAutoRefresh();
        
        // 设置新的定时器，每5秒刷新一次
        this.autoRefreshTimer = setInterval(() => {
            console.log('自动刷新数据...');
            this.refreshData();
        }, 5000); // 5秒刷新一次
    }
    
    // 停止自动刷新
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }

    // 绑定事件监听器
    bindEvents() {
        // 导出数据按钮
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // 刷新数据按钮
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // 生成兑换码按钮
        document.getElementById('generateCodesBtn').addEventListener('click', () => {
            this.showGenerateCodesModal();
        });
        
        // 下载兑换码按钮
        document.getElementById('downloadCodesBtn').addEventListener('click', () => {
            this.downloadCodes();
        });

        // 生成二维码模态框事件
        const generateModal = document.getElementById('generateCodesModal');
        const generateCloseBtn = generateModal.querySelector('.close-btn');
        
        generateCloseBtn.addEventListener('click', () => {
            this.closeGenerateCodesModal();
        });

        document.getElementById('cancelGenerateBtn').addEventListener('click', () => {
            this.closeGenerateCodesModal();
        });

        document.getElementById('confirmGenerateBtn').addEventListener('click', (event) => {
            event.preventDefault();
            debugger; // 在这里添加断点
            this.generateCodes();
        });

        // 点击生成二维码模态框外部关闭
        window.addEventListener('click', (event) => {
            if (event.target === generateModal) {
                this.closeGenerateCodesModal();
            }
        });

        // 数据明细模态框事件
        const detailModal = document.getElementById('detailModal');
        const detailCloseBtn = detailModal.querySelector('.close-btn');
        
        detailCloseBtn.addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        // 点击数据明细模态框外部关闭
        window.addEventListener('click', (event) => {
            if (event.target === detailModal) {
                this.closeModal();
            }
        });
        
        // 搜索框事件
        const searchInput = document.getElementById('codeSearchInput');
        const searchBtn = document.getElementById('searchBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchCodes();
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetSearch();
            });
        }
        
        // 为所有输入框添加回车键搜索功能
        const phoneInput = document.getElementById('phoneSearch');
        const codeInput = document.getElementById('codeSearch');
        const companyInput = document.getElementById('companySearch');
        
        const handleEnterKey = (e) => {
            if (e.key === 'Enter') {
                this.searchCodes();
            }
        };
        
        if (phoneInput) phoneInput.addEventListener('keypress', handleEnterKey);
        if (codeInput) codeInput.addEventListener('keypress', handleEnterKey);
        if (companyInput) companyInput.addEventListener('keypress', handleEnterKey);
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchCodes();
                }
            });
        }
    }

    // 刷新所有数据
    async refreshData() {
        // 调用resetSearch方法来清空所有搜索条件并重置数据
        await this.resetSearch();
    }
    
    // 搜索兑换码（多字段查询）
    searchCodes() {
        // 获取表单数据
        const phoneInput = document.getElementById('phoneSearch');
        const codeInput = document.getElementById('codeSearch');
        const redeemStatusSelect = document.getElementById('redemptionStatusSearch');
        const deliveryStatusSelect = document.getElementById('shippingStatusSearch');
        const companyInput = document.getElementById('companySearch');
        
        // 构建查询参数对象
        const searchParams = {
            phone: phoneInput ? phoneInput.value.trim() : '',
            code: codeInput ? codeInput.value.trim() : '',
            redeemStatus: redeemStatusSelect ? redeemStatusSelect.value : '',
            deliveryStatus: deliveryStatusSelect ? deliveryStatusSelect.value : '',
            company: companyInput ? companyInput.value.trim() : ''
        };
        
        this.currentSearchParams = searchParams;
        this.fetchCombinedCodes(); // 搜索结果从第一页开始
    }

    // 重置搜索表单
    async resetSearch() {
        // 清空所有输入框和下拉框
        const phoneInput = document.getElementById('phoneSearch');
        const codeInput = document.getElementById('codeSearch');
        const redeemStatusSelect = document.getElementById('redemptionStatusSearch');
        const deliveryStatusSelect = document.getElementById('shippingStatusSearch');
        const companyInput = document.getElementById('companySearch');
        
        if (phoneInput) phoneInput.value = '';
        if (codeInput) codeInput.value = '';
        if (redeemStatusSelect) redeemStatusSelect.value = '';
        if (deliveryStatusSelect) deliveryStatusSelect.value = '';
        if (companyInput) companyInput.value = '';
        
        // 重置搜索参数并重新获取数据
        this.currentSearchParams = {};
        await this.fetchCombinedCodes(); // 等待数据加载完成
    }

    // 获取合并后的兑换码和兑换记录数据（带分页和多字段搜索）
    async fetchCombinedCodes(page = 1) {
        // 检查是否正在加载，如果是则返回
        if (this.isLoading) {
            return;
        }
        
        this.currentCombinedPage = page;
        const loading = document.getElementById('combinedLoading');
        const noData = document.getElementById('combinedNoData');
        const tableBody = document.getElementById('combinedCodesTableBody');

        // 设置加载状态为true
        this.isLoading = true;
        
        // 显示加载状态
        loading.classList.add('active');
        noData.style.display = 'none';
        tableBody.innerHTML = '';

        try {
            // 构建查询参数（包含多字段搜索条件）
            let queryParams = `page=${page}&limit=${this.combinedPerPage}`;
            
            // 添加多字段搜索参数
            if (this.currentSearchParams) {
                Object.entries(this.currentSearchParams).forEach(([key, value]) => {
                    if (value) {
                        queryParams += `&${key}=${encodeURIComponent(value)}`;
                    }
                });
            }
            
            // 调用分页API
            const response = await fetch(`/api/combined-codes?${queryParams}`);
            const result = await response.json();

            // 检查响应状态
            if (!response.ok) {
                if (response.status === 401) {
                    alert('登录已过期，请重新登录');
                    window.location.href = '/login';
                    return;
                }
                throw new Error(result.message || '获取数据失败');
            }

            // 检查响应数据
            if (result.success) {
                this.combinedCodes = result.codes || [];
                this.totalCombinedPages = result.totalPages || 0;
                this.totalCombinedCodes = result.total || 0; // 新增：保存总数量
            } else {
                throw new Error(result.message || '获取数据失败');
            }
            
            // 渲染表格
            this.renderCombinedTable();
            // 更新统计数据
            this.updateStats();
        } catch (error) {
            console.error('数据刷新失败:', error);
            alert('数据刷新失败，请稍后重试');
        } finally {
            // 隐藏加载状态
            loading.classList.remove('active');
            // 设置加载状态为false
            this.isLoading = false;
        }
    }

    // 渲染合并后的兑换码列表表格
    renderCombinedTable() {
        const loading = document.getElementById('combinedLoading');
        const tableBody = document.getElementById('combinedCodesTableBody');
        const noData = document.getElementById('combinedNoData');

        // 确保加载状态被正确隐藏
        if (loading) {
            loading.classList.remove('active');
        }

        if (this.combinedCodes.length === 0) {
            if (noData) {
                noData.style.display = 'block';
            }
            if (tableBody) {
                tableBody.innerHTML = '';
            }
            return;
        }

        if (noData) {
            noData.style.display = 'none';
        }

        if (tableBody) {
            tableBody.innerHTML = this.combinedCodes.map((code, index) => {
                // 序号计算：(当前页 - 1) * 每页数量 + 索引 + 1
                const serialNumber = (this.currentCombinedPage - 1) * this.combinedPerPage + index + 1;
                
                // 计算有效期信息
                let validity = '永久有效';
                if (code.valid_from || code.valid_to) {
                    const from = code.valid_from ? this.formatDate(code.valid_from) : '无';
                    const to = code.valid_to ? this.formatDate(code.valid_to) : '无';
                    validity = `${from} 至 ${to}`;
                }
                
                /* let actionButton = '-';
                if (code.is_used) {
                    actionButton = `
                        <button class="action-btn action-btn-primary" onclick="adminPanel.markAsShipped(${code.record_id})" ${code.is_shipped ? 'disabled' : ''}>
                            ${code.is_shipped ? '已发货' : '标记发货'}
                        </button>
                    `;
                } */
                
                return `
                    <tr>
                        <td>${serialNumber}</td>
                        <td>${code.code}</td>
                        <td><span class="status-badge ${code.is_used ? 'status-used' : 'status-unused'}">${code.is_used ? '已兑换' : '未兑换'}</span></td>
                        <td>${code.redemption_time ? this.formatDate(code.redemption_time) : '-'}</td>
                        <td>${code.name || '-'}</td>
                        <td>${code.phone || '-'}</td>
                        <td>${this.formatAddress(code) || '-'}</td>
                        <td>${code.company || '-'}</td>
                        <td>${validity}</td>

                    </tr>
                `;
            }).join('');
        }
        
        // 渲染分页控件
        this.renderCombinedPagination();
    }
    
    // 渲染合并数据的分页控件
    renderCombinedPagination() {
        // 使用更普遍支持的方式获取兑换码列表的卡片元素
        const combinedTable = document.getElementById('combinedCodesTable');
        let combinedCard = null;
        
        if (combinedTable) {
            let parent = combinedTable.parentNode;
            while (parent && !parent.classList.contains('card')) {
                parent = parent.parentNode;
            }
            combinedCard = parent;
        }
        
        // 检查元素是否存在
        if (!combinedCard) {
            console.log('未找到兑换码列表卡片元素');
            return;
        }
        
        const combinedCardBody = combinedCard.querySelector('.card-body');
        
        if (!combinedCardBody) {
            console.log('未找到卡片内容区域');
            return;
        }
        
        // 清空现有分页控件
        const existingPagination = combinedCardBody.querySelector('.pagination');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        // 创建分页容器
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        
        // 添加总数量和每页数量信息
        const paginationInfo = document.createElement('div');
        paginationInfo.className = 'pagination-info';
        paginationInfo.textContent = `共 ${this.totalCombinedCodes} 条数据，每页显示 ${this.combinedPerPage} 条`;
        paginationContainer.appendChild(paginationInfo);
        
        // 如果只有一页，只显示信息不显示分页按钮
        if (this.totalCombinedPages <= 1) {
            // 添加到页面
            combinedCardBody.appendChild(paginationContainer);
            console.log('只有一页数据，仅显示数据信息');
            return;
        }
        
        // 第一页按钮
        const firstButton = document.createElement('button');
        firstButton.className = 'pagination-btn';
        firstButton.innerHTML = '<i class="fas fa-angle-double-left"></i> 第一页';
        firstButton.disabled = this.currentCombinedPage === 1;
        firstButton.addEventListener('click', () => {
            if (this.currentCombinedPage > 1) {
                this.fetchCombinedCodes(1);
            }
        });

        // 上一页按钮
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> 上一页';
        prevButton.disabled = this.currentCombinedPage === 1;
        prevButton.addEventListener('click', () => {
            if (this.currentCombinedPage > 1) {
                this.fetchCombinedCodes(this.currentCombinedPage - 1);
            }
        });
        
        // 页码按钮
        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentCombinedPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalCombinedPages, startPage + maxVisiblePages - 1);
        
        // 调整起始页以确保显示足够的页码
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        
        const pageButtons = pageNumbers.map(page => {
            const button = document.createElement('button');
            button.className = 'pagination-btn' + (page === this.currentCombinedPage ? ' active' : '');
            button.textContent = page;
            button.addEventListener('click', () => {
                this.fetchCombinedCodes(page);
            });
            return button;
        });

        // 最后一页按钮
        const lastButton = document.createElement('button');
        lastButton.className = 'pagination-btn';
        lastButton.innerHTML = '最后一页 <i class="fas fa-angle-double-right"></i>';
        lastButton.disabled = this.currentCombinedPage === this.totalCombinedPages;
        lastButton.addEventListener('click', () => {
            if (this.currentCombinedPage < this.totalCombinedPages) {
                this.fetchCombinedCodes(this.totalCombinedPages);
            }
        });
        
        // 下一页按钮
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn';
        nextButton.innerHTML = '下一页 <i class="fas fa-chevron-right"></i>';
        nextButton.disabled = this.currentCombinedPage === this.totalCombinedPages;
        nextButton.addEventListener('click', () => {
            if (this.currentCombinedPage < this.totalCombinedPages) {
                this.fetchCombinedCodes(this.currentCombinedPage + 1);
            }
        });

        // 指定页跳转功能
        const jumpContainer = document.createElement('div');
        jumpContainer.className = 'pagination-jump';
        jumpContainer.innerHTML = `
            <span>跳转到</span>
            <input type="number" class="pagination-jump-input" min="1" max="${this.totalCombinedPages}" value="${this.currentCombinedPage}">
            <span>页</span>
            <button class="pagination-btn pagination-jump-btn">跳转</button>
        `;
        // 添加跳转按钮事件监听
        const jumpInput = jumpContainer.querySelector('.pagination-jump-input');
        const jumpBtn = jumpContainer.querySelector('.pagination-jump-btn');
        jumpBtn.addEventListener('click', () => {
            const page = parseInt(jumpInput.value);
            if (page && page >= 1 && page <= this.totalCombinedPages) {
                this.fetchCombinedCodes(page);
            } else {
                jumpInput.value = this.currentCombinedPage;
                alert(`请输入1到${this.totalCombinedPages}之间的页码`);
            }
        });
        // 支持回车键跳转
        jumpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                jumpBtn.click();
            }
        });
        
        // 添加到容器
        paginationContainer.appendChild(firstButton);
        paginationContainer.appendChild(prevButton);
        pageButtons.forEach(button => {
            paginationContainer.appendChild(button);
        });
        paginationContainer.appendChild(nextButton);
        paginationContainer.appendChild(lastButton);
        paginationContainer.appendChild(jumpContainer);
        
        // 添加到页面
        combinedCardBody.appendChild(paginationContainer);
        console.log('分页控件已渲染');
    }



    // 更新统计数据
    updateStats() {
        // 调用统计API获取最新数据
        this.fetchStatistics();
    }

    // 获取统计数据
    async fetchStatistics() {
        try {
            const response = await fetch('/api/statistics');
            const result = await response.json();
            
            // 更新统计数据（使用修改后的接口返回格式）
            this.stats.total = result.total_codes;
            this.stats.redeemed = result.redeemed_codes;
            this.stats.shipped = result.shipped_codes;
            
            // 更新统计卡片
            document.getElementById('total').textContent = this.stats.total;
            document.getElementById('redeemed').textContent = this.stats.redeemed;
            // 检查'shipped'元素是否存在（可能已被注释掉）
            const shippedElement = document.getElementById('shipped');
            if (shippedElement) {
                shippedElement.textContent = this.stats.shipped;
            }
        } catch (error) {
            console.error('获取统计数据失败:', error);
        }
    }

    // 导出收货信息
    async exportData() {
        debugger;
        try {
            // 直接跳转到导出API
            window.location.href = '/api/export-data';
        } catch (error) {
            console.error('导出数据失败:', error);
            alert('导出数据失败，请稍后重试');
        }
    }

    // 标记为已发货
    async markAsShipped(codeId) {
        try {
            const response = await fetch(`/api/mark-shipped/${codeId}`, {
                method: 'PUT'
            });
            const result = await response.json();

            if (result.success) {
                // 更新本地数据
                const code = this.combinedCodes.find(c => c.id === codeId);
                if (code) {
                    code.is_shipped = 1;
                    this.renderCombinedTable();
                    this.updateStats();
                    alert('标记成功！');
                }
            } else {
                alert('标记失败：' + result.message);
            }
        } catch (error) {
            console.error('标记发货失败:', error);
            alert('标记发货失败，请稍后重试');
        }
    }

    // 下载兑换码
    async downloadCodes() {
        debugger;
        try {
            // 直接跳转到导出API
            window.location.href = '/api/export-codes';
        } catch (error) {
            console.error('下载兑换码失败:', error);
            alert('下载失败，请稍后重试');
        }
    }

    // 获取所有兑换码和二维码信息（带分页）
    async fetchAllCodes(page = 1) {
        // 检查是否正在加载，如果是则返回
        if (this.isCodesLoading) {
            return;
        }
        
        this.currentCodesPage = page;
        const codesLoading = document.getElementById('codesLoading');
        const codesNoData = document.getElementById('codesNoData');
        const codesTableBody = document.getElementById('codesTableBody');

        // 设置加载状态为true
        this.isCodesLoading = true;
        
        // 显示加载状态
        codesLoading.classList.add('active');
        codesNoData.style.display = 'none';
        codesTableBody.innerHTML = '';

        try {
            // 调用分页API
            const response = await fetch(`/api/all-codes?page=${page}&limit=${this.codesPerPage}`);
            const result = await response.json();

            // 检查响应状态
            if (!response.ok) {
                if (response.status === 401) {
                    alert('登录已过期，请重新登录');
                    window.location.href = '/login';
                    return;
                }
                throw new Error(result.message || '获取数据失败');
            }

            if (result.success) {
                this.codes = result.codes;
                this.totalCodesPages = result.totalPages;
                
                // 渲染兑换码表格
                this.renderCodes(result.codes);
                // 渲染分页控件
                this.renderCodesPagination();
            } else {
                throw new Error(result.message || '获取数据失败');
            }
        } catch (error) {
            console.error('获取兑换码信息失败:', error);
            codesNoData.textContent = '获取数据失败';
            codesNoData.style.display = 'block';
        } finally {
            // 隐藏加载状态
            codesLoading.classList.remove('active');
            // 设置加载状态为false
            this.isCodesLoading = false;
        }
    }

    // 渲染兑换码表格
    renderCodes(codes) {
        const codesTableBody = document.getElementById('codesTableBody');
        const codesNoData = document.getElementById('codesNoData');

        if (!codes || codes.length === 0) {
            codesNoData.style.display = 'block';
            return;
        }

        codesNoData.style.display = 'none';

        codesTableBody.innerHTML = codes.map(code => {
            let validity = '永久有效';
            if (code.valid_from || code.valid_to) {
                const from = code.valid_from ? this.formatDate(code.valid_from) : '无';
                const to = code.valid_to ? this.formatDate(code.valid_to) : '无';
                validity = `${from} 至 ${to}`;
            }
            return `
                <tr>
                    <td>${code.code}</td>
                    <td>
                        ${code.qr_code_path ? `<a href="${code.qr_code_path}" target="_blank" class="qr-link"><i class="fas fa-qrcode"></i> 查看二维码</a>` : '暂无二维码'}
                    </td>
                    <td>${code.is_used ? '<span class="status-badge status-used">已使用</span>' : '<span class="status-badge status-unused">未使用</span>'}</td>
                    <td>${this.formatDateTime(code.created_at)}</td>
                    <td>${validity}</td>
                </tr>
            `;
        }).join('');
    }

    // 显示生成兑换码模态框
    showGenerateCodesModal() {
        const generateModal = document.getElementById('generateCodesModal');
        generateModal.style.display = 'block';
        document.querySelector('.modal-overlay').style.display = 'block';
    }

    // 关闭生成兑换码模态框
    closeGenerateCodesModal() {
        const generateModal = document.getElementById('generateCodesModal');
        generateModal.style.display = 'none';
        document.querySelector('.modal-overlay').style.display = 'none';
        
        // 清空表单
        document.getElementById('codeCount').value = '';
        document.getElementById('codeNote').value = '';
    }

    // 生成兑换码
    async generateCodes() {
        debugger; // 在这里添加断点
        const count = document.getElementById('codeCount').value;
        const codeNote = document.getElementById('codeNote').value;
        const validFrom = document.getElementById('validFrom').value;
        const validTo = document.getElementById('validTo').value;
        const codeLength = 10; // 固定为10位兑换码
        
        // 验证输入
        if (!count || isNaN(count) || parseInt(count) < 1) {
            alert('请输入有效的兑换码数量');
            return;
        }
        
        // 验证有效期（如果设置了的话）
        if (validFrom && validTo && new Date(validFrom) > new Date(validTo)) {
            alert('有效期开始时间不能晚于结束时间');
            return;
        }
        
        const btn = document.getElementById('confirmGenerateBtn');
        
        // 显示加载状态
        btn.disabled = true;
        btn.classList.add('loading');

        try {
            // 创建请求数据对象
            const requestData = {
                count: parseInt(count),
                length: parseInt(codeLength),
                note: codeNote || '',
                validFrom: validFrom,
                validTo: validTo
            };
            
            const response = await fetch('/api/generate-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            // 检查响应状态
            if (!response.ok) {
                // 尝试解析错误响应
                let errorMessage = '生成兑换码失败，请稍后重试';
                try {
                    const errorResult = await response.json();
                    errorMessage = '生成失败：' + (errorResult.message || errorMessage);
                } catch (e) {
                    // 如果无法解析JSON，使用默认错误消息
                }
                alert(errorMessage);
                return;
            }
            
            // 解析成功响应
            const result = await response.json();
            
            if (result.success) {
                alert('兑换码生成成功！');
                this.closeGenerateCodesModal();
                // 立即刷新数据
                // 为刷新数据和统计信息添加独立的错误处理，避免影响兑换码生成成功的提示
                try {
                    await this.refreshData(); // 刷新所有数据，包括重置搜索条件
                    // 直接调用统计接口确保生成的兑换码及时显示在统计数据中
                    console.log('调用refreshData()完成，现在调用fetchStatistics()');
                    await this.fetchStatistics();
                } catch (refreshError) {
                    console.error('数据刷新或统计更新失败:', refreshError);
                    // 不影响用户体验，只在控制台记录错误
                }
            } else {
                alert('生成失败：' + (result.message || '生成兑换码失败，请稍后重试'));
            }
        } catch (error) {
            console.error('生成兑换码失败:', error);
            alert('生成兑换码失败，请稍后重试');
        } finally {
            // 恢复按钮状态
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    }
    
    // 清除所有兑换码
    async clearAllCodes() {
        // 确认用户是否真的要清除所有数据
        if (!confirm('确定要清除所有兑换码和兑换记录吗？此操作不可恢复！')) {
            return;
        }
        
        const btn = document.getElementById('clearAllCodesBtn');
        
        // 显示加载状态
        btn.disabled = true;
        btn.classList.add('loading');

        try {
            const response = await fetch('/api/clear-all-codes', {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('所有兑换码和兑换记录已清除！');
                this.refreshData(); // 刷新所有数据
            } else {
                alert('清除失败：' + result.message);
            }
        } catch (error) {
            console.error('清除数据失败:', error);
            alert('清除数据失败，请稍后重试');
        } finally {
            // 恢复按钮状态
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    }

    // 显示数据明细模态框
    showDetailModal(type) {
        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        let title, records;
        
        if (type === 'used') {
            title = '已使用兑换码明细';
            records = this.records;
        } else if (type === 'shipped') {
            title = '已发货订单明细';
            records = this.records.filter(r => r.is_shipped);
        }
        
        modalTitle.textContent = title;
        
        if (records && records.length > 0) {
            modalContent.innerHTML = `
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>兑换码</th>
                                <th>姓名</th>
                                <th>电话</th>
                                <th>地址</th>
                                <th>兑换时间</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(record => `
                                <tr>
                                    <td>${record.code}</td>
                                    <td>${record.name}</td>
                                    <td>${record.phone}</td>
                                    <td>${this.formatAddress(record)}</td>
                                    <td>${this.formatDateTime(record.created_at)}</td>
                                    <td>${record.is_shipped ? '已发货' : '待发货'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            modalContent.innerHTML = '<p class="no-data-text">暂无数据</p>';
        }
        
        modal.style.display = 'block';
        document.querySelector('.modal-overlay').style.display = 'block';
    }

    // 关闭模态框
    closeModal() {
        const modal = document.getElementById('detailModal');
        modal.style.display = 'none';
        document.querySelector('.modal-overlay').style.display = 'none';
    }

    // 渲染兑换记录分页控件
    renderRecordsPagination() {
        const redemptionCard = document.querySelector('.card:nth-child(2)');
        const redemptionCardBody = redemptionCard.querySelector('.card-body');
        
        // 清空现有分页控件
        const existingPagination = redemptionCardBody.querySelector('.pagination');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        // 如果只有一页，不显示分页控件
        if (this.totalRecordsPages <= 1) {
            return;
        }
        
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        
        // 第一页按钮
        const firstButton = document.createElement('button');
        firstButton.className = 'pagination-btn';
        firstButton.innerHTML = '<i class="fas fa-angle-double-left"></i> 第一页';
        firstButton.disabled = this.currentRecordsPage === 1;
        firstButton.addEventListener('click', () => {
            if (this.currentRecordsPage > 1) {
                this.fetchRecords(1);
            }
        });

        // 上一页按钮
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> 上一页';
        prevButton.disabled = this.currentRecordsPage === 1;
        prevButton.addEventListener('click', () => {
            if (this.currentRecordsPage > 1) {
                this.fetchRecords(this.currentRecordsPage - 1);
            }
        });
        
        // 页码按钮
        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentRecordsPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalRecordsPages, startPage + maxVisiblePages - 1);
        
        // 调整起始页以确保显示足够的页码
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        
        const pageButtons = pageNumbers.map(page => {
            const button = document.createElement('button');
            button.className = 'pagination-btn' + (page === this.currentRecordsPage ? ' active' : '');
            button.textContent = page;
            button.addEventListener('click', () => {
                this.fetchRecords(page);
            });
            return button;
        });

        // 最后一页按钮
        const lastButton = document.createElement('button');
        lastButton.className = 'pagination-btn';
        lastButton.innerHTML = '最后一页 <i class="fas fa-angle-double-right"></i>';
        lastButton.disabled = this.currentRecordsPage === this.totalRecordsPages;
        lastButton.addEventListener('click', () => {
            if (this.currentRecordsPage < this.totalRecordsPages) {
                this.fetchRecords(this.totalRecordsPages);
            }
        });
        
        // 下一页按钮
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn';
        nextButton.innerHTML = '下一页 <i class="fas fa-chevron-right"></i>';
        nextButton.disabled = this.currentRecordsPage === this.totalRecordsPages;
        nextButton.addEventListener('click', () => {
            if (this.currentRecordsPage < this.totalRecordsPages) {
                this.fetchRecords(this.currentRecordsPage + 1);
            }
        });

        // 指定页跳转功能
        const jumpContainer = document.createElement('div');
        jumpContainer.className = 'pagination-jump';
        jumpContainer.innerHTML = `
            <span>跳转到</span>
            <input type="number" class="pagination-jump-input" min="1" max="${this.totalRecordsPages}" value="${this.currentRecordsPage}">
            <span>页</span>
            <button class="pagination-btn pagination-jump-btn">跳转</button>
        `;
        // 添加跳转按钮事件监听
        const jumpInput = jumpContainer.querySelector('.pagination-jump-input');
        const jumpBtn = jumpContainer.querySelector('.pagination-jump-btn');
        jumpBtn.addEventListener('click', () => {
            const page = parseInt(jumpInput.value);
            if (page && page >= 1 && page <= this.totalRecordsPages) {
                this.fetchRecords(page);
            } else {
                jumpInput.value = this.currentRecordsPage;
                alert(`请输入1到${this.totalRecordsPages}之间的页码`);
            }
        });
        // 支持回车键跳转
        jumpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                jumpBtn.click();
            }
        });

        // 添加到容器
        paginationContainer.appendChild(firstButton);
        paginationContainer.appendChild(prevButton);
        pageButtons.forEach(button => {
            paginationContainer.appendChild(button);
        });
        paginationContainer.appendChild(nextButton);
        paginationContainer.appendChild(lastButton);
        paginationContainer.appendChild(jumpContainer);
        
        // 添加到页面
        redemptionCardBody.appendChild(paginationContainer);
    }

    // 渲染兑换码分页控件
    renderCodesPagination() {
        const codesCard = document.querySelector('.card:nth-child(1)');
        const codesCardBody = codesCard.querySelector('.card-body');
        
        // 清空现有分页控件
        const existingPagination = codesCardBody.querySelector('.pagination');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        // 如果只有一页，不显示分页控件
        if (this.totalCodesPages <= 1) {
            return;
        }
        
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        
        // 第一页按钮
        const firstButton = document.createElement('button');
        firstButton.className = 'pagination-btn';
        firstButton.innerHTML = '<i class="fas fa-angle-double-left"></i> 第一页';
        firstButton.disabled = this.currentCodesPage === 1;
        firstButton.addEventListener('click', () => {
            this.fetchAllCodes(1);
        });
        
        // 上一页按钮
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-btn';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> 上一页';
        prevButton.disabled = this.currentCodesPage === 1;
        prevButton.addEventListener('click', () => {
            if (this.currentCodesPage > 1) {
                this.fetchAllCodes(this.currentCodesPage - 1);
            }
        });
        
        // 页码按钮
        const pageNumbers = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentCodesPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalCodesPages, startPage + maxVisiblePages - 1);
        
        // 调整起始页以确保显示足够的页码
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        
        const pageButtons = pageNumbers.map(page => {
            const button = document.createElement('button');
            button.className = 'pagination-btn' + (page === this.currentCodesPage ? ' active' : '');
            button.textContent = page;
            button.addEventListener('click', () => {
                this.fetchAllCodes(page);
            });
            return button;
        });
        
        // 下一页按钮
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-btn';
        nextButton.innerHTML = '下一页 <i class="fas fa-chevron-right"></i>';
        nextButton.disabled = this.currentCodesPage === this.totalCodesPages;
        nextButton.addEventListener('click', () => {
            if (this.currentCodesPage < this.totalCodesPages) {
                this.fetchAllCodes(this.currentCodesPage + 1);
            }
        });
        
        // 最后一页按钮
        const lastButton = document.createElement('button');
        lastButton.className = 'pagination-btn';
        lastButton.innerHTML = '最后一页 <i class="fas fa-angle-double-right"></i>';
        lastButton.disabled = this.currentCodesPage === this.totalCodesPages;
        lastButton.addEventListener('click', () => {
            this.fetchAllCodes(this.totalCodesPages);
        });
        
        // 指定页跳转
        const jumpContainer = document.createElement('div');
        jumpContainer.className = 'pagination-jump';
        jumpContainer.innerHTML = `
            <span>跳转到</span>
            <input type="number" class="pagination-jump-input" min="1" max="${this.totalCodesPages}" value="${this.currentCodesPage}">
            <span>页</span>
            <button class="pagination-btn pagination-jump-btn">跳转</button>
        `;
        
        // 绑定跳转事件
        const jumpInput = jumpContainer.querySelector('.pagination-jump-input');
        const jumpButton = jumpContainer.querySelector('.pagination-jump-btn');
        
        const handleJump = () => {
            let page = parseInt(jumpInput.value);
            if (isNaN(page) || page < 1) {
                page = 1;
            } else if (page > this.totalCodesPages) {
                page = this.totalCodesPages;
            }
            this.fetchAllCodes(page);
        };
        
        jumpButton.addEventListener('click', handleJump);
        jumpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleJump();
            }
        });
        
        // 添加到容器
        paginationContainer.appendChild(firstButton);
        paginationContainer.appendChild(prevButton);
        pageButtons.forEach(button => {
            paginationContainer.appendChild(button);
        });
        paginationContainer.appendChild(nextButton);
        paginationContainer.appendChild(lastButton);
        paginationContainer.appendChild(jumpContainer);
        
        // 添加到页面
        codesCardBody.appendChild(paginationContainer);
    }

    // 格式化地址
    formatAddress(code) {
        if (!code) return '';
        // 优先使用full_address（如果有）
        if (code.full_address) {
            return code.full_address;
        }
        // 否则拼接地址信息
        const parts = [];
        if (code.province) parts.push(code.province);
        if (code.city) parts.push(code.city);
        if (code.district) parts.push(code.district);
        if (code.detailed_address) parts.push(code.detailed_address);
        return parts.join('');
    }

    // 格式化日期（只显示日期部分）
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            // 直接从字符串中提取日期部分，更高效
            if (dateString.includes('T')) {
                return dateString.split('T')[0];
            } else if (dateString.includes(' ')) {
                return dateString.split(' ')[0];
            } else {
                // 已经是日期格式
                return dateString;
            }
        } catch (error) {
            console.error('日期格式化失败:', error);
            return dateString;
        }
    }

    // 格式化日期时间
    formatDateTime(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch (error) {
            console.error('日期时间格式化失败:', error);
            return dateString;
        }
    }
}

let adminPanel;

// 页面加载完成后初始化

document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
    adminPanel.init();
});