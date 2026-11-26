/**
 * Media contract shared by MARS, the relay and the ADTP desktop gateway.
 *
 * Only this metadata travels in chat wire messages — never bytes. The receiving
 * device turns it into a thumbnail + download link with helpers from ./urls.
 */
export type MediaStatus =
  | 'created'
  | 'uploading'
  | 'verifying'
  | 'ready'
  | 'failed'
  | 'cancelled'
  | 'deleting'
  | 'expired'
  | 'deleted';

export interface MediaRef {
  /** Wire contract version. Absent/1 = legacy v1 reference. */
  schemaVersion?: number;
  /** Stable id minted by the relay; the capability for /api/media/file/:id. */
  id: string;
  /** Base URL of the relay that serves fresh signed redirects. */
  serviceUrl: string;
  name: string;
  mimeType: string;
  /** Original byte size, before on-device compression. */
  size: number;
  /** Bytes actually stored in the blob. */
  compressedSize: number;
  /** v2 canonical name for storedSize; kept alongside the v1 alias. */
  storedSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  sha256?: string;
  sender?: string;
  recipient?: string;
  /** Session/conversation the media belongs to (v2: conversationId). */
  sessionId?: string;
  conversationId?: string;
  compressed: boolean;
  hasThumbnail: boolean;
  createdAt: string;
  /** Server-calculated absolute retention deadline. */
  expiresAt?: string;
  /** Lifecycle state; `ready` only after server-side verification. */
  status?: MediaStatus;
}

/** Bytes actually stored, preferring the v2 field when present. */
export function storedSizeOf(media: MediaRef): number {
  return typeof media.storedSize === 'number' ? media.storedSize : media.compressedSize;
}

/** A picker result (before compression). */
export interface MediaSource {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

/** Result of on-device compression + thumbnail generation. */
export interface CompressedMedia {
  uri: string;
  name: string;
  mimeType: string;
  originalSize: number;
  size: number;
  width?: number;
  height?: number;
  compressed: boolean;
  thumbnailUri?: string;
  thumbnailSize?: number;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

export interface MediaSignResponse {
  id: string;
  serviceUrl: string;
  expiresAt: string;
  original: { path: string; url: string; headers: Record<string, string> };
  thumbnail: { path: string; url: string; headers: Record<string, string> } | null;
}
