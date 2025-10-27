import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import path from 'node:path';

async function run() {
  const projectId = 'stage2-smoke-test';
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules,
    },
  });

  try {
    const adminContext = testEnv.authenticatedContext('admin-user', { admin: true });
    const participantContext = testEnv.authenticatedContext('participant-user', {});

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db
        .collection('participants')
        .doc('participant-user-id')
        .set({
          firebaseUid: 'participant-user',
          cohortId: 'cohort-001',
          name: 'Test Participant',
          pushNotificationEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      await db.collection('cohorts').doc('cohort-001').set({
        name: '1기',
        startDate: '2024-10-01',
        endDate: '2024-10-14',
        programStartDate: '2024-10-01',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const adminDb = adminContext.firestore();
    await assertSucceeds(
      adminDb.collection('cohorts').doc('cohort-001').update({
        name: '1기 (updated)',
        updatedAt: new Date(),
      })
    );

    const participantDb = participantContext.firestore();

    await assertFails(
      participantDb.collection('cohorts').doc('cohort-001').update({
        name: 'should-fail',
      })
    );

    await assertSucceeds(participantDb.collection('cohorts').doc('cohort-001').get());

    await assertSucceeds(
      participantDb.collection('participants').doc('participant-user-id').update({
        profileImage: 'https://example.com/profile.jpg',
        updatedAt: new Date(),
      })
    );

    await assertFails(
      participantDb.collection('participants').doc('participant-user-id').update({
        firebaseUid: 'someone-else',
      })
    );

    await assertSucceeds(
      participantDb.collection('notices').add({
        cohortId: 'cohort-001',
        author: '필립앤소피',
        content: '테스트 공지입니다.',
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    await assertSucceeds(participantDb.collection('notices').where('cohortId', '==', 'cohort-001').get());

    console.log('✅ Firestore security smoke tests passed.');
  } finally {
    await testEnv.cleanup();
  }
}

run().catch((error) => {
  console.error('❌ Firestore security smoke tests failed.', error);
  process.exit(1);
});
