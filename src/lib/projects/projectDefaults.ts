import { getPlatformProfile, type LengthType, type PlatformId } from "../platforms/platformProfiles.ts";

const targetWordCounts: Record<LengthType, number> = {
  short_10k: 10000,
  mid_50k: 60000,
  long_300k_plus: 300000,
  mega_1m_plus: 1000000,
};

interface ProjectDefaultsInput {
  platformId: PlatformId;
  lengthType?: LengthType;
}

export function buildProjectDefaults(input: ProjectDefaultsInput) {
  const profile = getPlatformProfile(input.platformId);
  const targetLengthType = input.lengthType ?? profile.defaultLengthType;

  return {
    targetLengthType,
    targetWordCount: targetWordCounts[targetLengthType],
  };
}

