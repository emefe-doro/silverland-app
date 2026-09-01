import sharp from "sharp";
import fs from "fs";
import path from "path";

const svg = (size = 512) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b6cb8"/>
      <stop offset="1" stop-color="#061f40"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <path d="M256 96l150 62v74c0 92-62 166-150 190-88-24-150-98-150-190v-74z" fill="#ffffff" opacity="0.14"/>
  <path d="M256 128l126 52v62c0 76-51 138-126 158-75-20-126-82-126-158v-62z" fill="none" stroke="#ffffff" stroke-width="22"/>
  <text x="256" y="296" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="200" font-weight="800" fill="#ffffff">SL</text>
</svg>`;

async function main() {
  const dir = path.resolve(process.cwd(), "public/icons");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const size of [192, 512]) {
    await sharp(Buffer.from(svg(size))).resize(size, size).png().toFile(path.join(dir, `icon-${size}.png`));
    console.log(`icon-${size}.png`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
