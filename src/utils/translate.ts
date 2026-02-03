/**
 * Traduction via Google Translate (endpoint public)
 * ⚠️ Non officiel, à utiliser avec modération
 */

export async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  // sécurité minimale
  if (!text || typeof text !== "string") {
    return "";
  }

  if (!targetLang || typeof targetLang !== "string") {
    return text;
  }

  const url =
    "https://translate.googleapis.com/translate_a/single" +
    "?client=gtx" +
    "&sl=auto" +
    `&tl=${encodeURIComponent(targetLang)}` +
    "&dt=t" +
    `&q=${encodeURIComponent(text)}`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.warn("⚠️ Google Translate HTTP error:", res.status);
      return text; // fallback → ne casse rien
    }

    const data = (await res.json()) as any;

    // data[0] = tableau des segments traduits
    if (!Array.isArray(data?.[0])) {
      console.warn("⚠️ Google Translate unexpected response");
      return text;
    }

    const translatedText = data[0]
      .map((segment: any) => segment?.[0])
      .filter(Boolean)
      .join("");

    return translatedText || text;
  } catch (err) {
    console.error("❌ Translate error:", err);
    return text; // fallback SAFE
  }
}
