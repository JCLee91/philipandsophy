#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  'src/app/datacntr/board/page.tsx',
  'src/app/datacntr/cohorts/[cohortId]/daily-questions/page.tsx',
  'src/app/datacntr/cohorts/[cohortId]/page.tsx',
  'src/app/datacntr/cohorts/new/page.tsx',
  'src/app/datacntr/cohorts/page.tsx',
  'src/app/datacntr/login/page.tsx',
  'src/app/datacntr/messages/page.tsx',
  'src/app/datacntr/notice-templates/page.tsx',
  'src/app/datacntr/notices/page.tsx',
  'src/app/datacntr/page.tsx',
  'src/app/datacntr/participants/page.tsx',
  'src/app/datacntr/settings/page.tsx',
  'src/app/datacntr/submissions/page.tsx',
  'src/app/app/admin/matching/page.tsx',
  'src/app/app/chat/page.tsx',
  'src/app/app/chat/participants/page.tsx',
  'src/app/app/chat/today-library/page.tsx',
  'src/app/app/cohorts/page.tsx',
  'src/app/app/profile/[participantId]/page.tsx',
  'src/app/program/page.tsx',
];

const projectRoot = path.resolve(__dirname, '..');

let updated = 0;
let skipped = 0;

for (const file of files) {
  const filePath = path.join(projectRoot, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already has dynamic export
  if (content.includes("export const dynamic = 'force-dynamic'")) {
    console.log(`⏭️  Skipped (already has export): ${file}`);
    skipped++;
    continue;
  }

  // Check if it's a client component
  if (!content.startsWith("'use client'")) {
    console.log(`⏭️  Skipped (not a client component): ${file}`);
    skipped++;
    continue;
  }

  // Find the position to insert (after ALL imports, before first non-import statement)
  const lines = content.split('\n');
  let insertIndex = -1;
  let inMultilineImport = false;

  // Find last import statement (including multi-line imports)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track multi-line imports
    if (line.startsWith('import ') && !line.endsWith(';') && !line.endsWith("';") && line.includes('from')) {
      inMultilineImport = true;
    }

    if (inMultilineImport) {
      if (line.endsWith(';') || line.endsWith("';")) {
        inMultilineImport = false;
        insertIndex = i + 1;
      }
      continue;
    }

    // Single-line import
    if (line.startsWith("'use client'") || line.startsWith('import ')) {
      insertIndex = i + 1;
    }

    // Stop at first non-import, non-empty line after imports
    if (insertIndex > 0 && line && !line.startsWith('import ') && !line.startsWith("'use") && !inMultilineImport) {
      break;
    }
  }

  if (insertIndex === -1) {
    console.log(`⚠️  Could not find insertion point: ${file}`);
    continue;
  }

  // Skip blank lines after imports
  while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
    insertIndex++;
  }

  // Insert the export statement
  lines.splice(insertIndex, 0, '', '// ✅ Disable static generation - requires runtime data', "export const dynamic = 'force-dynamic';");

  const newContent = lines.join('\n');
  fs.writeFileSync(filePath, newContent, 'utf-8');

  console.log(`✅ Updated: ${file}`);
  updated++;
}

console.log(`\n📊 Summary: ${updated} updated, ${skipped} skipped`);
