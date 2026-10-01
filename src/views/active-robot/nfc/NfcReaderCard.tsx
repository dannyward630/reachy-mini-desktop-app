import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import NfcIcon from '@mui/icons-material/Nfc';
import SectionHeader from '../../../components/viewer3d/settings/SectionHeader';
import { STATUS } from '@styles/tokens';
import { useAppPalette, TYPO, FONT_WEIGHT, RADIUS } from '@styles';
import { NFC_STATE_COLOR } from './NfcStatusButton';
import {
  describeEraseError,
  needsFullErase,
  type NfcEraseResult,
  type NfcRecord,
  type NfcState,
  type NfcStatus,
  type NfcTag,
} from './nfcState';

export interface NfcReaderCardProps {
  status: NfcStatus | null;
  tag: NfcTag | null;
  state: NfcState;
  fetchError: string | null;
  isErasing: boolean;
  eraseResult: NfcEraseResult | null;
  onErase: (full: boolean) => void;
  onClearEraseResult: () => void;
  cardStyle?: SxProps<Theme>;
}

function readerTitle(status: NfcStatus | null): string {
  if (!status) return 'Unknown';
  if (status.connected) return 'Reader connected';
  if (!status.driver_available) return 'Driver not installed';
  return 'Reader not detected';
}

function readerDetail(status: NfcStatus | null, fetchError: string | null): string {
  if (!status) return fetchError ?? 'Waiting for the daemon…';
  if (status.connected) {
    return [status.chip_version && `CLRC663 ${status.chip_version}`, status.port]
      .filter(Boolean)
      .join(' · ');
  }
  if (!status.driver_available) return 'Install reachy_mini[nfc] on the robot';
  return status.error ?? 'Plug in the NFC reader board';
}

function recordValue(record: NfcRecord): string {
  return record.value ?? [record.type_name, record.data_hex].filter(Boolean).join(' ');
}

export default function NfcReaderCard({
  status,
  tag,
  state,
  fetchError,
  isErasing,
  eraseResult,
  onErase,
  onClearEraseResult,
  cardStyle,
}: NfcReaderCardProps): React.ReactElement {
  const palette = useAppPalette();
  const { textPrimary, textSecondary, textMuted } = palette;
  const [confirming, setConfirming] = useState<boolean>(false);

  const tagUid = tag?.present ? tag.uid : null;
  const records = tag?.records ?? [];
  const fullErase = needsFullErase(tag);

  // A result or a pending confirmation belongs to the tag it was about.
  useEffect(() => {
    setConfirming(false);
    if (!isErasing) onClearEraseResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagUid]);

  const labelSx = {
    fontSize: TYPO.tiny,
    fontWeight: FONT_WEIGHT.semibold,
    color: textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  } as const;

  const monoSx = { fontFamily: 'monospace', fontSize: TYPO.xs, color: textSecondary } as const;

  return (
    <Box sx={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
      <SectionHeader title="NFC Reader" icon={NfcIcon} darkMode={palette.isDark} />

      {/* Reader module */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography
          sx={{ fontSize: TYPO.md, fontWeight: FONT_WEIGHT.semibold, color: textPrimary, mb: 0.5 }}
        >
          {readerTitle(status)}
        </Typography>
        <Typography
          sx={{ fontSize: TYPO.sm, color: status?.connected ? STATUS.success : textMuted }}
        >
          {readerDetail(status, fetchError) || 'Ready'}
        </Typography>
      </Box>

      {/* Tag */}
      <Box
        sx={{
          minHeight: 120,
          p: 1.5,
          borderRadius: RADIUS.lg,
          bgcolor: palette.surfaceSubtle,
          border: `1px solid ${palette.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: NFC_STATE_COLOR[state],
            }}
          />
          <Typography sx={labelSx}>Tag</Typography>
          {tag?.present && tag.model && (
            <Typography sx={{ fontSize: TYPO.xs, color: textSecondary, ml: 'auto' }}>
              {tag.model}
              {tag.capacity != null && ` · ${tag.capacity} bytes`}
            </Typography>
          )}
        </Box>

        {!tag?.present ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: TYPO.sm, color: textMuted, textAlign: 'center' }}>
              {state === 'unavailable' ? 'No reader to read from' : 'Place a tag on the reader'}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography sx={{ ...labelSx, minWidth: 56 }}>UID</Typography>
              <Typography sx={monoSx}>{tag.uid ?? '—'}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography sx={{ ...labelSx, minWidth: 56 }}>Content</Typography>
              <Box
                sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}
              >
                {tag.blank ? (
                  <Typography sx={{ fontSize: TYPO.sm, color: textMuted }}>Blank tag</Typography>
                ) : records.length > 0 ? (
                  records.map((record, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                      <Typography
                        sx={{
                          fontSize: TYPO.micro,
                          fontWeight: FONT_WEIGHT.semibold,
                          color: textMuted,
                          textTransform: 'uppercase',
                          px: 0.5,
                          borderRadius: RADIUS.xs,
                          border: `1px solid ${palette.border}`,
                          flexShrink: 0,
                        }}
                      >
                        {record.kind}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: TYPO.sm,
                          color: textPrimary,
                          wordBreak: 'break-all',
                        }}
                      >
                        {recordValue(record)}
                      </Typography>
                    </Box>
                  ))
                ) : tag.raw_hex ? (
                  <Typography sx={{ ...monoSx, wordBreak: 'break-all' }}>{tag.raw_hex}…</Typography>
                ) : (
                  <Typography sx={{ fontSize: TYPO.sm, color: STATUS.warning }}>
                    {tag.error ?? 'Content could not be read'}
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        )}
      </Box>

      {/* Erase */}
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        {confirming ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: TYPO.sm, color: textSecondary }}>
              {fullErase ? 'Wipe the whole tag memory?' : 'Erase this tag?'}
            </Typography>
            <Button
              size="small"
              onClick={() => setConfirming(false)}
              sx={{ textTransform: 'none', color: textSecondary }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => {
                setConfirming(false);
                onErase(fullErase);
              }}
              sx={{ textTransform: 'none' }}
            >
              Erase
            </Button>
          </Box>
        ) : (
          <Button
            size="small"
            variant="outlined"
            color="error"
            disabled={!tag?.present || isErasing}
            onClick={() => {
              onClearEraseResult();
              setConfirming(true);
            }}
            startIcon={isErasing ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', minWidth: 140 }}
          >
            {isErasing ? 'Erasing…' : fullErase ? 'Wipe tag' : 'Erase tag'}
          </Button>
        )}

        {fullErase && !eraseResult && (
          <Typography sx={{ fontSize: TYPO.tiny, color: textMuted, textAlign: 'center' }}>
            Not an NDEF tag: the whole memory is wiped, which takes a few seconds.
          </Typography>
        )}

        {eraseResult && (
          <Typography
            sx={{
              fontSize: TYPO.sm,
              color: eraseResult.success ? STATUS.success : STATUS.error,
              textAlign: 'center',
            }}
          >
            {eraseResult.success ? 'Tag erased' : describeEraseError(eraseResult.error)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
