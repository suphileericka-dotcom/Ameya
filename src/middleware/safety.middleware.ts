import { Request, Response, NextFunction } from "express";

/**
 * Middleware de sécurité mentale
 * - Détecte des mots à risque
 * - Bloque la requête si danger explicite
 */
export function detectDanger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const text: string =
    typeof req.body?.body === "string" ? req.body.body.toLowerCase() : "";

  const dangerWords = [
    "suicide",
    "me tuer",
    "plus envie de vivre",
  ];

  const detected = dangerWords.some((w) => text.includes(w));

  if (detected) {
    return res.status(403).json({
      error: "Contenu sensible détecté",
      help:
        "Tu n’es pas seul. Si tu te sens en danger, contacte un proche ou une ligne d’aide.",
    });
  }

  next();
}
