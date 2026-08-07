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

/** Opens the CPAGrip content locker. Resolves true when the locker was shown. */
export async function openCpaGripLocker(): Promise<boolean> {
  await loadCpaGrip();
  if (typeof window.call_locker === "function") {
    window.call_locker();
    return true;
  }
  return false;
}
