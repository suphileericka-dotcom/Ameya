import { Request, Response } from "express";
import { anonymizeVoice } from "../services/voice.service";

export async function anonymizeVoiceController(req: Request, res: Response) {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ error: "Missing audio file" });
    }

    const result = await anonymizeVoice(req.file.path);

    // Tu peux ici enregistrer en DB si tu veux (transcript, aiAudioPath, createdAt, room, userId…)
    // -> je te le ferai quand tu m’enverras le schéma

    return res.json({
      transcript: result.transcript,
      audioUrl: result.aiAudioUrl,
      audioPath: result.aiAudioPath,
    });
  } catch (err) {
    console.error("VOICE ANONYMIZE ERROR:", err);
    return res.status(500).json({ error: "Voice anonymization failed" });
  }
}
