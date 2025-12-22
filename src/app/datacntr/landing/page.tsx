'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LandingConfigForm from './_components/LandingConfigForm';
import LandingImagesForm from './_components/LandingImagesForm';
import FunnelAnalytics from './_components/FunnelAnalytics';

export default function LandingPageAdmin() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">랜딩 페이지 관리</h1>
        <p className="text-gray-600 mt-2">랜딩 페이지 설정, 이미지 관리 및 퍼널 분석을 수행합니다.</p>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">기본 설정</TabsTrigger>
          <TabsTrigger value="images">이미지 관리</TabsTrigger>
          <TabsTrigger value="funnel">퍼널 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <LandingConfigForm />
        </TabsContent>

        <TabsContent value="images">
          <LandingImagesForm />
        </TabsContent>

        <TabsContent value="funnel">
          <FunnelAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}






