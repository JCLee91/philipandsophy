# GitHub Flow 워크플로우 가이드

**Last Updated**: 2025-10-22
**Category**: development

## Overview

프로젝트PNS의 GitHub Flow 기반 개발 워크플로우 완벽 가이드입니다.

---

## 🎯 GitHub Flow란?

### 핵심 원칙
1. **main 브랜치는 항상 배포 가능한 상태**
2. **새 작업은 항상 브랜치에서**
3. **Pull Request로 코드 리뷰**
4. **리뷰 통과 후 main에 merge**
5. **merge 즉시 배포 (Vercel 자동)**

### 브랜치 전략
```
main (프로덕션 - 항상 안정적)
├── feature/push-notification-v2
├── feature/matching-algorithm
├── fix/dm-read-bug
└── hotfix/critical-security-fix
```

---

## 📋 브랜치 명명 규칙

### Prefix 종류

| Prefix | 용도 | 예시 |
|--------|------|------|
| `feature/` | 새 기능 추가 | `feature/ai-matching` |
| `fix/` | 버그 수정 | `fix/dm-read-status` |
| `hotfix/` | 긴급 수정 | `hotfix/security-patch` |
| `refactor/` | 리팩토링 | `refactor/notification-system` |
| `docs/` | 문서 작업 | `docs/api-reference` |
| `chore/` | 빌드/설정 | `chore/update-dependencies` |
| `test/` | 테스트 추가 | `test/add-unit-tests` |

### 브랜치명 규칙
- **소문자 사용**: `feature/new-feature` ✅
- **하이픈 구분**: `feature/ai-book-matching` ✅
- **간결하고 명확**: `feature/improve-push` ✅
- **이슈 번호 포함**: `fix/issue-42-dm-bug` ✅

**나쁜 예시**:
- ❌ `feature/NewFeature` (대문자)
- ❌ `my_feature` (prefix 없음)
- ❌ `feature/this-is-a-very-long-branch-name-that-describes-everything` (너무 김)

---

## 🚀 전체 워크플로우

### 1. 새 기능 개발 시작

```bash
# 1. main 브랜치 최신화
git checkout main
git pull origin main

# 2. 새 feature 브랜치 생성
git checkout -b feature/push-notification-v2

# 3. 작업 시작
# (코드 작성...)
```

### 2. 작업 & 커밋

```bash
# 변경사항 확인
git status

# 스테이징
git add src/features/notifications/

# 커밋 (Conventional Commits 형식)
git commit -m "feat: FCM 토큰 저장 로직 추가"

# 추가 작업...
git commit -m "fix: iOS 권한 요청 버그 수정"
git commit -m "test: 푸시 알림 테스트 추가"
```

### 3. GitHub에 푸시

```bash
# 처음 푸시 시
git push -u origin feature/push-notification-v2

# 이후 푸시 시
git push
```

### 4. Pull Request 생성

#### 방법 1: GitHub CLI (추천)

```bash
gh pr create \
  --title "푸시 알림 시스템 v2 구현" \
  --body "
## 📋 변경사항 요약
FCM 기반 푸시 알림 시스템으로 전환

## 🎯 변경 이유
기존 Web Push API는 iOS PWA에서 작동하지 않아 FCM으로 마이그레이션

## 🔧 주요 변경 내용
- [x] FCM SDK 통합
- [x] 토큰 저장/삭제 로직 구현
- [x] iOS 권한 요청 UI 개선
- [x] 알림 수신 테스트 완료

## ✅ 테스트 체크리스트
- [x] iOS PWA 테스트 완료
- [x] Android 브라우저 테스트 완료
- [x] 타입 체크 통과
- [x] 빌드 성공
"
```

#### 방법 2: GitHub 웹 UI

1. GitHub 저장소 페이지 접속
2. **Pull requests** 탭 클릭
3. **New pull request** 클릭
4. base: `main` ← compare: `feature/push-notification-v2`
5. **Create pull request** 클릭
6. PR 템플릿 내용 작성

