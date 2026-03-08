import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Privacy Policy</h1>
        </div>

        <div className="glass-card rounded-3xl p-6 space-y-6 text-muted-foreground text-sm leading-relaxed">
          <section>
            <h2 className="text-foreground font-medium text-base mb-2">Information We Collect</h2>
            <p>We collect your email address (or phone number) for authentication, your building address for pickup coordination, and return label images for processing. Payment information is handled directly by Stripe and never stored on our servers.</p>
          </section>

          <section>
            <h2 className="text-foreground font-medium text-base mb-2">How We Use Your Information</h2>
            <p>Your information is used solely to process returns, coordinate pickups, send status notifications, and improve our service. We do not sell or share your personal information with third parties except as required to fulfill the service (e.g., delivery partners).</p>
          </section>

          <section>
            <h2 className="text-foreground font-medium text-base mb-2">Data Storage & Security</h2>
            <p>Your data is stored securely using industry-standard encryption. Return label images are stored in secure cloud storage. We retain your data for as long as your account is active or as needed to provide services.</p>
          </section>

          <section>
            <h2 className="text-foreground font-medium text-base mb-2">Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data by contacting us. We will respond to such requests within 30 days.</p>
          </section>

          <section>
            <h2 className="text-foreground font-medium text-base mb-2">Contact</h2>
            <p>For privacy-related inquiries, please reach out to our support team through the app.</p>
          </section>

          <p className="text-muted-foreground/60 text-xs pt-4 border-t border-border">
            Last updated: March 2026
          </p>
        </div>
      </div>
    </div>
  );
}
