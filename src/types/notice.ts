export interface Notice {
  id: string;
  cohortId: string;
  author: string;
  content: string;
  imageUrl?: string;
  isPinned?: boolean;
  createdAt: string;
}
