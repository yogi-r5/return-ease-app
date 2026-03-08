import { Package, Truck, MapPin, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG = {
  in_basket: {
    label: "In Basket",
    icon: Package,
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    step: 0,
  },
  courier_assigned: {
    label: "Courier Assigned",
    icon: Truck,
    color: "text-accent",
    bg: "bg-accent/10",
    step: 1,
  },
  en_route: {
    label: "En Route",
    icon: MapPin,
    color: "text-primary",
    bg: "bg-primary/10",
    step: 2,
  },
  dropped_off: {
    label: "Dropped Off",
    icon: CheckCircle,
    color: "text-primary",
    bg: "bg-primary/20",
    step: 3,
  },
};

const STEPS = ["in_basket", "courier_assigned", "en_route", "dropped_off"] as const;

interface ReturnStatusCardProps {
  returnItem: {
    id: string;
    status: string;
    deadline: string;
    paid: boolean;
    created_at: string;
    label_url: string | null;
  };
}

export default function ReturnStatusCard({ returnItem }: ReturnStatusCardProps) {
  const config = STATUS_CONFIG[returnItem.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.in_basket;
  const Icon = config.icon;

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <p className="text-foreground font-medium text-sm">{config.label}</p>
            <p className="text-muted-foreground text-xs">
              Due {format(new Date(returnItem.deadline), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${returnItem.paid ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
          {returnItem.paid ? "Paid" : "Unpaid"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= config.step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
