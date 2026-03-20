import { Card, CardContent } from "@/components/ui/Card";

export function MetricCard({ title, value, subtitle, colorClass }: { title: string, value: string | number, subtitle?: string, colorClass?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-[var(--color-muted)] mb-2">{title}</p>
        <h3 className={`text-3xl font-serif ${colorClass || 'text-[var(--color-navy)]'}`}>{value}</h3>
        {subtitle && <p className="text-xs text-[var(--color-muted)] mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
