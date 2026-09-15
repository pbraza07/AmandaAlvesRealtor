import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { getContent } from "./content";

function transport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: process.env.SMTP_SECURE !== "false", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}

export async function sendPasswordReset(email:string, url:string) {
  const tx=transport(); if(!tx) throw new Error("Email is not configured");
  await tx.sendMail({from:process.env.EMAIL_FROM,to:email,subject:"Reset your Amanda Alves Lead Studio password",html:`<div style="font:16px/1.6 Arial;color:#292d2a;max-width:620px"><h2>Password reset requested</h2><p>Use the secure link below within one hour to choose a new password.</p><p><a href="${esc(url)}">Reset my password</a></p><p>If you did not request this, you can ignore this email. The link can be used only once.</p></div>`});
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
const rows = (obj: Record<string, unknown>) => Object.entries(obj).filter(([,v]) => v !== "" && v != null).map(([k,v]) => `<tr><th style="text-align:left;padding:7px;border-bottom:1px solid #ddd">${esc(k.replace(/([A-Z])/g," $1"))}</th><td style="padding:7px;border-bottom:1px solid #ddd">${esc(Array.isArray(v) ? v.join(", ") : v)}</td></tr>`).join("");

export async function sendLeadEmails(lead: { id:string; type:"BUYER"|"SELLER"; firstName:string; lastName:string; email:string; phone:string; preferredContact:string; bestTime:string|null; language:string; source:string|null; details:unknown }) {
  const tx = transport(); if (!tx) return;
  const content = await getContent(); const details = lead.details as Record<string, unknown>; const type = lead.type === "BUYER" ? "Buyer" : "Seller";
  const adminSubject = `New ${type} Inquiry: ${lead.firstName} ${lead.lastName}`;
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/leads/${lead.id}`;
  try {
    const info = await tx.sendMail({ from: process.env.EMAIL_FROM, to: process.env.LEAD_NOTIFICATION_EMAIL || content.email, replyTo: lead.email, subject: adminSubject, html: `<h2>${esc(adminSubject)}</h2><table style="border-collapse:collapse"><tbody>${rows({ email:lead.email, phone:lead.phone, preferredContact:lead.preferredContact, bestTime:lead.bestTime, language:lead.language, source:lead.source, ...details })}</tbody></table><p><a href="${esc(dashboardUrl)}">Open this lead in the private dashboard</a></p>` });
    await prisma.emailEvent.create({ data: { leadId:lead.id, kind:"ADMIN_NOTIFICATION", recipient:process.env.LEAD_NOTIFICATION_EMAIL || content.email, subject:adminSubject, status:"SENT", providerId:info.messageId } });
  } catch (e) { await prisma.emailEvent.create({ data: { leadId:lead.id, kind:"ADMIN_NOTIFICATION", recipient:process.env.LEAD_NOTIFICATION_EMAIL || content.email, subject:adminSubject, status:"FAILED", error:String(e).slice(0,500) } }); }

  const address = String(details.propertyAddress || "").trim();
  const subject = lead.type === "BUYER" ? "Your Home Search Is in Great Hands" : "Your Home-Selling Request Has Been Received";
  const intro = lead.type === "BUYER" ? content.buyerEmailTemplate : content.sellerEmailTemplate.replace("{{property_reference}}", address ? `about selling your property at ${address}` : "about your plans to sell your home");
  try {
    const info = await tx.sendMail({ from: process.env.EMAIL_FROM, to:lead.email, replyTo:content.email, subject, html:`<div style="font:16px/1.6 Arial;color:#292d2a;max-width:620px"><p>Hi ${esc(lead.firstName)},</p><p>${esc(intro)}</p><p>${lead.type === "BUYER" ? "Buying a home is both an important decision and an exciting new chapter. My goal is to help you move through it with clarity, confidence, and genuine support—from identifying the right opportunities to reaching the closing table." : "Every home and every move has a unique story. My goal is to help you understand your options, prepare strategically, and move forward with clarity and confidence. You’re in great hands throughout the selling process."}</p><p>I look forward to speaking with you and learning more about your goals.</p><p>Warmly,<br><strong>Amanda Alves</strong><br>Realtor®<br>${esc(content.phone)}<br>${esc(content.email)}</p></div>` });
    await prisma.emailEvent.create({ data:{ leadId:lead.id, kind:"CLIENT_CONFIRMATION", recipient:lead.email, subject, status:"SENT", providerId:info.messageId } });
  } catch (e) { await prisma.emailEvent.create({ data:{ leadId:lead.id, kind:"CLIENT_CONFIRMATION", recipient:lead.email, subject, status:"FAILED", error:String(e).slice(0,500) } }); }
}
