const http = require('http');

async function setupAdmin() {
    const postData = JSON.stringify({
        username: 'admin',
        password: 'admin123'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/setup-admin',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);

                    if (res.statusCode === 200) {
                        console.log('✅ 管理员账户创建成功！');
                        console.log('用户名: admin');
                        console.log('密码: admin123');
                        console.log('\n现在可以在前端登录了！');
                    } else if (res.statusCode === 403) {
                        console.log('ℹ️  管理员账户已存在');
                        console.log('用户名: admin');
                        console.log('密码: admin123');
                        console.log('\n可以直接登录！');
                    } else {
                        console.log('❌ 创建失败:', response.error);
                    }
                    resolve(response);
                } catch (e) {
                    console.error('❌ 解析响应失败:', e.message);
                    console.log('原始响应:', data);
                    reject(e);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 请求失败:', error.message);
            console.log('\n请确保后端服务器正在运行 (npm run dev)');
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

setupAdmin().catch(console.error);
