import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { DigitalAssetController } from "./digitalAsset.controller";
import { digitalAssetValidation } from "./digitalAsset.validation";

const router = express.Router();

// Get user's digital assets (single record)
router.get(
  "/",
  auth(),
  DigitalAssetController.getDigitalAssets
);

// Update user's digital assets (create or update)
router.put(
  "/",
  auth(),
  validateRequest(digitalAssetValidation.updateDigitalAssetsValidationSchema),
  DigitalAssetController.updateDigitalAssets
);

export const DigitalAssetRoutes = router;