/* ——————————————————— CONFIG ——————————————————— */
export const CONFIG = {
  pcTargetWidth: 0.34,
  mouseTargetLength: 0.12,
  gapRatio: 0.18,
  mouseForwardRatio: 0.18,
  mouseYawDeg: 164,
  cameraPadding: 2.4,
  verticalFocus: 0.04,
  maxYaw: 0.22,
  maxPitch: 0.10,
  maxDolly: 0.05,
  followSpeed: 5.5,
  baseTiltDeg: +6,
  pcLidCloseAngleDeg: 90,
  pcLidAnimDuration: 0.9
};

export const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (prefersReducedMotion) {
  CONFIG.maxYaw = 0;
  CONFIG.maxPitch = 0;
  CONFIG.maxDolly = 0;
}
