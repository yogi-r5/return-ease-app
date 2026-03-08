import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReturnItemForm, { type ReturnItem } from "@/components/returns/ReturnItemForm";

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

  const handleFileRemove = (itemId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, labelFile: null, labelPreview: null } : i
      )
    );
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
      { id: String(Date.now()), labelFile: null, labelPreview: null, deadline: null },
    ]);
  };

  const removeItem = (itemId: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const isValid = () => {
    const allItemsValid = items.every((item) => item.labelFile && item.deadline);
    if (isGuest) return allItemsValid && guestEmail.includes("@");
    return allItemsValid;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;
    setIsSubmitting(true);

    try {
      // Upload labels and create return records
      const returnIds: string[] = [];

      for (const item of items) {
        // Upload label to storage
        const fileName = `${Date.now()}-${item.labelFile!.name}`;
        const { error: uploadError } = await supabase.storage
          .from("return-labels")
          .upload(fileName, item.labelFile!);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("return-labels")
          .getPublicUrl(fileName);

        // Create return record
        const insertData: any = {
          deadline: item.deadline!.toISOString().split("T")[0],
          label_url: urlData.publicUrl,
          status: "in_basket",
          service_fee: 5.0,
        };

        if (isGuest) {
          insertData.guest_email = guestEmail;
        } else {
          insertData.user_id = user.id;
        }

        const { data: returnData, error: insertError } = await supabase
          .from("returns")
          .insert(insertData)
          .select("id")
          .single();

        if (insertError) throw insertError;
        returnIds.push(returnData.id);
      }

      // Create Stripe checkout session
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-payment",
        {
          body: {
            itemCount: items.length,
            returnIds,
            guestEmail: isGuest ? guestEmail : undefined,
          },
        }
      );

      if (paymentError) throw paymentError;

      if (paymentData?.url) {
        window.location.href = paymentData.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in">
          <button
            onClick={() => navigate(isGuest ? "/" : "/dashboard")}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">New Return</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isGuest ? "Guest checkout" : "Add items to your basket"}
            </p>
          </div>
        </div>

        {/* Guest Email */}
        {isGuest && (
          <div className="glass-card rounded-2xl p-4 mb-4 animate-fade-in-up">
            <label className="text-muted-foreground text-sm mb-2 block">
              Email for receipt
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-secondary/30 border border-border rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        )}

        {/* Return Items */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <ReturnItemForm
              key={item.id}
              item={item}
              index={index}
              canRemove={items.length > 1}
              onFileUpload={handleFileUpload}
              onFileRemove={handleFileRemove}
              onDateSelect={handleDateSelect}
              onRemove={removeItem}
            />
          ))}
        </div>

        {/* Add Another */}
        <button
          onClick={addAnotherItem}
          className="w-full mt-4 py-3 border border-dashed border-border rounded-2xl text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors flex items-center justify-center gap-2 animate-fade-in"
        >
          <Plus className="w-4 h-4" />
          Add another item
        </button>

        {/* Payment Section */}
        <div className="glass-card rounded-3xl p-5 mt-6 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Service fee</span>
            <span className="text-foreground font-medium">
              ${items.length * 5}.00
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid() || isSubmitting}
            className="auth-btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              <span>Pay & Submit Return</span>
            )}
          </button>
          <p className="text-center text-muted-foreground/50 text-xs mt-3">
            Secure checkout via Stripe · Apple Pay · Google Pay · Cards
          </p>
        </div>
      </div>
    </div>
  );
}
