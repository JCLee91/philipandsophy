# 📚 필립앤소피 프로젝트 문서

이 폴더는 프로젝트의 모든 기술 문서를 포함합니다. 문서는 카테고리별로 정리되어 있습니다.

## 📂 문서 구조

```
docs/
├── setup/              # 초기 설정 및 환경 구성
├── optimization/       # 성능 최적화 문서
├── design/             # 디자인 시스템 및 가이드
└── architecture/       # 아키텍처 및 기획 문서
```

---

## 🚀 시작하기

처음 프로젝트를 시작하시나요? 이 문서들을 순서대로 읽어보세요:

1. **[Firebase 설정](./setup/firebase.md)** - Firebase 프로젝트 생성 및 연동
2. **[Admin SDK 설정](./setup/admin-sdk.md)** - Firebase Admin SDK 구성 (서버 사이드)

---

## ⚡ 성능 최적화

프로젝트의 성능을 이해하고 개선하려면:

### [성능 최적화 가이드](./optimization/performance.md)
**완료 시점**: 2025-10-08
**주요 내용**:
- ✅ Level 1: React Query 3단계 캐시 전략 (STATIC/SEMI_DYNAMIC/REAL_TIME)
- ✅ Level 2: Prefetch & Zustand 구독 최적화
- ✅ Level 3: 코드 스플리팅 & 세부 튜닝
- 📊 성능 측정: Firebase Read 60-70% 감소, 로딩 속도 80% 개선

### [데이터베이스 최적화](./optimization/database.md)
**완료 시점**: 2025-10-08
**주요 내용**:
- 🗄️ Firebase/Firestore 스키마 문서화 (5개 컬렉션)
- 🔍 쿼리 패턴 및 베스트 프랙티스
- 🔄 실시간 구독 관리 전략
- 📈 성능 지표: 읽기 69.5% 감소, 구독자 85.7% 감소

---

## 🎨 디자인 시스템

일관된 UI/UX를 위한 디자인 가이드:

### [버튼 디자인 시스템](./design/button-system.md)
**완료 시점**: 2025-10-08
**주요 내용**:
- ✅ Primary/Secondary 버튼 통일 스타일 (FooterActions 기반)
- ✅ 디자인 토큰 및 시각적 사양 (간격, 색상, 타이포그래피)
- ✅ 접근성 가이드 (WCAG AAA, 키보드 내비게이션, 스크린 리더)
- ✅ Shadcn Button 마이그레이션 가이드
- 📝 웹 앱(`/app/*`) 전용 - 랜딩 페이지 제외

### [UI 디자인 가이드](./design/ui-guide.md)
- 컴포넌트 디자인 시스템
- 색상 팔레트 및 타이포그래피
- 레이아웃 및 그리드 시스템
- 반응형 디자인 가이드

### [애니메이션 가이드](./design/animation.md)
- 애니메이션 원칙 및 패턴
- Framer Motion 사용 가이드
- 트랜지션 및 인터랙션
- 성능 고려사항

---

## 🏗️ 아키텍처

프로젝트의 구조와 설계를 이해하려면:

### [제품 요구사항 문서 (PRD)](./architecture/prd.md)
- 프로젝트 비전 및 목표
- 핵심 기능 명세
- 사용자 스토리
- 기술 요구사항

### [정보 구조 (IA)](./architecture/ia.md)
- 앱 구조 및 페이지 계층
- 내비게이션 플로우
- 사용자 여정 맵

---

## 🔍 빠른 참조

### 자주 찾는 문서
- **Firebase 설정**: [setup/firebase.md](./setup/firebase.md)
- **성능 최적화**: [optimization/performance.md](./optimization/performance.md)
- **DB 쿼리 패턴**: [optimization/database.md](./optimization/database.md)
- **버튼 시스템**: [design/button-system.md](./design/button-system.md)
- **디자인 시스템**: [design/ui-guide.md](./design/ui-guide.md)

### 문제 해결
- Firebase 연결 문제 → [setup/firebase.md](./setup/firebase.md)
- 성능 이슈 → [optimization/performance.md](./optimization/performance.md)
- 쿼리 최적화 → [optimization/database.md](./optimization/database.md)
- 버튼 스타일링 → [design/button-system.md](./design/button-system.md)
- UI 일관성 → [design/ui-guide.md](./design/ui-guide.md)

---

## 📝 문서 업데이트

문서를 업데이트하거나 새 문서를 추가할 때:

1. 적절한 카테고리 폴더에 배치
2. Markdown 포맷 사용 (`.md`)
3. 명확한 제목과 구조
4. 코드 예제 포함 (해당되는 경우)
5. 이 README에 링크 추가

---

## 🤝 기여

문서 개선 제안이나 오류 발견 시:
1. 문제점 또는 제안 사항 기록
2. 프로젝트 관리자에게 공유
3. 승인 후 업데이트

---

**마지막 업데이트**: 2025-10-08
**문서 버전**: v1.0.0
