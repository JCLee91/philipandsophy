/**
 * CSV Parser: Real User Data
 * Parse Airtable export CSV and extract participant information
 */

import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvPath = '/Users/jclee/Downloads/10월 멤버십-10월 멤버 리스트.csv';

interface CSVRow {
  이름: string;
  연락처: string;
  '회사/하는일': string;
  프로필: string;
  [key: string]: string;
}

async function parseCSV() {
  try {
    console.log('📖 Reading CSV file...\n');

    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle UTF-8 BOM
    }) as CSVRow[];

    console.log(`✅ Total records: ${records.length}\n`);

    // Filter valid participants
    const validParticipants = records.filter(row => {
      // Must have name and phone number
      return row['이름'] && row['이름'].trim() && row['연락처'] && row['연락처'].trim();
    });

    console.log(`✅ Valid participants: ${validParticipants.length}\n`);
    console.log('📋 Sample data (first 10):\n');

    // Show first 10
    validParticipants.slice(0, 10).forEach((row, index) => {
      console.log(`${index + 1}. ${row['이름']}`);
      console.log(`   Phone: ${row['연락처']}`);
      console.log(`   Job: ${row['회사/하는일'] || '(없음)'}`);
      console.log(`   Profile: ${row['프로필'] ? 'YES' : 'NO'}`);
      console.log('');
    });

    // Extract phone numbers
    const phoneNumbers = validParticipants.map(row => {
      let phone = row['연락처'].trim();
      // Normalize phone format
      phone = phone.replace(/\+82\s?/, '0'); // +82 10 → 010
      phone = phone.replace(/[\s-]/g, ''); // Remove spaces and dashes
      return phone;
    });

    console.log('\n📱 Phone numbers:');
    phoneNumbers.slice(0, 10).forEach((phone, index) => {
      console.log(`${index + 1}. ${phone}`);
    });

    // Extract profile image URLs
    const profileImages = validParticipants.map(row => {
      const profileField = row['프로필'] || '';
      // Extract URL from "Profile_xxx.png (https://...)"
      const match = profileField.match(/\(https:\/\/[^\)]+\)/);
      return match ? match[0].slice(1, -1) : ''; // Remove parentheses
    });

    console.log('\n🖼️  Profile images (first 5):');
    profileImages.slice(0, 5).forEach((url, index) => {
      console.log(`${index + 1}. ${url ? 'HAS URL' : 'NO URL'}`);
    });

    // Save parsed data
    const parsedData = validParticipants.map((row, index) => ({
      id: `user-${index + 1}`,
      name: row['이름'].trim(),
      phoneNumber: phoneNumbers[index],
      occupation: row['회사/하는일']?.trim() || '',
      profileImage: profileImages[index] || '',
    }));

    fs.writeFileSync(
      '/Users/jclee/Desktop/휠즈랩스/projectpns/parsed-users.json',
      JSON.stringify(parsedData, null, 2),
      'utf-8'
    );

    console.log('\n✅ Parsed data saved to: parsed-users.json');
    console.log(`📊 Total users to migrate: ${parsedData.length}`);

  } catch (error) {
    console.error('❌ Error parsing CSV:', error);
    process.exit(1);
  }
}

parseCSV();
