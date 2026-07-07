const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png"] as const;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.85;
const MAX_DIMENSION = 1024;

export type CompressAvatarResult =
  | { ok: true; file: File }
  | { ok: false; error: string };

export async function compressAvatar(file: File): Promise<CompressAvatarResult> {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
    return { ok: false, error: "Image must be JPEG or PNG." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Image must be under 5 MB." };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: "Could not read image file." };
  }

  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { ok: false, error: "Could not compress image." };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY);
  });
  if (!blob) {
    return { ok: false, error: "Could not compress image." };
  }

  return {
    ok: true,
    file: new File([blob], "avatar.jpg", { type: OUTPUT_TYPE }),
  };
}
