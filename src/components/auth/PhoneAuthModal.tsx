import { useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface PhoneAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PhoneAuthModal({ isOpen, onClose }: PhoneAuthModalProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const sendOTP = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+1${digits}`,
      });
      if (error) throw error;
      setStep("otp");
      toast({
        title: "Code sent!",
        description: "Check your phone for the verification code",
      });
    } catch (error: any) {
      toast({
        title: "Could not send code",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) return;

    setIsLoading(true);
    const digits = phone.replace(/\D/g, "");
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+1${digits}`,
        token: otp,
        type: "sms",
      });
      if (error) throw error;
      onClose();
      toast({
        title: "Welcome to Returnee!",
        description: "You're now signed in",
      });
    } catch (error: any) {
      toast({
        title: "Invalid code",
        description: "Please check the code and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="glass-card relative z-10 w-full max-w-sm rounded-3xl p-6 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "phone" ? (
          <>
            <h2 className="text-xl font-semibold text-white mb-2">
              Enter your phone
            </h2>
            <p className="text-white/60 text-sm mb-6">
              We'll send you a verification code
            </p>

            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                +1
              </span>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-teal-vibrant transition-colors text-lg"
                autoFocus
              />
            </div>

            <button
              onClick={sendOTP}
              disabled={isLoading || phone.replace(/\D/g, "").length !== 10}
              className="auth-btn-primary w-full disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Code</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white mb-2">
              Verify your phone
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Enter the 6-digit code sent to {phone}
            </p>

            <div className="flex justify-center mb-6">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="w-12 h-14 text-xl bg-white/5 border-white/10 text-white rounded-xl"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              onClick={verifyOTP}
              disabled={isLoading || otp.length !== 6}
              className="auth-btn-primary w-full disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Verify & Continue</span>
              )}
            </button>

            <button
              onClick={() => {
                setStep("phone");
                setOtp("");
              }}
              className="w-full mt-3 text-center text-white/50 hover:text-white/80 text-sm transition-colors"
            >
              Use a different number
            </button>
          </>
        )}
      </div>
    </div>
  );
}
