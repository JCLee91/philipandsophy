export const LOCKED_TOAST_MESSAGES = {
  review: {
    title: '감상평 잠김 🔒',
    description: '오늘의 독서를 인증하면 다른 멤버들의 감상평을 볼 수 있어요',
  },
  answer: {
    title: '답변 잠김 🔒',
    description: '오늘의 독서를 인증하면 다른 멤버들의 답변을 볼 수 있어요',
  },
  profile: {
    title: '프로필 잠김 🔒',
    description: '오늘의 독서를 인증하면 다른 멤버들의 프로필북을 볼 수 있어요',
  },
  like: {
    title: '좋아요 잠김 🔒',
    description: '오늘의 독서를 인증하면 좋아요를 보낼 수 있어요',
  },
} as const;

export type LockType = keyof typeof LOCKED_TOAST_MESSAGES;
