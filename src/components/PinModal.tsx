import { Copy, PartyPopper } from "lucide-react";
import { toast } from "sonner";

export function PinModal({ pin, onClose }: { pin: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card-surface w-full max-w-sm p-6 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-3 text-xl font-extrabold">Your Adearnia PIN is ready!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this 8-digit PIN to unlock your withdrawal form.
        </p>
        <p className="mt-4 rounded-xl border border-gold/40 bg-gold/10 py-4 font-display text-3xl font-extrabold tracking-[0.35em] text-gold tabular-nums">
          {pin}
        </p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(pin);
            toast.success("PIN copied to clipboard");
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl gold-gradient px-4 py-3 text-sm font-extrabold text-gold-foreground shadow-gold"
        >
          <Copy className="h-4 w-4" /> Copy to clipboard
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-muted-foreground backdrop-blur-md"
        >
          Close
        </button>
      </div>
    </div>
  );
}
