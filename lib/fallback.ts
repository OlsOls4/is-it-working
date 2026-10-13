/** Why a request was served a recorded result instead of a live YouCam call. Shared by server + client. */
export type FallbackReason = "credits" | "api-error" | "rate-limit" | "timeout";
export const FALLBACK_MESSAGE: Record<FallbackReason, string> = {
  credits: "Live YouCam credits exhausted — showing a recorded result.",
  "api-error": "The live YouCam API didn't respond as expected — showing a recorded result.",
  "rate-limit": "Daily live-analysis limit reached for this device — showing a recorded result.",
  timeout: "The live YouCam API took too long — showing a recorded result.",
};
/** YouCam task errors caused by the photo itself: the user can fix these, so we tell them (and offer the recorded result). */
export const PHOTO_ERRORS = [
  "error_src_face_too_small", "error_src_face_out_of_bound", "error_lighting_dark", "error_no_face", "error_pose",
  "error_below_min_image_size", "error_face_position_invalid", "error_face_angle", "error_multiple_faces",
];
