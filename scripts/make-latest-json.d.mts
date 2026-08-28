export interface ReleaseEnvironment {
  MONARCH_VERSION?: string;
  MONARCH_RELEASE_URL?: string;
  MONARCH_SIGNATURE?: string;
  MONARCH_NOTES?: string;
  [key: string]: string | undefined;
}

export interface LatestMetadata {
  version: string;
  notes: string;
  pub_date: string;
  platforms: {
    "windows-x86_64": {
      signature: string;
      url: string;
    };
  };
}

export function createLatestMetadata(
  env: ReleaseEnvironment,
  now?: Date,
): LatestMetadata;

export function writeLatestJson(
  env: ReleaseEnvironment,
  outputPath?: string,
  now?: Date,
): LatestMetadata;
