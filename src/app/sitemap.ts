import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.philipandsophy.kr';

  return [
    {
      url: baseUrl,
      lastModified: new Date('2025-11-04'),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/service`,
      lastModified: new Date('2025-11-04'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/membership`,
      lastModified: new Date('2025-11-04'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // /program은 비밀 페이지 (robots: noindex)이므로 사이트맵에서 제외
    {
      url: `${baseUrl}/app`,
      lastModified: new Date('2025-11-04'),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];
}
