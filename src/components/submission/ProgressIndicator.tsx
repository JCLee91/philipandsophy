'use client';

interface ProgressIndicatorProps {
  currentStep: 1 | 2 | 3;
}

export default function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const progress = (currentStep / 3) * 100;

  return (
    <div className="w-full h-1 bg-gray-200 relative">
      <div
        className="h-full bg-black transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
