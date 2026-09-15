export type SiteContentData = {
  heroHeading: string; heroMessage: string; primaryCta: string; buyerHeading: string; buyerMessage: string;
  sellerHeading: string; sellerMessage: string; specialtyHeading: string; specialtyMessage: string; aboutBio: string;
  phone: string; email: string; instagramUrl: string; brokerageName: string; brokerageContact: string; licenseNumber: string;
  serviceAreas: string; profileImageUrl: string; familyImageUrl: string; socialImageUrl: string; seoTitle: string; seoDescription: string;
  buyerEmailTemplate: string; sellerEmailTemplate: string; privacyText: string; termsText: string; disclosureText: string;
};

export const defaultContent: SiteContentData = {
  heroHeading: "More Than a House. A Place to Build Your Life.",
  heroMessage: "Whether you’re searching for more space, preparing to sell, or simply wondering what your next move could look like, I’ll help you navigate the process with clarity, care, and confidence.",
  primaryCta: "Make Your Move",
  buyerHeading: "Looking to buy?",
  buyerMessage: "From neighborhood homes to acreage and farmhouse-style properties, let’s find a place that fits the life you want to build.",
  sellerHeading: "Thinking about selling?",
  sellerMessage: "Understand your options, prepare strategically, and move forward with a plan designed around your priorities.",
  specialtyHeading: "More Space. More Possibility. A Home That Fits Your Life.",
  specialtyMessage: "Amanda has a special passion for helping clients discover acreage homes, larger homesites, farmhouse-style properties, and communities that offer more room to live. Whether your dream includes land, privacy, a garden, space for animals, or simply the right home in the right neighborhood, Amanda can help turn that vision into a practical plan.",
  aboutBio: "For Amanda Alves, real estate is about much more than a transaction—it is about helping people find the setting where their lives can flourish. As a wife and mother of three sons, Amanda understands that home is where families build traditions, create memories, and feel grounded.\n\nLicensed in real estate since 2021, Amanda brings a thoughtful, personal approach to every client relationship. She has a particular passion for acreage properties, larger homesites, and farmhouse-style living, but she is equally committed to helping clients find or sell any home that supports their goals.\n\nWhether you are buying your first home, searching for more land and privacy, relocating, or preparing to sell, Amanda provides clear communication, attentive guidance, and genuine care throughout the process. Her goal is to make your next move feel informed, supported, and uniquely yours.",
  phone: "[CELLPHONE NUMBER]", email: "[EMAIL ADDRESS]", instagramUrl: "[INSTAGRAM PROFILE URL]", brokerageName: "[BROKERAGE NAME]", brokerageContact: "[BROKERAGE CONTACT INFORMATION]", licenseNumber: "[LICENSE NUMBER]", serviceAreas: "[SERVICE AREAS]",
  profileImageUrl: "", familyImageUrl: "", socialImageUrl: "", seoTitle: "Amanda Alves | Florida Realtor®", seoDescription: "Personal real estate guidance for buying, selling, acreage, new construction, and lifestyle moves in Florida.",
  buyerEmailTemplate: "Thank you for reaching out and sharing a little about the home you hope to find. I’ve received your information and will personally review your goals before contacting you within 24 hours.",
  sellerEmailTemplate: "Thank you for reaching out {{property_reference}}. I’ve received your information and will personally review the details before contacting you within 24 hours.",
  privacyText: "We collect the information you submit solely to respond to your real estate inquiry, maintain business records, and provide requested services. We do not sell your personal information. Contact Amanda to request access, correction, or deletion.",
  termsText: "Information on this website is general and does not constitute legal, tax, lending, or financial advice. Submitting a form does not create an agency relationship. Real estate services are provided subject to a written agreement where required.",
  disclosureText: "Licensed Florida real estate sales associate. Equal Housing Opportunity. Verify brokerage details and all required advertising disclosures before publication."
};

export async function getContent(): Promise<SiteContentData> {
  try {
    const { prisma } = await import("./prisma");
    const row = await prisma.siteContent.findUnique({ where: { id: "primary" } });
    return { ...defaultContent, ...(row?.content as Partial<SiteContentData> | undefined) };
  } catch { return defaultContent; }
}