### 5. 코드 리뷰 & 수정

```bash
# 리뷰 피드백 반영
git commit -m "fix: 리뷰 피드백 - 에러 핸들링 개선"
git push

# PR이 자동으로 업데이트됨
```

### 6. Merge

#### GitHub UI에서 Merge

1. PR 페이지에서 **Merge pull request** 클릭
2. Merge 방식 선택:
   - **Create a merge commit** (권장) - 히스토리 보존
   - Squash and merge - 커밋 압축
   - Rebase and merge - 선형 히스토리

3. **Confirm merge** 클릭

#### CLI에서 Merge

```bash
# PR이 승인되면
gh pr merge feature/push-notification-v2 \
  --merge \
  --delete-branch
```

### 7. 브랜치 정리

```bash
# 로컬 브랜치 삭제
git checkout main
git pull origin main
git branch -d feature/push-notification-v2

# 원격 브랜치는 merge 시 자동 삭제 (--delete-branch 옵션)
```

---

## 🔥 Hotfix 워크플로우 (긴급 수정)

### 프로덕션 버그 발견!

```bash
# 1. main에서 hotfix 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/dm-critical-bug

# 2. 최소한의 수정
git commit -m "fix: DM 읽음 처리 크리티컬 버그 수정"

# 3. 즉시 푸시 & PR
git push -u origin hotfix/dm-critical-bug

gh pr create \
  --title "🚨 Hotfix: DM 읽음 처리 버그" \
  --body "
## 긴급 수정 사항
사용자가 DM을 읽어도 읽음 상태로 표시되지 않는 버그

## 원인
conversationId 계산 로직 오류

## 수정 내용
- conversationId 정렬 로직 수정
- 읽음 처리 트랜잭션 추가

## 테스트
- [x] 로컬 테스트 완료
- [x] 프로덕션 재현 확인
"

# 4. Self-review 후 즉시 merge
gh pr merge hotfix/dm-critical-bug --merge --delete-branch

# 5. Vercel 자동 배포 확인
```

---

## 📝 Commit Message 규칙

### Conventional Commits 형식

```
<type>: <subject>

[optional body]

[optional footer]
```

### Type 종류

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새 기능 | `feat: AI 매칭 알고리즘 추가` |
| `fix` | 버그 수정 | `fix: DM 읽음 처리 버그 수정` |
| `refactor` | 리팩토링 | `refactor: 알림 시스템 단순화` |
| `docs` | 문서 | `docs: GitHub Flow 가이드 추가` |
| `test` | 테스트 | `test: 알림 유닛 테스트 추가` |
| `chore` | 빌드/설정 | `chore: dependencies 업데이트` |
| `style` | 코드 포맷 | `style: prettier 적용` |
| `perf` | 성능 개선 | `perf: 이미지 로딩 최적화` |

### Subject 규칙

- **50자 이내**
- **명령형** 사용: "추가한다" ✅ "추가했다" ❌
- **마침표 없음**
- **한글 또는 영어**

### 좋은 커밋 메시지 예시

```bash
# Good ✅
git commit -m "feat: FCM 푸시 알림 시스템 추가"
git commit -m "fix: iOS PWA에서 알림 권한 요청 안 되는 버그 수정"
git commit -m "refactor: 알림 토큰 저장 로직 단순화"
git commit -m "docs: 푸시 알림 설정 가이드 추가"

# Bad ❌
git commit -m "updated code"
git commit -m "fix bug"
git commit -m "asdfasdf"
git commit -m "WIP"
```

---

## 🎯 실전 시나리오

### 시나리오 1: 새 기능 개발 (AI 매칭 개선)

