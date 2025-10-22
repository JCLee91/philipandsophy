# 첫 Pull Request 생성 예시

**Last Updated**: 2025-10-22
**Category**: development

## 🎯 목표

이 가이드는 **실제로 GitHub Flow를 적용**하여 첫 번째 Pull Request를 생성하는 과정을 단계별로 안내합니다.

---

## 📋 시나리오: GitHub Flow 문서 추가를 첫 PR로!

방금 작성한 GitHub Flow 관련 문서들을 첫 번째 PR로 만들어봅시다.

### 추가된 파일들
- `.github/pull_request_template.md`
- `docs/development/github-flow-guide.md`
- `docs/development/branch-protection-guide.md`
- `docs/development/first-pr-example.md` (이 문서)
- `docs/README.md` (업데이트)

---

## 🚀 Step-by-Step 가이드

### Step 1: 현재 상태 확인

```bash
# 프로젝트 디렉토리로 이동
cd /Users/jclee/Desktop/휠즈랩스/projectpns

# 현재 브랜치 확인
git branch
# * main (현재 main 브랜치에 있음)

# 변경사항 확인
git status
```

**예상 출력**:
```
On branch main
Untracked files:
  .github/pull_request_template.md
  docs/development/branch-protection-guide.md
  docs/development/first-pr-example.md
  docs/development/github-flow-guide.md

Modified files:
  docs/README.md
```

---

### Step 2: Feature 브랜치 생성

```bash
# main 브랜치가 최신인지 확인
git checkout main
git pull origin main

# 새 feature 브랜치 생성
git checkout -b docs/add-github-flow-guides
```

**브랜치명 설명**:
- `docs/` prefix: 문서 작업
- `add-github-flow-guides`: 무엇을 하는지 명확하게

---

### Step 3: 변경사항 스테이징

```bash
# 새로 생성된 파일들 추가
git add .github/pull_request_template.md
git add docs/development/

# 수정된 파일 추가
git add docs/README.md

# 스테이징된 파일 확인
git status
```

---

### Step 4: 커밋

```bash
git commit -m "docs: GitHub Flow 워크플로우 가이드 추가

- PR 템플릿 추가 (.github/pull_request_template.md)
- GitHub Flow 전체 워크플로우 가이드 추가
- Branch Protection 설정 가이드 추가
- 첫 PR 생성 예시 가이드 추가
- 문서 인덱스 업데이트 (docs/README.md)
"
```

**커밋 메시지 구조**:
- 첫 줄: `docs: ` prefix + 간결한 요약 (50자 이내)
- 빈 줄
- 상세 설명 (bullet points)

---

### Step 5: GitHub에 푸시

```bash
# 처음 푸시 시 upstream 설정
git push -u origin docs/add-github-flow-guides
```

**예상 출력**:
```
Enumerating objects: 15, done.
Counting objects: 100% (15/15), done.
Delta compression using up to 8 threads
Compressing objects: 100% (12/12), done.
Writing objects: 100% (13/13), 45.67 KiB | 3.81 MiB/s, done.
Total 13 (delta 2), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (2/2), completed with 2 local objects.
remote:
remote: Create a pull request for 'docs/add-github-flow-guides' on GitHub by visiting:
remote:      https://github.com/JCLee91/philipandsophy/pull/new/docs/add-github-flow-guides
remote:
To https://github.com/JCLee91/philipandsophy.git
 * [new branch]      docs/add-github-flow-guides -> docs/add-github-flow-guides
Branch 'docs/add-github-flow-guides' set up to track remote branch 'docs/add-github-flow-guides' from 'origin'.
```

---

### Step 6: Pull Request 생성

#### 방법 1: GitHub CLI (추천)

```bash
gh pr create \
  --title "📚 GitHub Flow 워크플로우 가이드 추가" \
  --body "$(cat <<'EOF'
## 📋 변경사항 요약

프로젝트에 GitHub Flow 기반 개발 워크플로우를 도입하기 위한 문서 추가

## 🎯 변경 이유

현재 main 브랜치에 직접 커밋하는 방식은 다음과 같은 문제가 있습니다:
- 버그가 있는 코드가 즉시 프로덕션 배포됨
- 코드 리뷰 프로세스 없음
- 유저 이탈 위험 (CLAUDE.md에 명시된 우려사항)

GitHub Flow를 도입하여 안전한 개발 환경을 구축합니다.

## 🔧 주요 변경 내용

- [x] PR 템플릿 추가 (`.github/pull_request_template.md`)
  - 체크리스트 기반 PR 작성 가이드
  - 테스트 환경 및 스크린샷 섹션
  - 리뷰어 체크리스트

- [x] GitHub Flow 완전 가이드 (`docs/development/github-flow-guide.md`)
  - 브랜치 명명 규칙
  - 전체 워크플로우 (feature/fix/hotfix)
  - Commit Message 컨벤션
  - 실전 시나리오 3가지
  - 유용한 Git 명령어 모음

- [x] Branch Protection 설정 가이드 (`docs/development/branch-protection-guide.md`)
  - GitHub Settings 설정 방법
  - 권장 설정 옵션
  - 설정 후 워크플로우 변화
  - Hotfix 긴급 대응 방법

- [x] 첫 PR 예시 가이드 (`docs/development/first-pr-example.md`)
  - Step-by-step 첫 PR 생성 과정
  - 이 PR 자체가 예시!

- [x] 문서 인덱스 업데이트 (`docs/README.md`)
  - 개발 워크플로우 섹션 추가

## ✅ 테스트 체크리스트

- [x] 모든 문서 마크다운 문법 확인
- [x] 내부 링크 동작 확인
- [x] 코드 블록 문법 하이라이팅 확인
- [x] 가이드 따라 실제 브랜치 생성 테스트 완료 (이 PR!)

## 📱 테스트 환경

- [x] 로컬 에디터에서 마크다운 렌더링 확인
- [x] GitHub 마크다운 렌더링 호환성 확인

## 📸 스크린샷 / 영상

### 문서 구조
```
docs/
└── development/           # ✨ NEW
    ├── github-flow-guide.md
    ├── branch-protection-guide.md
    └── first-pr-example.md

