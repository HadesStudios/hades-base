const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function writeLog(f,t){try{fs.appendFileSync(f,t,'utf8')}catch(e){}}

const resourceRoot = process.cwd();
const parent = path.join(resourceRoot, '..');
const res = process.argv[2];
const explicitPath = process.argv[3]; // optional absolute resource path passed from the server
if(!res){console.error('usage: node rebuild.js <resource>'); process.exit(2)}

// ensure the resource folder actually exists (allow non-hades-* names)
const target = explicitPath && explicitPath.length ? explicitPath : path.join(parent, res);
if(!fs.existsSync(target) || !fs.lstatSync(target).isDirectory()){console.error('resource not found:', target); process.exit(2)}

const ui = path.join(target, 'ui');
if(!fs.existsSync(ui) || !fs.lstatSync(ui).isDirectory()){console.error('no ui folder for', res); process.exit(1)}

// try to discover alternate ui folders if the default wasn't present
function discoverUi(targetDir){
  const candidates = ['ui','html','client/html','ui/dist','ui/src','www','web'];
  for(const c of candidates){
    const p = path.join(targetDir, c);
    if(fs.existsSync(p) && fs.lstatSync(p).isDirectory()) return p;
  }
  return null;
}

if(!fs.existsSync(ui) || !fs.lstatSync(ui).isDirectory()){
  const alt = discoverUi(target);
  if(alt){
    writeLog(logFile, `Default ui not found, using discovered folder: ${alt}\n`);
    ui = alt;
  }
}

const logs = path.join(resourceRoot, 'builder', 'logs');
fs.mkdirSync(logs, { recursive: true });
const stamp = Date.now();
const safe = res.replace(/[^a-z0-9-_]/gi, '_');
const logFile = path.join(logs, `${safe}_build_${stamp}.log`);
writeLog(logFile, `Rebuild ${res} - ${new Date().toISOString()}\n`);

function run(cmd, args, cwd){
  writeLog(logFile, `\n$ ${cmd} ${args.join(' ')}\n`);
  const r = spawnSync(cmd, args, { cwd, shell: true, encoding: 'utf8' });
  if(r.stdout) writeLog(logFile, r.stdout + '\n');
  if(r.stderr) writeLog(logFile, r.stderr + '\n');
  writeLog(logFile, `exit:${r.status}\n`);
  return r.status === 0;
}
// detect package manager available on PATH (pnpm -> npm -> yarn)
function whichCmd(cmd){
  try{
    const which = process.platform === 'win32' ? 'where' : 'which';
    const r = spawnSync(which, [cmd], { shell: true, encoding: 'utf8' });
    return r.status === 0;
  }catch(e){ return false }
}

let pkgMgr = null;
if(whichCmd('pnpm')) pkgMgr = 'pnpm';
else if(whichCmd('npm')) pkgMgr = 'npm';
else if(whichCmd('yarn')) pkgMgr = 'yarn';

// try corepack to enable pnpm if nothing found and corepack exists
if(!pkgMgr && whichCmd('corepack')){
  writeLog(logFile, '\nNo pnpm/npm/yarn found; attempting `corepack enable`\n');
  run('corepack', ['enable'], resourceRoot);
  if(whichCmd('pnpm')) pkgMgr = 'pnpm';
}

if(!pkgMgr){
  console.error('no package manager found (pnpm/npm/yarn). See', logFile);
  writeLog(logFile, '\nNo package manager available: tried pnpm, npm, yarn, corepack.\n');
  process.exit(1);
}

// helper to run appropriate install/build/add commands for detected package manager
function installDeps(){
  if(pkgMgr === 'pnpm') return run('pnpm', ['install'], ui);
  if(pkgMgr === 'npm') return run('npm', ['install', '--no-audit', '--no-fund'], ui);
  return run('yarn', [], ui);
}

function buildProject(){
  if(pkgMgr === 'pnpm') return run('pnpm', ['run', 'build'], ui);
  if(pkgMgr === 'npm') return run('npm', ['run', 'build'], ui);
  return run('yarn', ['build'], ui);
}

function addDynamicImportPlugin(){
  if(pkgMgr === 'pnpm') return run('pnpm', ['add', '@babel/plugin-syntax-dynamic-import', '--save-dev'], ui);
  if(pkgMgr === 'npm') return run('npm', ['install', '--save-dev', '@babel/plugin-syntax-dynamic-import'], ui);
  return run('yarn', ['add', '@babel/plugin-syntax-dynamic-import', '--dev'], ui);
}

writeLog(logFile, '\nUsing package manager: ' + pkgMgr + '\n');

if(!installDeps()){
  console.error(pkgMgr + ' install failed. see', logFile); process.exit(1)
}

// validate package.json and build script
const pkgJson = path.join(ui, 'package.json');
if(!fs.existsSync(pkgJson)){
  writeLog(logFile, `\npackage.json not found in ui folder (${ui}). Aborting.\n`);
  console.error('no package.json in', ui, 'see', logFile);
  process.exit(1);
}
try{
  const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
  if(!pkg.scripts || (!pkg.scripts.build && !pkg.scripts['build:prod'])){
    writeLog(logFile, `\npackage.json has no build script. scripts: ${Object.keys(pkg.scripts||{}).join(', ')}\n`);
    console.error('no build script in package.json for', res, 'see', logFile);
    process.exit(1);
  }
}catch(e){
  writeLog(logFile, '\nfailed to parse package.json: '+e.message+'\n');
  console.error('invalid package.json in', ui, 'see', logFile);
  process.exit(1);
}

let ok = buildProject();
if(!ok){
  writeLog(logFile, '\nbuild failed, trying plugin and retry\n');
  const add = addDynamicImportPlugin();
  if(add){ installDeps(); ok = buildProject(); }
}

if(ok){ console.log('ok', res, 'log:', logFile); process.exit(0)}
console.error('failed', res, 'log:', logFile); process.exit(1)
