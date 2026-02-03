import multer from "multer";
import { Request } from "express";
import path from "path";
import fs from "fs";

/**
 * Dossier d'upload (DOIT être défini AVANT utilisation)
 */
const uploadDir = path.resolve(__dirname, "../../uploads/avatars");
fs.mkdirSync(uploadDir, { recursive: true });

/**
 *  Storage Multer
 */
const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, uploadDir);
  },

  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const filename = `avatar-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}${ext}`;
    cb(null, filename);
  },
});

/**
 * Filtre fichiers 
 */
function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void
) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (!allowed.includes(file.mimetype)) {
    cb(new Error("Format image non supporté"), false);
    return;
  }

  cb(null, true);
}

/**
 *  Middleware final
 */
export const uploadAvatarMulter = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
  },
});
