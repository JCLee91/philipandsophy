
import { useToast } from '@/hooks/use-toast';

type LockType = 'review' | 'answer' | 'profile';

export function useLockedToast() {
  const { toast } = useToast();

  const showLockedToast = (type: LockType) => {
    const config = {
      review: {
        title: '감상평 잠김 🔒',
        description: '오늘의 독서를 인증하면 다른 멤버들의 감상평을 볼 수 있어요'
      },
      answer: {
        title: '답변 잠김 🔒',
        description: '오늘의 독서를 인증하면 다른 멤버들의 답변을 볼 수 있어요'
      },
      profile: {
        title: '프로필 잠김 🔒',
        description: '오늘의 독서를 인증하면 다른 멤버들의 프로필북을 볼 수 있어요'
      }
    };

    const { title, description } = config[type];

    toast({
      title,
      description,
    });
  };

  return { showLockedToast };
}

