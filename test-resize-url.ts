import { getResizedImageUrl } from './src/lib/image-utils';

const testUrls = [
  'https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/reading_submissions%2Fcohort2-%EC%9B%90%EC%9A%B0%2F1761577924005_WIN_20251027_23_47_32_Pro.jpg?alt=media&token=efd874da-3def-49b0-a4a0-28cdeb5dc2fb',
  'https://firebasestorage.googleapis.com/v0/b/philipandsophy.firebasestorage.app/o/cohorts%2Fcohort1%2Fprofiles%2FHJ.webp?alt=media',
];

console.log('URL 변환 테스트:\n');
testUrls.forEach((url, idx) => {
  console.log(`${idx + 1}. 원본:`);
  console.log(`   ${url}`);
  console.log(`   리사이즈:`);
  console.log(`   ${getResizedImageUrl(url)}`);
  console.log('');
});
