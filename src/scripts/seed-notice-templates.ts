#!/usr/bin/env tsx
/**
 * 공지 템플릿 시드 스크립트
 *
 * 사용법:
 * npm run seed:notice-templates
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS, NoticeTemplate } from '@/types/database';
import { Timestamp } from 'firebase-admin/firestore';

const db = getAdminDb();

// 기본 공지 템플릿
const TEMPLATES = [
  // 온보딩 (3개)
  {
    id: 'welcome-guide',
    category: 'onboarding' as const,
    title: '프로그램 시작 안내',
    content: `안녕하세요! 필립앤소피에 오신 것을 환영합니다. 🎉

앞으로 2주간 함께 책을 읽고 서로의 생각을 나누는 시간을 갖게 됩니다.

**프로그램 일정**
- 기간: 14일간
- 매일: 독서 인증 + 질문 답변
- 오전 10시: 오늘의 매칭 발표
- 프로필 페이지에서 매칭된 분들의 생각을 확인할 수 있습니다.

**참여 방법**
1. 매일 책을 읽고 인증샷 업로드
2. 오늘의 질문에 답변 작성
3. 매칭된 분들의 프로필 확인
4. 마음에 드는 분께 DM 보내기

즐거운 독서 여정이 되길 바랍니다! 📚`,
    order: 1,
  },
  {
    id: 'first-matching',
    category: 'onboarding' as const,
    title: '첫 매칭 안내',
    content: `오늘부터 매칭이 시작됩니다! 🎯

**매칭 시스템**
- 매일 오전 10시에 새로운 매칭 발표
- 비슷한 성향 2명 + 다른 성향 2명
- 프로필 페이지에서 매칭 이유 확인 가능

**프로필 확인 방법**
1. 채팅 → 오늘의 서재 클릭
2. 매칭된 분의 이름 클릭
3. 프로필, 독서 인증, 답변 확인

**DM 보내기**
- 프로필 우측 상단 DM 아이콘 클릭
- 자유롭게 대화 시작!

좋은 만남이 되길 바랍니다. 😊`,
    order: 2,
  },
  {
    id: 'daily-routine',
    category: 'onboarding' as const,
    title: '일일 루틴 소개',
    content: `매일의 루틴을 소개합니다! ⏰

**아침 (기상 후)**
1. 오늘의 질문 확인
2. 책 읽기 (최소 10분)
3. 독서 인증 + 질문 답변

**오전 10시**
- 오늘의 매칭 발표
- 매칭된 분들 프로필 확인

**저녁 (취침 전)**
- 매칭된 분들의 답변 읽어보기
- 마음에 드는 분께 DM 보내기
- 내일 읽을 책 준비

**Tip**
- 독서 인증은 00:00~01:59 (다음날 새벽 2시)까지 가능
- 늦어도 괜찮아요, 자신의 페이스대로!

꾸준함이 만드는 변화를 경험해보세요. 📖`,
    order: 3,
  },

  // 가이드 (3개)
  {
    id: 'reading-certification',
    category: 'guide' as const,
    title: '독서 인증 방법',
    content: `독서 인증 방법을 안내드립니다! 📸

**인증 방법**
1. 채팅 → "독서 인증" 버튼 클릭
2. 책과 함께 찍은 사진 업로드
   - 책 표지가 보이게
   - 혹은 내가 읽은 페이지
3. 오늘의 질문 답변 작성
4. 제출 완료!

**사진 가이드**
✅ 좋은 예시
- 책 표지가 선명하게 나온 사진
- 내가 읽은 부분이 보이는 사진
- 북마크, 메모와 함께

❌ 피해주세요
- 너무 흐릿한 사진
- 책과 무관한 사진

**질문 답변 Tip**
- 솔직하게, 자신의 언어로
- 길이 제한 없음
- 오늘 읽은 내용과 연결해도 좋아요

매일의 기록이 쌓여 나만의 독서 아카이브가 됩니다. ✨`,
    order: 1,
  },
  {
    id: 'profile-tips',
    category: 'guide' as const,
    title: '프로필 작성 팁',
    content: `매력적인 프로필 작성 팁! 💫

**프로필 사진**
- 얼굴이 잘 보이는 자연스러운 사진
- 밝고 선명한 사진
- 최근 사진 권장

**자기소개**
- 나를 표현하는 키워드 3가지
- 요즘 관심사나 취미
- 어떤 사람과 이야기 나누고 싶은지

**좋은 프로필 예시**
"책 읽고 산책하는 걸 좋아하는 디자이너입니다.
요즘은 심리학 책에 빠져있어요.
비슷한 관심사를 가진 분들과 이야기 나누고 싶습니다!"

**Tip**
- 너무 형식적이지 않게
- 나만의 개성을 담아서
- 정기적으로 업데이트

프로필은 첫인상입니다. 나를 잘 드러내보세요! 😊`,
    order: 2,
  },
  {
    id: 'chat-guide',
    category: 'guide' as const,
    title: '채팅 사용법',
    content: `채팅 기능 사용법을 안내드립니다! 💬

**DM 보내기**
1. 프로필 페이지 → 우측 상단 DM 아이콘
2. 메시지 입력 후 전송
3. 실시간 대화 가능

**대화 시작 Tip**
- 프로필이나 답변 내용 언급하기
  "오늘 답변 읽었는데 공감됐어요!"
- 공통 관심사로 시작하기
  "저도 그 책 읽었는데..."
- 질문으로 시작하기
  "어떤 책 추천하시나요?"

**대화 에티켓**
✅ 좋아요
- 상대방 답변/관심사에 관심 표현
- 열린 질문으로 대화 이어가기
- 적절한 반응과 공감

❌ 피해주세요
- 너무 사적인 질문
- 일방적인 대화
- 답장 강요

좋은 대화가 좋은 인연을 만듭니다. 🌟`,
    order: 3,
  },

  // 마일스톤 (2개)
  {
    id: 'midpoint-check',
    category: 'milestone' as const,
    title: '중간 점검 (7일차)',
    content: `벌써 일주일이 지났습니다! 🎉

**지금까지 어떠셨나요?**
- 7일간의 독서 인증 완료
- 14개의 답변 작성
- 여러 분들과의 매칭
- 새로운 인연들

**남은 일주일**
- 더 깊이 있는 대화 나눠보기
- 아직 DM 못 보낸 분께 용기내기
- 꾸준히 독서 인증 이어가기

**중간 점검 질문**
1. 가장 기억에 남는 매칭은?
2. 어떤 책/답변이 인상 깊었나요?
3. 프로그램을 통해 발견한 것은?

반환점을 돌았습니다.
남은 여정도 의미있게 만들어가세요! 📚✨`,
    order: 1,
  },
  {
    id: 'final-day',
    category: 'milestone' as const,
    title: '마지막 날 안내 (14일차)',
    content: `드디어 마지막 날입니다! 🎊

**14일간의 여정**
- 14일 독서 인증
- 28개 질문 답변
- 수많은 매칭과 대화
- 새로운 인연들

**오늘은 특별한 날**
- 모든 프로필 열람 가능
- 그동안 못 본 분들도 확인 가능
- 마지막 인사 나누기

**프로그램 이후**
- 연락처 교환 (선택)
- 독서 모임 지속 (선택)
- 각자의 일상으로

**감사의 말**
2주간 함께해주셔서 감사합니다.
이 프로그램이 여러분의 삶에
작은 변화와 좋은 인연을
가져다주었기를 바랍니다.

앞으로도 계속 읽고, 생각하고,
나누는 삶을 살아가시길! 📚💕

- 필립앤소피 팀 드림`,
    order: 2,
  },
];

async function seedNoticeTemplates() {
  try {
    console.log('📚 공지 템플릿 시드 시작...\n');

    const batch = db.batch();
    let count = 0;

    for (const template of TEMPLATES) {
      const docRef = db.collection(COLLECTIONS.NOTICE_TEMPLATES).doc(template.id);

      batch.set(docRef, {
        category: template.category,
        title: template.title,
        content: template.content,
        order: template.order,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`  ✅ ${template.title} (${template.category})`);
      count++;
    }

    await batch.commit();

    console.log('\n✨ 템플릿 시드 완료!');
    console.log(`\n📋 생성된 템플릿: ${count}개`);
    console.log('🎓 온보딩: 3개');
    console.log('📖 가이드: 3개');
    console.log('🎯 마일스톤: 2개');

    process.exit(0);
  } catch (error) {
    console.error('❌ 템플릿 시드 중 오류 발생:', error);
    process.exit(1);
  }
}

seedNoticeTemplates();
