import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../lib/api";
import LessonCard from "../../components/LessonCard";
import { SUBJECTS } from "../../lib/subjects";

export default function SubjectLessons() {
  const { slug } = useParams();
  const subject = SUBJECTS.find((s) => s.slug === slug);
  const progress = useQuery({ queryKey: ["progress"], queryFn: () => get("/my/progress") });

  const lessons = (progress.data ?? []).filter((l) => l.subject === subject?.name);

  return (
    <>
      <Link to="/student" className="kid-pill mb-4 inline-block px-4 py-2">
        ← Go back
      </Link>
      <h1 className="mb-4 flex items-center gap-3 text-3xl font-extrabold">
        <span aria-hidden="true">{subject?.icon}</span> {subject?.name ?? "Subject"}
      </h1>
      {!subject ? (
        <p className="kid-card p-5 font-bold">We couldn’t find that subject.</p>
      ) : progress.isLoading ? (
        <p className="font-bold">Loading your lessons…</p>
      ) : lessons.length === 0 ? (
        <p className="kid-card p-5 font-bold">No {subject.name} lessons are open yet. Ask your teacher!</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {lessons.map((l) => (
            <LessonCard key={l.lesson_id} lesson={l} look={subject} />
          ))}
        </div>
      )}
    </>
  );
}
