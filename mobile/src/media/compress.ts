import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import type { CompressedMedia, MediaSource } from './types';

/** Longest edge kept in the uploaded image; thumbnails are capped separately. */
export const MAX_IMAGE_EDGE = 1600;
export const THUMBNAIL_EDGE = 320;
const IMAGE_QUALITY = 0.72;
const THUMBNAIL_QUALITY = 0.6;

function isImage(source: MediaSource): boolean {
  if (source.mimeType?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(source.name);
}

function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({ width: 0, height: 0 })
    );
  });
}

async function fileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && 'size' in info ? Number(info.size) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Compress before the bytes ever leave the device.
 *
 * Images are re-encoded to JPEG at a bounded resolution, and a small thumbnail
 * is produced from that result. Other media (video/audio/documents) is already
 * compressed in its container format; there is no safe lossless gain on-device,
 * so it is stored as-is with a generic icon instead of a thumbnail. ADTP can
 * supply its own thumbnail when it sends AI-originated media.
 */
export async function compressMedia(source: MediaSource): Promise<CompressedMedia> {
  const originalSize = source.size || (await fileSize(source.uri));
  const base: CompressedMedia = {
    uri: source.uri,
    name: source.name,
    mimeType: source.mimeType || 'application/octet-stream',
    originalSize,
    size: originalSize,
    compressed: false,
  };

  if (!isImage(source)) return base;

  try {
    const dimensions = await imageSize(source.uri);
    const longest = Math.max(dimensions.width, dimensions.height);
    const needsResize = longest > MAX_IMAGE_EDGE;

    const result = await ImageManipulator.manipulateAsync(
      source.uri,
      needsResize ? [{ resize: { width: MAX_IMAGE_EDGE } }] : [],
      {
        compress: IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    const thumb = await ImageManipulator.manipulateAsync(
      result.uri,
      [{ resize: { width: THUMBNAIL_EDGE } }],
      { compress: THUMBNAIL_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );

    return {
      uri: result.uri,
      name: source.name.replace(/\.[^.]+$/, '') + '.jpg',
      mimeType: 'image/jpeg',
      originalSize,
      size: await fileSize(result.uri),
      width: result.width || dimensions.width,
      height: result.height || dimensions.height,
      compressed: true,
      thumbnailUri: thumb.uri,
      thumbnailSize: await fileSize(thumb.uri),
      thumbnailWidth: thumb.width,
      thumbnailHeight: thumb.height,
    };
  } catch {
    // An unsupported image format (e.g. animated GIF) falls back to the original.
    return base;
  }
}
