import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="mesh-gradient min-h-screen px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Terms of Service</h1>
        </div>

        <div className="glass-card rounded-3xl p-6 space-y-6 text-muted-foreground text-sm leading-relaxed">
          <section>
            <h2 className="text-foreground font-medium text-base mb-2">1. Service Description</h2>
            <p>Returnee provides a return logistics service that collects prepaid return packages from your location and drops them off at the appropriate carrier. A $5.00 service fee is charged per item.</p>
          </section>

          <section>
            <h2 className="text-foreground font-medium text-base mb-2">2. Eligibility</h2>
            <p>You must be at least 18 years old and located in a serviced building to use Returnee. By using the service, you confirm that you have authority to return the items submitted.</p>
          </section>

          <section>
            <h2 className="text-foreground font-medium text-base mb-2">3. Return Labels</h2>
            <p>You are responsible for providing a valid, prepaid return shipping label. Returnee is not responsible for labels that are incorrect, expired, or unreadable.</p>
          </section>

          <section>
            <h2 className="text-foreground font-medium text-base mb-2">4. Payment</h2>
            <p>Payment is processed via Stripe at the time of submission. All fees are non-refundable once a courier has been assigned, except in cases of service failure on our part.</p>
          </section>

          <section>
            <h2 className="text-foreground font-medium text-base mb-2">5. Liability</h2>
            <p>Returnee's liability is limited to the service fee paid. We are not liable for the value of returned items, carrier delays, or lost packages once handed off to the shipping carrier.</p>
          </section>

          <section>
            <h2 className="text-foreground font-medium text-base mb-2">6. Changes</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of updated terms.</p>
          </section>

          <p className="text-muted-foreground/60 text-xs pt-4 border-t border-border">
            Last updated: March 2026
          </p>
        </div>
      </div>
    </div>
  );
}
