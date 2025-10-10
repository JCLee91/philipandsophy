import { DirectMessage } from '@/types/database';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * 메시지 그룹 타입
 * 연속된 메시지를 하나의 그룹으로 묶어 처리
 */
export interface MessageGroup {
  senderId: string;
  messages: DirectMessage[];
  showAvatar: boolean; // 아바타 표시 여부
  showTimestamp: boolean; // 시간 표시 여부 (그룹의 마지막 메시지만)
}

/**
 * 날짜별 메시지 그룹
 */
export interface DateSection {
  date: Date;
  dateLabel: string; // "오늘", "어제", "2025년 10월 10일"
  groups: MessageGroup[];
}

/**
 * 메시지 그룹화 설정
 */
const GROUPING_CONFIG = {
  /** 같은 발신자의 메시지를 그룹화할 최대 시간 간격 (밀리초) */
  MAX_GROUP_INTERVAL: 5 * 60 * 1000, // 5분
} as const;

/**
 * 날짜 레이블 생성
 * "오늘", "어제", "2025년 10월 10일" 형식
 */
export function getDateLabel(date: Date): string {
  if (isToday(date)) {
    return '오늘';
  }
  if (isYesterday(date)) {
    return '어제';
  }
  return format(date, 'yyyy년 M월 d일', { locale: ko });
}

/**
 * 메시지 시간 포맷
 * "오후 2:30" 형식
 */
export function formatMessageTime(date: Date): string {
  return format(date, 'a h:mm', { locale: ko });
}

/**
 * 메시지를 날짜별 섹션으로 그룹화
 *
 * 그룹화 규칙:
 * 1. 날짜가 바뀌면 새로운 섹션 생성
 * 2. 같은 발신자가 5분 이내 연속 발송 시 하나의 그룹으로 묶음
 * 3. 그룹의 첫 메시지에만 아바타 표시
 * 4. 그룹의 마지막 메시지에만 시간 표시
 */
export function groupMessagesByDate(messages: DirectMessage[]): DateSection[] {
  if (messages.length === 0) return [];

  const sections: DateSection[] = [];
  let currentSection: DateSection | null = null;
  let currentGroup: MessageGroup | null = null;

  messages.forEach((msg, index) => {
    const msgDate = msg.createdAt.toDate();
    const isLastMessage = index === messages.length - 1;

    // 1. 날짜 섹션 체크
    if (!currentSection || !isSameDay(currentSection.date, msgDate)) {
      // 이전 그룹 마무리
      if (currentGroup) {
        currentGroup.showTimestamp = true;
        currentSection!.groups.push(currentGroup);
        currentGroup = null;
      }

      // 새 섹션 생성
      currentSection = {
        date: msgDate,
        dateLabel: getDateLabel(msgDate),
        groups: [],
      };
      sections.push(currentSection);
    }

    // 2. 메시지 그룹화
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const shouldStartNewGroup =
      !currentGroup ||
      currentGroup.senderId !== msg.senderId ||
      (prevMsg && msgDate.getTime() - prevMsg.createdAt.toDate().getTime() > GROUPING_CONFIG.MAX_GROUP_INTERVAL);

    if (shouldStartNewGroup) {
      // 이전 그룹 마무리
      if (currentGroup) {
        currentGroup.showTimestamp = true;
        currentSection.groups.push(currentGroup);
      }

      // 새 그룹 시작
      currentGroup = {
        senderId: msg.senderId,
        messages: [msg],
        showAvatar: true, // 그룹의 첫 메시지는 아바타 표시
        showTimestamp: false, // 일단 false, 그룹 종료 시 마지막 메시지만 true
      };
    } else {
      // 기존 그룹에 추가
      currentGroup!.messages.push(msg);
    }

    // 3. 마지막 메시지 처리
    if (isLastMessage && currentGroup) {
      currentGroup.showTimestamp = true;
      currentSection.groups.push(currentGroup);
    }
  });

  return sections;
}
