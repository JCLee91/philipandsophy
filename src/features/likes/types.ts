export interface LikeData {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'review' | 'answer';
  targetUserId: string;
  createdAt: any; // Timestamp
}
