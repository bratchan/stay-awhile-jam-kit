interface MeterProps {
  label: string;
  value: number;
}

function clampMeterValue(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function Meter({ label, value }: MeterProps) {
  const safeValue = clampMeterValue(value);

  return (
    <div
      className="meter"
      role="meter"
      aria-label={label}
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}
