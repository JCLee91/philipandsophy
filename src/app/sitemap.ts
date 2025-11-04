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
    {
      url: `${baseUrl}/program`,
      lastModified: new Date('2025-10-28'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/app`,
      lastModified: new Date('2025-11-04'),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];
}
