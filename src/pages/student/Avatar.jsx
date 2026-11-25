import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMsg, get } from "../../lib/api";
import { avatarOf } from "../../lib/avatars";

export default function Avatar() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => get("/my/profile") });
  const avatars = useQuery({ queryKey: ["avatars"], queryFn: () => get("/avatars") });
  const [nick, setNick] = useState(null);

  const save = useMutation({
    mutationFn: (changes) => api.patch("/my/profile", changes),
    onSuccess: (res) => qc.setQueryData(["profile"], res.data),
  });

  const name = nick ?? profile.data?.nickname ?? "";
  const current = profile.data?.avatar;

  return (
    <>
      <Link to="/student" className="kid-pill mb-4 inline-block px-4 py-2">
        ← Go back
      </Link>
      <section className="kid-card p-6 text-center">
        <h1 className="mb-4 text-2xl font-extrabold">Dress up your Avatar!</h1>
        <div
          className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-teal-400 text-6xl"
          aria-hidden="true"
        >
          {avatarOf(current?.image_key)}
        </div>

        <form
          className="mx-auto mb-6 flex max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ nickname: name }, { onSuccess: () => setNick(null) });
          }}
        >
          <input
            aria-label="Your name"
            className="kid-pill w-full border-2 px-4 py-2 text-center text-lg"
            style={{ borderColor: "#9aa38a" }}
            maxLength={60}
            value={name}
            onChange={(e) => setNick(e.target.value)}
          />
          <button className="kid-pill bg-emerald-200 px-4 py-2" style={{ color: "#2b2b2b" }} disabled={!name.trim() || save.isPending}>
            Save
          </button>
        </form>

        <h2 className="mb-3 text-lg font-extrabold">Choose your animal</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {avatars.data?.map((a) => (
            <button
              key={a.avatar_id}
              aria-label={a.name}
              aria-pressed={current?.avatar_id === a.avatar_id}
              onClick={() => save.mutate({ avatar_id: a.avatar_id })}
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-4xl"
              style={{ border: current?.avatar_id === a.avatar_id ? "4px solid #14b8a6" : "4px solid transparent" }}
            >
              {avatarOf(a.image_key)}
            </button>
          ))}
        </div>
        {save.isError && <p role="alert" className="mt-4 font-bold">{errMsg(save.error)}</p>}
      </section>
    </>
  );
}
