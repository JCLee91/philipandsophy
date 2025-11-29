'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUpload } from './FileUpload';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { useApplicationStore, Question } from '../hooks/use-application';
import {
    isValidPhoneNumber,
    formatPhoneNumber,
    isValidBirthdate,
    isAdult,
} from '../lib/validation';
import { fadeInUp, staggerChild, errorAnimation } from '../constants/animation';

interface QuestionStepProps {
    question: Question;
}

export function QuestionStep({ question }: QuestionStepProps) {
    const { answers, setAnswer, nextStep, privacyConsent, setPrivacyConsent, trackCurrentStep, isSubmitting } = useApplicationStore();
    const currentAnswer = answers[question.id];
    const [validationError, setValidationError] = useState<string | null>(null);
    const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    // 현재 단계 퍼널 이벤트 트래킹
    useEffect(() => {
        trackCurrentStep();
    }, [question.id, trackCurrentStep]);

    const isIntro = question.type === 'intro';

    const handleOptionSelect = (value: string) => {
        setAnswer(question.id, value);
        setValidationError(null);
        if (question.type === 'single-select') {
            setTimeout(() => nextStep(), 300);
        }
    };

    // Composite 필드 값 가져오기/설정
    const getFieldValue = (fieldId: string): string => (answers[fieldId] as string) || '';
    const setFieldValue = (fieldId: string, value: string) => {
        setAnswer(fieldId, value);
        setValidationError(null);
    };
    const handlePhoneFieldChange = (fieldId: string, value: string) => {
        setFieldValue(fieldId, formatPhoneNumber(value));
    };

    const validateAndNext = () => {
        if (isNavigating || isSubmitting) return;
        setValidationError(null);

        if (question.type !== 'intro' && question.required !== false) {
            // Composite 타입 검증
            if (question.type === 'composite' && question.fields) {
                for (const field of question.fields) {
                    const value = (answers[field.id] as string)?.trim();
                    if (!value) {
                        setValidationError(`${field.label}을(를) 입력해주세요.`);
                        return;
                    }
                    if (field.type === 'text' && value.length < 2) {
                        setValidationError(`${field.label}은(는) 2글자 이상 입력해주세요.`);
                        return;
                    }
                    if (field.type === 'phone' && !isValidPhoneNumber(value)) {
                        setValidationError('올바른 휴대폰 번호를 입력해주세요.');
                        return;
                    }
                }
            }

            // 텍스트 타입 검증
            if (question.type === 'text') {
                const value = (currentAnswer as string)?.trim();
                if (!value) {
                    setValidationError('필수 입력 항목입니다.');
                    return;
                }
                if (value.length < 2) {
                    setValidationError('2글자 이상 입력해주세요.');
                    return;
                }
            }

            // 휴대폰 번호 검증
            if (question.type === 'phone') {
                const value = (currentAnswer as string)?.trim();
                if (!value) {
                    setValidationError('연락처를 입력해주세요.');
                    return;
                }
                if (!isValidPhoneNumber(value)) {
                    setValidationError('올바른 휴대폰 번호를 입력해주세요.');
                    return;
                }
            }

            // 생년월일 검증
            if (question.type === 'birthdate') {
                const birthdate = (currentAnswer as string)?.trim();
                if (!birthdate) {
                    setValidationError('생년월일을 입력해주세요.');
                    return;
                }
                if (birthdate.length !== 8) {
                    setValidationError('생년월일 8자리를 모두 입력해주세요.');
                    return;
                }
                if (!isValidBirthdate(birthdate)) {
                    setValidationError('올바른 생년월일을 입력해주세요.');
                    return;
                }
                if (!isAdult(birthdate)) {
                    setValidationError('만 19세 이상만 참여 가능합니다.');
                    return;
                }
            }

            // 파일 업로드 검증
            if (question.type === 'file' && !currentAnswer) {
                setValidationError('사진을 업로드해주세요.');
                return;
            }
        }

        // 마지막 단계 개인정보 동의 확인
        if (question.isLastStep && !privacyConsent) {
            setValidationError('개인정보처리방침에 동의해주세요.');
            return;
        }

        setIsNavigating(true);
        nextStep();
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAnswer(question.id, formatPhoneNumber(e.target.value));
        setValidationError(null);
    };

    const getSubmitButtonText = () => {
        if (question.isLastStep && question.submitButtonText) {
            return question.submitButtonText;
        }
        return '다음';
    };

    const isButtonDisabled = () => question.isLastStep && !privacyConsent;

    // Single Select
    if (question.type === 'single-select') {
        return (
            <motion.div className="question-step" {...fadeInUp}>
                <div className="question-header">
                    <h2 className="question-title">{question.title}</h2>
                    {question.description && (
                        <p className="question-description">{question.description}</p>
                    )}
                </div>

                <div className="question-options">
                    {question.options?.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleOptionSelect(option.value)}
                            className={cn(
                                "cta-button-white-full",
                                currentAnswer === option.value && "selected"
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div className="question-step" {...fadeInUp}>
            <div className={cn("question-header", isIntro && "question-header-intro")}>
                <h2 className={cn("question-title", isIntro && "question-title-intro")}>
                    {question.title}
                </h2>
                {question.description && (
                    <p className={cn("question-description", isIntro && "text-left")}>{question.description}</p>
                )}
            </div>

            <div className="question-body">
                {/* Intro Type */}
                {question.type === 'intro' && (
                    <div className="question-action">
                        <button className="cta-button-white" onClick={validateAndNext}>
                            {question.buttonText || '시작하기'}
                        </button>
                    </div>
                )}

                {/* Text Input */}
                {question.type === 'text' && (
                    <div className="question-input-wrap">
                        <input
                            type="text"
                            value={(currentAnswer as string) || ''}
                            onChange={(e) => {
                                setAnswer(question.id, e.target.value);
                                setValidationError(null);
                            }}
                            placeholder={question.placeholder}
                            className="form-input-dark"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing && currentAnswer) {
                                    validateAndNext();
                                }
                            }}
                        />
                        {renderSubmitSection()}
                    </div>
                )}

                {/* Phone Input */}
                {question.type === 'phone' && (
                    <div className="question-input-wrap">
                        <input
                            type="tel"
                            value={(currentAnswer as string) || ''}
                            onChange={handlePhoneChange}
                            placeholder={question.placeholder}
                            className="form-input-dark"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing && currentAnswer) {
                                    validateAndNext();
                                }
                            }}
                        />
                        {renderSubmitSection()}
                    </div>
                )}

                {/* Birthdate Input */}
                {question.type === 'birthdate' && (
                    <div className="question-input-wrap">
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            value={(currentAnswer as string) || ''}
                            onChange={(e) => {
                                setAnswer(question.id, e.target.value.replace(/\D/g, ''));
                                setValidationError(null);
                            }}
                            placeholder={question.placeholder}
                            className="form-input-dark"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing && (currentAnswer as string)?.length === 8) {
                                    validateAndNext();
                                }
                            }}
                        />
                        {renderSubmitSection()}
                    </div>
                )}

                {/* File Upload */}
                {question.type === 'file' && (
                    <div className="question-input-wrap">
                        <FileUpload
                            onFileSelect={(file) => {
                                setAnswer(question.id, file);
                                setValidationError(null);
                            }}
                            onUploadComplete={(url) => {
                                setAnswer('photoUrl', url);
                            }}
                            currentFile={currentAnswer as File | null}
                            onError={(error) => setValidationError(error)}
                        />
                        {renderSubmitSection()}
                    </div>
                )}

                {/* Composite Type */}
                {question.type === 'composite' && question.fields && (
                    <div className="question-input-wrap">
                        {question.fields.map((field, index) => (
                            <div key={field.id} className="composite-field">
                                <label className="composite-label">{field.label}</label>
                                {field.type === 'text' && (
                                    <input
                                        type="text"
                                        value={getFieldValue(field.id)}
                                        onChange={(e) => setFieldValue(field.id, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="form-input-dark"
                                        autoFocus={index === 0}
                                    />
                                )}
                                {field.type === 'phone' && (
                                    <input
                                        type="tel"
                                        value={getFieldValue(field.id)}
                                        onChange={(e) => handlePhoneFieldChange(field.id, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="form-input-dark"
                                    />
                                )}
                                {field.type === 'select' && field.options && (
                                    <div className="composite-select-group">
                                        {field.options.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setFieldValue(field.id, option.value)}
                                                className={cn(
                                                    "composite-select-btn",
                                                    getFieldValue(field.id) === option.value && "selected"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {renderSubmitSection()}
                    </div>
                )}
            </div>
        </motion.div>
    );

    function renderSubmitSection() {
        return (
            <motion.div className="question-submit" {...staggerChild(0.2)}>
                {validationError && (
                    <motion.div className="question-error" {...errorAnimation}>
                        <AlertCircle className="w-4 h-4" />
                        <span>{validationError}</span>
                    </motion.div>
                )}

                {question.isLastStep && (
                    <div className="question-privacy">
                        <Checkbox
                            id="privacy-consent"
                            checked={privacyConsent}
                            onCheckedChange={(checked) => {
                                setPrivacyConsent(checked === true);
                                if (checked) setValidationError(null);
                            }}
                            className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-black"
                        />
                        <label htmlFor="privacy-consent" className="question-privacy-label">
                            계속하시면{' '}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setPrivacyModalOpen(true);
                                }}
                                className="question-privacy-link"
                            >
                                개인정보처리방침
                            </button>
                            에 동의하게 됩니다.
                        </label>
                        <PrivacyPolicyModal open={privacyModalOpen} onOpenChange={setPrivacyModalOpen} />
                    </div>
                )}

                <button
                    onClick={validateAndNext}
                    disabled={isButtonDisabled()}
                    className="cta-button-white"
                >
                    {getSubmitButtonText()}
                </button>
            </motion.div>
        );
    }
}
