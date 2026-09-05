// src/admin/img.ts —— 图片压缩工具（解决「上传图片撑大包体」）
// 思路：本地用 canvas 把图缩放到最大边 maxDim，再按 quality 重编码为 WebP/JPEG，
// 体积通常能压到原图的 10%~30%。后台绝不不经压缩直接落盘。

export interface CompressResult {
  /** 可直接上传的 base64（不含 data: 前缀，与后端 upload 约定一致） */
  base64: string;
  /** 压缩后体积（KB，四舍五入） */
  kb: number;
  /** 输出宽高 */
  width: number;
  height: number;
  /** 输出 MIME */
  mime: string;
}

/**
 * 压缩图片文件。
 * @param file      原始文件
 * @param maxDim    最长边像素上限（缩略图建议 1080，原图建议 1600）
 * @param quality   0~1 编码质量（默认 0.82）
 * @param mime      输出格式（默认 image/jpeg；需要透明用 image/webp）
 */
export function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number; mime?: string } = {},
): Promise<CompressResult> {
  const maxDim = opts.maxDim ?? 1280;
  const quality = opts.quality ?? 0.82;
  const mime = opts.mime ?? 'image/jpeg';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片解码失败'));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas 不可用'));
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl: string = canvas.toDataURL(mime, quality);
        const base64 = dataUrl.split(',')[1] || '';
        const kb = Math.round((base64.length * 0.75) / 1024);
        resolve({ base64, kb, width, height, mime });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
