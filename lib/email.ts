import { getContent } from "./content";
import { hasDatabase } from "./database";

import { orderedLeadFields } from "./form-fields";
export type PhotoAttachment={name:string;contentType:string;content:Buffer};
type MailMessage = { to:string; subject:string; html:string; replyTo?:string; attachments?:PhotoAttachment[] };
type GmailConfiguration = { clientId:string; clientSecret:string; refreshToken:string; senderEmail:string };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
const validEmail = (value: string | undefined) => Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
const rows = (obj: Record<string, unknown>) => Object.entries(obj).map(([k,v]) => `<tr><th style="text-align:left;padding:7px;border-bottom:1px solid #ddd">${esc(k.replace(/([A-Z])/g," $1"))}</th><td style="padding:7px;border-bottom:1px solid #ddd">${esc(Array.isArray(v) ? v.join(", ") : v)}</td></tr>`).join("");

function gmailConfiguration():GmailConfiguration {
  const configuration={
    clientId:String(process.env.GMAIL_CLIENT_ID||"").trim(),
    clientSecret:String(process.env.GMAIL_CLIENT_SECRET||"").trim(),
    refreshToken:String(process.env.GMAIL_REFRESH_TOKEN||"").trim(),
    senderEmail:String(process.env.GMAIL_SENDER_EMAIL||"").trim().toLowerCase()
  };
  if(!configuration.clientId||!configuration.clientSecret||!configuration.refreshToken||!validEmail(configuration.senderEmail))throw new Error("GMAIL_API_NOT_CONFIGURED");
  return configuration;
}

async function gmailAccessToken(configuration:GmailConfiguration) {
  const response=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:configuration.clientId,client_secret:configuration.clientSecret,refresh_token:configuration.refreshToken,grant_type:"refresh_token"})
  });
  const result=await response.json().catch(()=>({}));
  const accessToken=(result as {access_token?:string}).access_token;
  if(!response.ok||!accessToken)throw new Error(`Gmail OAuth failed: ${response.status} ${JSON.stringify(result)}`);
  return accessToken;
}

function encodedHeader(value:string) {
  return /^[\x20-\x7E]*$/.test(value)?value:`=?UTF-8?B?${Buffer.from(value,"utf8").toString("base64")}?=`;
}

function wrappedBase64(value:string) {
  return Buffer.from(value,"utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n")||"";
}

async function deliver(message:MailMessage) {
  if(!validEmail(message.to)||message.replyTo&&!validEmail(message.replyTo))throw new Error("INVALID_EMAIL_ADDRESS");
  const configuration=gmailConfiguration();
  const accessToken=await gmailAccessToken(configuration);
  const displayFrom=`Amanda Alves <${configuration.senderEmail}>`;
  const boundary="amanda-photos-"+crypto.randomUUID();
  const mime=[
    `From: ${displayFrom}`,
    `To: ${message.to}`,
    ...(message.replyTo?[`Reply-To: ${message.replyTo}`]:[]),
    `Subject: ${encodedHeader(message.subject)}`,
    "MIME-Version: 1.0",
    ...(message.attachments?.length ? [`Content-Type: multipart/mixed; boundary="${boundary}"`,"",`--${boundary}`] : []),
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrappedBase64(message.html),
    ...(message.attachments?.length ? message.attachments.flatMap(a=>["",`--${boundary}`,`Content-Type: ${a.contentType}`,`Content-Disposition: attachment; filename="${a.name}"`,"Content-Transfer-Encoding: base64","",a.content.toString("base64").match(/.{1,76}/g)?.join("\r\n")||""]).concat(["",`--${boundary}--`]) : [])
  ].join("\r\n");
  const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{
    method:"POST",
    headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},
    body:JSON.stringify({raw:Buffer.from(mime,"utf8").toString("base64url")})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(`Gmail delivery failed: ${response.status} ${JSON.stringify(result)}`);
  return {messageId:String((result as {id?:string}).id||"")};
}

async function recordEmailEvent(data:{leadId:string;kind:string;recipient:string;subject:string;status:string;providerId?:string;error?:string}) {
  if (!hasDatabase()) return;
  try {
    const { prisma } = await import("./prisma");
    await prisma.emailEvent.create({ data });
  } catch (error) {
    console.error("Unable to record email event", error);
  }
}

