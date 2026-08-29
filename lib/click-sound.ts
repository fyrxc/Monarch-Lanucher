export const LAUNCHER_CLICK_SOUND_URL = "/sounds/Header_Click_UI.mp4";
export const LAUNCHER_CLICK_VOLUME = 1;

let audioTemplate: HTMLAudioElement | null = null;

function getAudioTemplate(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  if (!audioTemplate) {
    audioTemplate = new Audio(LAUNCHER_CLICK_SOUND_URL);
    audioTemplate.preload = "auto";
    audioTemplate.volume = LAUNCHER_CLICK_VOLUME;
  }
  return audioTemplate;
}

export function isClickableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest(
    "button, a, input, select, label, [role='button'], [role='checkbox'], [role='menuitem']",
  );
  if (!control) return false;

  if (control instanceof HTMLButtonElement && control.disabled) return false;
  if (control instanceof HTMLInputElement) {
    if (control.disabled) return false;
    return ["button", "submit", "reset", "checkbox", "radio", "range"].includes(control.type);
  }
  if (control instanceof HTMLSelectElement && control.disabled) return false;
  return true;
}

export function playLauncherClick(): void {
  const template = getAudioTemplate();
  if (!template) return;

  const audio = template.cloneNode(true) as HTMLAudioElement;
  audio.volume = LAUNCHER_CLICK_VOLUME;
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}