```bash
# 1. 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/improve-ai-matching

# 2. 작업
vim src/features/matching/ai-matcher.ts
git commit -m "feat: GPT-4 기반 매칭 알고리즘 추가"

vim src/features/matching/scoring.ts
git commit -m "feat: 독서 취향 점수 계산 로직 개선"

# 3. 테스트
npm run build
npm run lint
npx tsc --noEmit

# 4. Push & PR
git push -u origin feature/improve-ai-matching

gh pr create \
  --title "AI 매칭 알고리즘 개선" \
  --body "$(cat <<EOF
## 📋 변경사항 요약
GPT-4 API를 활용한 참가자 매칭 정확도 개선

## 🔧 주요 변경 내용
- [x] OpenAI GPT-4 API 통합
- [x] 독서 취향 벡터화 로직
- [x] 유사도 계산 알고리즘 개선

## ✅ 테스트 체크리스트
- [x] 타입 체크 통과
- [x] 빌드 성공
- [x] 매칭 정확도 테스트 (90% → 95% 향상)
EOF
)"

# 5. 리뷰 후 Merge
gh pr merge feature/improve-ai-matching --merge --delete-branch
```

### 시나리오 2: 버그 수정 (프로필 이미지 안 뜨는 문제)

```bash
# 1. 브랜치 생성
git checkout -b fix/profile-image-loading

# 2. 버그 수정
vim src/features/profile/components/ProfileImage.tsx
git commit -m "fix: WebP 이미지 로딩 실패 시 fallback 추가"

# 3. 테스트
npm run dev
# 브라우저에서 프로필 페이지 확인

# 4. Push & PR
git push -u origin fix/profile-image-loading

gh pr create \
  --title "프로필 이미지 로딩 실패 버그 수정" \
  --body "
## 🐛 버그 설명
일부 사용자의 프로필 이미지가 표시되지 않음

## 🔧 수정 내용
- WebP 이미지 로딩 실패 시 PNG fallback 추가
- 이미지 에러 핸들링 개선

## ✅ 테스트
- [x] WebP 미지원 브라우저 테스트
- [x] 네트워크 에러 시나리오 테스트
"

# 5. Merge
gh pr merge fix/profile-image-loading --merge --delete-branch
```

### 시나리오 3: 리팩토링 (알림 시스템 단순화)

```bash
# 1. 브랜치 생성
git checkout -b refactor/simplify-notification

# 2. 리팩토링
git commit -m "refactor: 푸시 토큰 저장 로직 단순화"
git commit -m "refactor: 중복 코드 제거 (DRY 원칙)"
git commit -m "refactor: 함수 분리 및 네이밍 개선"

# 3. 기능 테스트 (리팩토링은 동작 변경 없음)
npm run build
npm run lint

# 4. PR
git push -u origin refactor/simplify-notification

gh pr create \
  --title "알림 시스템 리팩토링" \
  --body "
## 🔧 리팩토링 내용
- 푸시 토큰 저장 로직 단순화 (150줄 → 80줄)
- 중복 코드 제거
- 함수명 개선 (명확성 향상)

## ✅ 동작 변경 없음
- [x] 기존 모든 기능 정상 작동 확인
- [x] 타입 에러 없음
- [x] 빌드 성공
"

# 5. Merge
gh pr merge refactor/simplify-notification --squash --delete-branch
```

---

## 🔄 Main 브랜치 최신 상태 유지

### Feature 브랜치 작업 중 main이 업데이트된 경우

```bash
# 현재 feature/my-feature 브랜치에서 작업 중
git status

# main 브랜치 최신화
git checkout main
git pull origin main

# 다시 feature 브랜치로 돌아와서 rebase
git checkout feature/my-feature
git rebase main

# 충돌 발생 시
# 1. 충돌 파일 수정
# 2. git add <파일>
# 3. git rebase --continue

# 강제 푸시 (rebase로 히스토리 변경됨)
git push --force-with-lease origin feature/my-feature
```

---

## ⚠️ 주의사항 & 팁

### DO ✅

1. **작은 단위로 커밋**
   ```bash
   # Good
   git commit -m "feat: FCM SDK 추가"
   git commit -m "feat: 토큰 저장 로직 구현"
   git commit -m "test: 토큰 저장 테스트 추가"

   # Bad
   git commit -m "feat: 푸시 알림 전체 구현"  # 너무 큼
   ```

