'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface PrivacyPolicyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PrivacyPolicyModal({ open, onOpenChange }: PrivacyPolicyModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden bg-zinc-900 border-zinc-700 p-0">
                <DialogHeader className="sticky top-0 bg-zinc-900 px-6 py-4 border-b border-zinc-700 z-10">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-bold text-white">
                            개인정보처리방침
                        </DialogTitle>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                            aria-label="닫기"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">시행일자: 2025년 9월 23일</p>
                </DialogHeader>

                <div className="overflow-y-auto px-6 pt-4 pb-8 text-sm text-gray-300 space-y-6 max-h-[calc(80vh-100px)]">
                    <p>
                        휠즈랩스(이하 "회사")는 개인정보보호법에 따라 정보주체의 개인정보를 보호하고
                        이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이
                        개인정보 처리방침을 수립·공개합니다.
                    </p>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제1조 (개인정보의 처리목적)</h2>
                        <p className="mb-3">
                            회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는
                            다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는
                            개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                        </p>
                        <ol className="list-decimal list-inside space-y-2 ml-2">
                            <li>
                                <strong className="text-white">필립앤소피 소셜클럽 서비스 제공</strong>
                                <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                                    <li>승인제 멤버십 가입 심사 및 관리</li>
                                    <li>독서 프로그램 운영 및 멤버 간 커뮤니케이션 지원</li>
                                    <li>오프라인 웰컴 파티 및 이벤트 운영</li>
                                    <li>서비스 이용에 따른 본인확인, 개인식별</li>
                                </ul>
                            </li>
                            <li>
                                <strong className="text-white">민원사무 처리</strong>
                                <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                                    <li>민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지</li>
                                    <li>처리결과 통보</li>
                                </ul>
                            </li>
                            <li>
                                <strong className="text-white">마케팅 및 광고에 활용</strong>
                                <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                                    <li>신규 서비스(상품) 개발 및 맞춤 서비스 제공</li>
                                    <li>이벤트 및 광고성 정보 제공 및 참여기회 제공</li>
                                    <li>인구통계학적 특성에 따른 서비스 제공 및 광고 게재</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제2조 (개인정보의 처리 및 보유기간)</h2>
                        <p className="mb-3">
                            회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를
                            수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                        </p>
                        <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between border-b border-zinc-700 pb-2">
                                <span className="text-gray-400">필립앤소피 서비스 제공</span>
                                <span className="text-white">회원탈퇴 또는 서비스 종료 시</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-700 pb-2">
                                <span className="text-gray-400">소비자 불만/분쟁처리</span>
                                <span className="text-white">3년</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-700 pb-2">
                                <span className="text-gray-400">신용정보 수집/처리</span>
                                <span className="text-white">3년</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">세법 관련 장부/증빙</span>
                                <span className="text-white">5년</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제3조 (처리하는 개인정보 항목)</h2>
                        <ul className="space-y-2">
                            <li><strong className="text-white">필수항목:</strong> 이름, 생년월일, 성별, 연락처, 회사명/직군, 프로필 사진</li>
                            <li><strong className="text-white">선택항목:</strong> 관심분야, 독서선호도, 소셜미디어 계정, 유입채널</li>
                            <li><strong className="text-white">자동수집:</strong> IP주소, 쿠키, MAC주소, 서비스 이용 기록 등</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제4조 (개인정보의 제3자 제공)</h2>
                        <p className="mb-2">
                            회사는 원칙적으로 정보주체의 개인정보를 수집·이용 목적으로 명시한 범위 내에서
                            처리하며, 정보주체의 사전 동의 없이는 본래의 목적 범위를 초과하여 처리하거나
                            제3자에게 제공하지 않습니다.
                        </p>
                        <p className="text-gray-400">다만, 별도 동의를 받거나 법령상 의무가 있는 경우는 예외로 합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제5조 (개인정보처리의 위탁)</h2>
                        <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between border-b border-zinc-700 pb-2">
                                <span className="text-gray-400">Firebase (Google Cloud)</span>
                                <span className="text-white">데이터 저장/인증</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-700 pb-2">
                                <span className="text-gray-400">Smore (스모어)</span>
                                <span className="text-white">온라인 신청서 수집/관리</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-700 pb-2">
                                <span className="text-gray-400">Make (Integromat)</span>
                                <span className="text-white">신청 데이터 자동화</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-700 pb-2">
                                <span className="text-gray-400">카카오톡</span>
                                <span className="text-white">고객상담/문의처리</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-700 pb-2">
                                <span className="text-gray-400">Google Analytics</span>
                                <span className="text-white">웹사이트 이용통계 분석</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Facebook (Meta)</span>
                                <span className="text-white">마케팅 성과 분석</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제6조 (정보주체의 권리·의무)</h2>
                        <p className="mb-2">정보주체는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
                        <ol className="list-decimal list-inside ml-2 space-y-1 text-gray-400">
                            <li>개인정보 처리현황 통지요구</li>
                            <li>개인정보 열람요구</li>
                            <li>개인정보 정정·삭제요구</li>
                            <li>개인정보 처리정지요구</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제7조 (쿠키 사용)</h2>
                        <p>
                            회사는 이용자에게 맞춤서비스를 제공하기 위해 '쿠키(cookie)'를 사용합니다.
                            이용자는 쿠키 설치에 대해 거부할 수 있으나, 일부 서비스 이용이 어려울 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제8조 (개인정보 보호책임자)</h2>
                        <div className="bg-zinc-800 rounded-lg p-4">
                            <p className="font-medium text-white mb-2">개인정보 보호책임자</p>
                            <ul className="space-y-1 text-gray-400">
                                <li>성명: 이종찬</li>
                                <li>직책: 대표이사</li>
                                <li>연락처: 카카오톡 채널 @필립앤소피</li>
                                <li>전화: 070-8028-3570</li>
                                <li>이메일: jclee@wheelslabs.kr</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제9조 (처리방침 변경)</h2>
                        <p>
                            이 개인정보처리방침은 시행일로부터 적용되며, 변경사항이 있는 경우
                            시행 7일 전부터 공지사항을 통하여 고지합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-base font-bold text-white mb-3">제10조 (권익침해 구제방법)</h2>
                        <ul className="space-y-1 text-gray-400">
                            <li>개인정보침해신고센터: privacy.go.kr / 182</li>
                            <li>개인정보보호위원회: pipc.go.kr / 02-2100-2820</li>
                            <li>대검찰청 사이버범죄수사단: 02-3480-3571</li>
                            <li>경찰청 사이버안전국: 182</li>
                        </ul>
                    </section>

                    <p className="text-center text-gray-500 pt-4 border-t border-zinc-700">
                        본 방침은 2025년 9월 23일부터 시행됩니다.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
