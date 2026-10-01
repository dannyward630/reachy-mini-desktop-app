import React, { useCallback, useState } from 'react';
import NfcStatusButton from './NfcStatusButton';
import NfcOverlay from './NfcOverlay';
import { useNfcReader } from './useNfcReader';

/** NFC status button and the page it opens, sharing one poll of the reader. */
export default function NfcControl(): React.ReactElement {
  const reader = useNfcReader();
  const [open, setOpen] = useState<boolean>(false);
  const openOverlay = useCallback(() => setOpen(true), []);
  const closeOverlay = useCallback(() => setOpen(false), []);

  return (
    <>
      <NfcStatusButton state={reader.state} onClick={openOverlay} />
      <NfcOverlay open={open} onClose={closeOverlay} reader={reader} />
    </>
  );
}