export async function sendPasswordReset(email:string, url:string) {
  await deliver({to:email,subject:"Reset your Amanda Alves Lead Studio password",html:`<div style="font:16px/1.6 Arial;color:#292d2a;max-width:620px"><h2>Password reset requested</h2><p>Use the secure link below within one hour to choose a new password.</p><p><a href="${esc(url)}">Reset my password</a></p><p>If you did not request this, you can ignore this email. The link can be used only once.</p></div>`});
}

export async function sendLeadEmails(lead: { id:string; type:"BUYER"|"SELLER"; firstName:string; lastName:string; email:string; phone:string; preferredContact:string; bestTime:string|null; language:string; source:string|null; details:unknown }, attachments:PhotoAttachment[] = []) {
  const configuration=gmailConfiguration();
  const content = await getContent();
  const details = lead.details as Record<string, unknown>;
  const type = lead.type === "BUYER" ? "Buyer" : "Seller";
  const ownerRecipient = validEmail(process.env.LEAD_NOTIFICATION_EMAIL) ? process.env.LEAD_NOTIFICATION_EMAIL! : content.email;
  if (!validEmail(ownerRecipient)) throw new Error("LEAD_NOTIFICATION_EMAIL_NOT_CONFIGURED");
  const replyAddress = validEmail(content.email) ? content.email : configuration.senderEmail;
  const adminSubject = `New ${type} Inquiry: ${lead.firstName} ${lead.lastName}`;
  const dashboardBlock = hasDatabase()
    ? `<p><a href="${esc(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/leads/${lead.id}`)}">Open this lead in the private dashboard</a></p>`
    : `<p><strong>Email-only mode:</strong> Keep this message as the inquiry record and reply directly to contact the client.</p>`;
  let adminSent = false;
  let clientSent = false;

  try {
    const info = await deliver({to:ownerRecipient,replyTo:lead.email,subject:adminSubject,attachments,html:`<h2>${esc(adminSubject)}</h2><table style="border-collapse:collapse"><tbody>${rows(Object.fromEntries(orderedLeadFields(lead)))}</tbody></table>${dashboardBlock}`});
    adminSent = true;
    await recordEmailEvent({leadId:lead.id,kind:"ADMIN_NOTIFICATION",recipient:ownerRecipient,subject:adminSubject,status:"SENT",providerId:info.messageId});
  } catch (error) {
    await recordEmailEvent({leadId:lead.id,kind:"ADMIN_NOTIFICATION",recipient:ownerRecipient,subject:adminSubject,status:"FAILED",error:String(error).slice(0,500)});
  }

  if (!adminSent) return { adminSent, clientSent };

  const address = String(details.propertyAddress || "").trim();
  const subject = lead.type === "BUYER" ? "Thank You — I Received Your Home Search Request" : "Thank You — I Received Your Home-Selling Request";
  const intro = lead.type === "BUYER" ? content.buyerEmailTemplate : content.sellerEmailTemplate.replace("{{property_reference}}", address ? `about selling your property at ${address}` : "about your plans to sell your home");
  try {
    const info = await deliver({to:lead.email,replyTo:replyAddress,subject,html:`<div style="font:16px/1.65 Arial,sans-serif;color:#292d2a;max-width:620px;margin:auto"><div style="border-top:5px solid #18352b;padding:28px 6px"><p>Hi ${esc(lead.firstName)},</p><p>${esc(intro)}</p><p>${lead.type === "BUYER" ? "I know buying a home is both an important decision and an exciting new chapter. My goal is to make the process feel clear, manageable, and personal from our first conversation through closing." : "I know selling a home can bring a lot of questions. My goal is to help you understand your options, prepare strategically, and move forward with clarity and confidence."}</p><p>If you think of anything else in the meantime, simply reply to this email. I look forward to speaking with you soon.</p><p>Warmly,<br><strong>Amanda Alves</strong><br>Realtor®<br>${esc(content.phone)}<br>${esc(replyAddress)}</p></div></div>`});
    clientSent = true;
    await recordEmailEvent({leadId:lead.id,kind:"CLIENT_CONFIRMATION",recipient:lead.email,subject,status:"SENT",providerId:info.messageId});
  } catch (error) {
    await recordEmailEvent({leadId:lead.id,kind:"CLIENT_CONFIRMATION",recipient:lead.email,subject,status:"FAILED",error:String(error).slice(0,500)});
  }

  return { adminSent, clientSent };
}
