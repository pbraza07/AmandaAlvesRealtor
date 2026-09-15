UPDATE "SiteContent"
SET "content" = "content" || jsonb_build_object(
  'specialtyMessage', 'I have a special passion for helping clients discover acreage homes, larger homesites, farmhouse-style properties, and communities that offer more room to live. Whether your dream includes land, privacy, a garden, space for animals, or simply the right home in the right neighborhood, I can help turn that vision into a practical plan.',
  'aboutBio', E'For me, real estate is about much more than a transaction—it is about helping people find the setting where their lives can flourish. As a wife and mother of three sons, I understand that home is where families build traditions, create memories, and feel grounded.\n\nI have been licensed in real estate since 2021, and I bring a thoughtful, personal approach to every client relationship. I have a particular passion for acreage properties, larger homesites, and farmhouse-style living, but I am equally committed to helping you find or sell any home that supports your goals.\n\nWhether you are buying your first home, searching for more land and privacy, relocating, or preparing to sell, I will provide clear communication, attentive guidance, and genuine care throughout the process. My goal is to make your next move feel informed, supported, and uniquely yours.',
  'privacyText', 'I collect the information you submit solely to respond to your real estate inquiry, maintain business records, and provide requested services. I do not sell your personal information. Contact me to request access, correction, or deletion.',
  'profileImageUrl', '/images/amanda-alves.webp',
  'familyImageUrl', '/images/amanda-family.webp',
  'socialImageUrl', '/images/farmhouse-acreage-hero.webp'
)
WHERE "id" = 'primary';
