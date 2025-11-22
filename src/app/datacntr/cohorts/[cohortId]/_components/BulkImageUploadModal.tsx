'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, X, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { CohortParticipant } from '@/types/datacntr';
import { uploadFileWithProgress } from '@/lib/firebase/storage';
import { updateParticipant } from '@/lib/firebase/participants';
import { STORAGE_PATHS, generateStorageFileName } from '@/constants/storage';
import { useToast } from '@/hooks/use-toast';

interface BulkImageUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    cohortId: string;
    participants: CohortParticipant[];
    onSuccess: () => void;
}

type ImageType = 'profileImage' | 'profileImageCircle' | 'faceImage';

interface PendingUploads {
    [participantId: string]: {
        [key in ImageType]?: File;
    };
}

interface UploadProgress {
    [participantId: string]: {
        status: 'pending' | 'uploading' | 'success' | 'error';
        progress: number; // 0-100 (overall for this participant)
        error?: string;
    };
}

export default function BulkImageUploadModal({
    isOpen,
    onClose,
    cohortId,
    participants,
    onSuccess,
}: BulkImageUploadModalProps) {
    const { toast } = useToast();
    const [pendingUploads, setPendingUploads] = useState<PendingUploads>({});
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = (participantId: string, type: ImageType, file: File) => {
        if (!file.type.startsWith('image/')) {
            toast({
                variant: "destructive",
                title: "오류",
                description: "이미지 파일만 업로드 가능합니다.",
            });
            return;
        }

        setPendingUploads((prev) => ({
            ...prev,
            [participantId]: {
                ...prev[participantId],
                [type]: file,
            },
        }));
    };

    const removeFile = (participantId: string, type: ImageType) => {
        setPendingUploads((prev) => {
            const newUploads = { ...prev };
            if (newUploads[participantId]) {
                delete newUploads[participantId][type];
                if (Object.keys(newUploads[participantId]).length === 0) {
                    delete newUploads[participantId];
                }
            }
            return newUploads;
        });
    };

    const handleDrop = (e: React.DragEvent, participantId: string, type: ImageType) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(participantId, type, e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleUploadAll = async () => {
        const participantsToUpload = Object.keys(pendingUploads);
        if (participantsToUpload.length === 0) return;

        setIsUploading(true);

        // Initialize progress
        const initialProgress: UploadProgress = {};
        participantsToUpload.forEach(id => {
            initialProgress[id] = { status: 'pending', progress: 0 };
        });
        setUploadProgress(initialProgress);

        // Process sequentially or in small batches to avoid overwhelming the browser/network
        // For now, let's do 3 concurrent uploads
        const BATCH_SIZE = 3;

        for (let i = 0; i < participantsToUpload.length; i += BATCH_SIZE) {
            const batch = participantsToUpload.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (participantId) => {
                const uploads = pendingUploads[participantId];
                if (!uploads) return;

                setUploadProgress(prev => ({
                    ...prev,
                    [participantId]: { status: 'uploading', progress: 0 }
                }));

                try {
                    const updateData: Partial<CohortParticipant> = {};
                    const totalFiles = Object.keys(uploads).length;
                    let completedFiles = 0;

                    for (const [type, file] of Object.entries(uploads)) {
                        if (!file) continue;

                        // Deterministic filename for overwrite behavior
                        // Name format: {type}_{participantId}.{extension}
                        const extension = file.name.split('.').pop() || '';
                        const fixedFileName = `${type}_${participantId}.${extension}`;

                        // Path: cohorts/{cohortId}/profiles/{fixedFileName}
                        const path = `cohorts/${cohortId}/profiles/${fixedFileName}`;

                        const downloadUrl = await uploadFileWithProgress(file, path);
                        updateData[type as ImageType] = downloadUrl;

                        completedFiles++;
                        setUploadProgress(prev => ({
                            ...prev,
                            [participantId]: {
                                status: 'uploading',
                                progress: (completedFiles / totalFiles) * 100
                            }
                        }));
                    }

                    // Update Firestore
                    await updateParticipant(participantId, updateData);

                    setUploadProgress(prev => ({
                        ...prev,
                        [participantId]: { status: 'success', progress: 100 }
                    }));

                    // Remove from pending uploads on success
                    setPendingUploads(prev => {
                        const next = { ...prev };
                        delete next[participantId];
                        return next;
                    });

                } catch (error) {
                    console.error(`Failed to upload for participant ${participantId}:`, error);
                    setUploadProgress(prev => ({
                        ...prev,
                        [participantId]: {
                            status: 'error',
                            progress: 0,
                            error: '업로드 실패'
                        }
                    }));
                }
            }));
        }

        setIsUploading(false);
        toast({
            title: "완료",
            description: "업로드가 완료되었습니다.",
        });
        onSuccess();
    };

    const DropZone = ({ participantId, type, label, existingUrl }: { participantId: string, type: ImageType, label: string, existingUrl?: string }) => {
        const file = pendingUploads[participantId]?.[type];
        const progress = uploadProgress[participantId];
        const isSuccess = progress?.status === 'success';
        const isError = progress?.status === 'error';

        return (
            <div
                onDrop={(e) => !isUploading && handleDrop(e, participantId, type)}
                onDragOver={handleDragOver}
                className={`
          relative w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-2 transition-colors
          ${file ? 'border-blue-500 bg-blue-50' : existingUrl ? 'border-green-200 bg-green-50/30' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isSuccess ? 'border-green-500 bg-green-50' : ''}
          ${isError ? 'border-red-500 bg-red-50' : ''}
        `}
            >
                {!file && !isSuccess && !existingUrl && (
                    <>
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    handleFileSelect(participantId, type, e.target.files[0]);
                                }
                            }}
                            disabled={isUploading}
                        />
                        <Upload className="h-5 w-5 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">{label}</span>
                    </>
                )}

                {/* Existing Image Display (when no new file selected) */}
                {!file && !isSuccess && existingUrl && (
                    <div className="relative w-full h-full group">
                        <img
                            src={existingUrl}
                            alt="Existing"
                            className="w-full h-full object-contain rounded-lg bg-gray-100 opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    handleFileSelect(participantId, type, e.target.files[0]);
                                }
                            }}
                            disabled={isUploading}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-0.5 rounded-b-lg">
                            기존 이미지
                        </div>
                    </div>
                )}

                {file && !isSuccess && (
                    <div className="relative w-full h-full group">
                        <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            className="w-full h-full object-contain rounded-lg bg-gray-100"
                            onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                        />
                        {!isUploading && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(participantId, type);
                                }}
                                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-gray-200 hover:bg-gray-100 z-20"
                            >
                                <X className="h-3 w-3 text-gray-500" />
                            </button>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
                            <span className="text-xs text-white font-medium truncate px-2 max-w-full">
                                {file.name}
                            </span>
                        </div>
                    </div>
                )}

                {isSuccess && (
                    <div className="flex flex-col items-center justify-center text-green-600">
                        <CheckCircle2 className="h-6 w-6 mb-1" />
                        <span className="text-xs font-medium">완료</span>
                    </div>
                )}

                {isError && (
                    <div className="flex flex-col items-center justify-center text-red-600">
                        <AlertCircle className="h-6 w-6 mb-1" />
                        <span className="text-xs font-medium">실패</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isUploading && !open && onClose()}>
            <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>참가자 프로필 이미지 일괄 업로드</DialogTitle>
                    <DialogDescription>
                        각 참가자의 프로필 이미지를 드래그 앤 드롭하여 업로드하세요.
                        <br />
                        <span className="text-xs text-gray-500">
                            * 파일은 자동으로 이름이 변경되어 저장됩니다.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden border rounded-md">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white z-10">
                                <TableRow>
                                    <TableHead className="w-[200px]">참가자 정보</TableHead>
                                    <TableHead>프로필 카드 (메인)</TableHead>
                                    <TableHead>원형 프로필 (작은)</TableHead>
                                    <TableHead>원본 이미지 (큰)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {participants.map((participant) => (
                                    <TableRow key={participant.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{participant.name}</span>
                                                <span className="text-xs text-gray-500">{participant.phoneNumber}</span>
                                                {participant.participationCode && (
                                                    <span className="text-xs text-gray-400">Code: {participant.participationCode}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DropZone
                                                participantId={participant.id}
                                                type="profileImage"
                                                label="프로필 카드"
                                                existingUrl={participant.profileImage}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <DropZone
                                                participantId={participant.id}
                                                type="profileImageCircle"
                                                label="원형 프로필"
                                                existingUrl={participant.profileImageCircle}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <DropZone
                                                participantId={participant.id}
                                                type="faceImage"
                                                label="원본 이미지"
                                                existingUrl={participant.faceImage}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                <DialogFooter className="mt-4">
                    <div className="flex items-center justify-between w-full">
                        <div className="text-sm text-gray-500">
                            {Object.keys(pendingUploads).length}명 선택됨
                            {isUploading && ' (업로드 중...)'}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose} disabled={isUploading}>
                                닫기
                            </Button>
                            <Button onClick={handleUploadAll} disabled={isUploading || Object.keys(pendingUploads).length === 0}>
                                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                일괄 업로드
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
