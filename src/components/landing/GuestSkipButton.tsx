interface GuestSkipButtonProps {
  onSkip: () => void;
}

export default function GuestSkipButton({ onSkip }: GuestSkipButtonProps) {
  return (
    <button
      onClick={onSkip}
      className="skip-btn absolute top-6 right-6 animate-fade-in"
      style={{ animationDelay: "0.4s" }}
    >
      Skip →
    </button>
  );
}
