# Branch Protection 설정 가이드

**Last Updated**: 2025-10-22
**Category**: development

## Overview

GitHub에서 main 브랜치를 보호하여 실수로 프로덕션에 배포되는 것을 방지하는 설정 가이드입니다.

## 🎯 Branch Protection이 필요한 이유

### 현재 문제점
- main 브랜치에 직접 push 가능 → 검증 없이 바로 Vercel 배포
- 버그가 있는 코드가 프로덕션에 즉시 반영
- 코드 리뷰 프로세스 없음

### Branch Protection 적용 시
- ✅ main 브랜치 직접 push 차단
- ✅ Pull Request를 통해서만 main 업데이트 가능
- ✅ 리뷰 및 테스트 후 배포
- ✅ 유저 이탈 방지

---

## 📋 설정 방법

### 1. GitHub 저장소 Settings 이동

1. https://github.com/JCLee91/philipandsophy 접속
2. 상단 메뉴에서 **Settings** 클릭
3. 왼쪽 사이드바에서 **Branches** 클릭

### 2. Branch Protection Rule 추가

1. **Add branch protection rule** 버튼 클릭
2. **Branch name pattern**에 `main` 입력

### 3. 권장 설정 (필수)

다음 옵션들을 체크하세요:

#### ✅ Require a pull request before merging
- **목적**: main에 직접 push 차단, PR을 통해서만 merge 가능
- **설정**:
  - ✅ Require approvals: **1개** (1인 개발이므로 1개면 충분)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ⬜ Require review from Code Owners (선택사항)

#### ✅ Require status checks to pass before merging
- **목적**: 빌드/테스트 성공 후에만 merge 가능
- **설정**:
  - ✅ Require branches to be up to date before merging
  - 아직 CI/CD가 없으므로 status checks는 나중에 추가

#### ✅ Require conversation resolution before merging
- **목적**: PR의 모든 코멘트가 해결되어야 merge 가능
- **설정**: 체크

#### ✅ Do not allow bypassing the above settings
- **목적**: 관리자도 protection rule 준수
- **설정**: 체크 (안전성 최대화)

### 4. 선택 설정 (권장하지 않음)

다음은 체크하지 **마세요**:

#### ⬜ Require linear history
- 1인 개발에서는 불필요
- Merge commit을 허용해도 무방

#### ⬜ Require deployments to succeed before merging
- Vercel 배포는 merge 후 자동 진행
- 배포 실패 시 rollback으로 대응

#### ⬜ Lock branch
- 읽기 전용으로 만들면 개발 불가능

---

## 🎨 설정 완료 후 모습

### Branch Protection Rule 요약
```
Branch name pattern: main

✅ Require a pull request before merging
   - Required approvals: 1
   - Dismiss stale reviews: enabled

✅ Require conversation resolution before merging

✅ Do not allow bypassing the above settings
```

---

## 🔍 설정 확인 방법

### 테스트: main에 직접 push 시도

```bash
# main 브랜치에서 변경
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test: branch protection"

# Push 시도
git push origin main
```

**예상 결과**:
```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
To https://github.com/JCLee91/philipandsophy.git
 ! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs to 'https://github.com/JCLee91/philipandsophy.git'
```

✅ **이 에러가 나오면 정상 작동!**

---

## 🚀 설정 후 워크플로우

### Before (Branch Protection 없음)
```bash
git checkout main
# 작업...
git commit -m "feat: 새 기능"
git push origin main
# → 즉시 Vercel 배포 😱
```

### After (Branch Protection 적용)
```bash
# 1. Feature 브랜치 생성
git checkout -b feature/new-feature

# 2. 작업...
git commit -m "feat: 새 기능"

# 3. GitHub에 push
git push origin feature/new-feature

# 4. PR 생성 (GitHub UI 또는 gh CLI)
gh pr create --title "새 기능 추가" --body "..."

# 5. 리뷰 & 승인

# 6. Merge (GitHub UI에서)
# → 이제 Vercel 배포 ✅
```

---

## ⚠️ 주의사항

### 1인 개발자의 딜레마

**문제**: 본인이 작성한 PR을 본인이 승인해야 함

**해결책**:
1. **Self-approval 허용**: GitHub은 자신의 PR 승인을 막지 않음
2. **체크리스트 활용**: PR 템플릿의 체크리스트를 모두 확인 후 승인
3. **Claude Code 활용**: PR 생성 전 자동 코드 리뷰

### Hotfix 긴급 상황

**급한 버그 수정이 필요할 때**:

```bash
# Option 1: Hotfix 브랜치 (권장)
git checkout -b hotfix/critical-bug
git commit -m "fix: 긴급 버그 수정"
git push origin hotfix/critical-bug
gh pr create --title "🚨 Hotfix: 긴급 버그 수정"
# 빠르게 self-review → merge

# Option 2: Admin bypass (비권장)
# Settings → Branches에서 일시적으로 protection 해제
# 수정 후 다시 protection 활성화
```

**권장**: 아무리 급해도 Option 1 사용 (히스토리 추적 가능)

### Vercel 배포 트리거

Branch Protection 적용 후:
- ✅ `main` 브랜치 업데이트 시 자동 배포 (변경 없음)
- ✅ PR 생성 시 Preview 배포 (Vercel 자동 지원)
- ✅ PR merge 시 Production 배포

---

## 🔧 추후 확장 (CI/CD)

Branch Protection과 함께 CI/CD를 추가하면 더욱 강력해집니다:

### GitHub Actions 예시

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run build
```

**효과**:
- PR 생성 시 자동으로 lint, type check, build 실행
- 통과해야만 merge 가능 (Status check required)

---

## 📊 Before/After 비교

| 항목 | Before | After |
|------|--------|-------|
| main 직접 push | ✅ 가능 | ❌ 차단 |
| 코드 리뷰 | ❌ 없음 | ✅ 필수 |
| 테스트 검증 | ❌ 선택 | ✅ 체크리스트 |
| 배포 타이밍 | 😱 즉시 | ✅ 검증 후 |
| 롤백 | 🔥 revert 커밋 | ✅ PR revert |
| 히스토리 | 📝 커밋 로그 | ✅ PR 단위 |

---

## 🎯 결론

Branch Protection을 설정하면:
1. ✅ 실수로 인한 프로덕션 배포 방지
2. ✅ 코드 품질 향상 (리뷰 필수)
3. ✅ 유저 이탈 방지 (CLAUDE.md 우려 해결)
4. ✅ 협업 준비 (나중에 팀원 합류 시)

**5분 투자로 프로젝트를 안전하게!**

---

*이 문서는 GitHub Flow 워크플로우의 일부입니다. [GitHub Flow 가이드](./github-flow-guide.md)도 참고하세요.*
