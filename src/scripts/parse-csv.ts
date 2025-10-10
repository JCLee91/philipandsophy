/**
 * CSV Parser Script
 * Parse real user data from Airtable CSV export
 */

import * as fs from 'fs';
import * as path from 'path';

const csvPath = '/Users/jclee/Downloads/10월 멤버십-10월 멤버 리스트.csv';

// Read CSV file
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Split by newlines
const lines = csvContent.split('\n');

// Parse header
const header = lines[0].split(',');

console.log('📊 CSV Header:');
console.log(header);
console.log('\n📝 First 5 data rows:\n');

// Parse first 5 data rows
for (let i = 1; i <= 5; i++) {
  if (lines[i]) {
    const fields = lines[i].split(',');
    console.log(`Row ${i}:`);
    console.log('  이름:', fields[0]);
    console.log('  연락처:', fields[5]);
    console.log('  회사/하는일:', fields[7]);
    console.log('  프로필:', fields[14]);
    console.log('');
  }
}

console.log('\n📈 Total rows:', lines.length - 1); // Exclude header
