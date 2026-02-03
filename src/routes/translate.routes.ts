import express from "express";
import { translateText } from "../utils/translate";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { text, target } = req.body;

    if (typeof text !== "string" || typeof target !== "string") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const translatedText = await translateText(text, target);
    res.json({ translatedText });
  } catch (err) {
    console.error("TRANSLATE ERROR:", err);
    res.status(500).json({ error: "Translation failed" });
  }
});

export default router;
