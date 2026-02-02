import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingHero from "@/components/landing/LandingHero";
import AuthButtons from "@/components/auth/AuthButtons";
import GuestSkipButton from "@/components/landing/GuestSkipButton";
import BottomTagline from "@/components/landing/BottomTagline";

export default function Landing() {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate("/dashboard");
        }
        setIsCheckingAuth(false);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
      setIsCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGuestSkip = () => {
    navigate("/new-return?guest=true");
  };

  if (isCheckingAuth) {
    return (
      <div className="mesh-gradient min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-vibrant/30 border-t-teal-vibrant rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mesh-gradient min-h-screen relative flex flex-col items-center justify-center px-6 py-12">
      {/* Skip Button */}
      <GuestSkipButton onSkip={handleGuestSkip} />

      {/* Main Content */}
      <div className="w-full max-w-sm">
        <LandingHero />

        {/* Auth Buttons */}
        <div className="glass-card rounded-3xl p-6">
          <AuthButtons />
        </div>

        <BottomTagline />
      </div>

      {/* Decorative Elements */}
      <div className="fixed top-20 left-10 w-32 h-32 bg-teal-vibrant/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-48 h-48 bg-emerald-deep/20 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
