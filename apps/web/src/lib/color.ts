export function withAlpha(color: string, percentage: number): string {
  return `color-mix(in oklab, ${color} ${percentage}%, transparent)`;
}
