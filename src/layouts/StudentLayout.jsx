import { useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "../lib/api";
import { avatarOf } from "../lib/avatars";
import AvatarFace from "../components/AvatarFace";

const DEFAULTS = { reduced_motion: false, sound: true, high_contrast: false, text_size: "medium", theme: "calm" };

// Applies the student's sensory preferences to the whole page
export function applyPrefs(p = DEFAULTS) {
  const root = document.documentElement;
  root.dataset.theme = p.theme;
  root.dataset.text = p.text_size;
  root.dataset.contrast = p.high_contrast ? "high" : "normal";
  root.dataset.motion = p.reduced_motion ? "reduced" : "normal";
}

export default function StudentLayout() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => get("/my/profile") });
  const stars = useQuery({ queryKey: ["stars"], queryFn: () => get("/my/coins") });

  useEffect(() => {
    if (profile.data) applyPrefs(profile.data.sensory_preferences);
  }, [profile.data]);

  // Reset the page when the student leaves (for example, on logout)
  useEffect(
    () => () => {
      const root = document.documentElement;
      ["theme", "text", "contrast", "motion"].forEach((k) => delete root.dataset[k]);
    },
    []
  );

  const p = profile.data;
  const balance = stars.data?.balance ?? 0;

  return (
    <div className="kid">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
        <Link to="/student" className="kid-pill px-4 py-2 text-sm">
          EduQuest AI
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/student/avatar"
            aria-label="Change your name and avatar"
            className="kid-pill flex items-center gap-2 py-1 pl-1 pr-4 text-lg"
            style={{ border: "2px solid currentColor" }}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600">
              <AvatarFace animal={avatarOf(p?.avatar?.image_key)} item={p?.equipped?.emoji} size={38} />
            </span>
            {p?.nickname ?? "…"}
            <span aria-hidden="true">✏️</span>
          </Link>
          <Link
            to="/student/shop"
            className="kid-pill px-5 py-2 text-lg"
            style={{ background: "#f0d078", color: "#2b2b2b" }}
            aria-label={`${balance} stars. Open the avatar shop`}
          >
            ⭐ {balance} {balance === 1 ? "Star" : "Stars"}
          </Link>
          <Link
            to="/student/settings"
            className="kid-pill flex h-11 w-11 items-center justify-center text-lg"
            style={{ background: "#d9d9d9", color: "#2b2b2b" }}
            aria-label="Settings"
          >
            ⚙️
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
