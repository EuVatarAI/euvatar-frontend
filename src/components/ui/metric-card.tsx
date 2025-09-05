import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  Icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export const MetricCard = ({ title, value, Icon, trend, className }: MetricCardProps) => {
  return (
    <Card className={`gradient-card shadow-card border-border p-6 animate-fade-in ${className || ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.value > 0 ? 'text-success' : 'text-destructive'}`}>
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className="p-3 rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </Card>
  );
};