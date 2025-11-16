#!/usr/bin/env node
// buildall-ui.js (resource-local)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BASE_DIR = process.cwd();

function runCommand(cmd, args, cwd, logStream) {
  const cmdLine = `${cmd} ${args.join(' ')}`;
  console.log(`→ ${cmdLine} (cwd: ${cwd})`);
  const res = spawnSync(cmd, args, { cwd, shell: true, encoding: 'utf8' });
  if (logStream) {
    logStream.write(`\n$ ${cmdLine}\n`);
    if (res.stdout) logStream.write(res.stdout + '\n');
    if (res.stderr) logStream.write(res.stderr + '\n');
    logStream.write(`exitCode: ${res.status}\n`);
  }
  return res.status === 0;
}

function findHadesDirs(base) {
  const names = fs.readdirSync(base);
  return names.filter(n => n.startsWith('hades-') && fs.lstatSync(path.join(base, n)).isDirectory());
}

function main() {
  const dirs = findHadesDirs(BASE_DIR);
  let found = 0;
  let installSuccess = 0, installFail = 0;
  let buildSuccess = 0, buildFail = 0;

  console.log(`Found ${dirs.length} hades-* folders to scan.`);

  for (const dir of dirs) {
    const uiPath = path.join(BASE_DIR, dir, 'ui');
    if (!fs.existsSync(uiPath) || !fs.lstatSync(uiPath).isDirectory()) continue;
    found++;
    console.log(`\n--- Processing ${dir}/ui ---`);

    const pkg = path.join(uiPath, 'package.json');
    if (!fs.existsSync(pkg)) {
      console.log('SKIPPED: no package.json in ui folder');
      buildFail++;
      continue;
    }

    const logsRoot = path.join(BASE_DIR, 'logs');
    if (!fs.existsSync(logsRoot)) fs.mkdirSync(logsRoot, { recursive: true });
    const stamp = Date.now();
    const logFile = path.join(logsRoot, `${dir.replace(/[^a-z0-9-_]/gi, '_')}_build_${stamp}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a', encoding: 'utf8' });
    logStream.write(`Build log for ${dir}/ui - ${new Date().toISOString()}\n`);

    const installOk = runCommand('pnpm', ['install'], uiPath, logStream);
    if (installOk) {
      installSuccess++;
    } else {
      installFail++;
      console.log('✖ pnpm install failed, skipping build for this ui.');
      logStream.write('✖ pnpm install failed, skipping build for this ui.\n');
      buildFail++;
      logStream.end();
      console.log('log:', logFile);
      continue;
    }

    let buildOk = runCommand('pnpm', ['run', 'build'], uiPath, logStream);
    if (!buildOk) {
      logStream.write('\nBuild failed, attempting to install @babel/plugin-syntax-dynamic-import and retry\n');
      console.log('Build failed for', dir, '- attempting auto-install of @babel/plugin-syntax-dynamic-import');
      const addOk = runCommand('pnpm', ['add', '@babel/plugin-syntax-dynamic-import', '--save-dev'], uiPath, logStream);
      if (addOk) {
        runCommand('pnpm', ['install'], uiPath, logStream);
        buildOk = runCommand('pnpm', ['run', 'build'], uiPath, logStream);
      }
    }

    if (buildOk) {
      buildSuccess++;
      logStream.write('✔ build OK\n');
    } else {
      buildFail++;
      logStream.write('✖ build failed\n');
    }
    logStream.end();
    if (!buildOk) console.log('log:', logFile);
  }

  console.log('\n==== Summary ===');
  console.log(`ui folders found: ${found}`);
  console.log(`pnpm install: success ${installSuccess}  failed ${installFail}`);
  console.log(`pnpm build:   success ${buildSuccess}  failed ${buildFail}`);

  const totalFailed = installFail + buildFail;
  if (totalFailed > 0) {
    console.log('\nSome builds failed. Exit code: 1');
    console.log('If you see errors about missing babel dynamic import plugin, the script attempted to install it automatically; check the logs.')
    process.exit(1);
  }

  console.log('\nAll builds completed successfully. Exit code: 0');
  process.exit(0);
}

main();
