import { Request, Response } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse';
import { DigitalAssetServices } from './digitalAsset.service';
import catchAsync from '../../utils/catchAsync';

const getDigitalAssets = catchAsync(async (req: Request, res: Response) => {
  const result = await DigitalAssetServices.getDigitalAssets(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Digital assets fetched successfully',
    data: result,
  });
});

const updateDigitalAssets = catchAsync(async (req: Request, res: Response) => {
  const result = await DigitalAssetServices.updateDigitalAssets(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Digital assets updated successfully',
    data: result,
  });
});

export const DigitalAssetController = {
  getDigitalAssets,
  updateDigitalAssets,
};