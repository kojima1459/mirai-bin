// Firebase Storage integration using Admin SDK
// Replaces the Forge API proxy with direct Firebase Storage access

import admin from "firebase-admin";

// Get or initialize Firebase app
let firebaseApp: admin.app.App;
try {
  firebaseApp = admin.app();
} catch {
  firebaseApp = admin.initializeApp({
    projectId: "miraibin",
    storageBucket: "miraibin.firebasestorage.app",
  });
}

// Get storage bucket
const bucket = admin.storage(firebaseApp).bucket("miraibin.firebasestorage.app");

/**
 * Upload file to Firebase Storage
 * @param relKey - Relative path for the file (e.g., "audio/user123/abc.webm")
 * @param data - File data as Buffer, Uint8Array, or string
 * @param contentType - MIME type of the file
 * @returns Object with key and public URL
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, ""); // Remove leading slashes
  const file = bucket.file(key);

  // Convert data to Buffer if needed
  const buffer = typeof data === "string"
    ? Buffer.from(data, "utf-8")
    : Buffer.from(data);

  // Upload the file
  await file.save(buffer, {
    metadata: {
      contentType,
    },
    resumable: false, // Simpler for smaller files
  });

  // Make the file publicly accessible
  await file.makePublic();

  // Get public URL
  const url = `https://storage.googleapis.com/${bucket.name}/${key}`;

  return { key, url };
}

/**
 * Get signed URL for private file download
 * @param relKey - Relative path for the file
 * @returns Object with key and signed URL
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  const file = bucket.file(key);

  // Generate signed URL (valid for 1 hour)
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return { key, url };
}

/**
 * Delete file from Firebase Storage
 * @param relKey - Relative path for the file
 */
export async function storageDelete(relKey: string): Promise<void> {
  const key = relKey.replace(/^\/+/, "");
  const file = bucket.file(key);

  try {
    await file.delete();
  } catch (error: any) {
    // Ignore "not found" errors
    if (error.code !== 404) {
      throw error;
    }
  }
}
