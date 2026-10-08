"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function WebsiteQrShare() {
  const [siteUrl, setSiteUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy Website Link");

  useEffect(() => {
    const url = window.location.origin;
    setSiteUrl(url);
    QRCode.toDataURL(url, {
      width: 720,
      margin: 3,
      errorCorrectionLevel: "H",
      color: { dark: "#18352b", light: "#ffffff" },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, []);

  async function copyLink() {
    if (!siteUrl) return;
    await navigator.clipboard.writeText(siteUrl);
    setCopyLabel("Link Copied!");
    window.setTimeout(() => setCopyLabel("Copy Website Link"), 2200);
  }

  async function shareWebsite() {
    if (!siteUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: "Amanda Alves, Realtor®",
        text: "Connect with Amanda Alves for personal guidance with buying or selling a home in the Tampa Bay area.",
        url: siteUrl,
      });
      return;
    }
    await copyLink();
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "Amanda-Alves-Realtor-Website-QR.png";
    link.click();
  }

  return <div className="qr-share-card" id="share">
    <div className="qr-code-wrap">
      {qrDataUrl
        ? <img src={qrDataUrl} alt="QR code linking to Amanda Alves Realtor website" width="220" height="220"/>
        : <div className="qr-loading" aria-live="polite">Creating QR code…</div>}
    </div>
    <div className="qr-share-copy">
      <span className="eyebrow">Keep my information close</span>
      <h2>Scan, save, and share.</h2>
      <p>Open my website instantly or share it with someone who is thinking about buying or selling a home.</p>
      <div className="qr-actions">
        <button className="button dark" type="button" onClick={shareWebsite}>Share My Website</button>
        <button className="button outline" type="button" onClick={copyLink}>{copyLabel}</button>
        <button className="qr-download" type="button" onClick={downloadQr} disabled={!qrDataUrl}>Download QR Code</button>
      </div>
    </div>
  </div>;
}
