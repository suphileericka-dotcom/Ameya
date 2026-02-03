import fs from "fs";
import path from "path";
import crypto from "crypto";
import { openai } from "../config/openai";
import { safeUnlink } from "../utils/fsSafe";

/**
 * Résultat retourné après anonymisation
 */
type AnonymizeVoiceResult = {
  transcript: string;
  aiAudioUrl: string;
  aiAudioPath: string; // ex: /uploads/ai/xxx.mp3
};

/**
 * Crée un dossier s'il n'existe pas
 */
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Génère un id aléatoire
 */
function randomId() {
  return crypto.randomBytes(10).toString("hex");
}

/**
 * Pipeline COMPLET d'anonymisation vocale
 * - STT (Whisper)
 * - suppression audio humain
 * - TTS voix IA neutre
 */
export async function anonymizeVoice(
  filePath: string
): Promise<AnonymizeVoiceResult> {
  const baseUrl = process.env.BASE_URL || "http://localhost:8000";

  /* =====================================================
     1) TRANSCRIPTION (STT)
  ===================================================== */

  const fileStream = fs.createReadStream(filePath);

  const transcription = await openai.audio.transcriptions.create({
    file: fileStream as any, // SDK OpenAI attend un File-like
    model: "whisper-1",
  });

  const transcript: string =
    (transcription as any)?.text?.trim() || "";

  /* =====================================================
     2) SUPPRESSION AUDIO HUMAIN (ANONYMAT)
  ===================================================== */

  safeUnlink(filePath);

  /* =====================================================
     3) NORMALISATION TEXTE (TTS SAFE)
     ⚠️ le TTS n'accepte pas une string vide
  ===================================================== */

  const cleanText =
    transcript && transcript.length > 0
      ? transcript
      : " ";

  /* =====================================================
     4) SYNTHÈSE VOCALE IA (TTS)
     - PAS de format explicite
     - SDK retourne un ArrayBuffer
  ===================================================== */

  const aiDir = path.join(process.cwd(), "uploads", "ai");
  ensureDir(aiDir);

  const outName = `ai-${Date.now()}-${randomId()}.mp3`;
  const outFullPath = path.join(aiDir, outName);

  const speech = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy", // voix neutre standard (recommandée)
    input: cleanText,
  });

  // conversion ArrayBuffer → Buffer Node
  const buffer = Buffer.from(
    await (speech as any).arrayBuffer()
  );

  fs.writeFileSync(outFullPath, buffer);

  /* =====================================================
     5) URL PUBLIQUE
  ===================================================== */

  const aiAudioPath = `/uploads/ai/${outName}`;
  const aiAudioUrl = `${baseUrl}${aiAudioPath}`;

  return {
    transcript: cleanText,
    aiAudioUrl,
    aiAudioPath,
  };
}
