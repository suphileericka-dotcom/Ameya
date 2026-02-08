import multer from "multer";
import { Request } from "express";
import path from "path";
import fs from "fs";

/* =====================================================
   UTILS
===================================================== */

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/* =====================================================
   AVATAR UPLOAD
===================================================== */

const avatarDir = path.resolve(__dirname, "../../uploads/avatars");
ensureDir(avatarDir);

const avatarStorage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ): void => {
    cb(null, avatarDir);
  },

  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ): void => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const filename = `avatar-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}${ext}`;
    cb(null, filename);
  },
});

function avatarFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void
): void {
  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (!allowed.includes(file.mimetype)) {
    cb(new Error("Format image non supporté"), false);
    return;
  }

  cb(null, true);
}

export const uploadAvatarMulter = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
  },
});

/* =====================================================
   VOICE UPLOAD (TEMPORAIRE)
===================================================== */

const voiceTmpDir = path.resolve(__dirname, "../../tmp/voice");
ensureDir(voiceTmpDir);

const voiceStorage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ): void => {
    cb(null, voiceTmpDir);
  },

  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ): void => {
    const ext =
      path.extname(file.originalname).toLowerCase() || ".webm";

    const filename = `voice-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}${ext}`;

    cb(null, filename);
  },
});

function voiceFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void
): void {
  const allowed = [
    "audio/webm",
    "audio/wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/ogg",
  ];

  if (!allowed.includes(file.mimetype)) {
    cb(new Error("Format audio non supporté"), false);
    return;
  }

  cb(null, true);
}

export const uploadVoiceMulter = multer({
  storage: voiceStorage,
  fileFilter: voiceFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max (voix)
  },
});
