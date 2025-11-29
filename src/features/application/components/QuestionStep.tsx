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
import { LAYOUT, TEXT_STYLES, BUTTON_SPACING } from '../constants/layout';

interface QuestionStepProps {
    question: Question;
}

export function QuestionStep({ question }: QuestionStepProps) {
    const { answers, setAnswer, nextStep, privacyConsent, setPrivacyConsent, trackCurrentStep } = useApplicationStore();
    const currentAnswer = answers[question.id];
    const [validationError, setValidationError] = useState<string | null>(null);
    const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

    // 현재 단계 퍼널 이벤트 트래킹
    useEffect(() => {
        trackCurrentStep();
    }, [question.id, trackCurrentStep]);

    // 공통 스타일 변수 (레이아웃 상수 활용)
    const textAlign = question.style?.textAlign || 'center';
    const isCentered = textAlign === 'center';

    const alignClass = {
        'left': 'text-left items-start',
        'center': 'text-center items-center',
        'right': 'text-right items-end',
    }[textAlign];

    const textAlignClass = {
        'left': 'text-left',
        'center': 'text-center',
        'right': 'text-right',
    }[textAlign];

    // 입력 래퍼 클래스 (중앙 정렬 시 mx-auto, 레이아웃 상수 사용)
    const inputWrapperClass = cn(`relative ${LAYOUT.INPUT_MAX_WIDTH} w-full`, isCentered && "mx-auto");
    const fileWrapperClass = cn(LAYOUT.FILE_MAX_WIDTH, isCentered && "mx-auto");

    // intro만 헤더+본문, 나머지는 모두 본문 스타일
    const isIntro = question.type === 'intro';

    // 헤더 스타일 (intro의 title용)
    const headerClass = cn(
        TEXT_STYLES.TITLE,
        question.style?.titleSize || TEXT_STYLES.TITLE_SIZE,
        question.style?.titleColor || "text-white"
    );

    // 본문 스타일 (질문 텍스트용 - 흰색, 가시성 확보)
    const bodyClass = cn(
        TEXT_STYLES.DESCRIPTION,
        question.style?.titleColor || TEXT_STYLES.DESCRIPTION_COLOR
    );

    // 서브 설명 스타일 (회색, intro의 description / 기타의 보조 설명용)
    const subDescriptionClass = cn(
        TEXT_STYLES.SUB_DESCRIPTION,
        question.style?.descriptionColor || TEXT_STYLES.SUB_DESCRIPTION_COLOR
    );

    // title 스타일: intro만 헤더, 나머지는 본문
    const titleClass = isIntro ? headerClass : bodyClass;
    // description 스타일: 항상 서브 설명 (회색)
    const descriptionClass = subDescriptionClass;

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

    // Composite 필드 값 가져오기
    const getFieldValue = (fieldId: string): string => {
        return (answers[fieldId] as string) || '';
    };

    // Composite 필드 값 설정
    const setFieldValue = (fieldId: string, value: string) => {
        setAnswer(fieldId, value);
        setValidationError(null);
    };

    // Composite 필드 전화번호 포맷팅
    const handlePhoneFieldChange = (fieldId: string, value: string) => {
        const formatted = formatPhoneNumber(value);
        setFieldValue(fieldId, formatted);
    };

    const validateAndNext = () => {
        setValidationError(null);

        // 필수 입력 검증 (intro 타입 제외)
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
                        setValidationError('올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)');
                        return;
                    }

                    if (field.type === 'select' && !value) {
                        setValidationError(`${field.label}을(를) 선택해주세요.`);
                        return;
                    }
                }
            }

            // 텍스트 타입: 빈 값 또는 공백만 있는 경우
            if (question.type === 'text') {
                const value = (currentAnswer as string)?.trim();
                if (!value) {
                    setValidationError('필수 입력 항목입니다.');
                    return;
                }
                // 최소 2글자 이상 (이름, 직장 등)
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
                    setValidationError('올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)');
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
                    setValidationError('올바른 생년월일을 입력해주세요. (예: 19950101)');
                    return;
                }
                if (!isAdult(birthdate)) {
                    setValidationError('만 19세 이상만 참여 가능합니다.');
                    return;
                }
            }

            // 파일 업로드 검증
            if (question.type === 'file') {
                if (!currentAnswer) {
                    setValidationError('사진을 업로드해주세요.');
                    return;
                }
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

    // 버튼 비활성화 조건 - Smore 스타일: 항상 활성화하고 클릭 시 검증
    // 단, 마지막 단계에서 개인정보 동의 체크 전에는 시각적으로 비활성화 표시
    const isButtonDisabled = () => {
        // 마지막 단계에서만 개인정보 동의 체크 시 비활성화
        if (question.isLastStep && !privacyConsent) return true;
        return false;
    };

    // Single Select - 다른 스텝과 동일한 상단 정렬 레이아웃
    if (question.type === 'single-select') {
        return (
            <motion.div
                className={cn(
                    "w-full mx-auto flex flex-col justify-start",
                    LAYOUT.MAX_WIDTH,
                    LAYOUT.PADDING_X,
                    LAYOUT.HEADER_PADDING,
                    LAYOUT.FOOTER_PADDING,
                    LAYOUT.MIN_HEIGHT
                )}
                {...fadeInUp}
            >
                <motion.div
                    key={question.id}
                    {...fadeInUp}
                    className="text-center"
                >
                    <motion.h2
                        className={cn(titleClass, "text-center")}
                        {...staggerChild(0)}
                    >
                        {question.title}
                    </motion.h2>

                    {question.description && (
                        <motion.p
                            className={cn(descriptionClass, "text-center")}
                            {...staggerChild(0.1)}
                        >
                            {question.description}
                        </motion.p>
                    )}
                </motion.div>

                {/* 선택 버튼들 */}
                <motion.div
                    className={cn("flex flex-col mt-8", BUTTON_SPACING.OPTION_GAP)}
                    {...staggerChild(0.2)}
                >
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
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={cn(
                "w-full mx-auto flex flex-col justify-start",
                LAYOUT.MAX_WIDTH,
                LAYOUT.PADDING_X,
                LAYOUT.HEADER_PADDING,
                LAYOUT.FOOTER_PADDING,
                LAYOUT.MIN_HEIGHT,
                alignClass
            )}
            {...fadeInUp}
        >
            <motion.div
                key={question.id}
                {...fadeInUp}
                className={cn("w-full", textAlignClass)}
            >
                <motion.h2 
                    className={titleClass}
                    {...staggerChild(0)}
                >
                    {question.title}
                </motion.h2>

                {question.description && (
                    <motion.p 
                        className={descriptionClass}
                        {...staggerChild(0.1)}
                    >
                        {question.description}
                    </motion.p>
                )}

                <div className={cn("w-full space-y-6 flex flex-col", alignClass)}>
                    {/* Intro Type */}
                    {question.type === 'intro' && (
                        <motion.div
                            className="mt-8 w-full flex justify-center"
                            {...staggerChild(0.2)}
                        >
                            <button
                                className="cta-button-white"
                                onClick={validateAndNext}
                            >
                                {question.buttonText || '시작하기'}
                            </button>
                        </motion.div>
                    )}

                    {/* Text Input */}
                    {question.type === 'text' && (
                        <motion.div
                            className="w-full"
                            {...staggerChild(0.15)}
                        >
                            <div className={inputWrapperClass}>
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
                            {...staggerChild(0.15)}
                        >
                            <div className={inputWrapperClass}>
                                <input
                                    type="tel"
                                    value={(currentAnswer as string) || ''}
                                    onChange={handlePhoneChange}
                                    placeholder={question.placeholder}
                                    className="form-input-dark"
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
                            {...staggerChild(0.15)}
                        >
                            <div className={inputWrapperClass}>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={8}
                                    value={(currentAnswer as string) || ''}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setAnswer(question.id, value);
                                        setValidationError(null);
                                    }}
                                    placeholder={question.placeholder}
                                    className="form-input-dark"
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
                            {...staggerChild(0.15)}
                        >
                            <div className={fileWrapperClass}>
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

                    {/* Composite Type - 여러 필드를 한 스텝에서 입력 */}
                    {question.type === 'composite' && question.fields && (
                        <motion.div
                            className="w-full space-y-5"
                            {...staggerChild(0.15)}
                        >
                            {question.fields.map((field, index) => (
                                <div key={field.id} className={inputWrapperClass}>
                                    <label className="block text-sm text-gray-400 mb-2 text-left pl-1">
                                        {field.label}
                                    </label>
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
                                        <div className="flex gap-3">
                                            {field.options.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => setFieldValue(field.id, option.value)}
                                                    className={cn(
                                                        "flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all",
                                                        getFieldValue(field.id) === option.value
                                                            ? "border-white bg-white text-black"
                                                            : "border-zinc-700 bg-zinc-800/50 text-gray-300 hover:border-white hover:text-white"
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
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );

    // 제출 영역 렌더링 (에러 메시지, 개인정보 동의, 버튼)
    function renderSubmitSection() {
        return (
            <motion.div 
                className="mt-12 space-y-6 flex flex-col items-center w-full"
                {...staggerChild(0.25)}
            >
                {/* 유효성 검사 에러 메시지 */}
                {validationError && (
                    <motion.div
                        className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-full"
                        {...errorAnimation}
                    >
                        <AlertCircle className="w-4 h-4" />
                        <span>{validationError}</span>
                    </motion.div>
                )}

                {/* 마지막 단계일 때 개인정보 동의 체크박스 */}
                {question.isLastStep && (
                    <motion.div 
                        className="flex items-center gap-3 py-2 justify-center"
                        {...staggerChild(0.3)}
                    >
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
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setPrivacyModalOpen(true);
                                }}
                                className="text-white underline hover:text-gray-300"
                            >
                                개인정보처리방침
                            </button>
                            에 동의하게 됩니다.
                        </label>
                        <PrivacyPolicyModal
                            open={privacyModalOpen}
                            onOpenChange={setPrivacyModalOpen}
                        />
                    </motion.div>
                )}

                {/* 제출 버튼 */}
                <motion.div {...staggerChild(0.2)}>
                    <button
                        onClick={validateAndNext}
                        disabled={isButtonDisabled()}
                        className="cta-button-white"
                    >
                        {getSubmitButtonText()}
                    </button>
                </motion.div>
            </motion.div>
        );
    }
}
