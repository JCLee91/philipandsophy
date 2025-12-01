'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormSelect from '@/components/datacntr/form/FormSelect';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant || !user) return;

    try {
      setIsLoading(true);
      const idToken = await user.getIdToken();

      const response = await fetch(`/api/datacntr/participants/${participant.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          gender: formData.gender || null, // Empty string means null (remove gender)
          occupation: formData.occupation || null, // Empty string means null (remove occupation)
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
      console.error('Update failed:', error);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>참가자 정보 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

