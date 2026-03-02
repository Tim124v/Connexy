'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { cn } from '../../lib/utils';

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  suspense: true,
});

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <div className={cn('relative w-full h-full', className)}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <span className="loader" />
          </div>
        }
      >
        <Spline key={scene} scene={scene} className="w-full h-full" />
      </Suspense>
    </div>
  );
}
