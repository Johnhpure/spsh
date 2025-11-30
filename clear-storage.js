// 在浏览器控制台运行此脚本来清除所有存储

console.log('=== 清除插件存储 ===');

chrome.storage.local.clear(() => {
  console.log('✓ 本地存储已清除');
  
  // 也清除 localStorage
  localStorage.removeItem('product_audit_running');
  localStorage.removeItem('audit_history');
  console.log('✓ localStorage 已清除');
  
  console.log('\n请刷新页面查看登录界面');
  console.log('刷新命令: location.reload()');
});
