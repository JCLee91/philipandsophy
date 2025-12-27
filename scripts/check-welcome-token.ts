import { getAdminDb } from '../src/lib/firebase/admin';

const db = getAdminDb();

async function checkWelcomeToken(phoneNumber: string) {
    console.log(`\n🔍 Checking participant with phone: ${phoneNumber}\n`);

    const participantsRef = db.collection('participants');
    const snapshot = await participantsRef.where('phoneNumber', '==', phoneNumber).get();

    if (snapshot.empty) {
        console.log('❌ No participant found with this phone number');
        return;
    }

    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        console.log('📋 Participant found:');
        console.log('  - Document ID:', doc.id);
        console.log('  - Name:', data.name);
        console.log('  - Phone:', data.phoneNumber);
        console.log('  - Welcome Token:', data.welcomeToken || '❌ NOT SET');
        console.log('  - Token Created At:', data.welcomeTokenCreatedAt?.toDate() || 'N/A');
        console.log('  - Token Expires At:', data.welcomeTokenExpiresAt?.toDate() || 'N/A');
        console.log('  - Welcome Message:', data.welcomeMessage ? '✅ EXISTS' : '❌ NOT SET');
        console.log('  - Cohort ID:', data.cohortId || 'N/A');

        if (data.welcomeToken) {
            const expiresAt = data.welcomeTokenExpiresAt?.toDate();
            if (expiresAt && expiresAt < new Date()) {
                console.log('\n⚠️ Token is EXPIRED!');
            } else {
                console.log('\n✅ Token is VALID');
                console.log(`🔗 Welcome URL: https://philipandsophy.com/welcome?token=${data.welcomeToken}`);
            }
        }
    });
}

const phoneNumber = process.argv[2] || '010-2145-3575';
checkWelcomeToken(phoneNumber)
    .then(() => process.exit(0))
    .catch((err: Error) => {
        console.error('Error:', err);
        process.exit(1);
    });
