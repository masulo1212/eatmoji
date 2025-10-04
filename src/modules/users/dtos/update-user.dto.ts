import { z } from "zod";
import { UpdateUserSchema } from "../types/user.types";

/**
 * 更新使用者的 DTO
 */
export class UpdateUserDto {
  email?: string;
  displayName?: string | null;
  photoURL?: string | null;
  gender?: string | null;
  age?: number | null;
  height?: number | null;
  initWeight?: number | null;
  targetWeight?: number | null;
  goal?: string | null;
  preferHeightUnit?: string | null;
  preferWeightUnit?: string | null;
  activityLevel?: string | null;
  weightSpeedPerWeek?: number | null;
  targetCalories?: number | null;
  targetProtein?: number | null;
  targetFat?: number | null;
  targetCarb?: number | null;
  bmr?: number | null;
  tdee?: number | null;
  isRecipePublic?: boolean;
  autoCalories?: boolean | null;
  lastLoginAt?: Date;
  lastSyncAt?: Date;
  primarySyncDevice?: string | null;
  primarySyncPlatform?: string | null;
  lastSyncPlatform?: string | null;
  deviceLanguage?: string | null;
  syncDeviceSwitchedAt?: Date;

  constructor(data: UpdateUserDtoType | UpdateUserDto) {
    this.email = data.email;
    this.displayName = data.displayName;
    this.photoURL = data.photoURL;
    this.gender = data.gender;
    this.age = data.age;
    this.height = data.height;
    this.initWeight = data.initWeight;
    this.targetWeight = data.targetWeight;
    this.goal = data.goal;
    this.preferHeightUnit = data.preferHeightUnit;
    this.preferWeightUnit = data.preferWeightUnit;
    this.activityLevel = data.activityLevel;
    this.weightSpeedPerWeek = data.weightSpeedPerWeek;
    this.targetCalories = data.targetCalories;
    this.targetProtein = data.targetProtein;
    this.targetFat = data.targetFat;
    this.targetCarb = data.targetCarb;
    this.bmr = data.bmr;
    this.tdee = data.tdee;
    this.isRecipePublic = data.isRecipePublic;
    this.autoCalories = data.autoCalories;
    this.lastLoginAt = data.lastLoginAt;
    this.lastSyncAt = data.lastSyncAt;
    this.primarySyncDevice = data.primarySyncDevice;
    this.primarySyncPlatform = data.primarySyncPlatform;
    this.lastSyncPlatform = data.lastSyncPlatform;
    this.deviceLanguage = data.deviceLanguage;
    this.syncDeviceSwitchedAt = data.syncDeviceSwitchedAt;
  }
}

/**
 * Zod schema for UpdateUserDto validation
 */
export const UpdateUserDtoSchema = UpdateUserSchema;

/**
 * Type for validated UpdateUserDto
 */
export type UpdateUserDtoType = z.infer<typeof UpdateUserDtoSchema>;