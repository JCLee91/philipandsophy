'use client';

import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isValidFileSize, isValidImageType } from '../lib/validation';

interface FileUploadProps {
    onFileSelect: (file: File | null) => void;
    currentFile?: File | null;
    onError?: (error: string) => void;
}

const MAX_FILE_SIZE_MB = 20;

export function FileUpload({ onFileSelect, currentFile, onError }: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const validateAndSetFile = (file: File) => {
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

        onFileSelect(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
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
        setPreviewUrl(null);
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
                    className="border-2 border-dashed border-zinc-700 bg-zinc-800/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-white hover:bg-zinc-800 transition-all group"
                >
                    <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-zinc-600 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-white" />
                    </div>
                    <p className="text-lg font-medium text-gray-300 group-hover:text-white">
                        파일을 끌어오거나 선택해 주세요.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        (최대 파일 크기: {MAX_FILE_SIZE_MB}MB)
                    </p>
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden border-2 border-zinc-700">
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-auto max-h-[400px] object-contain bg-black"
                    />
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full bg-black/50 hover:bg-black/80"
                        onClick={handleClear}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
