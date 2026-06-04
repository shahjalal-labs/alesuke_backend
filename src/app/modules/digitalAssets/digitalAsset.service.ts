import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiErrors';
import prisma from '../../../shared/prisma';
import { IUpdateDigitalAssets } from './digitalAsset.interface';

// Get user's digital assets (create default if doesn't exist)
const getDigitalAssets = async (userId: string) => {
  let assets = await prisma.userDigitalAssets.findUnique({
    where: { userId },
  });

  // If no record exists, return default (all false)
  if (!assets) {
    return {
      hasNetflix: false,
      hasDisneyPlus: false,
      hasPrimeVideo: false,
      hasViu: false,
      hasAppleTVPlus: false,
      hasSpotify: false,
      hasYouTubePremium: false,
      hasAudible: false,
      hasICloud: false,
      hasGoogleDrive: false,
      hasOneDrive: false,
      hasGrab: false,
      hasFoodpanda: false,
      hasBrokerageETF: false,
      brokerageDetails: null,
    };
  }

  return assets;
};

// Create or update user's digital assets
const updateDigitalAssets = async (userId: string, payload: IUpdateDigitalAssets) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  const assets = await prisma.userDigitalAssets.upsert({
    where: { userId },
    create: {
      userId,
      ...payload,
    },
    update: {
      ...payload,
    },
  });

  // Get summary of enabled platforms
  const enabledPlatforms = getEnabledPlatforms(assets);

  return {
    ...assets,
    enabledPlatforms,
    totalEnabled: enabledPlatforms.length,
  };
};

// Helper: Get list of enabled platform names
const getEnabledPlatforms = (assets: any) => {
  const platformMap: Record<string, string> = {
    hasNetflix: 'Netflix',
    hasDisneyPlus: 'Disney+',
    hasPrimeVideo: 'Prime Video',
    hasViu: 'Viu',
    hasAppleTVPlus: 'Apple TV+',
    hasSpotify: 'Spotify',
    hasYouTubePremium: 'YouTube Premium',
    hasAudible: 'Audible',
    hasICloud: 'iCloud',
    hasGoogleDrive: 'Google Drive',
    hasOneDrive: 'One Drive',
    hasGrab: 'Grab',
    hasFoodpanda: 'Foodpanda',
    hasBrokerageETF: 'Brokerage/ETF Platforms',
  };

  return Object.entries(platformMap)
    .filter(([key]) => assets[key] === true)
    .map(([_, name]) => name);
};

export const DigitalAssetServices = {
  getDigitalAssets,
  updateDigitalAssets,
};