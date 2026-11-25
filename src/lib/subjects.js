// The five Grade 1 learning areas from the curriculum (and the subject cards on the Figma board)
export const SUBJECTS = [
  { name: "Language", slug: "language", icon: "💬", bg: "#d6ecfb" },
  { name: "Reading & Literacy", slug: "reading-literacy", icon: "📖", bg: "#d8f3e0" },
  { name: "Mathematics", slug: "mathematics", icon: "🔢", bg: "#fdf0b8" },
  { name: "GMRC", slug: "gmrc", icon: "❤️", bg: "#fbd9e2" },
  { name: "Makabansa", slug: "makabansa", icon: "🇵🇭", bg: "#e4e4e4" },
];

export const SUBJECT_NAMES = SUBJECTS.map((s) => s.name);
export const STARS_PER_LESSON = 5;
