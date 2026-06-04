import { z } from "zod";

const updateDigitalAssetsValidationSchema = z.object({
  body: z.object({
    hasNetflix: z.boolean().optional(),
    hasDisneyPlus: z.boolean().optional(),
    hasPrimeVideo: z.boolean().optional(),
    hasViu: z.boolean().optional(),
    hasAppleTVPlus: z.boolean().optional(),
    hasSpotify: z.boolean().optional(),
    hasYouTubePremium: z.boolean().optional(),
    hasAudible: z.boolean().optional(),
    hasICloud: z.boolean().optional(),
    hasGoogleDrive: z.boolean().optional(),
    hasOneDrive: z.boolean().optional(),
    hasGrab: z.boolean().optional(),
    hasFoodpanda: z.boolean().optional(),
    hasBrokerageETF: z.boolean().optional(),
    brokerageDetails: z.string().optional(),
  }),
});

export const digitalAssetValidation = {
  updateDigitalAssetsValidationSchema,
};