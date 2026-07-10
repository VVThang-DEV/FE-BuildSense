const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset);

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

type CloudinaryResponse = {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
};

export async function uploadSitePhoto(file: File): Promise<CloudinaryUploadResult> {
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Select an image file");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("The image must be 10 MB or smaller");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const payload = (await response.json()) as CloudinaryResponse;

  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload.error?.message || "Cloudinary could not upload the image");
  }

  return { secureUrl: payload.secure_url, publicId: payload.public_id };
}
