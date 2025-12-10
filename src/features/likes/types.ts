export interface LikeData {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'review' | 'answer';
  targetUserId: string;
  createdAt: any; // Timestamp
}

export interface LikeStats {
  id: string; // targetId
  count: number;
  isLiked: boolean;
}
