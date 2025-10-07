'use client';

interface EllipseShadowProps {
  topOffset: number;
  gradientId?: string;
}

export default function EllipseShadow({
  topOffset,
  gradientId = 'ellipse-gradient'
}: EllipseShadowProps) {
  return (
    <div className="absolute h-6 left-0 w-full" style={{ top: `${topOffset}px` }}>
      <svg
        className="absolute w-[650px] h-[500px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 650 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse
          cx="325"
          cy="250"
          rx="325"
          ry="250"
          fill={`url(#${gradientId})`}
          fillOpacity="0.15"
        />
        <defs>
          <radialGradient id={gradientId}>
            <stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
