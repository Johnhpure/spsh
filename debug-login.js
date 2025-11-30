// 在浏览器控制台运行此脚本来调试登录功能

console.log('=== 登录功能调试工具 ===');

// 1. 检查插件是否加载
console.log('\n1. 检查插件元素:');
const panel = document.querySelector('product-audit-panel');
console.log('Panel element:', panel);

if (panel && panel.shadowRoot) {
  console.log('Shadow root found:', panel.shadowRoot);
  const loginPanel = panel.shadowRoot.querySelector('.login-panel');
  const controlPanel = panel.shadowRoot.querySelector('.control-panel');
  console.log('Login panel:', loginPanel);
  console.log('Control panel:', controlPanel);
} else {
  console.log('❌ Shadow root not found');
}

// 2. 检查存储状态
console.log('\n2. 检查存储状态:');
chrome.storage.local.get(['auth_token', 'user_info', 'audit_api_config'], (result) => {
  console.log('Auth token:', result.auth_token ? '✓ 存在' : '✗ 不存在');
  console.log('User info:', result.user_info);
  console.log('API config:', result.audit_api_config);
});

// 3. 测试认证函数
console.log('\n3. 测试认证状态:');
chrome.storage.local.get('auth_token', (result) => {
  const isAuth = !!result.auth_token;
  console.log('Is authenticated:', isAuth);
});

// 4. 提供清除函数
window.clearAuth = () => {
  chrome.storage.local.remove(['auth_token', 'user_info'], () => {
    console.log('✓ 认证信息已清除，请刷新页面');
  });
};

// 5. 提供设置 API URL 函数
window.setApiUrl = (url) => {
  chrome.storage.local.set({ 'audit_api_config': { apiUrl: url } }, () => {
    console.log('✓ API URL 已设置为:', url);
  });
};

// 6. 提供手动登录函数
window.manualLogin = async (username, password, apiUrl = 'http://localhost:3000') => {
  try {
    console.log('尝试登录:', apiUrl + '/api/auth/login');
    const response = await fetch(apiUrl + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    console.log('响应:', data);
    
    if (data.success) {
      chrome.storage.local.set({
        'auth_token': data.token,
        'user_info': data.user
      }, () => {
        console.log('✓ 登录成功，token 已保存');
        console.log('请刷新页面查看效果');
      });
    } else {
      console.error('✗ 登录失败:', data.error);
    }
  } catch (error) {
    console.error('✗ 请求失败:', error);
  }
};

console.log('\n=== 可用命令 ===');
console.log('clearAuth() - 清除认证信息');
console.log('setApiUrl(url) - 设置 API URL');
console.log('manualLogin(username, password, apiUrl) - 手动登录');
console.log('\n示例:');
console.log('manualLogin("admin", "admin123", "http://localhost:3000")');
