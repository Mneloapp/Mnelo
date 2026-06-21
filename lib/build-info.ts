export function getBuildInfo() {
  return {
    branch: process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH || "unknown",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_COMMIT || "local",
    deploymentUrl: process.env.VERCEL_URL || "local",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
  };
}
