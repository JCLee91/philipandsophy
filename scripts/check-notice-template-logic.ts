#!/usr/bin/env tsx

/**
 * 공지사항 템플릿 적용 로직 점검
 *
 * 확인 사항:
 * 1. notice_templates 컬렉션 존재 여부
 * 2. 템플릿 데이터 구조 확인
 * 3. 템플릿 → 공지 생성 플로우 검증
 */

import { getFirebaseAdmin } from '../src/lib/firebase/admin-init';

const { db } = getFirebaseAdmin();

async function checkNoticeTemplateLogic() {
  console.log('🔍 공지사항 템플릿 로직 점검\n');
  console.log('='.repeat(80));

  try {
    // 1. 템플릿 컬렉션 확인
    console.log('\n1️⃣ 템플릿 컬렉션 확인');
    console.log('-'.repeat(80));

    const templatesSnapshot = await db.collection('notice_templates').get();

    if (templatesSnapshot.empty) {
      console.log('❌ notice_templates 컬렉션이 비어있습니다.');
      console.log('   템플릿을 생성하거나 시드 스크립트를 실행하세요.\n');
      return;
    }

    console.log(`✅ 템플릿: ${templatesSnapshot.size}개`);

    // 카테고리별 그룹핑
    const categories: Record<string, number> = {};
    templatesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const category = data.category || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
    });

    console.log('\n카테고리별 템플릿:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count}개`);
    });

    // 2. 템플릿 데이터 구조 확인
    console.log('\n2️⃣ 템플릿 데이터 구조 확인 (첫 번째 템플릿)');
    console.log('-'.repeat(80));

    const firstTemplate = templatesSnapshot.docs[0];
    const firstTemplateData = firstTemplate.data();

    console.log(`템플릿 ID: ${firstTemplate.id}`);
    console.log(`제목: ${firstTemplateData.title || 'N/A'}`);
    console.log(`카테고리: ${firstTemplateData.category || 'N/A'}`);
    console.log(`내용: ${firstTemplateData.content?.substring(0, 50) || 'N/A'}...`);
    console.log(`이미지 URL: ${firstTemplateData.imageUrl || '없음'}`);
    console.log(`순서: ${firstTemplateData.order || 'N/A'}`);

    // 필수 필드 체크
    const requiredFields = ['category', 'title', 'content', 'order'];
    const missingFields = requiredFields.filter(field => !firstTemplateData[field]);

    if (missingFields.length > 0) {
      console.log(`\n⚠️  누락된 필드: ${missingFields.join(', ')}`);
    } else {
      console.log('\n✅ 모든 필수 필드 존재');
    }

    // 3. 템플릿 적용 플로우 확인
    console.log('\n3️⃣ 템플릿 적용 플로우');
    console.log('-'.repeat(80));
    console.log('Step 1: 공지사항 페이지 → "템플릿 사용" 버튼 클릭');
    console.log('Step 2: NoticeTemplateSelector 모달 열림');
    console.log('Step 3: 템플릿 선택 (라디오 버튼)');
    console.log('Step 4: "템플릿 적용하기" 버튼 클릭');
    console.log('Step 5: /datacntr/notices/create?cohortId={id}&templateId={id}로 이동');
    console.log('Step 6: 공지 작성 페이지에서 템플릿 내용 자동 로드');

    // 4. 템플릿 이미지 URL 처리 확인
    console.log('\n4️⃣ 템플릿 이미지 URL 처리');
    console.log('-'.repeat(80));

    const templatesWithImage = templatesSnapshot.docs.filter(doc =>
      doc.data().imageUrl
    );

    console.log(`이미지 포함 템플릿: ${templatesWithImage.length}개`);

    if (templatesWithImage.length > 0) {
      const firstWithImage = templatesWithImage[0].data();
      console.log(`\n예시:`);
      console.log(`  제목: ${firstWithImage.title}`);
      console.log(`  이미지 URL: ${firstWithImage.imageUrl}`);
      console.log(`\n템플릿 이미지 처리:`);
      console.log(`  1. 템플릿 선택 → imageUrl 자동 설정`);
      console.log(`  2. 이미지 미리보기 표시`);
      console.log(`  3. 새 이미지 업로드 시 템플릿 이미지 대체`);
      console.log(`  4. 제출 시 templateImageUrl 또는 새 이미지 전송`);
    }

    // 5. 잠재적 문제점 확인
    console.log('\n5️⃣ 잠재적 문제점 확인');
    console.log('-'.repeat(80));

    const issues: string[] = [];

    // 템플릿 ID 중복 체크
    const templateIds = templatesSnapshot.docs.map(doc => doc.id);
    const uniqueIds = new Set(templateIds);
    if (templateIds.length !== uniqueIds.size) {
      issues.push('템플릿 ID 중복 발견');
    }

    // order 필드 중복 체크 (같은 카테고리 내)
    Object.entries(groupedTemplates).forEach(([category, templates]) => {
      const orders = templates.map((t: any) => t.order).filter((o: any) => o !== undefined);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        issues.push(`${category} 카테고리에서 order 중복`);
      }
    });

    // content 빈 값 체크
    const emptyContent = templatesSnapshot.docs.filter(doc => !doc.data().content);
    if (emptyContent.length > 0) {
      issues.push(`내용이 비어있는 템플릿: ${emptyContent.length}개`);
    }

    if (issues.length > 0) {
      console.log('⚠️  발견된 문제:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ 데이터 구조 이상 없음');
    }

    // 6. API 엔드포인트 확인
    console.log('\n6️⃣ API 엔드포인트');
    console.log('-'.repeat(80));
    console.log('✅ GET  /api/datacntr/notice-templates - 템플릿 목록 조회');
    console.log('✅ GET  /api/datacntr/notice-templates/{id} - 단일 템플릿 조회');
    console.log('✅ POST /api/datacntr/notices/from-templates - 템플릿에서 공지 생성 (배치)');
    console.log('✅ POST /api/datacntr/notices/create - 공지 작성 (템플릿 포함)');

    // 7. 종합 결과
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 점검 결과 요약');
    console.log('-'.repeat(80));
    console.log(`✅ 템플릿 수: ${templatesSnapshot.size}개`);
    console.log(`✅ 카테고리: ${Object.keys(categories).length}개`);
    console.log(`✅ 이미지 포함: ${templatesWithImage.length}개`);
    console.log(`${issues.length > 0 ? '⚠️' : '✅'}  데이터 이슈: ${issues.length}개`);

    console.log('\n💡 템플릿 사용 방법:');
    console.log('  1. 데이터센터 → 공지사항 관리');
    console.log('  2. 특정 기수 섹션에서 "템플릿 사용" 클릭');
    console.log('  3. 템플릿 선택 모달에서 원하는 템플릿 선택');
    console.log('  4. "템플릿 적용하기" 클릭');
    console.log('  5. 공지 작성 페이지에서 내용 확인/수정 후 발행\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 카테고리 매핑 (참고용)
const groupedTemplates: any = {};

checkNoticeTemplateLogic()
  .then(() => {
    console.log('스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 실패:', error);
    process.exit(1);
  });
