import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { errMsg, get } from "../../lib/api";
import { avatarOf } from "../../lib/avatars";
import AvatarFace from "../../components/AvatarFace";
import { ProgressBar } from "../../components/ui";
import { SUBJECTS } from "../../lib/subjects";
import { weekPlan } from "../../lib/week";

const average = (list) => (list.length ? list.reduce((s, l) => s + Number(l.completion_pct), 0) / list.length : 0);

const CIRCLES = {
  done: { background: "#c9484f", color: "#fff", border: "4px solid #c9484f" },
  current: { background: "#f1e9d2", color: "#2b2b2b", border: "4px solid #b9404a" },
  open: { background: "#f1e9d2", color: "#2b2b2b", border: "4px solid #e2d8bd" },
  locked: { background: "#ece4cd", color: "#2b2b2b", border: "4px solid #ddd3b8" },
};

function Day({ day }) {
  const inner = (
    <>
      <span
        className="relative flex h-14 w-14 items-center justify-center rounded-full text-2xl font-extrabold"
        style={CIRCLES[day.state]}
      >
        {day.state === "done" ? "✓" : ""}
        {day.state === "done" && (
          <span className="absolute -bottom-1 -right-1 text-xl" aria-hidden="true">
            ⭐
          </span>
        )}
      </span>
      <span className="text-sm font-extrabold">Day {day.n}</span>
    </>
  );

  if (day.state === "locked") {
    return (
      <span className="flex flex-col items-center gap-1 opacity-80" aria-label={`Day ${day.n}, locked`}>
        {inner}
      </span>
    );
  }

  return (
    <Link
      to={`/student/week?day=${day.n}`}
      className="flex flex-col items-center gap-1"
      aria-label={`Day ${day.n}, ${day.state === "done" ? "finished" : "open"}. See its lessons`}
    >
      {inner}
    </Link>
  );
}

export default function Home() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => get("/my/profile") });
  const progress = useQuery({ queryKey: ["progress"], queryFn: () => get("/my/progress") });

  const lessons = progress.data ?? [];
  const plan = weekPlan(lessons);
  const name = profile.data?.nickname;

  return (
    <>
      <div className="relative mb-8 max-w-md">
        <section className="kid-card p-5 pr-20">
          <h1 className="text-2xl font-extrabold">{name ? `Hello, ${name}!` : "Hello!"}</h1>
          <p className="text-lg font-semibold">Let’s play and learn today!</p>
          {profile.isError && (
            <p role="alert" className="mt-2 text-sm font-bold">
              We couldn’t load your name. {errMsg(profile.error)}
            </p>
          )}
        </section>
        <div className="absolute -bottom-5 right-2">
          <AvatarFace animal={avatarOf(profile.data?.avatar?.image_key)} item={profile.data?.equipped?.emoji} size={64} />
        </div>
      </div>

      <h2 className="sr-only">Subjects</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SUBJECTS.map((s) => {
          const list = lessons.filter((l) => l.subject === s.name);
          return (
            <Link
              key={s.name}
              to={`/student/subjects/${s.slug}`}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center shadow-md"
              style={{ background: s.bg, color: "#2b2b2b", minHeight: 170 }}
            >
              <span className="text-6xl" aria-hidden="true">
                {s.icon}
              </span>
              <span className="text-sm font-extrabold">{s.name}</span>
              {list.length > 0 && (
                <span className="w-full">
                  <ProgressBar value={average(list)} />
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <section
        aria-labelledby="weekly-games"
        className="mt-10 px-6 pb-6 pt-10"
        style={{ background: "var(--kid-tan)", borderRadius: "50% 50% 1.5rem 1.5rem / 2.5rem 2.5rem 1.5rem 1.5rem" }}
      >
        <h2 id="weekly-games" className="sr-only">
          Weekly games
        </h2>
        <div className="flex flex-wrap justify-center gap-6 sm:justify-start sm:pl-6">
          {plan.days.map((d) => (
            <Day key={d.n} day={d} />
          ))}
        </div>
      </section>
    </>
  );
}
