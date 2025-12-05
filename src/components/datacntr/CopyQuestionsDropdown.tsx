import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UnifiedButton } from '@/components/common';
import { Copy, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CohortSimple {
  id: string;
  name: string;
}

interface CopyQuestionsDropdownProps {
  onCopy: (sourceCohortId: string) => Promise<void>;
}

export default function CopyQuestionsDropdown({ onCopy }: CopyQuestionsDropdownProps) {
  const { user } = useAuth();
  const [cohorts, setCohorts] = useState<CohortSimple[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchCohorts = async () => {
      setIsLoading(true);
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/datacntr/cohorts/list', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          setCohorts(data.cohorts);
        }
      } catch (error) {
        console.error('Failed to fetch cohorts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCohorts();
  }, [user]);

  const handleSelect = async (cohortId: string) => {
    setIsCopying(true);
    await onCopy(cohortId);
    setIsCopying(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <UnifiedButton
          variant="outline"
          size="sm"
          disabled={isLoading || isCopying}
          loading={isCopying}
          icon={!isCopying ? <Copy className="h-4 w-4" /> : undefined}
        >
          다른 기수에서 복사
        </UnifiedButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isLoading ? (
          <div className="p-2 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : cohorts.length === 0 ? (
          <div className="p-2 text-sm text-gray-500 text-center">
            복사할 기수가 없습니다
          </div>
        ) : (
          cohorts.map((cohort) => (
            <DropdownMenuItem 
              key={cohort.id} 
              onClick={() => handleSelect(cohort.id)}
            >
              {cohort.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

