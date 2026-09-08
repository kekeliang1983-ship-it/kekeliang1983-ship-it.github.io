// scripts/gen-banner-webp.mjs
// 把 Banner 视频转成「动画 WebP」(banner-loop.webp)，用于会被系统播放器劫持的浏览器(<img> 动画兜底)。
// 用法: node scripts/gen-banner-webp.mjs <input.mp4> <output.webp>
// ffmpeg 定位优先级: PATH 里的 ffmpeg → WorkBuddy 自带 python 环境里的 imageio_ffmpeg 二进制。
import { spawnSync } from 'child_process';

function findFfmpeg() {
  // 1) PATH
  const p = spawnSync('ffmpeg', ['-version'], { windowsHide: true });
  if (p.status === 0) return 'ffmpeg';
  // 2) WorkBuddy 自带 python 环境的 imageio_ffmpeg 内置 ffmpeg
  const py =
    'C:/Users/KEKELIANG/.workbuddy/binaries/python/envs/default/Scripts/python.exe';
  try {
    const r = spawnSync(py, ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  } catch {
    /* ignore */
  }
  return null;
}

const src = process.argv[2];
const out = process.argv[3];
if (!src || !out) {
  console.error('USAGE: node gen-banner-webp.mjs <in.mp4> <out.webp>');
  process.exit(2);
}

const ff = findFfmpeg();
if (!ff) {
  // 找不到 ffmpeg 时优雅跳过：好浏览器仍走视频，仅 MIUI 等兜底暂时沿用旧 webp
  console.error('FFMPEG_NOT_FOUND_SKIP');
  process.exit(0);
}

const args = [
  '-y',
  '-i', src,
  '-an',
  '-vf', 'fps=20,scale=720:405',
  '-c:v', 'libwebp_anim',
  '-loop', '0',
  '-q:v', '75',
  out,
];
const r = spawnSync(ff, args, { windowsHide: true, encoding: 'utf8' });
if (r.status !== 0) {
  console.error('FFMPEG_FAIL', r.stderr?.slice(-2000));
  process.exit(1);
}
console.log('OK', out);
process.exit(0);
