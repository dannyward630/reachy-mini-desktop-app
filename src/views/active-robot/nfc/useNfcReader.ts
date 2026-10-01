import { useCallback, useEffect, useRef, useState } from 'react';
import { buildApiUrl, fetchWithTimeout } from '../../../config/daemon';
import { useWindowVisible } from '../../../hooks/system/useWindowVisible';
import { deriveNfcState } from './nfcState';
import type { NfcEraseResult, NfcState, NfcStatus, NfcTag } from './nfcState';

const POLL_INTERVAL_MS = 1000;
const READ_TIMEOUT_MS = 3000;
// The daemon waits up to 15s for a tag before answering an erase, and a full
// erase writes every page; leave room on top of that.
const ERASE_TIMEOUT_MS = 25000;

export interface UseNfcReaderResult {
  status: NfcStatus | null;
  tag: NfcTag | null;
  state: NfcState;
  /** Set when the daemon could not be asked at all (older daemon, network). */
  fetchError: string | null;
  isErasing: boolean;
  eraseResult: NfcEraseResult | null;
  erase: (full: boolean) => Promise<void>;
  clearEraseResult: () => void;
}

/**
 * Poll the daemon's NFC reader once a second while the window is visible.
 *
 * The tag is only asked for when the reader is connected: the daemon answers
 * "no tag" otherwise, so the request would tell us nothing.
 *
 * `enabled: false` pauses the poll, so two readers on screen at once (the
 * status button behind Settings, and the Settings card) do not both ask.
 */
export function useNfcReader({ enabled = true }: { enabled?: boolean } = {}): UseNfcReaderResult {
  const [status, setStatus] = useState<NfcStatus | null>(null);
  const [tag, setTag] = useState<NfcTag | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [eraseResult, setEraseResult] = useState<NfcEraseResult | null>(null);
  const isVisible = useWindowVisible();
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async (): Promise<void> => {
      try {
        const statusRes = await fetchWithTimeout(
          buildApiUrl('/api/nfc/status'),
          {},
          READ_TIMEOUT_MS,
          { silent: true }
        );
        if (!statusRes.ok) {
          throw new Error(
            statusRes.status === 404
              ? 'This daemon version has no NFC support'
              : `NFC status request failed (${statusRes.status})`
          );
        }
        const nextStatus = (await statusRes.json()) as NfcStatus;
        let nextTag: NfcTag | null = null;
        if (nextStatus.connected) {
          const tagRes = await fetchWithTimeout(buildApiUrl('/api/nfc/tag'), {}, READ_TIMEOUT_MS, {
            silent: true,
          });
          if (tagRes.ok) nextTag = (await tagRes.json()) as NfcTag;
        }
        if (cancelled) return;
        setStatus(nextStatus);
        setTag(nextTag);
        setFetchError(null);
      } catch (err) {
        if (cancelled) return;
        setStatus(null);
        setTag(null);
        setFetchError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, enabled]);

  const erase = useCallback(async (full: boolean): Promise<void> => {
    setIsErasing(true);
    setEraseResult(null);
    let result: NfcEraseResult;
    try {
      const res = await fetchWithTimeout(
        buildApiUrl('/api/nfc/erase'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full }),
        },
        ERASE_TIMEOUT_MS,
        { label: full ? 'NFC full erase' : 'NFC erase' }
      );
      if (res.status === 503) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        result = { success: false, error: body.detail ?? 'NOT_CONNECTED' };
      } else if (!res.ok) {
        result = { success: false, error: `Erase request failed (${res.status})` };
      } else {
        result = (await res.json()) as NfcEraseResult;
      }
    } catch {
      result = { success: false, error: 'LINK_LOST' };
    }
    if (!mountedRef.current) return;
    setEraseResult(result);
    setIsErasing(false);
  }, []);

  const clearEraseResult = useCallback(() => setEraseResult(null), []);

  return {
    status,
    tag,
    state: deriveNfcState(status, tag),
    fetchError,
    isErasing,
    eraseResult,
    erase,
    clearEraseResult,
  };
}

export default useNfcReader;
