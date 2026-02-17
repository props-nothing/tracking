'use client';

interface Annotation {
  id: string;
  date: string;
  text: string;
}

interface AnnotationMarkersProps {
  annotations: Annotation[];
  chartWidth: number;
  chartHeight: number;
  dateRange: { from: string; to: string };
}

export function AnnotationMarkers({ annotations, chartWidth, chartHeight, dateRange }: AnnotationMarkersProps) {
  if (!annotations.length) return null;

  const fromTime = new Date(dateRange.from).getTime();
  const toTime = new Date(dateRange.to).getTime();
  const range = toTime - fromTime;

  if (range <= 0) return null;

  // Left margin offset for recharts (approx 60px)
  const marginLeft = 60;
  const marginRight = 10;
  const usableWidth = chartWidth - marginLeft - marginRight;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ left: marginLeft }}>
      {annotations.map((ann) => {
        const annTime = new Date(ann.date).getTime();
        const pct = (annTime - fromTime) / range;
        if (pct < 0 || pct > 1) return null;
        const left = pct * usableWidth;

        return (
          <div key={ann.id} className="absolute top-0 pointer-events-auto" style={{ left }}>
            {/* Vertical line */}
            <div className="w-px bg-orange-400/60" style={{ height: chartHeight - 30 }} />
            {/* Marker dot */}
            <div className="group relative -ml-1.5 -mt-1">
              <div className="h-3 w-3 rounded-full border-2 border-orange-400 bg-background cursor-pointer" />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                <div className="rounded-md bg-popover border px-2.5 py-1.5 text-xs shadow-md whitespace-nowrap">
                  <p className="font-medium">{new Date(ann.date).toLocaleDateString()}</p>
                  <p className="text-muted-foreground">{ann.text}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
