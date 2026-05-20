export function getDomainFromUrl(url) {
  try {
    const urlObject = new URL(url);
    return urlObject.hostname.replace(/^www\./, "").toLowerCase();
  } catch (error) {
    return "site-inconnu";
  }
}

function domainMatches(domain, sites) {
  return sites.some((site) => domain === site || domain.endsWith(`.${site}`));
}

export function classifySite(domain, url, pageContent = null) {
  const normalizedDomain = domain.toLowerCase();
  const normalizedUrl = url.toLowerCase();

  const searchEngines = [
    "google.com",
    "google.fr",
    "bing.com",
    "duckduckgo.com",
    "yahoo.com",
    "qwant.com",
    "ecosia.org"
  ];

  if (domainMatches(normalizedDomain, searchEngines)) {
    return {
      category: "Neutre",
      source: "search_engine"
    };
  }

  const knownSites = {
    Productif: [
      "github.com",
      "gitlab.com",
      "stackoverflow.com",
      "developer.mozilla.org",
      "openclassrooms.com",
      "w3schools.com",
      "freecodecamp.org",
      "docs.google.com",
      "notion.so",
      "figma.com",
      "dbdiagram.io",
      "trello.com",
      "slack.com",
      "chatgpt.com",
      "openai.com"
    ],

    Distraction: [
      "youtube.com",
      "youtu.be",
      "tiktok.com",
      "instagram.com",
      "facebook.com",
      "x.com",
      "twitter.com",
      "snapchat.com",
      "netflix.com",
      "twitch.tv",
      "primevideo.com",
      "disneyplus.com",
      "spotify.com",
      "kick.com",
      "reddit.com"
    ],

    "E-commerce": [
      "amazon.fr",
      "amazon.com",
      "shein.com",
      "nike.com",
      "adidas.com",
      "adidas.fr",
      "puma.com",
      "puma.fr",
      "zalando.fr",
      "zalando.com",
      "vinted.fr",
      "aliexpress.com",
      "cdiscount.com",
      "fnac.com",
      "darty.com",
      "boulanger.com",
      "ikea.com",
      "ikea.fr",
      "zara.com",
      "hm.com",
      "decathlon.fr",
      "decathlon.com",
      "laredoute.fr",
      "asos.com",
      "laboutiqueofficielle.com",
      "temu.com",
      "ebay.com",
      "ebay.fr",
      "carrefour.fr",
      "auchan.fr",
      "leclercdrive.fr"
    ],

    Neutre: [
      "mail.google.com",
      "gmail.com",
      "outlook.live.com",
      "hotmail.com"
    ]
  };

  for (const category in knownSites) {
    if (domainMatches(normalizedDomain, knownSites[category])) {
      return {
        category,
        source: "known_site"
      };
    }
  }

  const ecommerceDomainWords = [
    "shop",
    "store",
    "boutique",
    "market",
    "outlet",
    "shopping",
    "fashion",
    "sneakers",
    "chaussures",
    "mode",
    "meubles",
    "mobilier"
  ];

  if (ecommerceDomainWords.some((word) => normalizedDomain.includes(word))) {
    return {
      category: "E-commerce",
      source: "domain_keyword"
    };
  }

  const urlKeywords = {
    "E-commerce": [
      "shop",
      "store",
      "boutique",
      "cart",
      "checkout",
      "panier",
      "produit",
      "promo",
      "soldes",
      "livraison",
      "commande",
      "paiement",
      "collection",
      "sneakers",
      "chaussures",
      "meuble",
      "mobilier"
    ],

    Productif: [
      "docs",
      "learn",
      "course",
      "cours",
      "formation",
      "developer",
      "academy",
      "tutorial",
      "documentation"
    ],

    Distraction: [
      "video",
      "streaming",
      "reels",
      "shorts",
      "gaming",
      "music",
      "playlist"
    ]
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
        "meubles",
        "mobilier",
        "retour gratuit",
        "mon compte",
        "saisir le code postal",
        "choisir un magasin"
      ],

      Productif: [
        "documentation",
        "cours",
        "formation",
        "apprendre",
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