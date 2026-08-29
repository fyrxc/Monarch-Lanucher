export const LAUNCHER_CLICK_SOUND_URL = "/sounds/header-click.ogg";

let audioTemplate: HTMLAudioElement | null = null;

function getAudioTemplate(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  if (!audioTemplate) {
    audioTemplate = new Audio(LAUNCHER_CLICK_SOUND_URL);
    audioTemplate.preload = "auto";
    audioTemplate.volume = 0.65;
  }
  return audioTemplate;
}

export function isClickableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      "button, a, input, select, textarea, label, [role='button'], [role='checkbox'], [role='menuitem']",
    ) !== null
  );
}

export function playLauncherClick(): void {
  const template = getAudioTemplate();
  if (!template) return;

  const audio = template.cloneNode(true) as HTMLAudioElement;
  audio.volume = template.volume;
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}
