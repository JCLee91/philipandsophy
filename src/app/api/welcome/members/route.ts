import { NextResponse } from 'next/server';

/**
 * 더미 프로필 이미지 목록 (개인정보 보호)
 */
const DUMMY_PROFILES = {
  female: [
    'profile_female_01', 'profile_female_02', 'profile_female_03', 'profile_female_04',
    'profile_female_05', 'profile_female_07', 'profile_female_08', 'profile_female_10',
    'profile_female_11', 'profile_female_12', 'profile_female_13', 'profile_female_14',
    'profile_female_16', 'profile_female_17', 'profile_female_18', 'profile_female_19',
    'profile_female_20', 'profile_female_21', 'profile_female_22', 'profile_female_23',
    'profile_female_24', 'profile_female_25', 'profile_female_26', 'profile_female_27',
    'profile_female_28', 'profile_female_29', 'profile_female_30', 'profile_female_31',
    'profile_female_32', 'profile_female_36', 'profile_female_37',
  ],
  male: [
    'profile_male_01', 'profile_male_02', 'profile_male_03', 'profile_male_04',
    'profile_male_06', 'profile_male_07', 'profile_male_08', 'profile_male_09',
    'profile_male_10', 'profile_male_12', 'profile_male_13', 'profile_male_14',
    'profile_male_15', 'profile_male_16', 'profile_male_17', 'profile_male_18',
    'profile_male_19', 'profile_male_21', 'profile_male_22', 'profile_male_23',
    'profile_male_24', 'profile_male_25', 'profile_male_26', 'profile_male_27',
    'profile_male_29', 'profile_male_30', 'profile_male_31', 'profile_male_32',
    'profile_male_33', 'profile_male_35', 'profile_male_36', 'profile_male_39',
  ],
};

// 통계 데이터 (하드코딩 - 개인정보 보호)
const STATS = {
  total: 350,
  female: 228,
  male: 122,
};

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
 * 환영 페이지 캐러셀용 더미 멤버 데이터를 반환합니다.
 * 개인정보 보호를 위해 실제 유저 프로필 대신 더미 이미지 사용
 */
export async function GET() {
  // 더미 이미지로 멤버 데이터 생성 (여성:남성 = 228:122 비율 유지)
  const femaleProfiles = DUMMY_PROFILES.female.map((name, i) => ({
    id: `dummy-female-${i}`,
    profileImage: `/image/dummy-profiles/${name}.webp`,
  }));

  const maleProfiles = DUMMY_PROFILES.male.map((name, i) => ({
    id: `dummy-male-${i}`,
    profileImage: `/image/dummy-profiles/${name}.webp`,
  }));

  // 전체 프로필 합치고 셔플
  const allProfiles = [...femaleProfiles, ...maleProfiles];
  const shuffled = shuffleArray(allProfiles);

  // 60개 선별 (4줄 x 15개)
  const showcase = shuffled.slice(0, 60);

  return NextResponse.json({
    total: STATS.total,
    showcase,
  });
}
