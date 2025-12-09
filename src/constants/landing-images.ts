/**
 * 랜딩 페이지 이미지 슬롯 정의
 * 데이터센터에서 동적으로 이미지를 교체할 수 있는 슬롯들
 */

export interface ImageSlot {
  id: string;
  label: string;
  resolution: string;
  defaultImage: string;
}

export interface ImageSection {
  id: string;
  title: string;
  slots: ImageSlot[];
}

export const IMAGE_SECTIONS: ImageSection[] = [
  {
    id: 'home',
    title: '홈',
    slots: [
      { id: 'home_main_1', label: '메인 1', resolution: '1170×2400', defaultImage: '/image/landing/PnS_1.webp' },
      { id: 'home_main_2', label: '메인 2', resolution: '1170×5526', defaultImage: '/image/landing/PnS_2.webp' },
      { id: 'home_main_3', label: '메인 3', resolution: '1170×6930', defaultImage: '/image/landing/PnS_3.webp' },
    ],
  },
  {
    id: 'service',
    title: '프로그램',
    slots: [
      { id: 'service_1', label: '프로그램 1', resolution: '1170×3963', defaultImage: '/image/landing/PnS_Service_1.webp' },
      { id: 'service_2', label: '프로그램 2', resolution: '1170×5151', defaultImage: '/image/landing/PnS_Service_2.webp' },
      { id: 'service_3', label: '프로그램 3', resolution: '1170×4797', defaultImage: '/image/landing/PnS_Service_3.webp' },
    ],
  },
  {
    id: 'membership',
    title: '멤버십',
    slots: [
      { id: 'membership_1', label: '멤버십 1', resolution: '1170×4131', defaultImage: '/image/landing/PnS_Membership_1.webp' },
      { id: 'membership_2', label: '멤버십 2', resolution: '1170×4204', defaultImage: '/image/landing/PnS_Membership_2.webp' },
    ],
  },
  {
    id: 'review',
    title: '파티 후기',
    slots: [
      { id: 'review_1', label: '후기', resolution: '1170×4000', defaultImage: '/image/landing/PnS_Review_1.png' },
    ],
  },
  {
    id: 'party',
    title: '시크릿 파티',
    slots: [
      { id: 'party_1', label: '초대장 1', resolution: '1170×8022', defaultImage: '/image/landing/PnS_Members_Party_1.webp' },
      { id: 'party_2', label: '초대장 2', resolution: '1170×1161', defaultImage: '/image/landing/PnS_Members_Party_2.webp' },
    ],
  },
];
