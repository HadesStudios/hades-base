#!/usr/bin/env node
// rebuild-ui.js <resource-name>
// Rebuilds a single hades-<resource>/ui by running pnpm install && pnpm run build

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function writeLog(file, text) {
  try { fs.appendFileSync(file, text, 'utf8'); } catch (e) {}
}

const BASE_DIR = process.cwd();

function runCommand(cmd, args, cwd) {
  console.log(`→ ${cmd} ${args.join(' ')} (cwd: ${cwd})`);
  const res = spawnSync(cmd, args, { cwd, shell: true, stdio: 'inherit' });
  return res.status === 0;
}

function usage() {
  console.error('Usage: node rebuild-ui.js <resource-name>');
  process.exit(2);
}

const resource = process.argv[2];
if (!resource) usage();
if (!resource.startsWith('hades-')) {
  console.error('Resource name should start with hades-');
  process.exit(2);
}

const uiPath = path.join(BASE_DIR, resource, 'ui');
if (!fs.existsSync(uiPath) || !fs.lstatSync(uiPath).isDirectory()) {
  console.error(`UI folder not found for resource: ${resource}`);
  process.exit(1);
}

const pkg = path.join(uiPath, 'package.json');
if (!fs.existsSync(pkg)) {
  console.error('No package.json in ui folder; nothing to build.');
  process.exit(1);
}

const logsRoot = path.join(BASE_DIR, 'logs');
if (!fs.existsSync(logsRoot)) fs.mkdirSync(logsRoot, { recursive: true });
const stamp = Date.now();
const logFile = path.join(logsRoot, `${resource.replace(/[^a-z0-9-_]/gi, '_')}_build_${stamp}.log`);
writeLog(logFile, `Rebuild log for ${resource} - ${new Date().toISOString()}\n`);

function runAndLog(cmd, args, cwd) {
  writeLog(logFile, `\n$ ${cmd} ${args.join(' ')}\n`);
  const res = spawnSync(cmd, args, { cwd, shell: true, encoding: 'utf8' });
  if (res.stdout) writeLog(logFile, res.stdout + '\n');
  if (res.stderr) writeLog(logFile, res.stderr + '\n');
  writeLog(logFile, `exitCode: ${res.status}\n`);
  return res.status === 0;
}

if (!runAndLog('pnpm', ['install'], uiPath)) {
  console.error('Install failed. See log:', logFile);
  process.exit(1);
}

let buildOk = runAndLog('pnpm', ['run', 'build'], uiPath);
if (!buildOk) {
  writeLog(logFile, '\nBuild failed, attempting to install @babel/plugin-syntax-dynamic-import and retry\n');
  console.log('Build failed, attempting auto-install of @babel/plugin-syntax-dynamic-import and retry...');
  // try to add plugin and retry once
  const addOk = runAndLog('pnpm', ['add', '@babel/plugin-syntax-dynamic-import', '--save-dev'], uiPath);
  if (addOk) {
    writeLog(logFile, 'plugin install succeeded, running pnpm install and pnpm run build again\n');
    runAndLog('pnpm', ['install'], uiPath);
    buildOk = runAndLog('pnpm', ['run', 'build'], uiPath);
    if (buildOk) {
      console.log('Rebuild succeeded after auto-install. Log:', logFile);
      process.exit(0);
    }
  }

  console.error('pnpm run build failed after retry. See log:', logFile);
  console.error('You can manually run inside the ui folder: pnpm add @babel/plugin-syntax-dynamic-import');
  process.exit(1);
}

console.log('Rebuild completed successfully. Log:', logFile);
process.exit(0);
