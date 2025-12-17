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
      url: `${baseUrl}/program`,
      lastModified: new Date('2025-12-17'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/membership`,
      lastModified: new Date('2025-11-04'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/app`,
      lastModified: new Date('2025-11-04'),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy-policy.html`,
      lastModified: new Date('2025-09-23'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service.html`,
      lastModified: new Date('2025-09-23'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
