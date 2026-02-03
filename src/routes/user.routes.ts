import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  me,
  updateProfile,
  updateLanguage,
  updateTheme,
  changePassword,
  uploadAvatar,
} from "../controllers/user.controller";
import { uploadAvatarMulter } from "../middleware/upload.middleware";

const router = Router();

/**
 * =====================
 * PROFIL
 * =====================
 */

// infos utilisateur connecté
router.get("/me", requireAuth, me);

// modifier username / email
router.put("/me", requireAuth, updateProfile);

/**
 * =====================
 * PRÉFÉRENCES
 * =====================
 */

// langue
router.put("/me/language", requireAuth, updateLanguage);

// thème clair / sombre
router.put("/me/theme", requireAuth, updateTheme);

/**
 * =====================
 * SÉCURITÉ
 * =====================
 */

// changer mot de passe
router.put("/me/password", requireAuth, changePassword);

/**
 * =====================
 * AVATAR
 * =====================
 */

// upload photo de profil
router.post(
  "/me/avatar",
  requireAuth,
  uploadAvatarMulter.single("avatar"),
  uploadAvatar
);

export default router;
