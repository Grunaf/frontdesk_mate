import { cn } from '@/shared/lib/utils';

const RING_SIZE = 40;
const STROKE_WIDTH = 3;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type StepRingProgressProps = {
  totalSteps: number;
  completedSteps: number;
  className?: string;
  'aria-label'?: string;
};

export function StepRingProgress({
  totalSteps,
  completedSteps,
  className,
  'aria-label': ariaLabel,
}: StepRingProgressProps) {
  const safeTotal = Math.max(1, totalSteps);
  const safeCompleted = Math.min(Math.max(0, completedSteps), safeTotal);
  const fraction = safeCompleted / safeTotal;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  const center = RING_SIZE / 2;

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: RING_SIZE, height: RING_SIZE }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-valuenow={safeCompleted}
      aria-label={ariaLabel}
    >
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          className="stroke-muted"
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset] duration-300"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-foreground">
        {safeCompleted}/{safeTotal}
      </span>
    </div>
  );
}
