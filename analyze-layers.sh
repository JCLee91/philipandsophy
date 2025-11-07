#!/bin/bash

echo "=== 레이어 구조 분석 ==="
echo ""

# today-library 확인
echo "[오늘의 서재]"
grep -A 3 "Main Content" src/app/app/chat/today-library/page.tsx | grep -E "main|div" | head -4

echo ""
echo "[참가자 목록]"  
grep -A 3 "BackHeader" src/app/app/chat/participants/page.tsx | grep -E "main|div" | head -4

