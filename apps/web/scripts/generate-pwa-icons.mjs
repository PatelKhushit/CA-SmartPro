import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, "..", "src", "app", "icon.svg");
const outDir = path.join(__dirname, "..", "public", "icons");

// The real ui-sans-serif/system-ui stack renders fine in browsers, but the
// librsvg rasterizer used here doesn't have those families registered and
// falls back to a serif font — force a font actually present on this box so
// the generated PNG matches what the browser favicon looks like.
const svg = readFileSync(svgPath, "utf8").replace(/font-family="[^"]*"/, 'font-family="Arial, sans-serif"');

const sizes = [192, 512];

await Promise.all(
  sizes.map(async (size) => {
    const outPath = path.join(outDir, `icon-${size}.png`);
    await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(outPath);
    console.log(`Wrote ${outPath}`);
  }),
);
