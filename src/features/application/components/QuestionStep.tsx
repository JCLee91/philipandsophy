'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUpload } from './FileUpload';
import { useApplicationStore, Question } from '../hooks/use-application';
import {
    isValidPhoneNumber,
    formatPhoneNumber,
    isValidBirthdate,
    isAdult,
} from '../lib/validation';

interface QuestionStepProps {
    question: Question;
}

export function QuestionStep({ question }: QuestionStepProps) {
    const { answers, setAnswer, nextStep, privacyConsent, setPrivacyConsent } = useApplicationStore();
    const currentAnswer = answers[question.id];
    const [validationError, setValidationError] = useState<string | null>(null);

    // 스타일 설정 기본값
    const alignClass = {
        'left': 'text-left items-start',
        'center': 'text-center items-center',
        'right': 'text-right items-end',
    }[question.style?.textAlign || 'center'];

    // 타이틀 스타일
    const titleClass = cn(
        "font-bold mb-6 whitespace-pre-wrap leading-snug",
        question.style?.titleSize || "text-2xl md:text-3xl",
        question.style?.titleColor || "text-white"
    );

    // 설명 스타일
    const descriptionClass = cn(
        "text-lg mb-10 whitespace-pre-wrap leading-relaxed",
        question.style?.descriptionColor || "text-gray-400"
    );

    const handleOptionSelect = (value: string) => {
        setAnswer(question.id, value);
        setValidationError(null);
        // Auto-advance for single select after a short delay for visual feedback
        if (question.type === 'single-select') {
            setTimeout(() => {
                nextStep();
            }, 300);
        }
    };

    const validateAndNext = () => {
        setValidationError(null);

        // 휴대폰 번호 유효성 검사
        if (question.type === 'phone' && currentAnswer) {
            if (!isValidPhoneNumber(currentAnswer as string)) {
                setValidationError('올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)');
                return;
            }
        }

        // 생년월일 유효성 검사
        if (question.type === 'birthdate' && currentAnswer) {
            const birthdate = currentAnswer as string;
            if (!isValidBirthdate(birthdate)) {
                setValidationError('올바른 생년월일을 입력해주세요. (예: 19950101)');
                return;
            }
            if (!isAdult(birthdate)) {
                setValidationError('만 19세 이상만 참여 가능합니다.');
                return;
            }
        }

        // 마지막 단계에서 개인정보 동의 확인
        if (question.isLastStep && !privacyConsent) {
            setValidationError('개인정보처리방침에 동의해주세요.');
            return;
        }

        nextStep();
    };

    // 휴대폰 번호 입력 핸들러 (자동 포맷팅)
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setAnswer(question.id, formatted);
        setValidationError(null);
    };

    // 제출 버튼 텍스트 결정
    const getSubmitButtonText = () => {
        if (question.isLastStep && question.submitButtonText) {
            return question.submitButtonText;
        }
        return '다음';
    };

    // 버튼 비활성화 조건
    const isButtonDisabled = () => {
        if (!currentAnswer && question.type !== 'intro') return true;
        if (question.type === 'birthdate' && (currentAnswer as string).length !== 8) return true;
        if (question.isLastStep && !privacyConsent) return true;
        return false;
    };

    return (
        <div className={cn(
            "w-full max-w-xl mx-auto px-8 pt-20 pb-12 flex flex-col justify-start min-h-[60vh]",
            alignClass
        )}>
            <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={cn("w-full", question.style?.textAlign === 'left' ? 'text-left' : (question.style?.textAlign === 'right' ? 'text-right' : 'text-center'))}
            >
                <h2 className={titleClass}>
                    {question.title}
                </h2>

                {question.description && (
                    <p className={descriptionClass}>
                        {question.description}
                    </p>
                )}

                <div className={cn("w-full space-y-6 flex flex-col", alignClass)}>
                    {/* Intro Type */}
                    {question.type === 'intro' && (
                        <div className="mt-8 w-full flex justify-center">
                            <button
                                className="cta-button-white"
                                onClick={validateAndNext}
                            >
                                {question.buttonText || '시작하기'}
                            </button>
                        </div>
                    )}

                    {/* Single Select Type */}
                    {question.type === 'single-select' && (
                        <div className="w-full space-y-3">
                            {question.options?.map((option, index) => (
                                <motion.button
                                    key={option.value}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 + 0.3, duration: 0.4 }}
                                    onClick={() => handleOptionSelect(option.value)}
                                    className={cn(
                                        "w-full py-4 px-6 rounded-lg text-lg font-medium transition-all duration-200 flex items-center justify-center text-center",
                                        currentAnswer === option.value
                                            ? "bg-white text-black ring-2 ring-blue-500"
                                            : "bg-white text-black hover:bg-gray-200"
                                    )}
                                >
                                    {option.label}
                                </motion.button>
                            ))}
                        </div>
                    )}

                    {/* Text Input */}
                    {question.type === 'text' && (
                        <motion.div
                            className="w-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className={cn("relative max-w-sm mx-auto px-4", question.style?.textAlign === 'center' || !question.style?.textAlign ? "mx-auto" : "")}>
                                <input
                                    type="text"
                                    value={(currentAnswer as string) || ''}
                                    onChange={(e) => {
                                        setAnswer(question.id, e.target.value);
                                        setValidationError(null);
                                    }}
                                    placeholder={question.placeholder}
                                    className="w-full bg-zinc-800/80 border border-zinc-700 text-white rounded-xl px-4 py-4 text-xl placeholder:text-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-center"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && currentAnswer) {
                                            validateAndNext();
                                        }
                                    }}
                                />
                            </div>
                            {renderSubmitSection()}
                        </motion.div>
                    )}

                    {/* Phone Input */}
                    {question.type === 'phone' && (
                        <motion.div
                            className="w-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className={cn("relative max-w-sm mx-auto px-4", question.style?.textAlign === 'center' || !question.style?.textAlign ? "mx-auto" : "")}>
                                <input
                                    type="tel"
                                    value={(currentAnswer as string) || ''}
                                    onChange={handlePhoneChange}
                                    placeholder={question.placeholder}
                                    className="w-full bg-zinc-800/80 border border-zinc-700 text-white rounded-xl px-4 py-4 text-xl placeholder:text-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-center"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && currentAnswer) {
                                            validateAndNext();
                                        }
                                    }}
                                />
                            </div>
                            {renderSubmitSection()}
                        </motion.div>
                    )}

                    {/* Birthdate Input (8자리 텍스트) */}
                    {question.type === 'birthdate' && (
                        <motion.div
                            className="w-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className={cn("relative max-w-sm mx-auto px-4", question.style?.textAlign === 'center' || !question.style?.textAlign ? "mx-auto" : "")}>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={8}
                                    value={(currentAnswer as string) || ''}
                                    onChange={(e) => {
                                        // 숫자만 허용
                                        const value = e.target.value.replace(/\D/g, '');
                                        setAnswer(question.id, value);
                                        setValidationError(null);
                                    }}
                                    placeholder={question.placeholder}
                                    className="w-full bg-zinc-800/80 border border-zinc-700 text-white rounded-xl px-4 py-4 text-xl placeholder:text-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-center"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && currentAnswer && (currentAnswer as string).length === 8) {
                                            validateAndNext();
                                        }
                                    }}
                                />
                            </div>
                            {renderSubmitSection()}
                        </motion.div>
                    )}

                    {/* File Upload */}
                    {question.type === 'file' && (
                        <motion.div
                            className="w-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className={cn("max-w-md", question.style?.textAlign === 'center' || !question.style?.textAlign ? "mx-auto" : "")}>
                                <FileUpload
                                    onFileSelect={(file) => {
                                        setAnswer(question.id, file);
                                        setValidationError(null);
                                    }}
                                    currentFile={currentAnswer as File | null}
                                    onError={(error) => setValidationError(error)}
                                />
                            </div>
                            {renderSubmitSection()}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );

    // 제출 영역 렌더링 (에러 메시지, 개인정보 동의, 버튼)
    function renderSubmitSection() {
        return (
            <div className="mt-12 space-y-6 flex flex-col items-center w-full">
                {/* 유효성 검사 에러 메시지 */}
                {validationError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-full">
                        <AlertCircle className="w-4 h-4" />
                        <span>{validationError}</span>
                    </div>
                )}

                {/* 마지막 단계일 때 개인정보 동의 체크박스 */}
                {question.isLastStep && (
                    <div className="flex items-center gap-3 py-2 justify-center">
                        <Checkbox
                            id="privacy-consent"
                            checked={privacyConsent}
                            onCheckedChange={(checked) => {
                                setPrivacyConsent(checked === true);
                                if (checked) setValidationError(null);
                            }}
                            className="mt-0.5 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-black"
                        />
                        <label
                            htmlFor="privacy-consent"
                            className="text-sm text-gray-400 cursor-pointer hover:text-white transition-colors"
                        >
                            계속하시면{' '}
                            <a
                                href="/privacy-policy.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white underline hover:text-gray-300"
                            >
                                개인정보처리방침
                            </a>
                            에 동의하게 됩니다.
                        </label>
                    </div>
                )}

                {/* 제출 버튼 */}
                <button
                    onClick={validateAndNext}
                    disabled={isButtonDisabled()}
                    className="cta-button-white"
                >
                    {getSubmitButtonText()}
                </button>
            </div>
        );
    }
}
