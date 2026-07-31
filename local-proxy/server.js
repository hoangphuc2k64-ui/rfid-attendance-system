const http = require('http');
const https = require('https');
const url = require('url');

// Server local (node) sẽ thay thế cho việc ESP32 giao tiếp trực tiếp với Google Apps Script
// tất cả ESP32 bị lỗi giao tiếp trực tiếp với gia thức HTTPS, nó chỉ giao tiếp HTTP bình 
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbynVIVcbiFgEvteszJFuO149s0-0at7nUNCt1ZfesnmE0xWlvPb5tCImHc4UvGkvPOC1Q/exec';

const PORT = 3000;

function fetchGoogle(targetUrl, callback, redirectsLeft = 5) {
  https.get(targetUrl, (res) => {
    if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
      fetchGoogle(res.headers.location, callback, redirectsLeft - 1);
      return;
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => callback(null, data));
  }).on('error', (err) => callback(err));
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const uid = parsed.query.uid;

  console.log(`[${new Date().toLocaleTimeString()}] - Nhan request tu ESP32, uid=${uid}`);

  if (!uid) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'missing uid' }));
    return;
  }

  const targetUrl = `${GOOGLE_SCRIPT_URL}?uid=${encodeURIComponent(uid)}`;

  fetchGoogle(targetUrl, (err, data) => {
    if (err) {
      console.error('- Loi goi Google Apps Script:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
      return;
    }
    console.log('- Phan hoi tu Google:', data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`- Server dang chay tai http://0.0.0.0:${PORT}`);
  console.log(`- ESP32 se goi vao: http://<IP_LAN_CUA_MAY_BAN>:${PORT}/?uid=XXXX`);
  console.log('- Chay lenh "ipconfig" (Windows) hoac "ifconfig"/"ip addr" (Mac/Linux) de biet IP LAN cua may ban.');
});