import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../lib/api";
import LessonCard from "../../components/LessonCard";
import { STARS_PER_LESSON, SUBJECTS } from "../../lib/subjects";
import { weekPlan } from "../../lib/week";

export default function Week() {
  const [params] = useSearchParams();
  const progress = useQuery({ queryKey: ["progress"], queryFn: () => get("/my/progress") });

  const plan = weekPlan(progress.data);
  const current = plan.days.find((d) => d.state === "current");
  const wanted = Number(params.get("day")) || current?.n || 1;
  const day = plan.days.find((d) => d.n === wanted) ?? plan.days[0];

  return (
    <>
      <Link to="/student" className="kid-pill mb-4 inline-block px-4 py-2">
        ← Go back
      </Link>
      <h1 className="text-3xl font-extrabold">Day {day.n}</h1>
      <p className="mb-4 text-lg font-bold">
        Level {plan.level} · Finish a lesson to win ⭐ {STARS_PER_LESSON} stars!
      </p>

      <nav aria-label="Days" className="mb-6 flex flex-wrap gap-2">
        {plan.days.map((d) => {
          const open = d.state !== "locked";
          const style = { background: d.n === day.n ? "#a7e3b5" : "var(--kid-card)", color: d.n === day.n ? "#2b2b2b" : undefined };
          return open ? (
            <Link key={d.n} to={`/student/week?day=${d.n}`} className="kid-pill px-4 py-2" style={style}>
              Day {d.n} {d.state === "done" ? "✓" : ""}
            </Link>
          ) : (
            <span key={d.n} className="kid-pill px-4 py-2 opacity-60" aria-label={`Day ${d.n}, locked`}>
              Day {d.n}
            </span>
          );
        })}
      </nav>

      {progress.isLoading ? (
        <p className="font-bold">Loading your lessons…</p>
      ) : day.state === "locked" ? (
        <p className="kid-card p-5 font-bold">
          Your teacher hasn’t opened Day {day.n} yet.{current ? ` Try Day ${current.n}!` : ""}
        </p>
      ) : (
        <>
          {day.state === "done" && <p className="kid-card mb-4 p-4 text-lg font-extrabold">Day {day.n} is finished! ⭐</p>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {day.items.map((l, i) => (
              <LessonCard
                key={l.lesson_id}
                lesson={l}
                look={SUBJECTS.find((s) => s.name === l.subject) ?? SUBJECTS[i % SUBJECTS.length]}
              />
            ))}
          </div>
          {plan.finished && <p className="kid-card mt-6 p-4 text-lg font-extrabold">You finished every lesson. Amazing! 🎉</p>}
        </>
      )}
    </>
  );
}