2. **PR 크기 적절하게**
   - 한 PR에 500줄 이하 권장
   - 하나의 기능/수정에 집중
   - 너무 크면 리뷰 어려움

3. **브랜치 이름 명확하게**
   ```bash
   # Good
   feature/ai-book-matching
   fix/dm-notification-bug

   # Bad
   my-branch
   test123
   ```

4. **정기적으로 푸시**
   ```bash
   # 하루 작업 끝날 때마다 푸시
   git push

   # 장점: 작업 내역 백업, 진행 상황 공유
   ```

### DON'T ❌

1. **main 브랜치에서 직접 작업 금지**
   ```bash
   # Bad ❌
   git checkout main
   # 작업...
   git push origin main  # Branch protection이 막음
   ```

2. **WIP 커밋 남발 금지**
   ```bash
   # Bad ❌
   git commit -m "WIP"
   git commit -m "tmp"
   git commit -m "asdf"

   # 나중에 squash하거나 amend로 정리
   ```

3. **Force push 남발 금지**
   ```bash
   # Bad ❌
   git push --force origin main  # 절대 금지!

   # OK (본인 feature 브랜치만)
   git push --force-with-lease origin feature/my-feature
   ```

4. **거대한 PR 생성 금지**
   - 1000줄 이상 변경은 리뷰 불가
   - 여러 PR로 분리

---

## 🛠️ 유용한 명령어 모음

### Git 명령어

```bash
# 브랜치 목록 확인
git branch -a

# 브랜치 삭제
git branch -d feature/old-feature      # 로컬
git push origin --delete feature/old   # 원격

# 커밋 취소 (아직 push 안 함)
git reset --soft HEAD~1  # 커밋만 취소, 변경사항 유지
git reset --hard HEAD~1  # 커밋 + 변경사항 모두 취소

# 마지막 커밋 수정
git commit --amend

# Stash (임시 저장)
git stash              # 변경사항 임시 저장
git stash pop          # 다시 꺼내기
git stash list         # 목록 확인

# 변경사항 확인
git diff               # Unstaged 변경사항
git diff --staged      # Staged 변경사항
git log --oneline -10  # 최근 10개 커밋
```

### GitHub CLI 명령어

```bash
# PR 생성
gh pr create

# PR 목록
gh pr list

# PR 상태 확인
gh pr status

# PR Merge
gh pr merge 123 --merge

# PR Checkout (리뷰용)
gh pr checkout 123

# 브랜치 정보 확인
gh repo view
```

---

## 📊 Before/After 비교

### Before (Main 직접 커밋)

```bash
# 금요일 오후 5시
git checkout main
git commit -m "feat: 새 기능"
git push origin main
# → Vercel 자동 배포
# → 버그 발견 😱
# → 주말 내내 긴급 수정...
```

### After (GitHub Flow)

```bash
# 금요일 오후 5시
git checkout -b feature/new-feature
git commit -m "feat: 새 기능"
git push origin feature/new-feature
gh pr create
# → 배포 안 됨 (안전)
# → 월요일에 리뷰 & merge
# → 평화로운 주말 ✅
```

---

## 🎯 체크리스트

PR 생성 전 확인사항:

- [ ] `npm run lint` 통과
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run build` 성공
- [ ] 로컬에서 기능 테스트 완료
- [ ] 커밋 메시지 Conventional Commits 형식
- [ ] PR 템플릿 체크리스트 작성
- [ ] 스크린샷 첨부 (UI 변경 시)

---

## 🚀 다음 단계

1. **Branch Protection 설정**: [가이드 보기](./branch-protection-guide.md)
2. **첫 PR 생성**: 이 문서 추가를 첫 PR로!
3. **CI/CD 추가**: GitHub Actions 설정 (추후)

---

*이 문서는 프로젝트PNS의 공식 개발 워크플로우입니다. 모든 개발자는 이 가이드를 따라야 합니다.*