.github/
└── pull_request_template.md  # ✨ NEW
```

## 🚨 Breaking Changes

- [x] 없음

## 📝 추가 노트

### 다음 단계
1. 이 PR merge 후 Branch Protection 설정 필요
2. GitHub Settings > Branches에서 설정
3. 설정 후 main 직접 push 차단됨

### 협업 준비
- 1인 개발이지만 향후 팀 확장 대비
- Self-review 프로세스 확립
- CI/CD 추가 준비 완료

EOF
)"
```

#### 방법 2: GitHub 웹 UI

1. 출력된 URL 클릭: `https://github.com/JCLee91/philipandsophy/pull/new/docs/add-github-flow-guides`
2. PR 템플릿이 자동으로 로드됨
3. 템플릿 내용 작성
4. **Create pull request** 클릭

---

### Step 7: PR 확인 & Self-Review

PR이 생성되면:

1. **Files changed** 탭 확인
   - 변경된 파일 목록
   - 추가된 라인 (녹색)
   - 삭제된 라인 (빨간색)

2. **Self-review 수행**
   ```bash
   # 로컬에서 다시 한번 확인
   git diff main...docs/add-github-flow-guides
   ```

3. **코멘트 추가** (필요 시)
   - 특정 라인에 설명 추가
   - 리뷰어(미래의 나)에게 메모

---

### Step 8: Merge

PR 검토 완료 후:

#### GitHub UI에서

1. **Merge pull request** 버튼 클릭
2. **Merge 방식 선택**:
   - **Create a merge commit** (권장) ← 선택
   - Squash and merge
   - Rebase and merge

3. **Confirm merge** 클릭

#### CLI에서

```bash
gh pr merge docs/add-github-flow-guides \
  --merge \
  --delete-branch
```

---

### Step 9: 정리

```bash
# main 브랜치로 이동
git checkout main

# 최신 변경사항 가져오기
git pull origin main

# 로컬 브랜치 삭제 (이미 merge됨)
git branch -d docs/add-github-flow-guides

# 브랜치 목록 확인
git branch -a
# * main
#   remotes/origin/main
```

---

## 🎉 축하합니다!

첫 번째 Pull Request를 성공적으로 생성하고 merge했습니다!

### 이제 할 수 있는 것들

✅ Feature 브랜치에서 안전하게 개발
✅ PR을 통한 코드 리뷰
✅ 배포 타이밍 컨트롤
✅ 체계적인 히스토리 관리

---

## 🔍 학습 포인트

### 1. main은 이제 직접 push 불가

```bash
# 이제 이렇게 하면 에러!
git checkout main
echo "test" >> test.txt
git commit -m "test"
git push origin main
# ❌ remote rejected (branch protection 적용 시)
```

### 2. 항상 브랜치에서 작업

```bash
# 올바른 방법
git checkout -b feature/my-feature
# 작업...
git push origin feature/my-feature
# PR 생성
```

### 3. PR이 히스토리의 단위

```bash
# Before
git log --oneline
* feat: 기능 A
* fix: 버그 수정
* feat: 기능 B

# After
git log --oneline
* Merge pull request #3: 기능 B 추가
* Merge pull request #2: 버그 수정
* Merge pull request #1: 기능 A 추가
```

---

## 📚 다음 읽을 문서

1. **[Branch Protection 설정](./branch-protection-guide.md)** - GitHub에서 main 브랜치 보호 설정
2. **[GitHub Flow 가이드](./github-flow-guide.md)** - 전체 워크플로우 상세 설명

---

## 💡 팁

### PR 크기 적절하게 유지

- ✅ 이 PR: 문서 5개 추가 (적절)
- ❌ 너무 큼: 기능 10개 한 번에
- ❌ 너무 작음: 오타 수정 하나에 PR

### 의미 있는 단위로 PR 생성

- ✅ "GitHub Flow 가이드 추가" (하나의 목적)
- ❌ "여러 가지 수정" (여러 목적 섞임)

### 첫 PR은 작게 시작

- 문서 추가 (이 예시처럼)
- 작은 버그 수정
- 코드 포맷 정리

점차 복잡한 기능으로 확장!

---

*이 문서를 따라 첫 PR을 생성하셨나요? 축하드립니다! 이제 GitHub Flow 전문가입니다. 🎉*
