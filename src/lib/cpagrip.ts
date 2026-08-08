export const CPAGRIP_SCRIPT_URL = "https://optilinklock.com/script_include.php?id=1908208";

declare global {
  interface Window {
    call_locker?: () => void;
  }
}

let loading: Promise<void> | null = null;

/** Loads the CPAGrip locker script once per session. */
export function loadCpaGrip(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CPAGRIP_SCRIPT_URL}"]`,
    );
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = CPAGRIP_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the task offers. Please retry."));
    document.body.appendChild(script);
  });

  return loading;
}

/**
 * Opens the CPAGrip content locker immediately, never blocking the user.
 * If the script has not finished loading, it opens the locker URL in a new tab
 * and keeps loading the script in the background.
 */
export function openCpaGripLocker(): boolean {
  if (typeof window === "undefined") return false;

  // Keep the script loading in the background; never await it.
  void loadCpaGrip().catch(() => undefined);

  if (typeof window.call_locker === "function") {
    try {
      window.call_locker();
      return true;
    } catch {
      /* fall through to direct open */
    }
  }

  window.open(CPAGRIP_SCRIPT_URL, "_blank", "noopener,noreferrer");
  return true;
}
