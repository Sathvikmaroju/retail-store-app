import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const BarcodeScanner = ({ onScanSuccess, onScanError, fps = 10, qrbox = 250 }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("scanner");

    scanner.start(
      { facingMode: "environment" },
      { fps, qrbox },
      (decodedText) => {
        onScanSuccess(decodedText);
        scanner.stop();
      },
      onScanError || ((err) => console.warn("Scan error:", err))
    );

    return () => {
      scanner.stop().catch((err) => console.error("Stop failed:", err));
    };
  }, []);

  return <div id="scanner" ref={scannerRef} style={{ width: '100%' }} />;
};

export default BarcodeScanner;
