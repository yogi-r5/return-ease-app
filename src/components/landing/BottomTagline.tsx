import { useNavigate } from "react-router-dom";

export default function BottomTagline() {
  const navigate = useNavigate();

  return (
    <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: "0.5s" }}>
      <p className="text-muted-foreground/40 text-sm mb-3">
        Returns, without the headache.
      </p>
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/30">
        <button onClick={() => navigate("/track")} className="hover:text-muted-foreground/60 transition-colors">
          Track Order
        </button>
        <span>·</span>
        <button onClick={() => navigate("/terms")} className="hover:text-muted-foreground/60 transition-colors">
          Terms
        </button>
        <span>·</span>
        <button onClick={() => navigate("/privacy")} className="hover:text-muted-foreground/60 transition-colors">
          Privacy
        </button>
      </div>
    </div>
  );
}
