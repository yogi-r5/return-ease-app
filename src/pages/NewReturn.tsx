import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, Calendar, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
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

export default function NewReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGuest = searchParams.get("guest") === "true";

  const [user, setUser] = useState<any>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([
    { id: "1", labelFile: null, labelPreview: null, deadline: null },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isGuest) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          navigate("/");
        } else {
          setUser(session.user);
        }
      });
    }
  }, [isGuest, navigate]);

  const handleFileUpload = (itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, labelFile: file, labelPreview: reader.result as string }
            : item
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const handleDateSelect = (itemId: string, date: Date | undefined) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, deadline: date || null } : item
      )
    );
  };

  const addAnotherItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        labelFile: null,
        labelPreview: null,
        deadline: null,
      },
    ]);
  };

  const removeItem = (itemId: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const isValid = () => {
    const allItemsValid = items.every((item) => item.labelFile && item.deadline);
    if (isGuest) {
      return allItemsValid && guestEmail.includes("@");
    }
    return allItemsValid;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;

    setIsSubmitting(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast({
      title: "Return Confirmed!",
      description: `${items.length} item${items.length > 1 ? "s" : ""} added to your basket`,
    });

    if (isGuest) {
      navigate("/success?guest=true");
    } else {
      navigate("/dashboard");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <button
            onClick={() => navigate(isGuest ? "/" : "/dashboard")}
            className="p-2 text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">New Return</h1>
            <p className="text-white/50 text-sm mt-1">
              {isGuest ? "Guest checkout" : "Add items to your basket"}
            </p>
          </div>
        </div>

        {/* Guest Email */}
        {isGuest && (
          <div className="glass-card rounded-2xl p-4 mb-4 animate-fade-in-up">
            <label className="text-white/60 text-sm mb-2 block">
              Email for receipt
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-teal-vibrant transition-colors"
            />
          </div>
        )}

        {/* Return Items */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="glass-card rounded-3xl p-5 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/60 text-sm">
                  Item {index + 1}
                </span>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-white/30 hover:text-white/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Label Upload */}
              <div className="mb-4">
                <label className="text-white text-sm font-medium mb-2 block">
                  Return Label
                </label>
                {item.labelPreview ? (
                  <div className="relative rounded-2xl overflow-hidden bg-white/5">
                    <img
                      src={item.labelPreview}
                      alt="Label preview"
                      className="w-full h-40 object-cover"
                    />
                    <button
                      onClick={() =>
                        setItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id
                              ? { ...i, labelFile: null, labelPreview: null }
                              : i
                          )
                        )
                      }
                      className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white/70 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:border-teal-vibrant/50 transition-colors">
                    <Upload className="w-8 h-8 text-white/40 mb-2" />
                    <span className="text-white/50 text-sm">
                      Drop or tap to upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(item.id, file);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Deadline Picker */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Last Day to Return
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-left hover:border-white/20 transition-colors",
                        !item.deadline && "text-white/30"
                      )}
                    >
                      <Calendar className="w-5 h-5 text-teal-light" />
                      {item.deadline
                        ? format(item.deadline, "PPP")
                        : "Select deadline"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-white/10" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={item.deadline || undefined}
                      onSelect={(date) => handleDateSelect(item.id, date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))}
        </div>

        {/* Add Another */}
        <button
          onClick={addAnotherItem}
          className="w-full mt-4 py-3 border border-dashed border-white/20 rounded-2xl text-white/50 hover:text-white/80 hover:border-white/40 transition-colors flex items-center justify-center gap-2 animate-fade-in"
        >
          <Plus className="w-4 h-4" />
          Add another item
        </button>

        {/* Payment Section */}
        <div className="glass-card rounded-3xl p-5 mt-6 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60">Service fee</span>
            <span className="text-white font-medium">
              ${items.length * 5}.00
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid() || isSubmitting}
            className="auth-btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Pay & Submit Return</span>
            )}
          </button>
          <p className="text-center text-white/30 text-xs mt-3">
            Payment secured by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
