// src/utils/image.ts —— 头像上传压缩
// 设计目标：自动压缩 + 保持品质
//  - 居中正方形裁剪（cover），头像不变形
//  - 最大边缩放到 maxSize，且「不放大」原图（小图保持原有清晰）
//  - 优先 WebP（体积小、品质好），浏览器不支持则回退 JPEG
//  - 高质量平滑（imageSmoothingQuality='high'）

export interface CompressOptions {
  /** 输出最大边长（px）。默认 256，头像显示 54~64px 足够清晰且体积小 */
  maxSize?: number;
  /** 输出质量 0~1。默认 0.9，兼顾画质与体积 */
  quality?: number;
}

/**
 * 把用户选择的图片压成适合作头像的 dataURL。
 * @returns Promise<data:image/...;base64,...>
 */
export function compressAvatar(file: File, opts: CompressOptions = {}): Promise<string> {
  const maxSize = opts.maxSize ?? 256;
  const quality = opts.quality ?? 0.9;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const sw = img.naturalWidth || img.width;
      const sh = img.naturalHeight || img.height;
      if (!sw || !sh) { reject(new Error('图片读取失败')); return; }

      // 正方形裁剪区域：取较小边，居中
      const side = Math.min(sw, sh);
      const sx = (sw - side) / 2;
      const sy = (sh - side) / 2;
      // 输出边长：不超过 maxSize，也不超过原图边长（不放大，保持原图品质）
      const out = Math.min(maxSize, side);

      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('浏览器不支持 canvas')); return; }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high'; // 高质量重采样，缩小不忘质
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

      // 优先 WebP（品质好、体积小）；检测支持与否（不支持时 toDataURL 会回退 png/jpeg）
      const webp = canvas.toDataURL('image/webp', quality);
      if (webp.startsWith('data:image/webp')) { resolve(webp); return; }
      // 回退 JPEG（仍有透明需求时 JPEG 无透明，但头像底色由底环承担，可接受）
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}
