import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = require('../../firebase-service-account.json');

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// 동적으로 최근 날짜의 더미 독서 인증 데이터 생성
function generateDummySubmissions() {
  const now = new Date();
  
  return [
    {
      participantId: '1', // 다은
      review: '우주의 광활함 앞에서 인간의 존재가 얼마나 작은지 깨달았어요.',
      dailyQuestion: '당신에게 독서란 무엇인가요?',
      dailyAnswer: '새로운 세계로의 초대장이자, 나를 성장시키는 거울입니다.\n책을 읽을 때마다 내가 몰랐던 세상과 만나게 되고, 그 안에서 새로운 나를 발견하게 돼요.\n때로는 위로를, 때로는 용기를 얻으며 한 걸음씩 성장해 나가는 것 같아요.',
      bookImageUrl: 'https://picsum.photos/seed/book1/800/600',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)), // 1일 전
      status: 'approved',
    },
    {
      participantId: '1',
      review: '관계의 본질에 대해 깊이 생각하게 되었습니다. 진정한 연결이란 무엇일까요?',
      dailyQuestion: '오늘 하루 중 가장 기억에 남는 순간은?',
      dailyAnswer: '책을 읽다가 문득 창밖을 바라본 순간. 햇살이 따뜻했어요.\n글 속 주인공의 고민과 내 일상이 묘하게 겹치면서 현실과 책 속 세계가 하나로 느껴졌어요.\n그 순간의 고요함과 깨달음이 오래도록 마음에 남을 것 같습니다.',
      bookImageUrl: 'https://picsum.photos/seed/book2/800/600',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)), // 2일 전
      status: 'approved',
    },
    {
      participantId: '1',
      review: '작가의 세밀한 묘사가 인상적이었습니다. 마치 그 장면 속에 있는 것 같았어요.',
      dailyQuestion: '책에서 가장 공감한 구절은?',
      dailyAnswer: '"우리는 모두 별먼지로 이루어져 있다" - 이 문장이 계속 마음에 남아요.\n우주적 관점에서 보면 우리의 고민은 정말 작은 것이지만, 동시에 우리 모두가 특별한 존재라는 걸 느끼게 해줘요.\n일상의 스트레스 속에서도 이 문장을 떠올리면 마음이 한결 가벼워집니다.',
      bookImageUrl: 'https://picsum.photos/seed/book3/800/600',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)), // 5일 전
      status: 'approved',
    },
    {
      participantId: '1',
      review: '인생의 덧없음과 아름다움을 동시에 느꼈습니다.',
      dailyQuestion: '독서가 당신의 삶에 어떤 영향을 주나요?',
      dailyAnswer: '더 넓은 시각으로 세상을 바라볼 수 있게 해줍니다.\n다양한 관점과 경험을 간접적으로 체험하면서 편견에서 벗어나고 공감 능력이 높아지는 것을 느껴요.\n또한 삶의 의미와 방향성에 대해 깊이 고민하게 되면서 더 성숙한 사람이 되어가는 것 같아요.',
      bookImageUrl: 'https://picsum.photos/seed/book4/800/600',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)), // 7일 전
      status: 'approved',
    },
    {
      participantId: '3', // 구종
      review: '기술의 발전이 인간성에 미치는 영향에 대해 많이 생각하게 되었습니다.',
      dailyQuestion: '당신에게 독서란 무엇인가요?',
      dailyAnswer: '질문을 던지고 답을 찾아가는 여정입니다.\n책은 단순히 정보를 제공하는 것이 아니라, 내가 가진 생각의 틀을 깨고 새로운 관점을 열어줘요.\n읽는 동안 끊임없이 질문하고, 때론 답을 찾고, 때론 더 큰 의문을 품으면서 사고가 깊어지는 것을 느낍니다.',
      bookImageUrl: 'https://picsum.photos/seed/book5/800/600',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)), // 3일 전
      status: 'approved',
    },
    {
      participantId: '3',
      review: '철학적 질문들이 머릿속을 떠나지 않네요. 좋은 의미로요.',
      dailyQuestion: '오늘 하루 중 가장 기억에 남는 순간은?',
      dailyAnswer: '출퇴근길 지하철에서 책에 빠져 내릴 역을 놓칠 뻔한 순간.\n책 속 이야기가 너무 흥미진진해서 시간 가는 줄 몰랐어요. 알람이 울려서 간신히 내렸죠.\n일상의 지루함이 책 한 권으로 완전히 다른 세계로 바뀌는 마법 같은 경험이었습니다.',
      bookImageUrl: 'https://picsum.photos/seed/book6/800/600',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)), // 6일 전
      status: 'approved',
    },
    {
      participantId: '2', // 다진
      review: '주인공의 성장 과정이 제 모습과 많이 닮아있어서 놀랐어요.',
      dailyQuestion: '당신에게 독서란 무엇인가요?',
      dailyAnswer: '나 자신을 이해하는 도구이자, 위로받는 시간입니다.\n책 속 인물들의 이야기를 통해 내 감정과 생각을 객관적으로 바라볼 수 있게 돼요.\n힘들 때 책을 읽으면 혼자가 아니라는 걸 느끼고, 나만의 방식으로 문제를 해결해 나갈 용기를 얻습니다.',
      bookImageUrl: 'https://picsum.photos/seed/book7/800/600',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)), // 4일 전
      status: 'approved',
    },
    {
      participantId: '2',
      review: '감동적인 결말에 눈물이 났습니다. 오랜만에 이렇게 울어봤네요.',
      dailyQuestion: '책에서 가장 공감한 구절은?',
      dailyAnswer: '"완벽하지 않아도 괜찮아" - 이 말이 너무 필요했어요.\n늘 완벽해야 한다는 강박에 시달리던 제게 이 문장은 해방구 같았어요.\n불완전함을 인정하고 받아들이는 것이 진정한 성장의 시작이라는 걸 깨달았습니다.',
      bookImageUrl: 'https://picsum.photos/seed/book8/800/600',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)), // 8일 전
      status: 'approved',
    },
  ];
}

async function seedSubmissions() {
  console.log('🌱 Starting submissions seeding...\n');

  try {
    // 기존 제출물 삭제 (선택사항)
    const existingSubmissions = await db.collection('reading_submissions').get();
    console.log(`📋 Found ${existingSubmissions.size} existing submissions`);
    
    if (existingSubmissions.size > 0) {
      console.log('🗑️  Deleting existing submissions...');
      const batch = db.batch();
      existingSubmissions.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('✅ Existing submissions deleted\n');
    }

    // 새 제출물 생성 (동적으로 최근 날짜 기준)
    const DUMMY_SUBMISSIONS = generateDummySubmissions();
    console.log('📝 Creating dummy submissions...\n');
    
    for (const submission of DUMMY_SUBMISSIONS) {
      const docRef = db.collection('reading_submissions').doc();
      const submissionDate = submission.submittedAt.toDate().toISOString().split('T')[0];
      
      await docRef.set({
        ...submission,
        participationCode: submission.participantId, // participant ID와 동일
        submissionDate,
        createdAt: submission.submittedAt,
        updatedAt: submission.submittedAt,
      });
      
      console.log(`✅ Created submission for ${submission.participantId} - ${submission.review.substring(0, 30)}...`);
    }

    console.log(`\n🎉 Successfully created ${DUMMY_SUBMISSIONS.length} submissions!`);
    console.log('\n📊 Summary:');
    console.log(`   - 1 (다은): 4 submissions`);
    console.log(`   - 2 (다진): 2 submissions`);
    console.log(`   - 3 (구종): 2 submissions`);
    
  } catch (error) {
    console.error('❌ Error seeding submissions:', error);
    throw error;
  }
}

// Run the seeding
seedSubmissions()
  .then(() => {
    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to seed submissions:', error);
    process.exit(1);
  });

