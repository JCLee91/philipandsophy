'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { isValidFileSize, isValidImageType } from '../lib/validation';
import { uploadApplicationPhoto } from '@/lib/firebase/storage';

interface FileUploadProps {
    onFileSelect: (file: File | null) => void;
    onUploadComplete?: (url: string) => void;
    currentFile?: File | null;
    onError?: (error: string) => void;
}

const MAX_FILE_SIZE_MB = 50;

export function FileUpload({ onFileSelect, onUploadComplete, currentFile, onError }: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploadComplete, setIsUploadComplete] = useState(false);

    // 메모리 누수 방지: previewUrl cleanup
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const validateAndSetFile = async (file: File) => {
        // 파일 타입 검증
        if (!isValidImageType(file)) {
            onError?.('이미지 파일만 업로드 가능합니다. (JPG, PNG, GIF, WebP)');
            return;
        }

        // 파일 크기 검증
        if (!isValidFileSize(file, MAX_FILE_SIZE_MB)) {
            onError?.(`파일 크기는 ${MAX_FILE_SIZE_MB}MB 이하여야 합니다.`);
            return;
        }

        // 미리보기 설정
        onFileSelect(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        // Firebase에 즉시 업로드
        setIsUploading(true);
        setUploadProgress(0);
        setIsUploadComplete(false);

        try {
            const downloadUrl = await uploadApplicationPhoto(file, (progress) => {
                setUploadProgress(Math.round(progress));
            });
            setIsUploadComplete(true);
            onUploadComplete?.(downloadUrl);
        } catch (error) {
            console.error('사진 업로드 실패:', error);
            onError?.('사진 업로드에 실패했습니다. 다시 시도해주세요.');
            // 실패 시 초기화
            handleClear();
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        const file = e.dataTransfer.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleClear = () => {
        onFileSelect(null);
        onUploadComplete?.('');
        setPreviewUrl(null);
        setIsUploading(false);
        setUploadProgress(0);
        setIsUploadComplete(false);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className="w-full">
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

            {!previewUrl ? (
                <div
                    onClick={() => inputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-zinc-700 bg-zinc-800/50 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-white hover:bg-zinc-800 transition-all group"
                >
                    <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center mb-3 group-hover:bg-zinc-600 transition-colors">
                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-white" />
                    </div>
                    <p className="text-base font-medium text-gray-300 group-hover:text-white">
                        파일을 끌어오거나 선택해 주세요.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        (최대 {MAX_FILE_SIZE_MB}MB)
                    </p>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden border-2 border-zinc-700 h-48 bg-zinc-900 flex items-center justify-center">
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                    />
                    
                    {/* 업로드 상태 오버레이 */}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                            <p className="text-white text-sm">업로드 중... {uploadProgress}%</p>
                        </div>
                    )}
                    
                    {/* 업로드 완료 표시 */}
                    {isUploadComplete && !isUploading && (
                        <div className="absolute bottom-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>업로드 완료</span>
                        </div>
                    )}
                    
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={isUploading}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="이미지 삭제"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
            )}
        </div>
    );
}
