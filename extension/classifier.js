export function getDomainFromUrl(url) {
  try {
    const urlObject = new URL(url);
    return urlObject.hostname.replace("www.", "");
  } catch (error) {
    return "site-inconnu";
  }
}

export function classifySite(domain, url, pageContent = null) {
  const normalizedDomain = domain.toLowerCase();
  const normalizedUrl = url.toLowerCase();

  const knownSites = {
  Productif: [
    "github.com",
    "stackoverflow.com",
    "developer.mozilla.org",
    "openclassrooms.com",
    "docs.google.com",
    "notion.so",
    "figma.com",
    "dbdiagram.io"
  ],
  Distraction: [
    "youtube.com",
    "tiktok.com",
    "instagram.com",
    "netflix.com",
    "twitch.tv",
    "primevideo.com",
    "disneyplus.com",
    "spotify.com",
    "kick.com"
  ],
  "E-commerce": [
    "amazon.fr",
    "amazon.com",
    "shein.com",
    "nike.com",
    "laboutiqueofficielle.com",
    "vinted.fr",
    "zalando.fr",
    "aliexpress.com",
    "cdiscount.com"
  ],
  Neutre: [
    "mail.google.com",
    "gmail.com"
  ]
};

  for (const category in knownSites) {
    if (knownSites[category].some((site) => normalizedDomain.includes(site))) {
      return {
        category,
        source: "known_site"
      };
    }
  }

  const searchEngines = [
    "google.com",
    "google.fr",
    "bing.com",
    "duckduckgo.com",
    "yahoo.com",
    "qwant.com",
    "ecosia.org"
  ];

  if (searchEngines.some((site) => normalizedDomain.includes(site))) {
    return {
      category: "Neutre",
      source: "search_engine"
    };
  }

  const urlKeywords = {
    Productif: ["docs", "learn", "course", "cours", "formation", "developer", "academy"],
    Distraction: ["video", "streaming", "reels", "shorts", "gaming", "music"],
    "E-commerce": ["shop", "store", "boutique", "cart", "checkout", "panier", "produit", "promo"]
  };

  for (const category in urlKeywords) {
    if (urlKeywords[category].some((keyword) => normalizedUrl.includes(keyword))) {
      return {
        category,
        source: "url_keyword"
      };
    }
  }

  if (pageContent) {
    const text = `
      ${pageContent.title || ""}
      ${pageContent.metaDescription || ""}
      ${pageContent.headings || ""}
      ${pageContent.buttons || ""}
      ${pageContent.bodyText || ""}
    `.toLowerCase();

    const contentKeywords = {
      Productif: [
        "cours",
        "formation",
        "apprendre",
        "documentation",
        "développeur",
        "developer",
        "exercice",
        "leçon",
        "certification",
        "compétence"
      ],
      Distraction: [
        "films",
        "séries",
        "series",
        "streaming",
        "regarder",
        "playlist",
        "musique",
        "gaming",
        "abonnez-vous"
      ],
      "E-commerce": [
        "panier",
        "acheter",
        "commande",
        "livraison",
        "paiement",
        "prix",
        "promo",
        "soldes",
        "ajouter au panier",
        "chaussures",
        "vêtements",
        "retour gratuit"
      ]
    };

    for (const category in contentKeywords) {
      if (contentKeywords[category].some((keyword) => text.includes(keyword))) {
        return {
          category,
          source: "page_content"
        };
      }
    }
  }

  return {
    category: "Neutre",
    source: "neutral"
  };
}

export function getOpeningMessage(category) {
  if (category === "Productif") {
    return "Enfin tu bosses 👏";
  }

  if (category === "Distraction") {
    return "Encore ici ? 👀";
  }

  if (category === "E-commerce") {
    return "Tu regardes juste ou tu achètes ?";
  }

  return "Navigation tranquille 😌";
}