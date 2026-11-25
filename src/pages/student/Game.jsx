import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMsg, get } from "../../lib/api";

const QUESTIONS = 5;

function makeQuestions() {
  return Array.from({ length: QUESTIONS }, () => {
    const a = 1 + Math.floor(Math.random() * 9);
    const b = 1 + Math.floor(Math.random() * 9);
    const answer = a + b;
    const options = new Set([answer]);
    while (options.size < 3) {
      const o = answer + Math.floor(Math.random() * 5) - 2;
      if (o > 0) options.add(o);
    }
    return { a, b, answer, options: [...options].sort(() => Math.random() - 0.5) };
  });
}

export default function Game() {
  const qc = useQueryClient();
  const game = useQuery({ queryKey: ["game"], queryFn: () => get("/my/game") });

  const [questions, setQuestions] = useState(makeQuestions);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState(null);

  const submit = useMutation({
    mutationFn: (score) => api.post("/my/game/attempts", { score }),
    onSuccess: (res) => {
      setResult(res.data);
      qc.invalidateQueries({ queryKey: ["stars"] });
      qc.invalidateQueries({ queryKey: ["game"] });
    },
  });

  const pick = (value) => {
    const right = value === questions[index].answer ? 1 : 0;
    const total = correct + right;
    setCorrect(total);
    if (index + 1 < QUESTIONS) setIndex(index + 1);
    else submit.mutate(total * (100 / QUESTIONS));
  };

  const again = () => {
    setQuestions(makeQuestions());
    setIndex(0);
    setCorrect(0);
    setResult(null);
    submit.reset();
  };

  const back = (
    <Link to="/student" className="kid-pill mb-4 inline-block px-4 py-2">
      ← Go back
    </Link>
  );

  if (game.isError) {
    const none = game.error.response?.status === 404;
    return (
      <>
        {back}
        <div className="kid-card p-6 text-lg font-bold">
          {none ? "There’s no game this week yet. Check back soon!" : errMsg(game.error)}
        </div>
      </>
    );
  }

  if (result) {
    return (
      <>
        {back}
        <section className="kid-card p-8 text-center">
          <p className="text-5xl" aria-hidden="true">
            {result.score >= 80 ? "🏆" : "⭐"}
          </p>
          <h1 className="my-2 text-3xl font-extrabold">You scored {result.score}!</h1>
          <p className="text-xl font-bold">
            {result.coins_earned > 0 ? `You earned ${result.coins_earned} ${result.coins_earned === 1 ? "star" : "stars"}.` : "No new stars this time. Beat your best score to earn more!"}
          </p>
          <p className="mb-6 font-bold">You now have ⭐ {result.balance} {result.balance === 1 ? "star" : "stars"}.</p>
          <button className="kid-pill bg-emerald-200 px-6 py-3 text-lg" onClick={again}>
            Play again
          </button>
        </section>
      </>
    );
  }

  const q = questions[index];

  return (
    <>
      {back}
      <section className="kid-card p-8 text-center">
        <p className="font-bold">{game.data?.game.title}</p>
        <p className="mb-4 text-sm font-bold opacity-80">Best score so far: {game.data?.best_score ?? 0}</p>
        <p className="mb-2 font-bold">
          Question {index + 1} of {QUESTIONS}
        </p>
        <h1 className="mb-6 text-5xl font-extrabold">
          {q.a} + {q.b} = ?
        </h1>
        <div className="flex flex-wrap justify-center gap-4">
          {q.options.map((o) => (
            <button
              key={o}
              disabled={submit.isPending}
              className="kid-pill min-w-24 bg-amber-200 px-6 py-4 text-3xl"
              style={{ color: "#2b2b2b" }}
              onClick={() => pick(o)}
            >
              {o}
            </button>
          ))}
        </div>
        {submit.isError && <p role="alert" className="mt-4 font-bold">{errMsg(submit.error)}</p>}
      </section>
    </>
  );
}
