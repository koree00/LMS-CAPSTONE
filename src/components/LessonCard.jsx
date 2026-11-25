import { Link } from "react-router-dom";
import { ProgressBar } from "./ui";
import { STARS_PER_LESSON } from "../lib/subjects";

export default function LessonCard({ lesson, look }) {
  const pct = Number(lesson.completion_pct);
  return (
    <Link
      to={`/student/lessons/${lesson.lesson_id}`}
      className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center shadow-sm"
      style={{ background: look.bg, color: "#2b2b2b" }}
    >
      <span className="text-4xl" aria-hidden="true">
        {look.icon}
      </span>
      <span className="text-sm font-extrabold">{lesson.title}</span>
      <span className="text-xs font-bold">Level {lesson.level_no}</span>
      <div className="w-full">
        <ProgressBar value={pct} />
      </div>
      <span className="text-xs font-bold">{pct >= 100 ? "Done! ⭐" : `${pct}% · finish for ⭐ ${STARS_PER_LESSON}`}</span>
    </Link>
  );
}
