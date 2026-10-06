import nodemailer from "nodemailer";
import { getContent } from "./content";
import { hasDatabase } from "./database";

function transport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

type MailMessage = { to:string; subject:string; html:string; replyTo?:string };

async function deliver(message:MailMessage) {
  if (process.env.RESEND_API_KEY) {
    const from=process.env.RESEND_FROM||process.env.EMAIL_FROM;
    if(!from)throw new Error("EMAIL_FROM_NOT_CONFIGURED");
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:`Bearer ${process.env.RESEND_API_KEY}`},
      body:JSON.stringify({
        from,
        to:[message.to],
        subject:message.subject,
        html:message.html,
        ...(message.replyTo?{reply_to:message.replyTo}:{})
      })
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(`Resend delivery failed: ${response.status} ${JSON.stringify(result)}`);
    return {messageId:String((result as {id?:string}).id||"")};
  }
  const tx=transport();
  if(!tx)throw new Error("EMAIL_NOT_CONFIGURED");
  return tx.sendMail({from:process.env.EMAIL_FROM,to:message.to,replyTo:message.replyTo,subject:message.subject,html:message.html});
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
const rows = (obj: Record<string, unknown>) => Object.entries(obj).filter(([,v]) => v !== "" && v != null).map(([k,v]) => `<tr><th style="text-align:left;padding:7px;border-bottom:1px solid #ddd">${esc(k.replace(/([A-Z])/g," $1"))}</th><td style="padding:7px;border-bottom:1px solid #ddd">${esc(Array.isArray(v) ? v.join(", ") : v)}</td></tr>`).join("");
const validEmail = (value: string | undefined) => Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

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

export async function sendLeadEmails(lead: { id:string; type:"BUYER"|"SELLER"; firstName:string; lastName:string; email:string; phone:string; preferredContact:string; bestTime:string|null; language:string; source:string|null; details:unknown }) {
  if (!process.env.RESEND_API_KEY && !transport()) throw new Error("EMAIL_NOT_CONFIGURED");
  const content = await getContent();
  const details = lead.details as Record<string, unknown>;
  const type = lead.type === "BUYER" ? "Buyer" : "Seller";
  const ownerRecipient = validEmail(process.env.LEAD_NOTIFICATION_EMAIL) ? process.env.LEAD_NOTIFICATION_EMAIL! : content.email;
  if (!validEmail(ownerRecipient)) throw new Error("LEAD_NOTIFICATION_EMAIL_NOT_CONFIGURED");
  const replyAddress = validEmail(content.email) ? content.email : process.env.SMTP_USER!;
  const adminSubject = `New ${type} Inquiry: ${lead.firstName} ${lead.lastName}`;
  const dashboardBlock = hasDatabase()
    ? `<p><a href="${esc(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/leads/${lead.id}`)}">Open this lead in the private dashboard</a></p>`
    : `<p><strong>Email-only mode:</strong> Keep this message as the inquiry record and reply directly to contact the client.</p>`;
  let adminSent = false;
  let clientSent = false;

  try {
    const info = await deliver({to:ownerRecipient,replyTo:lead.email,subject:adminSubject,html:`<h2>${esc(adminSubject)}</h2><table style="border-collapse:collapse"><tbody>${rows({ email:lead.email, phone:lead.phone, preferredContact:lead.preferredContact, bestTime:lead.bestTime, language:lead.language, source:lead.source, ...details })}</tbody></table>${dashboardBlock}`});
    adminSent = true;
    await recordEmailEvent({leadId:lead.id,kind:"ADMIN_NOTIFICATION",recipient:ownerRecipient,subject:adminSubject,status:"SENT",providerId:info.messageId});
  } catch (error) {
    await recordEmailEvent({leadId:lead.id,kind:"ADMIN_NOTIFICATION",recipient:ownerRecipient,subject:adminSubject,status:"FAILED",error:String(error).slice(0,500)});
  }

  const address = String(details.propertyAddress || "").trim();
  const subject = lead.type === "BUYER" ? "Your Home Search Is in Great Hands" : "Your Home-Selling Request Has Been Received";
  const intro = lead.type === "BUYER" ? content.buyerEmailTemplate : content.sellerEmailTemplate.replace("{{property_reference}}", address ? `about selling your property at ${address}` : "about your plans to sell your home");
  try {
    const info = await deliver({to:lead.email,replyTo:replyAddress,subject,html:`<div style="font:16px/1.6 Arial;color:#292d2a;max-width:620px"><p>Hi ${esc(lead.firstName)},</p><p>${esc(intro)}</p><p>${lead.type === "BUYER" ? "Buying a home is both an important decision and an exciting new chapter. My goal is to help you move through it with clarity, confidence, and genuine support—from identifying the right opportunities to reaching the closing table." : "Every home and every move has a unique story. My goal is to help you understand your options, prepare strategically, and move forward with clarity and confidence. You’re in great hands throughout the selling process."}</p><p>I look forward to speaking with you and learning more about your goals.</p><p>Warmly,<br><strong>Amanda Alves</strong><br>Realtor®<br>${esc(content.phone)}<br>${esc(replyAddress)}</p></div>`});
    clientSent = true;
    await recordEmailEvent({leadId:lead.id,kind:"CLIENT_CONFIRMATION",recipient:lead.email,subject,status:"SENT",providerId:info.messageId});
  } catch (error) {
    await recordEmailEvent({leadId:lead.id,kind:"CLIENT_CONFIRMATION",recipient:lead.email,subject,status:"FAILED",error:String(error).slice(0,500)});
  }

  return { adminSent, clientSent };
}
