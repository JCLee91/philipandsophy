'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AwardCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  winner: { participantId: string; participantName: string } | null;
  detail: string | null;
  subDetail?: string | null;
}

export default function AwardCard({
  icon,
  title,
  description,
  winner,
  detail,
  subDetail,
}: AwardCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {winner ? (
          <div>
            <p className="text-xl font-bold">{winner.participantName}</p>
            {detail && <p className="text-sm text-muted-foreground mt-1">{detail}</p>}
            {subDetail && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{subDetail}</p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">해당자 없음</p>
        )}
      </CardContent>
    </Card>
  );
}
