import { AgentToolCall, TransferReference } from '../desktop/types';

function basename(path: string): string {
  const cleaned = path.replace(/\\/g, '/');
  return cleaned.slice(cleaned.lastIndexOf('/') + 1) || cleaned;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Tool results are JSON strings for device sends; older tools use plain text. */
function parseJsonObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return undefined;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Lifts completed send/receive tool calls into file tiles for the reply bubble.
 *
 * `send_file_to_device` is a desktop → phone inbox transfer, so it renders as
 * incoming and keeps the device-file id needed for the chat download button.
 */
export function transfersFromToolCalls(
  toolCalls: AgentToolCall[] | undefined
): TransferReference[] {
  if (!toolCalls) return [];
  return toolCalls
    .filter(
      (tc) =>
        tc.name === 'send_file' ||
        tc.name === 'receive_file' ||
        tc.name === 'send_file_to_device'
    )
    .filter((tc) => tc.status === 'completed')
    .map((tc) => {
      const params = tc.params ?? {};
      const result = parseJsonObject(tc.result) ?? {};
      const filePath = String(params.file_path ?? params.file ?? params.path ?? '');
      const fileName = (stringValue(result.filename) ?? basename(filePath)) || 'file';

      if (tc.name === 'send_file_to_device') {
        return {
          fileName,
          direction: 'incoming' as const,
          peerName: 'Desktop',
          sizeBytes: numberValue(result.size_bytes) ?? numberValue(params.size_bytes),
          deviceFileId: stringValue(result.device_file_id),
          deviceId: stringValue(result.device_id),
          mimeType: stringValue(result.mime_type),
        };
      }

      return {
        fileName,
        direction: tc.name === 'send_file' ? ('outgoing' as const) : ('incoming' as const),
        peerName: String(params.peer_id ?? params.peer ?? '').trim() || undefined,
        sizeBytes: numberValue(params.size_bytes) ?? numberValue(result.size_bytes),
        result: tc.result,
      };
    });
}
