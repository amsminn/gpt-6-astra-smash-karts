import { spawn } from 'node:child_process';
const jobs = [
  spawn('npm', ['run', 'server'], { stdio: 'inherit' }),
  spawn('npm', ['run', 'dev:web'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  jobs.forEach((p) => p.kill('SIGTERM'));
  setTimeout(() => process.exit(code), 500);
}
jobs.forEach((p) => p.on('exit', (code) => stop(code ?? 1)));
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
