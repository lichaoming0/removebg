const { execSync } = require('child_process');
const path = require('path');

const dir = __dirname;
function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(cmd, { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
  console.log(out);
  return out;
}

try {
  run('git add -A');
  run('git commit -m "feat: image background remover MVP"');
  run('git push -u origin master');
  console.log('=== ALL DONE ===');
} catch (e) {
  console.error(e.message);
}
