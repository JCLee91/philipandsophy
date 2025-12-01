import OnboardingFlow from '@/features/onboarding/components/OnboardingFlow';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '필립앤소피 - 온보딩',
  description: '필립앤소피 독서소셜클럽 참여 안내',
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}

