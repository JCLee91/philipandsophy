import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const DUMMY_PROFILES_DIR = path.join(process.cwd(), 'public', 'image', 'dummy-profiles');

const TARGET_WIDTH = Number(process.env.TARGET_WIDTH ?? 160);
const QUALITY = Number(process.env.QUALITY ?? 70);
const EFFORT = Number(process.env.EFFORT ?? 4);

async function main() {
  const entries = await fs.readdir(DUMMY_PROFILES_DIR);
  const targets = entries
    .filter((name) => name.toLowerCase().endsWith('.webp'))
    .map((name) => path.join(DUMMY_PROFILES_DIR, name));

  let resized = 0;
  let skipped = 0;

  for (const filePath of targets) {
    const meta = await sharp(filePath).metadata();
    const width = meta.width ?? 0;

    if (width > 0 && width <= TARGET_WIDTH) {
      skipped += 1;
      continue;
    }

    const tmpPath = `${filePath}.tmp`;
    try {
      await sharp(filePath)
        .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: EFFORT })
        .toFile(tmpPath);

      await fs.rename(tmpPath, filePath);
      resized += 1;
      console.log(`✅ Resized: ${path.basename(filePath)} (${width || '?'}px → ${TARGET_WIDTH}px)`);
    } catch (error) {
      await fs.rm(tmpPath, { force: true });
      throw error;
    }
  }

  console.log(`\nDone. resized=${resized}, skipped=${skipped}, dir=${DUMMY_PROFILES_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

