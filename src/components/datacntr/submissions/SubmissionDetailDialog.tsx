import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatTimestampKST } from '@/lib/datacntr/timestamp';
import { getResizedImageUrl } from '@/lib/image-utils';
import { User, Calendar, BookOpen, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import type { ReadingSubmission } from '@/types/database';

interface SubmissionWithParticipant extends ReadingSubmission {
    participantName: string;
    cohortName: string;
}

interface SubmissionDetailDialogProps {
    submission: SubmissionWithParticipant | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function SubmissionDetailDialog({
    submission,
    open,
    onOpenChange,
}: SubmissionDetailDialogProps) {
    if (!submission) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-normal">
                                <User className="h-3 w-3 mr-1" />
                                {submission.participantName}
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                                {submission.cohortName}
                            </Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatTimestampKST(submission.submittedAt, 'yyyy.MM.dd HH:mm')}
                        </div>
                    </div>
                    <DialogTitle className="text-xl">{submission.bookTitle}</DialogTitle>
                    {submission.bookAuthor && (
                        <DialogDescription className="text-base mt-1">
                            {submission.bookAuthor}
                        </DialogDescription>
                    )}
                </DialogHeader>


                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* 책 이미지 */}
                        {submission.bookImageUrl && (
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                                <Image
                                    src={getResizedImageUrl(submission.bookImageUrl) || submission.bookImageUrl}
                                    alt={submission.bookTitle || 'Book Cover'}
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        )}

                        {/* 리뷰 */}
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                감상평
                            </h3>
                            <div className="bg-muted/30 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                                {submission.review}
                            </div>
                        </div>

                        {/* 가치관 질문 & 답변 */}
                        {submission.dailyQuestion && submission.dailyAnswer && (
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2 text-primary">
                                    <MessageSquare className="h-4 w-4" />
                                    오늘의 질문
                                </h3>
                                <div className="bg-primary/5 border border-primary/10 p-4 rounded-lg space-y-3">
                                    <p className="font-medium text-sm text-primary">
                                        Q. {submission.dailyQuestion}
                                    </p>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        A. {submission.dailyAnswer}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
