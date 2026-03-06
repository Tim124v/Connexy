'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils';

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  suspense: true,
});

interface SplineSceneProps {
  scene: string;
  className?: string;
  /** Disable pointer/scroll interactions that can cause zoom/focus changes. */
  interactive?: boolean;
  /** Keep interaction but prevent wheel/pinch zoom. */
  lockZoom?: boolean;
  /** Optional className for the Spline canvas element. */
  splineClassName?: string;
  /** Optional style for the Spline canvas element (e.g. scale/translate). */
  splineStyle?: CSSProperties;
}

export function SplineScene({
  scene,
  className,
  interactive = true,
  lockZoom = false,
  splineClassName,
  splineStyle,
}: SplineSceneProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lockZoom) return;
    const el = wrapperRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Prevent zoom-in/out & camera jumps from wheel/trackpad gestures inside Spline
      e.preventDefault();
    };
    const onGesture = (e: Event) => {
      e.preventDefault();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    // Safari / iOS gesture events
    el.addEventListener('gesturestart', onGesture, { passive: false } as AddEventListenerOptions);
    el.addEventListener('gesturechange', onGesture, { passive: false } as AddEventListenerOptions);
    el.addEventListener('gestureend', onGesture, { passive: false } as AddEventListenerOptions);

    return () => {
      el.removeEventListener('wheel', onWheel as EventListener);
      el.removeEventListener('gesturestart', onGesture as EventListener);
      el.removeEventListener('gesturechange', onGesture as EventListener);
      el.removeEventListener('gestureend', onGesture as EventListener);
    };
  }, [lockZoom]);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative w-full h-full', className)}
      style={lockZoom ? { touchAction: 'pan-x pan-y' } : undefined}
    >
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <span className="loader" />
          </div>
        }
      >
        <Spline
          key={scene}
          scene={scene}
          className={cn(
            interactive ? 'w-full h-full' : 'w-full h-full pointer-events-none select-none',
            splineClassName,
          )}
          style={splineStyle}
        />
      </Suspense>
    </div>
  );
}
