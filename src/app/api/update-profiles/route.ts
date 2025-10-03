import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

const serviceAccount = require('../../../../firebase-service-account.json');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

export async function POST() {
  try {
    const profiles = [
      {
        id: '1',
        occupation: '마케터',
        bio: '새로운 경험과 배움을 통해 성장하는 것을 좋아합니다.\n책과 함께하는 시간이 일상의 활력소예요.',
      },
      {
        id: '2',
        occupation: '디자이너',
        bio: '일상 속 작은 아름다움을 발견하고\n기록하는 것을 즐깁니다.',
      },
      {
        id: '3',
        occupation: '중학교 교사',
        bio: '새로운 도전을 두려워하지 않고\n삶의 결을 다채롭게 이어가는 사람',
      },
      {
        id: '4',
        occupation: '개발자',
        bio: '기술과 인문학의 경계에서\n새로운 가치를 만들어가고 있습니다.',
      },
    ];

    for (const profile of profiles) {
      const { id, ...data } = profile;
      await db.collection('participants').doc(id).update(data);
      console.log(`✅ Updated profile for participant ${id}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${profiles.length} profiles` 
    });
  } catch (error) {
    console.error('Error updating profiles:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

