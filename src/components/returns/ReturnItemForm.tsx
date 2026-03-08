import { Upload, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ReturnItem {
  id: string;
  labelFile: File | null;
  labelPreview: string | null;
  deadline: Date | null;
}

interface ReturnItemFormProps {
  item: ReturnItem;
  index: number;
  canRemove: boolean;
  onFileUpload: (itemId: string, file: File) => void;
  onFileRemove: (itemId: string) => void;
  onDateSelect: (itemId: string, date: Date | undefined) => void;
  onRemove: (itemId: string) => void;
}

export default function ReturnItemForm({
  item,
  index,
  canRemove,
  onFileUpload,
  onFileRemove,
  onDateSelect,
  onRemove,
}: ReturnItemFormProps) {
  return (
    <div
      className="glass-card rounded-3xl p-5 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-muted-foreground text-sm">Item {index + 1}</span>
        {canRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Label Upload */}
      <div className="mb-4">
        <label className="text-foreground text-sm font-medium mb-2 block">
          Return Label
        </label>
        {item.labelPreview ? (
          <div className="relative rounded-2xl overflow-hidden bg-secondary/30">
            <img
              src={item.labelPreview}
              alt="Label preview"
              className="w-full h-40 object-cover"
            />
            <button
              onClick={() => onFileRemove(item.id)}
              className="absolute top-2 right-2 p-2 bg-background/70 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-muted-foreground text-sm">
              Drop or tap to upload
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(item.id, file);
              }}
            />
          </label>
        )}
      </div>

      {/* Deadline Picker */}
      <div>
        <label className="text-foreground text-sm font-medium mb-2 block">
          Last Day to Return
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 bg-secondary/30 border border-border rounded-xl py-3 px-4 text-left hover:border-muted-foreground/30 transition-colors",
                !item.deadline && "text-muted-foreground"
              )}
            >
              <Calendar className="w-5 h-5 text-primary" />
              {item.deadline
                ? format(item.deadline, "PPP")
                : "Select deadline"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
            <CalendarPicker
              mode="single"
              selected={item.deadline || undefined}
              onSelect={(date) => onDateSelect(item.id, date)}
              disabled={(date) => date < new Date()}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export type { ReturnItem };
