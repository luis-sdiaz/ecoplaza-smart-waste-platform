export const PROFILE_IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;

const PROFILE_IMAGE_MAX_DIMENSION = 512;
const WEBP_QUALITY = 0.84;

export type ProfileImageErrorCode = "too-large" | "unsupported";

export class ProfileImageError extends Error {
  readonly code: ProfileImageErrorCode;

  constructor(code: ProfileImageErrorCode) {
    super(code);
    this.name = "ProfileImageError";
    this.code = code;
  }
}

function hasSupportedImageSignature(bytes: Uint8Array): boolean {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebP =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  return isJpeg || isPng || isWebP;
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  if ("createImageBitmap" in globalThis) {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not decode profile photo."));
      element.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareProfileImage(file: File): Promise<Blob> {
  if (file.size > PROFILE_IMAGE_MAX_FILE_SIZE) {
    throw new ProfileImageError("too-large");
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (!hasSupportedImageSignature(signature)) {
    throw new ProfileImageError("unsupported");
  }

  let decodedImage: DecodedImage | null = null;

  try {
    decodedImage = await decodeImage(file);

    if (decodedImage.width <= 0 || decodedImage.height <= 0) {
      throw new ProfileImageError("unsupported");
    }

    const scale = Math.min(
      1,
      PROFILE_IMAGE_MAX_DIMENSION / decodedImage.width,
      PROFILE_IMAGE_MAX_DIMENSION / decodedImage.height,
    );
    const width = Math.max(1, Math.round(decodedImage.width * scale));
    const height = Math.max(1, Math.round(decodedImage.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (context === null) throw new ProfileImageError("unsupported");

    canvas.width = width;
    canvas.height = height;
    context.drawImage(decodedImage.source, 0, 0, width, height);

    const webpBlob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);

    if (webpBlob?.type === "image/webp") return webpBlob;

    const pngBlob = await canvasToBlob(canvas, "image/png");

    if (pngBlob !== null) return pngBlob;

    throw new ProfileImageError("unsupported");
  } catch (error) {
    if (error instanceof ProfileImageError) throw error;
    throw new ProfileImageError("unsupported");
  } finally {
    decodedImage?.release();
  }
}
