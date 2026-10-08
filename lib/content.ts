export type SiteContentData = {
  bioEyebrow:string; bioHeading:string; bioSubtitle:string; bioBody:string; bioImageUrl:string; bioImageAlt:string; bioImageCaption:string; bioCta:string; bioContactLabel:string; bioSeoTitle:string; bioSeoDescription:string;
  heroHeading: string; heroMessage: string; primaryCta: string; buyerHeading: string; buyerMessage: string;
  sellerHeading: string; sellerMessage: string; specialtyHeading: string; specialtyMessage: string; aboutBio: string;
  phone: string; email: string; instagramUrl: string; brokerageName: string; brokerageContact: string; licenseNumber: string;
  serviceAreas: string; profileImageUrl: string; familyImageUrl: string; socialImageUrl: string; seoTitle: string; seoDescription: string;
  buyerEmailTemplate: string; sellerEmailTemplate: string; privacyText: string; termsText: string; disclosureText: string;
};

export const defaultContent: SiteContentData = {
  bioEyebrow:"The person behind your next move",bioHeading:"Meet Amanda Alves",bioSubtitle:"Realtor® · Investor · Wife & Mom",
  bioBody:"Originally from Brazil, Amanda and her husband moved to the Tampa Bay area with the U.S. Air Force in 2010 and have called it home ever since. Before transitioning into real estate, Amanda built her career in the financial services industry, backed by an education in Business Administration. Licensed since 2020, she is also an active real estate investor with experience in new construction and house flips. Her background in finance, along with her own investing experience, gives her a practical understanding of real estate from both sides of the equation, helping clients make confident, informed decisions.\n\nAmanda has a passion for acreage and lifestyle properties, particularly in the communities north of Tampa, including Wesley Chapel, Lutz, Land O’ Lakes, Odessa, San Antonio, and Dade City. She knows these areas well and loves helping families find a home that fits the way they actually live, whether that means more land, more privacy, or simply a place that feels right.\n\nOutside of real estate, Amanda is a wife and mom to three boys, which means much of her free time is spent on soccer fields cheering them on. She's also an avid traveler who loves discovering new places, experiencing different cultures, and making memories along the way. Having lived abroad herself, she values the experiences that come with exploring the world and believes in enjoying life today while still planning for the future.\n\nAt the heart of it all, Amanda believes real estate is about more than buying and selling properties. Whether it's finding the right place to call home or making a smart investment, she loves helping people see the possibilities real estate can create and how it can help them build a life they truly love.",
  bioImageUrl:"/images/amanda-family-bio.webp",bioImageAlt:"Amanda Alves with her husband and three sons",bioImageCaption:"Amanda and her family",bioCta:"Make Your Move",bioContactLabel:"Contact Me",bioSeoTitle:"Meet Amanda Alves | Tampa Bay Realtor & Investor",bioSeoDescription:"Meet Amanda Alves, a Tampa Bay Realtor and investor passionate about acreage, lifestyle properties, and helping families build a life they love.",
  heroHeading: "More Than a House. A Place to Build Your Life.",
  heroMessage: "Whether you’re searching for more space, preparing to sell, or simply wondering what your next move could look like, I’ll help you navigate the process with clarity, care, and confidence.",
  primaryCta: "Make Your Move",
  buyerHeading: "Looking to buy?",
  buyerMessage: "From neighborhood homes to acreage and farmhouse-style properties, let’s find a place that fits the life you want to build.",
  sellerHeading: "Thinking about selling?",
  sellerMessage: "Understand your options, prepare strategically, and move forward with a plan designed around your priorities.",
  specialtyHeading: "More Space. More Possibility. A Home That Fits Your Life.",
  specialtyMessage: "I have a special passion for helping clients discover acreage homes, larger homesites, farmhouse-style properties, and communities that offer more room to live. Whether your dream includes land, privacy, a garden, space for animals, or simply the right home in the right neighborhood, I can help turn that vision into a practical plan.",
  aboutBio: "For me, real estate is about much more than a transaction—it is about helping people find the setting where their lives can flourish. As a wife and mother of three sons, I understand that home is where families build traditions, create memories, and feel grounded.\n\nI have been licensed in real estate since 2021, and I bring a thoughtful, personal approach to every client relationship. I have a particular passion for acreage properties, larger homesites, and farmhouse-style living, but I am equally committed to helping you find or sell any home that supports your goals.\n\nWhether you are buying your first home, searching for more land and privacy, relocating, or preparing to sell, I will provide clear communication, attentive guidance, and genuine care throughout the process. My goal is to make your next move feel informed, supported, and uniquely yours.",
  phone: "[CELLPHONE NUMBER]", email: "amandaborgesalves@gmail.com", instagramUrl: "[INSTAGRAM PROFILE URL]", brokerageName: "[BROKERAGE NAME]", brokerageContact: "[BROKERAGE CONTACT INFORMATION]", licenseNumber: "[LICENSE NUMBER]", serviceAreas: "[SERVICE AREAS]",
  profileImageUrl: "/images/amanda-alves.webp", familyImageUrl: "/images/amanda-family.webp", socialImageUrl: "/images/farmhouse-acreage-hero.webp", seoTitle: "Amanda Alves | Florida Realtor®", seoDescription: "Personal real estate guidance for buying, selling, acreage, new construction, and lifestyle moves in Florida.",
  buyerEmailTemplate: "Thank you for reaching out and sharing a little about the home you hope to find. I’ve received your message and will personally review the details you provided. I’ll be in touch within 24 hours to learn more about your goals, answer your questions, and discuss the best next steps.",
  sellerEmailTemplate: "Thank you for reaching out {{property_reference}}. I’ve received your message and will personally review the details you provided. I’ll be in touch within 24 hours to learn more about your goals, answer your questions, and discuss the best next steps.",
  privacyText: "I collect the information you submit solely to respond to your real estate inquiry, maintain business records, and provide requested services. I do not sell your personal information. Contact me to request access, correction, or deletion.",
  termsText: "Information on this website is general and does not constitute legal, tax, lending, or financial advice. Submitting a form does not create an agency relationship. Real estate services are provided subject to a written agreement where required.",
  disclosureText: "Licensed Florida real estate sales associate. Equal Housing Opportunity. Verify brokerage details and all required advertising disclosures before publication."
};

function environmentContent(): Partial<SiteContentData> {
  const values: Partial<SiteContentData> = {
    phone: process.env.SITE_PHONE,
    email: process.env.SITE_EMAIL,
    instagramUrl: process.env.SITE_INSTAGRAM_URL,
    brokerageName: process.env.SITE_BROKERAGE_NAME,
    brokerageContact: process.env.SITE_BROKERAGE_CONTACT,
    licenseNumber: process.env.SITE_LICENSE_NUMBER,
    serviceAreas: process.env.SITE_SERVICE_AREAS
  };
  return Object.fromEntries(Object.entries(values).filter(([,value]) => Boolean(value?.trim()))) as Partial<SiteContentData>;
}

export async function getContent(): Promise<SiteContentData> {
  const { hasDatabase } = await import("./database");
  const baseContent = { ...defaultContent, ...environmentContent() };
  if (!hasDatabase()) return baseContent;
  try {
    const { prisma } = await import("./prisma");
    const row = await prisma.siteContent.findUnique({ where: { id: "primary" } });
    return { ...baseContent, ...(row?.content as Partial<SiteContentData> | undefined) };
  } catch { return baseContent; }
}
