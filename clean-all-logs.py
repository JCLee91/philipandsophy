#!/usr/bin/env python3
"""
모든 어플리케이션 코드에서 logger 호출을 제거하는 스크립트
"""
import os
import re
from pathlib import Path

def clean_logs_in_file(filepath):
    """파일에서 logger 호출 제거"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. logger.info, logger.warn, logger.error, logger.debug 제거 (멀티라인 포함)
    # 싱글라인 제거
    content = re.sub(r'^\s*logger\.(info|warn|error|debug)\([^;]*\);\s*$', '', content, flags=re.MULTILINE)

    # 멀티라인 제거 (줄별 처리)
    lines = content.split('\n')
    cleaned_lines = []
    skip_until_semicolon = False

    for line in lines:
        # logger 호출 시작
        if re.match(r'^\s*logger\.(info|warn|error|debug)\(', line):
            # 같은 줄에 세미콜론이 있으면 해당 줄만 스킵
            if ');' in line:
                continue
            # 없으면 다음 세미콜론까지 스킵 시작
            skip_until_semicolon = True
            continue

        # 스킵 모드일 때
        if skip_until_semicolon:
            if ');' in line:
                skip_until_semicolon = False
            continue

        cleaned_lines.append(line)

    content = '\n'.join(cleaned_lines)

    # 2. 3개 이상 연속된 빈 줄을 2개로 줄임
    content = re.sub(r'\n\n\n+', '\n\n', content)

    # 변경사항이 있으면 파일 저장
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    # src 디렉토리 하위의 모든 .ts, .tsx 파일 (scripts 제외)
    src_dir = Path('src')

    modified_count = 0
    total_count = 0

    for ext in ['*.ts', '*.tsx']:
        for filepath in src_dir.rglob(ext):
            # scripts 폴더 제외
            if 'scripts' in filepath.parts:
                continue

            total_count += 1

            if clean_logs_in_file(filepath):
                modified_count += 1
                print(f'✅ {filepath}')

    print(f'\n총 {total_count}개 파일 검사, {modified_count}개 파일 수정됨')

if __name__ == '__main__':
    main()
