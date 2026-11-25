import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMsg, get } from "../../lib/api";
import { ProgressBar } from "../../components/ui";
import { STARS_PER_LESSON } from "../../lib/subjects";

const PARTS = 4;

export default function Lesson() {
  const { id } = useParams();
  const qc = useQueryClient();

  const lesson = useQuery({ queryKey: ["lesson", id], queryFn: () => get(`/lessons/${id}`) });
  const progress = useQuery({ queryKey: ["progress"], queryFn: () => get("/my/progress") });

  const pct = Number(progress.data?.find((l) => String(l.lesson_id) === id)?.completion_pct ?? 0);
  const doneParts = Math.min(PARTS, Math.floor(pct / (100 / PARTS)));
  const finished = pct >= 100;

  const save = useMutation({
    mutationFn: (value) => api.put(`/my/progress/${id}`, { completion_pct: value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["levels"] });
      qc.invalidateQueries({ queryKey: ["stars"] });
    },
  });

  const won = save.data?.data?.stars_earned ?? 0;

  if (lesson.isError) {
    return (
      <div className="kid-card p-6">
        <p className="mb-4 text-lg font-bold">{errMsg(lesson.error)}</p>
        <Link to="/student" className="kid-pill inline-block px-4 py-2">
          ← Go back
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link to="/student" className="kid-pill mb-4 inline-block px-4 py-2">
        ← Go back
      </Link>
      <section className="kid-card p-6">
        <p className="font-bold">
          {lesson.data?.subject ? `${lesson.data.subject} · ` : ""}Level {lesson.data?.level_no}
        </p>
        <h1 className="mb-2 text-3xl font-extrabold">{lesson.data?.title ?? "…"}</h1>
        <p className="mb-6 text-lg font-semibold">{lesson.data?.description}</p>

        <ProgressBar value={pct} />
        <p className="mb-6 mt-2 font-bold">
          {finished ? "Lesson complete! 🎉" : `Part ${doneParts + 1} of ${PARTS} · finish the lesson for ⭐ ${STARS_PER_LESSON}`}
        </p>

        {won > 0 && (
          <p role="status" className="mb-6 rounded-2xl bg-amber-200 p-4 text-2xl font-extrabold" style={{ color: "#2b2b2b" }}>
            ⭐ You won {won} stars!
          </p>
        )}

        {finished ? (
          <div className="flex flex-wrap gap-3">
            <Link to="/student" className="kid-pill inline-block bg-emerald-200 px-6 py-3 text-lg" style={{ color: "#2b2b2b" }}>
              Pick another lesson
            </Link>
            <Link to="/student/shop" className="kid-pill inline-block bg-amber-200 px-6 py-3 text-lg" style={{ color: "#2b2b2b" }}>
              Visit the avatar shop
            </Link>
          </div>
        ) : (
          <button
            className="kid-pill bg-emerald-200 px-6 py-3 text-lg disabled:opacity-60"
            style={{ color: "#2b2b2b" }}
            disabled={save.isPending}
            onClick={() => save.mutate(Math.min(100, (doneParts + 1) * (100 / PARTS)))}
          >
            {save.isPending ? "Saving…" : "I finished this part"}
          </button>
        )}
        {save.isError && <p role="alert" className="mt-3 font-bold">{errMsg(save.error)}</p>}
      </section>
    </>
  );
}
