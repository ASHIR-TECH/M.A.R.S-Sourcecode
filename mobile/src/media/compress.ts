import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import type { CompressedMedia, MediaSource } from './types';

/** Longest edge kept in the uploaded image; thumbnails are capped separately. */
export const MAX_IMAGE_EDGE = 1600;
export const THUMBNAIL_EDGE = 320;
const IMAGE_QUALITY = 0.72;
const THUMBNAIL_QUALITY = 0.6;

/**
 * Compute a resize that keeps the aspect ratio and never lets the longest edge
 * exceed `maxEdge`. A width-only resize breaks portrait images.
 */
export function fitWithinMaxEdge(
  width: number,
  height: number,
  maxEdge: number = MAX_IMAGE_EDGE
): { width: number; height: number; needsResize: boolean } {
  if (!width || !height || maxEdge <= 0) {
    return { width, height, needsResize: false };
  }
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height, needsResize: false };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    needsResize: true,
  };
}

function isImage(source: MediaSource): boolean {
  if (source.mimeType?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(source.name);
}

/** Animated/transparent-safe formats are left byte-for-byte intact. */
function preserveOriginal(source: MediaSource): boolean {
  return /\.(gif|webp)$/i.test(source.name) || source.mimeType === 'image/gif' || source.mimeType === 'image/webp';
}

function outputFormat(source: MediaSource): { format: ImageManipulator.SaveFormat; ext: string } {
  if (/\.png$/i.test(source.name) || source.mimeType === 'image/png') {
    return { format: ImageManipulator.SaveFormat.PNG, ext: 'png' };
  }
  return { format: ImageManipulator.SaveFormat.JPEG, ext: 'jpg' };
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

  if (!isImage(source) || preserveOriginal(source)) return base;

  try {
    const dimensions = await imageSize(source.uri);
    const fitted = fitWithinMaxEdge(dimensions.width, dimensions.height);
    const target = outputFormat(source);
    const result = await ImageManipulator.manipulateAsync(
      source.uri,
      fitted.needsResize ? [{ resize: { width: fitted.width, height: fitted.height } }] : [],
      {
        ...(target.format === ImageManipulator.SaveFormat.JPEG
          ? { compress: IMAGE_QUALITY }
          : {}),
        format: target.format,
      }
    );

    const thumbFit = fitWithinMaxEdge(
      result.width || fitted.width,
      result.height || fitted.height,
      THUMBNAIL_EDGE
    );
    const thumb = await ImageManipulator.manipulateAsync(
      result.uri,
      [{ resize: { width: thumbFit.width, height: thumbFit.height } }],
      {
        ...(target.format === ImageManipulator.SaveFormat.JPEG
          ? { compress: THUMBNAIL_QUALITY }
          : {}),
        format: target.format,
      }
    );

    return {
      uri: result.uri,
      name:
        target.ext === 'jpg'
          ? source.name.replace(/\.[^.]+$/, '') + '.jpg'
          : source.name,
      mimeType: target.ext === 'jpg' ? 'image/jpeg' : 'image/png',
      originalSize,
      size: await fileSize(result.uri),
      width: result.width || fitted.width || dimensions.width,
      height: result.height || fitted.height || dimensions.height,
      compressed: true,
      thumbnailUri: thumb.uri,
      thumbnailSize: await fileSize(thumb.uri),
      thumbnailWidth: thumb.width,
      thumbnailHeight: thumb.height,
    };
  } catch {
    // An unsupported image format falls back to the original bytes.
    return base;
  }
}
