import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function triggerManualMatching() {
  const cohortId = '3';  // 3기
  const functionUrl = 'https://manualmatchingpreview-vliq2xsjqa-du.a.run.app';
  const internalSecret = process.env.INTERNAL_SERVICE_SECRET;

  if (!internalSecret) {
    console.error('❌ INTERNAL_SERVICE_SECRET not found in .env.local');
    process.exit(1);
  }

  console.log(`\n🎲 Triggering manual RANDOM matching for cohort ${cohortId}...`);
  console.log('=' + '='.repeat(50));

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({ cohortId }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ Random matching executed successfully!');
      console.log('\n📊 Results:');
      console.log(`   - Date: ${result.date}`);
      console.log(`   - Total Participants: ${result.result?.totalParticipants || 0}`);
      console.log(`   - Providers Count: ${result.result?.providersCount || 0}`);
      console.log(`   - Assignments Count: ${result.result?.assignments || 0}`);

      if (result.result?.validation) {
        const validation = result.result.validation;
        console.log('\n📋 Validation:');
        console.log(`   - Valid: ${validation.valid}`);
        if (validation.errors?.length) {
          console.log(`   - Errors: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings?.length) {
          console.log(`   - Warnings: ${validation.warnings.join(', ')}`);
        }
      }
    } else {
      console.error('\n❌ Manual matching failed');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${result.error}`);
      console.error(`   Details: ${result.details || result.message || 'No details'}`);
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

// 스크립트 실행
triggerManualMatching()
  .then(() => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ Manual matching trigger completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });