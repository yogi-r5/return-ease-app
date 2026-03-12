import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, CreditCard, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReturnItemForm, { type ReturnItem } from "@/components/returns/ReturnItemForm";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentRequestButtonElement, useStripe } from "@stripe/react-stripe-js";

const MAX_ITEMS = 5;
const SERVICE_FEE = 5.0;
const MAX_FILE_SIZE_MB = 20;

// Load Stripe once at module level
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// ─── Express Checkout Button (must live inside <Elements>) ───────────────────
interface ExpressCheckoutButtonProps {
  isFormValid: boolean;
  onExpressPayment: (ev: any) => Promise<void>;
}

function ExpressCheckoutButton({ isFormValid, onExpressPayment }: ExpressCheckoutButtonProps) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<any>(null);

  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: "US",
      currency: "usd",
      total: {
        label: "Returnee – Up to 5 Returns",
        amount: 500, // Always $5.00
      },
      requestPayerName: false,
      requestPayerEmail: false,
    });

    pr.canMakePayment().then((result: any) => {
      if (result) setPaymentRequest(pr);
    });

    pr.on("paymentmethod", async (ev: any) => {
      await onExpressPayment(ev);
    });

    return () => {
      pr.off("paymentmethod");
    };
  }, [stripe]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!paymentRequest) return null;

  return (
    <div className="mb-5 animate-fade-in-up">
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: "default",
              theme: "dark",
              height: "52px",
            },
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

// ─── Main Component ──────────────────────────────────────────────────────────
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
        if (!session) {
          navigate("/");
        } else {
          setUser(session.user);
        }
      });
    }
  }, [isGuest, navigate]);

  // ── File handlers ──────────────────────────────────────────────────────────
  const handleFileUpload = (itemId: string, file: File) => {
    // Validate file size
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

  // ── Validation ─────────────────────────────────────────────────────────────
  const isValid = () => {
    const allItemsValid = items.every((item) => item.labelFile && item.deadline);
    const hasAddress = buildingAddress.trim().length > 0;
    if (isGuest) return allItemsValid && hasAddress && guestEmail.includes("@");
    return allItemsValid && hasAddress;
  };

  // ── Shared: upload files + create DB records ───────────────────────────────
  const uploadAndCreateReturns = async (): Promise<string[]> => {
    const returnIds: string[] = [];

    for (const item of items) {
      // Sanitise filename to prevent path traversal
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

  // ── Standard checkout → Stripe hosted page ─────────────────────────────────
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

  // ── Express checkout → Apple Pay / Google Pay ──────────────────────────────
  const handleExpressPayment = async (ev: any) => {
    if (!isValid()) {
      ev.complete("fail");
      toast({
        title: "Please fill in all fields",
        description: "Add your address, labels, and deadlines first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Upload files + create returns in DB
      const returnIds = await uploadAndCreateReturns();

      // Step 2: Create PaymentIntent for $5 flat
      const { data: intentData, error: intentError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            returnIds,
            guestEmail: isGuest ? guestEmail : undefined,
          },
        }
      );

      if (intentError) throw new Error(intentError.message);

      // Step 3: Confirm PaymentIntent with Apple Pay / Google Pay payment method
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not loaded");

      const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
        intentData.clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );

      if (confirmError) {
        ev.complete("fail");
        throw new Error(confirmError.message);
      }

      // Handle 3D Secure if needed (rare for Apple/Google Pay)
      if (paymentIntent?.status === "requires_action") {
        const { error: actionError } = await stripe.confirmCardPayment(intentData.clientSecret);
        if (actionError) {
          ev.complete("fail");
          throw new Error(actionError.message);
        }
      }

      ev.complete("success");

      // Step 4: Navigate to success with payment info
      navigate(
        `/success?payment_intent_id=${paymentIntent?.id}&return_ids=${returnIds.join(",")}`
      );
    } catch (error: any) {
      console.error("Express payment error:", error);
      ev.complete("fail");
      toast({
        title: "Payment failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-lg mx-auto">

        {/* ── Header ── */}
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

        {/* ── Guest Email ── */}
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

        {/* ── Pickup Address ── */}
        <div className="glass-card rounded-2xl p-4 mb-4 animate-fade-in-up">
          <label className="text-muted-foreground text-sm mb-2 block">
            Building address
          </label>
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

        {/* ── Return Items ── */}
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

        {/* ── Add Another Item ── */}
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

        {/* ── Payment Section ── */}
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

          {/* Express Checkout (Apple Pay / Google Pay) */}
          <Elements stripe={stripePromise}>
            <ExpressCheckoutButton
              isFormValid={isValid()}
              onExpressPayment={handleExpressPayment}
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
