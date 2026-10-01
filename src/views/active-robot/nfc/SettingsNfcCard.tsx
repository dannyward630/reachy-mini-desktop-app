import React from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import NfcReaderCard from './NfcReaderCard';
import { useNfcReader } from './useNfcReader';

export interface SettingsNfcCardProps {
  cardStyle?: SxProps<Theme>;
}

/** NFC Reader card for the Settings page, polling the reader while shown. */
export default function SettingsNfcCard({ cardStyle }: SettingsNfcCardProps): React.ReactElement {
  const reader = useNfcReader();

  return (
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
  );
}
