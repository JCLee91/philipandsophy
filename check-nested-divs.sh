#!/bin/bash
echo "=== 중첩 div 패턴 검사 ==="
echo ""

files=(
  "src/app/app/chat/participants/page.tsx"
  "src/app/app/submit/step1/page.tsx"
  "src/app/app/submit/step2/page.tsx"
  "src/app/app/submit/step3/page.tsx"
  "src/app/app/profile/[participantId]/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "[$file]"
    # pt-* pb-* 패턴 찾기
    grep -n "className.*pt-.*pb-" "$file" | head -5
    echo ""
  fi
done
