import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReturnItemForm, { type ReturnItem } from "@/components/returns/ReturnItemForm";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const MAX_ITEMS = 5;
const SERVICE_FEE = 5.0;
const MAX_FILE_SIZE_MB = 20;

// Load Stripe once at module level
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// Elements options — deferred intent mode: amount/currency set here,
// actual PaymentIntent is created server-side inside onConfirm.
const ELEMENTS_OPTIONS = {
  mode: "payment" as const,
  amount: 500, // $5.00 in cents
  currency: "usd",
  paymentMethodTypes: ["card"],
  appearance: {
    theme: "night" as const,
    variables: { borderRadius: "12px" },
  },
};

// ─── Express Checkout inner component (must live inside <Elements>) ───────────
interface ExpressButtonProps {
  isFormValid: boolean;
  onCreateReturns: () => Promise<string[]>;
  guestEmail: string;
  isGuest: boolean;
  onSubmitting: (v: boolean) => void;
}

function ExpressButton({
  isFormValid,
  onCreateReturns,
  guestEmail,
  isGuest,
  onSubmitting,
}: ExpressButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const handleConfirm = async () => {
    if (!stripe || !elements) return;

    if (!isFormValid) {
      toast({
        title: "Please complete the form first",
        description: "Add your address, return labels, and deadlines.",
        variant: "destructive",
      });
      return;
    }

    onSubmitting(true);
    try {
      // Step 1: Validate/freeze the express checkout data
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message);

      // Step 2: Upload files + create DB records (paid=false)
      const returnIds = await onCreateReturns();

      // Step 3: Create PaymentIntent server-side ($5 flat)
      const { data: intentData, error: intentError } = await supabase.functions.invoke(
        "create-payment-intent",
        { body: { returnIds, guestEmail: isGuest ? guestEmail : undefined } }
      );
      if (intentError) throw new Error(intentError.message);

      // Step 4: Confirm with Apple Pay / Google Pay (native sheet)
      const result = await stripe.confirmPayment({
        elements,
        clientSecret: intentData.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/success`,
        },
        redirect: "if_required",
      });

      if (result.error) throw new Error(result.error.message);

      // Step 5: Payment succeeded — navigate to success page
      // (only reached when no redirect needed, typical for Apple/Google Pay)
      if (result.paymentIntent) {
        navigate(
          `/success?payment_intent_id=${result.paymentIntent.id}&return_ids=${returnIds.join(",")}`
        );
      }
    } catch (error: any) {
      console.error("Express payment error:", error);
      toast({
        title: "Payment failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      onSubmitting(false);
    }
  };

  return (
    <div className="mb-5 animate-fade-in-up">
      <ExpressCheckoutElement
        onConfirm={handleConfirm}
        options={{
          buttonHeight: 52,
          buttonType: { applePay: "buy", googlePay: "buy" },
          buttonTheme: { applePay: "black", googlePay: "black" },
          paymentMethods: {
            applePay: "auto",
            googlePay: "auto",
            link: "never",
          },
        }}
      />
      <div className="flex items-center gap-3 mt-4">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-muted-foreground/60 text-xs uppercase tracking-wide">
          or pay with card
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function NewReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGuest = searchParams.get("guest") === "true";

  const [user, setUser] = useState<any>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [buildingAddress, setBuildingAddress] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([
    { id: "1", labelFile: null, labelPreview: null, deadline: null },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isGuest) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) navigate("/");
        else setUser(session.user);
      });
    }
  }, [isGuest, navigate]);

  // ── File handlers ────────────────────────────────────────────────────────────
  const handleFileUpload = (itemId: string, file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please upload a file under ${MAX_FILE_SIZE_MB}MB.`,
        variant: "destructive",
      });
      return;
    }
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
      prev.map((i) => (i.id === itemId ? { ...i, labelFile: null, labelPreview: null } : i))
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
    if (items.length >= MAX_ITEMS) {
      toast({
        title: "Maximum reached",
        description: `Up to ${MAX_ITEMS} returns per order — all covered by the flat $${SERVICE_FEE} fee.`,
      });
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), labelFile: null, labelPreview: null, deadline: null },
    ]);
  };

  const removeItem = (itemId: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const isValid = () => {
    const allItemsValid = items.every((item) => item.labelFile && item.deadline);
    const hasAddress = buildingAddress.trim().length > 0;
    if (isGuest) return allItemsValid && hasAddress && guestEmail.includes("@");
    return allItemsValid && hasAddress;
  };

  // ── Shared: upload files + create DB records (used by both payment flows) ────
  const uploadAndCreateReturns = async (): Promise<string[]> => {
    const returnIds: string[] = [];
    for (const item of items) {
      const safeName = item.labelFile!.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("return-labels")
        .upload(fileName, item.labelFile!);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from("return-labels")
        .getPublicUrl(fileName);

      const insertData: any = {
        deadline: item.deadline!.toISOString().split("T")[0],
        label_url: urlData.publicUrl,
        status: "in_basket",
        service_fee: SERVICE_FEE,
        building_address: buildingAddress.trim(),
        room_number: roomNumber.trim() || null,
      };

      if (isGuest) {
        insertData.guest_email = guestEmail.toLowerCase().trim();
      } else {
        insertData.user_id = user.id;
      }

      const { data: returnData, error: insertError } = await supabase
        .from("returns")
        .insert(insertData)
        .select("id")
        .single();
      if (insertError) throw new Error(`Failed to create return: ${insertError.message}`);
      returnIds.push(returnData.id);
    }
    return returnIds;
  };

  // ── Standard checkout → Stripe hosted Checkout page ─────────────────────────
  const handleSubmit = async () => {
    if (!isValid()) return;
    setIsSubmitting(true);
    try {
      const returnIds = await uploadAndCreateReturns();
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-payment",
        {
          body: {
            itemCount: 1, // Always 1 unit = flat $5
            returnIds,
            guestEmail: isGuest ? guestEmail : undefined,
          },
        }
      );
      if (paymentError) throw new Error(paymentError.message);
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

  // ── Render ───────────────────────────────────────────────────────────────────
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
              Email for receipt &amp; tracking
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              className="w-full bg-secondary/30 border border-border rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        )}

        {/* Pickup Address */}
        <div className="glass-card rounded-2xl p-4 mb-4 animate-fade-in-up">
          <label className="text-muted-foreground text-sm mb-2 block">Building address</label>
          <input
            type="text"
            value={buildingAddress}
            onChange={(e) => setBuildingAddress(e.target.value)}
            placeholder="123 Main St, New York NY 10001"
            autoComplete="street-address"
            className="w-full bg-secondary/30 border border-border rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
          />
          <label className="text-muted-foreground text-sm mt-3 mb-2 block">
            Room / Unit / Apt no.
          </label>
          <input
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="Apt 4B  ·  Room 214  ·  Suite 5"
            autoComplete="address-line2"
            className="w-full bg-secondary/30 border border-border rounded-xl py-3 px-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

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

        {/* Add Another Item */}
        {items.length < MAX_ITEMS ? (
          <button
            onClick={addAnotherItem}
            className="w-full mt-4 py-3 border border-dashed border-border rounded-2xl text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors flex items-center justify-center gap-2 animate-fade-in"
          >
            <Plus className="w-4 h-4" />
            Add another return ({items.length}/{MAX_ITEMS})
          </button>
        ) : (
          <p className="w-full mt-4 py-3 text-center text-xs text-muted-foreground/50 animate-fade-in">
            Maximum {MAX_ITEMS} returns per order — all for just ${SERVICE_FEE.toFixed(0)}.
          </p>
        )}

        {/* Payment Section */}
        <div
          className="glass-card rounded-3xl p-5 mt-6 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          {/* Pricing summary */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted-foreground text-sm">Service fee</span>
            <span className="text-foreground font-semibold">${SERVICE_FEE.toFixed(2)}</span>
          </div>
          <p className="text-muted-foreground/55 text-xs mb-5">
            Flat ${SERVICE_FEE.toFixed(0)} — covers up to {MAX_ITEMS} returns per order
          </p>

          {/* Express Checkout — Apple Pay / Google Pay (auto-shown when supported) */}
          <Elements stripe={stripePromise} options={ELEMENTS_OPTIONS}>
            <ExpressButton
              isFormValid={isValid()}
              onCreateReturns={uploadAndCreateReturns}
              guestEmail={guestEmail}
              isGuest={isGuest}
              onSubmitting={setIsSubmitting}
            />
          </Elements>

          {/* Standard card checkout */}
          <button
            onClick={handleSubmit}
            disabled={!isValid() || isSubmitting}
            className="auth-btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            ) : (
              <span>
                Pay ${SERVICE_FEE.toFixed(2)}
                {items.length > 1 ? ` · ${items.length} Returns` : " · Submit Return"}
              </span>
            )}
          </button>

          {/* Trust badge */}
          <p className="text-center text-muted-foreground/45 text-xs mt-3 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" />
            Secured by Stripe · Apple Pay · Google Pay · Cards
          </p>
        </div>

      </div>
    </div>
  );
}
