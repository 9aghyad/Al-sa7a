const { spawnSync } = require('child_process');
const modules = ['express','socket.io','qrcode'];
const missing = modules.filter(m => { try { require.resolve(m); return false; } catch { return true; } });
if (missing.length) {
  console.log(`[Arena] Missing dependencies: ${missing.join(', ')} — installing...`);
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install','--omit=dev','--no-audit','--no-fund'], { stdio:'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}
require('./server.js');
