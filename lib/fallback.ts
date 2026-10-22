/** Shared by server + client: why a result was recorded instead of live, and which YouCam errors the user can fix. */
export type AnyFeature = "skin-analysis" | "skin-tone-analysis" | "makeup-vto" | "skin-simulation";

export type FallbackReason = "credits" | "api-error" | "rate-limit" | "timeout";
export const FALLBACK_MESSAGE: Record<FallbackReason, string> = {
  credits: "Live YouCam credits exhausted — showing a recorded result.",
  "api-error": "The live YouCam API didn't respond as expected — showing a recorded result.",
  "rate-limit": "Daily live-analysis limit reached for this device — showing a recorded result.",
  timeout: "The live YouCam API took too long — showing a recorded result.",
};

/** Minimum short side in px per feature (YouCam docs: SD skin analysis + simulation 480; tone and VTO reject < 320). */
const MIN_SHORT: Record<AnyFeature, number> = { "skin-analysis": 480, "skin-simulation": 480, "skin-tone-analysis": 320, "makeup-vto": 320 };
export const minShortSide = (f: AnyFeature) => MIN_SHORT[f];

/**
 * YouCam task errors caused by the photo itself (from the Skin Analysis, Skin Tone, Makeup VTO and Skin Simulation
 * error tables). The user can fix these, so we ask for a retake instead of silently swapping in a recorded result.
 * Families are matched by prefix (e.g. error_face_angle_upward, error_src_face_too_small_cr_*).
 */
const PHOTO_EXACT = new Set([
  "error_no_face", "error_pose", "error_lighting_dark", "error_below_min_image_size", "error_exceed_max_image_size",
  "error_face_not_forward_facing", "error_multiple_faces", "error_nsfw_content_detected", "error_face_parsing",
]);
const PHOTO_PREFIX = ["error_src_face_", "error_face_angle_", "error_face_position_"];
export function isPhotoError(code?: string | null) {
  if (!code) return false;
  return PHOTO_EXACT.has(code) || PHOTO_PREFIX.some((p) => code.startsWith(p));
}

/** Plain-English, directional advice for a YouCam error code. */
export function friendlyError(code?: string, feature: AnyFeature = "skin-analysis", msg?: string) {
  const min = MIN_SHORT[feature];
  const map: Record<string, string> = {
    error_src_face_too_small: "Your face is too small in the frame — move closer so it fills the oval.",
    error_face_position_too_small: "Your face is too small in the frame — move closer so it fills the oval.",
    error_src_face_out_of_bound: "Part of your face is outside the frame — centre it in the oval.",
    error_face_position_out_of_boundary: "Part of your face is outside the frame — centre it in the oval.",
    error_face_position_invalid: "Centre your face in the frame, filling about 70% of its width.",
    error_lighting_dark: "It's too dark — face a window or a soft light.",
    error_no_face: "We couldn't find a face. Look straight at the camera with your whole face visible.",
    error_pose: "Look straight ahead — head level, not tilted.",
    error_face_not_forward_facing: "Face the camera straight on, both ears equally visible.",
    error_face_angle_upward: "Your head is tilted up — bring your chin down slightly.",
    error_face_angle_downward: "Your head is tilted down — lift your chin slightly.",
    error_face_angle_leftward: "Your head is turned to one side — turn back to face the camera.",
    error_face_angle_rightward: "Your head is turned to one side — turn back to face the camera.",
    error_face_angle_left_tilt: "Your head is tilted sideways — keep it level.",
    error_face_angle_right_tilt: "Your head is tilted sideways — keep it level.",
    error_face_angle_invalid: "Look straight at the camera, head level.",
    error_below_min_image_size: `That photo is too small (needs at least ${min}px on its short side). Take a new photo or upload a larger one.`,
    error_exceed_max_image_size: "That photo is too large (max 4096px on the long side). Try another photo.",
    error_multiple_faces: "There's more than one face in the photo — only you, please.",
    error_nsfw_content_detected: "That photo couldn't be processed. Try a plain, well-lit selfie.",
    error_face_parsing: "We couldn't read your facial features clearly — remove glasses, hair from the face, and retake.",
  };
  if (code && map[code]) return map[code];
  if (code?.startsWith("error_src_face_too_small")) return map.error_src_face_too_small;
  if (code?.startsWith("error_face_angle_")) return map.error_face_angle_invalid;
  if (code?.startsWith("error_face_position_")) return map.error_face_position_invalid;
  return msg || code || "Analysis failed";
}
