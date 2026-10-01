import React from 'react';
import { Box, Typography } from '@mui/material';
import FullscreenOverlay from '../../../components/FullscreenOverlay';
import { blackAlpha, whiteAlpha } from '@styles/tokens';
import { useAppPalette, TYPO, FONT_WEIGHT, RADIUS, BLUR } from '@styles';
import NfcReaderCard from './NfcReaderCard';
import type { UseNfcReaderResult } from './useNfcReader';

export interface NfcOverlayProps {
  open: boolean;
  onClose: () => void;
  reader: UseNfcReaderResult;
}

/** Full-screen page for the NFC reader, laid out like Settings. */
export default function NfcOverlay({ open, onClose, reader }: NfcOverlayProps): React.ReactElement {
  const palette = useAppPalette();

  // Same card as the Settings page, so the two read as one family.
  const cardStyle = {
    p: 2.5,
    borderRadius: RADIUS.xxl,
    bgcolor: palette.isDark ? whiteAlpha(0.03) : 'rgba(255, 255, 255, 0.8)',
    border: `1px solid ${palette.isDark ? whiteAlpha(0.06) : blackAlpha(0.06)}`,
    backdropFilter: BLUR.md,
  };

  return (
    <FullscreenOverlay
      open={open}
      onClose={onClose}
      darkMode={palette.isDark}
      zIndex={10001}
      centeredX={true}
      centeredY={true}
      debugName="Nfc"
      showCloseButton={true}
    >
      <Box
        sx={{
          width: '90%',
          maxWidth: '420px',
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: TYPO.xxl,
            fontWeight: FONT_WEIGHT.bold,
            color: palette.textPrimary,
            letterSpacing: '-0.3px',
            pb: 1,
          }}
        >
          NFC
        </Typography>

        <NfcReaderCard
          status={reader.status}
          tag={reader.tag}
          state={reader.state}
          fetchError={reader.fetchError}
          isErasing={reader.isErasing}
          eraseResult={reader.eraseResult}
          onErase={full => void reader.erase(full)}
          onClearEraseResult={reader.clearEraseResult}
          cardStyle={cardStyle}
        />
      </Box>
    </FullscreenOverlay>
  );
}
