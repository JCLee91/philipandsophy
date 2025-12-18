import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * 이름을 마스킹합니다 (김OO, 이종O 형식)
 */
function maskName(name: string): string {
  if (!name || name.length === 0) return 'OOO';
  if (name.length === 1) return name + 'OO';
  if (name.length === 2) return name[0] + 'O' + name[1];
  // 3글자 이상: 첫 글자 + O + 마지막 글자
  return name[0] + 'O'.repeat(name.length - 2) + name[name.length - 1];
}

/**
 * 배열을 셔플합니다 (Fisher-Yates 알고리즘)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * GET /api/welcome/members
 * 환영 페이지 캐러셀용 멤버 데이터를 반환합니다.
 * 모든 기수에서 랜덤 20명을 선별합니다.
 */
export async function GET() {
  try {
    const db = getAdminDb();

    // 모든 참가자 조회 (고스트 제외)
    const participantsSnapshot = await db
      .collection('participants')
      .where('isGhost', '!=', true)
      .get();

    const allParticipants: {
      id: string;
      name: string;
      profileImage: string | null;
    }[] = [];

    participantsSnapshot.forEach((doc) => {
      const data = doc.data();
      // 프로필 이미지가 있는 멤버만 포함
      if (data.profileImageCircle || data.profileImage) {
        allParticipants.push({
          id: doc.id,
          name: data.name || '',
          profileImage: data.profileImageCircle || data.profileImage || null,
        });
      }
    });

    // 랜덤 셔플 후 20명 선별
    const shuffled = shuffleArray(allParticipants);
    const selected = shuffled.slice(0, 20);

    // 이름 마스킹 및 응답 형식 변환
    const showcase = selected.map((member) => ({
      id: member.id,
      profileImage: member.profileImage,
      displayName: maskName(member.name),
    }));

    return NextResponse.json({
      total: allParticipants.length,
      showcase,
    });
  } catch (error) {
    logger.error('Failed to fetch members for welcome page', error);
    return NextResponse.json(
      { error: '멤버 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
