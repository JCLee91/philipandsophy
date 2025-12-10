/**
 * 텍스트를 한 줄 미리보기용으로 정규화
 * - 줄바꿈을 공백으로 변환
 * - 연속 공백을 단일 공백으로 압축
 */
export function normalizeTextForPreview(text: string): string {
  if (!text) return '';
  return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}
