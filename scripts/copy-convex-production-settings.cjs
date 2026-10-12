const {execFileSync} = require('node:child_process');
const root = '/Users/akhilesh/build-sprint-app';
const cli = root + '/node_modules/.bin/convex';
const source = 'little-kangaroo-718';
const target = 'coordinated-barracuda-687';
const secrets = [];
function run(args, input) {
  try {
    return execFileSync(cli, args, {cwd:root, encoding:'utf8', input,
      env:{...process.env,DO_NOT_TRACK:'1'},stdio:['pipe','pipe','pipe']}).trimEnd();
  } catch (error) {
    let message = String(error.stderr || 'Convex command failed');
    for (const value of secrets) if (value) message = message.replaceAll(value,'[redacted]');
    throw new Error(message);
  }
}
try {
  const names = run(['env','list','--deployment',source,'--names-only'])
    .split('\n').filter(name => /^[A-Z][A-Z0-9_]*$/.test(name));
  if (names.length !== 16) throw new Error('Source setting list changed; inspect before copying.');
  const targetNames = run(['env','list','--deployment',target,'--names-only']);
  if (targetNames.trim()) throw new Error('Production has existing settings; inspect before overwriting.');
  for (const name of names) {
    const value = run(['env','get',name,'--deployment',source]);
    secrets.push(value);
    // Standby copy must not dispatch duplicate real calls before cutover.
    const copied = name === 'LIVE_CALLS_ENABLED' ? 'false' : value;
    run(['env','set',name,'--deployment',target], copied);
    const actual = run(['env','get',name,'--deployment',target]);
    if (actual !== copied) throw new Error('Verification failed for ' + name);
    console.log('Copied and verified ' + name + (name === 'LIVE_CALLS_ENABLED' ? ' (standby: false)' : ''));
  }
  console.log('16 settings copied; secret values were not printed or written to disk.');
} catch (error) {console.error(error.message);process.exitCode=1;}
