import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMsg, get } from "../../lib/api";

export default function Shop() {
  const qc = useQueryClient();
  const items = useQuery({ queryKey: ["rewards"], queryFn: () => get("/rewards") });
  const stars = useQuery({ queryKey: ["stars"], queryFn: () => get("/my/coins") });
  const balance = stars.data?.balance ?? 0;

  const buy = useMutation({
    mutationFn: (id) => api.post(`/rewards/${id}/claim`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["stars"] });
      qc.invalidateQueries({ queryKey: ["my-rewards"] });
    },
  });

  return (
    <>
      <Link to="/student" className="kid-pill mb-4 inline-block px-4 py-2">
        ← Go back
      </Link>
      <h1 className="mb-1 text-3xl font-extrabold">Avatar shop</h1>
      <p className="mb-5 text-lg font-bold">You have ⭐ {balance} {balance === 1 ? "star" : "stars"}</p>
      {buy.isError && <p role="alert" className="kid-card mb-4 p-4 font-bold">{errMsg(buy.error)}</p>}
      {buy.isSuccess && (
        <p role="status" className="kid-card mb-4 p-4 font-bold">
          {buy.data.data.message} Wear it on the{" "}
          <Link to="/student/avatar" className="underline">
            avatar page
          </Link>
          .
        </p>
      )}

      {items.isLoading ? (
        <p className="font-bold">Loading…</p>
      ) : items.data?.length === 0 ? (
        <p className="kid-card p-5 font-bold">The shop is empty right now. Check back soon!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.data?.map((r) => {
            const owned = !!r.owned;
            const missing = r.cost_coins - balance;
            return (
              <div key={r.reward_id} className="kid-card flex flex-col items-center gap-2 p-5 text-center">
                <span className="text-6xl" aria-hidden="true">
                  {r.emoji || "🎁"}
                </span>
                <h2 className="text-xl font-extrabold">{r.reward_name}</h2>
                {r.description && <p className="font-semibold">{r.description}</p>}
                <p className="font-extrabold">⭐ {r.cost_coins}</p>
                <button
                  className="kid-pill bg-emerald-200 px-4 py-2 disabled:opacity-60"
                  style={{ color: "#2b2b2b" }}
                  disabled={owned || missing > 0 || buy.isPending}
                  onClick={() => buy.mutate(r.reward_id)}
                >
                  {owned ? "You have this" : missing > 0 ? `Need ${missing} more ${missing === 1 ? "star" : "stars"}` : "Buy"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
