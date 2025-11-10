/**
 * Firebase에 reCAPTCHA Enterprise 키 설정
 * Firebase Admin SDK를 사용해서 설정 시도
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Service Account 로드
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'philipandsophy'
});

const SITE_KEY = '6Lf5vQcsAAAAAP4vRkf38AJGwZO-ToNDpgAi0KzM';

async function updateFirebaseRecaptcha() {
  console.log('📝 Updating Firebase Authentication settings...\n');

  try {
    // Firebase Auth API를 통한 설정은 Admin SDK로 직접 불가능
    // Firebase Console UI 또는 gcloud CLI를 통해서만 가능

    console.log('⚠️  Note: Firebase Phone Auth reCAPTCHA settings cannot be updated via Admin SDK.');
    console.log('\n📋 Manual Steps Required:\n');
    console.log('1. Open Firebase Console:');
    console.log('   https://console.firebase.google.com/project/philipandsophy/authentication/settings\n');
    console.log('2. Go to Sign-in method → Phone\n');
    console.log('3. In "Phone numbers for testing" section, add test numbers if needed:\n');
    console.log('   +82 10-1234-5678 → 123456\n');
    console.log('4. In "reCAPTCHA verification" section:\n');
    console.log(`   - Add this Site Key: ${SITE_KEY}\n`);
    console.log('5. Save the settings\n');

    // 테스트용 전화번호 추가 시도 (이것도 Admin SDK로는 불가능)
    console.log('📱 For development testing, you can add these test phone numbers:');
    console.log('   Phone: +82 10-1234-5678');
    console.log('   Code:  123456');
    console.log('   ');
    console.log('   Phone: +82 10-9876-5432');
    console.log('   Code:  654321\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateFirebaseRecaptcha()
  .then(() => {
    console.log('✅ Script completed');
    console.log('\n🚀 Next Steps:');
    console.log('1. Complete manual configuration in Firebase Console');
    console.log('2. Restart your development server: npm run dev');
    console.log('3. Test phone authentication\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });