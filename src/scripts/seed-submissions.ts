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
      bookTitle: 'Company of One',
      bookAuthor: 'Paul Jarvis',
      review: '작은 것이 아름답다는 메시지가 마음에 와닿았습니다. 무한 성장보다 지속가능성이 더 중요하다는 걸 깨달았어요.',
      dailyQuestion: '당신에게 독서란 무엇인가요?',
      dailyAnswer: '새로운 세계로의 초대장이자, 나를 성장시키는 거울입니다.\n책을 읽을 때마다 내가 몰랐던 세상과 만나게 되고, 그 안에서 새로운 나를 발견하게 돼요.\n때로는 위로를, 때로는 용기를 얻으며 한 걸음씩 성장해 나가는 것 같아요.',
      bookImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)), // 1일 전
      status: 'approved',
    },
    {
      participantId: '1',
      bookTitle: 'Atomic Habits',
      bookAuthor: 'James Clear',
      review: '작은 습관의 복리 효과에 대해 눈을 뜨게 되었습니다. 1% 개선의 힘을 실천해보려고 합니다.',
      dailyQuestion: '오늘 하루 중 가장 기억에 남는 순간은?',
      dailyAnswer: '책을 읽다가 문득 창밖을 바라본 순간. 햇살이 따뜻했어요.\n글 속 주인공의 고민과 내 일상이 묘하게 겹치면서 현실과 책 속 세계가 하나로 느껴졌어요.\n그 순간의 고요함과 깨달음이 오래도록 마음에 남을 것 같습니다.',
      bookImageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)), // 2일 전
      status: 'approved',
    },
    {
      participantId: '1',
      bookTitle: 'Cosmos',
      bookAuthor: 'Carl Sagan',
      review: '우주의 광활함 앞에서 인간의 존재가 얼마나 작은지, 동시에 얼마나 특별한지 깨달았어요.',
      dailyQuestion: '책에서 가장 공감한 구절은?',
      dailyAnswer: '"우리는 모두 별먼지로 이루어져 있다" - 이 문장이 계속 마음에 남아요.\n우주적 관점에서 보면 우리의 고민은 정말 작은 것이지만, 동시에 우리 모두가 특별한 존재라는 걸 느끼게 해줘요.\n일상의 스트레스 속에서도 이 문장을 떠올리면 마음이 한결 가벼워집니다.',
      bookImageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)), // 5일 전
      status: 'approved',
    },
    {
      participantId: '1',
      bookTitle: 'The Alchemist',
      bookAuthor: 'Paulo Coelho',
      review: '자신의 전설을 찾아가는 여정. 삶의 목적에 대해 다시 생각하게 되었습니다.',
      dailyQuestion: '독서가 당신의 삶에 어떤 영향을 주나요?',
      dailyAnswer: '더 넓은 시각으로 세상을 바라볼 수 있게 해줍니다.\n다양한 관점과 경험을 간접적으로 체험하면서 편견에서 벗어나고 공감 능력이 높아지는 것을 느껴요.\n또한 삶의 의미와 방향성에 대해 깊이 고민하게 되면서 더 성숙한 사람이 되어가는 것 같아요.',
      bookImageUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=800',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)), // 7일 전
      status: 'approved',
    },
    {
      participantId: '3', // 구종
      bookTitle: 'Sapiens',
      bookAuthor: 'Yuval Noah Harari',
      review: '인류 역사를 거시적으로 조망하며 현재를 이해하게 되었습니다. 미래에 대한 통찰도 얻었어요.',
      dailyQuestion: '당신에게 독서란 무엇인가요?',
      dailyAnswer: '질문을 던지고 답을 찾아가는 여정입니다.\n책은 단순히 정보를 제공하는 것이 아니라, 내가 가진 생각의 틀을 깨고 새로운 관점을 열어줘요.\n읽는 동안 끊임없이 질문하고, 때론 답을 찾고, 때론 더 큰 의문을 품으면서 사고가 깊어지는 것을 느낍니다.',
      bookImageUrl: 'https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=800',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)), // 3일 전
      status: 'approved',
    },
    {
      participantId: '3',
      bookTitle: 'Thinking, Fast and Slow',
      bookAuthor: 'Daniel Kahneman',
      review: '인간의 사고 체계를 이해하게 되었습니다. 빠른 직관과 느린 논리, 둘 다 중요하네요.',
      dailyQuestion: '오늘 하루 중 가장 기억에 남는 순간은?',
      dailyAnswer: '출퇴근길 지하철에서 책에 빠져 내릴 역을 놓칠 뻔한 순간.\n책 속 이야기가 너무 흥미진진해서 시간 가는 줄 몰랐어요. 알람이 울려서 간신히 내렸죠.\n일상의 지루함이 책 한 권으로 완전히 다른 세계로 바뀌는 마법 같은 경험이었습니다.',
      bookImageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)), // 6일 전
      status: 'approved',
    },
    {
      participantId: '2', // 다진
      bookTitle: 'Educated',
      bookAuthor: 'Tara Westover',
      review: '교육의 힘과 자기 발견의 여정이 깊은 감동을 주었습니다. 용기를 얻었어요.',
      dailyQuestion: '당신에게 독서란 무엇인가요?',
      dailyAnswer: '나 자신을 이해하는 도구이자, 위로받는 시간입니다.\n책 속 인물들의 이야기를 통해 내 감정과 생각을 객관적으로 바라볼 수 있게 돼요.\n힘들 때 책을 읽으면 혼자가 아니라는 걸 느끼고, 나만의 방식으로 문제를 해결해 나갈 용기를 얻습니다.',
      bookImageUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800',
      submittedAt: Timestamp.fromDate(new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)), // 4일 전
      status: 'approved',
    },
    {
      participantId: '2',
      bookTitle: 'The Gifts of Imperfection',
      bookAuthor: 'Brené Brown',
      review: '완벽주의에서 벗어나 진정한 자신을 사랑하는 법을 배웠습니다. 감사한 책이에요.',
      dailyQuestion: '책에서 가장 공감한 구절은?',
      dailyAnswer: '"완벽하지 않아도 괜찮아" - 이 말이 너무 필요했어요.\n늘 완벽해야 한다는 강박에 시달리던 제게 이 문장은 해방구 같았어요.\n불완전함을 인정하고 받아들이는 것이 진정한 성장의 시작이라는 걸 깨달았습니다.',
      bookImageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
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

