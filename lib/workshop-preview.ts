const DEFAULT_DAYZ_WORKSHOP_DHASH = BigInt("0x377770033e0d0f46");
const DEFAULT_HASH_DISTANCE = 4;

function hammingDistance(a: bigint, b: bigint): number {
  let value = a ^ b;
  let count = 0;
  while (value !== 0n) {
    count += 1;
    value &= value - 1n;
  }
  return count;
}

export function isDefaultWorkshopPreviewHash(hash: string): boolean {
  try {
    const normalized = hash.trim().replace(/^0x/i, "");
    if (!/^[0-9a-f]{16}$/i.test(normalized)) return false;
    return hammingDistance(BigInt(`0x${normalized}`), DEFAULT_DAYZ_WORKSHOP_DHASH) <= DEFAULT_HASH_DISTANCE;
  } catch {
    return false;
  }
}

function grayscale(r: number, g: number, b: number): number {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

export function workshopPreviewDhash(image: HTMLImageElement): string | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, 9, 8);
    const pixels = context.getImageData(0, 0, 9, 8).data;
    let hash = 0n;
    let bit = 63;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const left = (y * 9 + x) * 4;
        const right = (y * 9 + x + 1) * 4;
        if (
          grayscale(pixels[left], pixels[left + 1], pixels[left + 2]) >
          grayscale(pixels[right], pixels[right + 1], pixels[right + 2])
        ) {
          hash |= 1n << BigInt(bit);
        }
        bit -= 1;
      }
    }
    return hash.toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}

export function isDefaultDayzWorkshopPreview(image: HTMLImageElement): boolean {
  if (image.naturalWidth !== 1024 || image.naturalHeight !== 512) return false;
  const hash = workshopPreviewDhash(image);
  return hash !== null && isDefaultWorkshopPreviewHash(hash);
}
