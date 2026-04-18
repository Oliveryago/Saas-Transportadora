import React from 'react';

interface SkeletonProps {
  variant?: 'card' | 'table' | 'form' | 'page' | 'text' | 'circle';
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}

function SkeletonPulse({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={style}
    />
  );
}

export function Skeleton({ variant = 'text', width, height, count = 1, className = '' }: SkeletonProps) {
  if (variant === 'circle') {
    return (
      <SkeletonPulse
        className={`rounded-full ${className}`}
        style={{ width: width || '40px', height: height || '40px' }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 space-y-3">
            <SkeletonPulse style={{ width: '40%', height: '14px' }} />
            <SkeletonPulse style={{ width: '60%', height: '28px' }} />
            <SkeletonPulse style={{ width: '80%', height: '14px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
        {/* Header */}
        <div className="border-b bg-gray-50 px-6 py-4 flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonPulse key={i} style={{ width: '18%', height: '14px' }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="border-b last:border-0 px-6 py-4 flex gap-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <SkeletonPulse key={j} style={{ width: '18%', height: '14px' }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={`bg-white rounded-lg shadow p-6 space-y-5 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonPulse style={{ width: '30%', height: '14px' }} />
            <SkeletonPulse style={{ width: '100%', height: '40px' }} className="rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'page') {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Title */}
        <SkeletonPulse style={{ width: '250px', height: '32px' }} />
        {/* Cards row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 space-y-3">
              <SkeletonPulse style={{ width: '50%', height: '14px' }} />
              <SkeletonPulse style={{ width: '40%', height: '28px' }} />
            </div>
          ))}
        </div>
        {/* Table */}
        <Skeleton variant="table" count={8} />
      </div>
    );
  }

  // Default: text lines
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPulse
          key={i}
          style={{
            width: width || (i === count - 1 ? '60%' : '100%'),
            height: height || '14px',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Page-level skeleton usado como fallback do Suspense no lazy loading
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar placeholder */}
      <div className="hidden md:block fixed left-0 top-0 h-screen w-64 bg-slate-900" />
      {/* Content */}
      <div className="md:ml-64 p-6">
        <Skeleton variant="page" />
      </div>
    </div>
  );
}
