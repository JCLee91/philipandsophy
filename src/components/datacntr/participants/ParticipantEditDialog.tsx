'use client';

import { useEffect, useState } from 'react';
import { DialogBase } from '@/components/common/dialogs';
import { UnifiedButton } from '@/components/common/buttons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormSelect from '@/components/datacntr/form/FormSelect';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ParticipantEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  participant: {
    id: string;
    name?: string;
    phoneNumber?: string;
    gender?: string;
    cohortId?: string;
    occupation?: string;
  } | null;
  onSuccess: () => void;
}

export default function ParticipantEditDialog({
  isOpen,
  onClose,
  participant,
  onSuccess,
}: ParticipantEditDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    gender: '',
    occupation: '',
  });

  useEffect(() => {
    if (participant && isOpen) {
      setFormData({
        name: participant.name || '',
        phoneNumber: participant.phoneNumber || '',
        gender: participant.gender || '',
        occupation: participant.occupation || '',
      });
    }
  }, [participant, isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!participant || !user) return;

    try {
      setIsLoading(true);
      const idToken = await user.getIdToken();

      const response = await fetch(`/api/datacntr/participants/${participant.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          gender: formData.gender || null,
          occupation: formData.occupation || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '업데이트 실패');
      }

      toast({
        title: '수정 완료',
        description: '참가자 정보가 성공적으로 수정되었습니다.',
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: '수정 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogBase
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="참가자 정보 수정"
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <UnifiedButton variant="secondary" onClick={onClose} disabled={isLoading}>
            취소
          </UnifiedButton>
          <UnifiedButton onClick={() => handleSubmit()} loading={isLoading} loadingText="저장 중...">
            저장
          </UnifiedButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="이름 입력"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">전화번호</Label>
          <Input
            id="phone"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="010-0000-0000"
          />
        </div>
        <div className="space-y-2">
          <FormSelect
            label="성별"
            value={formData.gender}
            onChange={(value) => setFormData({ ...formData, gender: value })}
            options={[
              { value: 'male', label: '남성' },
              { value: 'female', label: '여성' },
              { value: 'other', label: '기타' },
            ]}
            placeholder="성별 선택"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="occupation">직업</Label>
          <Input
            id="occupation"
            value={formData.occupation}
            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            placeholder="예: 소프트웨어 엔지니어"
          />
        </div>
      </form>
    </DialogBase>
  );
}
