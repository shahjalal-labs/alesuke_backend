import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { profileValidation } from "./user.validation";
import { ProfileController } from "./user.controller";
import { parseBody } from "../../middlewares/parseBody";
import { fileUploader2 } from "../../../helpars/fileUploadDoulbe";


const router = express.Router();

// Update user profile (religion, name, nickname, marital status, etc.)
router.put(
  "/",
  fileUploader2.profileImage, // Use the fileUploader middleware to handle profile image upload
  parseBody,
  auth(),
  validateRequest(profileValidation.updateProfileValidationSchema),
  ProfileController.updateProfile
);

router.post(
  "/address",
  auth(),
  validateRequest(profileValidation.addAddressValidationSchema),
  ProfileController.addAddress
);

// Update address
router.put(
  "/address/:id",
  auth(),
  validateRequest(profileValidation.updateAddressValidationSchema),
  ProfileController.updateAddress
);

// Get user profile
router.get(
  "/",
  auth(),
  ProfileController.getProfile
);

// Add a new person (spouse, partner, child, pet)
router.post(
  "/people",
  auth(),
  validateRequest(profileValidation.addPersonValidationSchema),
  ProfileController.addPerson
);

// Get all people for the user
router.get(
  "/people",
  auth(),
  ProfileController.getPeople
);

// Get people by relation type
router.get(
  "/people/:relationType",
  auth(),
  ProfileController.getPeopleByType
);

// Update a person
router.put(
  "/people/:id",
  auth(),
  validateRequest(profileValidation.updatePersonValidationSchema),
  ProfileController.updatePerson
);

// Delete a person
router.delete(
  "/people/:id",
  auth(),
  ProfileController.deletePerson
);

router.post(
  "/selected",
  auth(),
  // validateRequest(profileValidation.addSelectedPeopleValidationSchema),
  ProfileController.addSelectedPeople
)

// Update selected people to show
router.put(
  "/selected/:id",
  auth(),
  // validateRequest(profileValidation.updateSelectedPeopleValidationSchema),
  ProfileController.updateSelectedPeople
);

// Get selected people to show
router.get(
  "/selected",
  auth(),
  ProfileController.getSelectedPeopleToShow
);


export const ProfileRoutes = router;