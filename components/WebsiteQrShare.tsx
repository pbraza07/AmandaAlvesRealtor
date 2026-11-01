"use client";
import { useSiteLanguage, Localized } from "@/components/SiteLanguage";


import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function WebsiteQrShare({defaultCampaign="general"}:{defaultCampaign?:string}) {
  const {locale,t}=useSiteLanguage();
  const [siteUrl, setSiteUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy Website Link");
  const [campaign, setCampaign] = useState(defaultCampaign);
  const destinations:Record<string,string>={lifestyle:"/",florida:"/lifestyle/florida",spain:"/lifestyle/spain",portugal:"/lifestyle/portugal","costa-rica":"/lifestyle/costa-rica",general:"/",seller:"/sell",openhouse:"/openhouse",buyer:"/buy",homevalue:"/home-value"};

  useEffect(() => {
    const url = `${window.location.origin}${destinations[campaign]}?utm_source=qr&utm_medium=print&utm_campaign=${encodeURIComponent(campaign)}&lang=${locale}`;
    setSiteUrl(url);
    QRCode.toDataURL(url, {
      width: 720,
      margin: 3,
      errorCorrectionLevel: "H",
      color: { dark: "#18352b", light: "#ffffff" },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [campaign,locale]);

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
        text: t("Find Your Place. Live Your Lifestyle. Explore Florida, Spain, Portugal, and Costa Rica with Amanda Alves."),
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
    link.download = `Amanda-Alves-${campaign}-QR.png`;
    link.click();
  }

  return <Localized><div className="qr-share-card" id="share">
    <div className="qr-code-wrap">
      {qrDataUrl
        ? <img src={qrDataUrl} alt="QR code linking to Amanda Alves Realtor website" width="220" height="220"/>
        : <div className="qr-loading" aria-live="polite">Creating QR code…</div>}
    </div>
    <div className="qr-share-copy">
      <span className="eyebrow">Keep my information close</span>
      <h2>Scan, save, and share.</h2>
      <p>Select a campaign to create its own trackable QR code. You can download a different code for lifestyle destinations, sellers, buyers, or open houses.</p><label htmlFor="qr-campaign">QR destination</label><select id="qr-campaign" value={campaign} onChange={e=>setCampaign(e.target.value)}>{Object.keys(destinations).map(key=><option key={key} value={key}>{({lifestyle:"Lifestyle destinations",florida:"Florida",spain:"Spain",portugal:"Portugal","costa-rica":"Costa Rica",general:"General website",seller:"Seller inquiries",openhouse:"Open houses",buyer:"Home buyers",homevalue:"Home value reviews"} as Record<string,string>)[key]}</option>)}</select>
      <div className="qr-actions">
        <button className="button dark" type="button" onClick={shareWebsite}>Share My Website</button>
        <button className="button outline" type="button" onClick={copyLink}>{copyLabel}</button>
        <button className="qr-download" type="button" onClick={downloadQr} disabled={!qrDataUrl}>Download QR Code</button>
      </div>
    </div>
  </div></Localized>;
}
