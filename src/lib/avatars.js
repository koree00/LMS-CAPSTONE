// The API sends an image_key; we map it to an emoji until real artwork exists
export const AVATAR_EMOJI = {
  fox: "🦊",
  panda: "🐼",
  owl: "🦉",
  bunny: "🐰",
  turtle: "🐢",
  lion: "🦁",
};
export const avatarOf = (key) => AVATAR_EMOJI[key] ?? "🐾";
