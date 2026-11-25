import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMsg, get } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { Badge, Button, Card, ErrorText, Field, Input, Loading, PageHeader, Table, Tabs } from "../../components/ui";
import { DAY_NUMBERS, daysMissing, withDays } from "../../lib/week";

// Run a request, then refresh a list
function useAction(request, key) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });
}

// Individual daily lessons across levels and subjects, with per-lesson lock/unlock toggle
function DailyLessons() {
  const list = useQuery({ queryKey: ["lessons"], queryFn: () => get("/lessons") });
  const toggleLesson = useAction(
    (lesson) => api.patch(`/lessons/${lesson.lesson_id}`, { is_unlocked: !lesson.is_unlocked }),
    "lessons"
  );

  if (list.isLoading) return <Loading />;
  if (list.isError) return <ErrorText>{errMsg(list.error)}</ErrorText>;

  const lessons = withDays(list.data);

  if (!lessons.length) return <p className="py-8 text-center text-sm text-gray-500">No lessons yet.</p>;

  return (
    <>
      <p className="mb-4 text-sm text-gray-600">
        Manage individual daily lessons across levels and days. Open or lock a lesson directly for students.
      </p>
      <ErrorText>{toggleLesson.isError && errMsg(toggleLesson.error)}</ErrorText>
      <Table
        empty="No lessons yet."
        rows={lessons}
        columns={[
          { label: "Lesson", render: (l) => <span className="font-medium">{l.title}</span> },
          { label: "Subject", render: (l) => l.subject || "—" },
          { label: "Schedule", render: (l) => `Level ${l.level_no} · Day ${l.day_no ?? 1}` },
          {
            label: "Status",
            render: (l) => <Badge tone={l.is_unlocked ? "green" : "gray"}>{l.is_unlocked ? "Open" : "Locked"}</Badge>,
          },
          {
            label: "Action",
            render: (l) => (
              <Button variant="ghost" disabled={toggleLesson.isPending} onClick={() => toggleLesson.mutate(l)}>
                {l.is_unlocked ? "Lock" : "Open"}
              </Button>
            ),
          },
        ]}
      />
    </>
  );
}

// The weekly games: each level's lessons on Day 1 to Day 5. Teachers open a whole day at once.
function WeeklyGames() {
  const list = useQuery({ queryKey: ["lessons"], queryFn: () => get("/lessons") });
  const setDay = useAction(
    ({ level, day, unlock }) => api.patch("/lesson-days", { level_no: level, day_no: day, is_unlocked: unlock }),
    "lessons"
  );

  if (list.isLoading) return <Loading />;
  if (list.isError) return <ErrorText>{errMsg(list.error)}</ErrorText>;

  const missing = daysMissing(list.data);
  const lessons = withDays(list.data);
  const levels = [...new Set(lessons.map((l) => Number(l.level_no)))].sort((a, b) => a - b);

  if (!levels.length) return <p className="py-8 text-center text-sm text-gray-500">No lessons yet.</p>;

  return (
    <>
      <p className="mb-4 text-sm text-gray-600">
        Each level is one week. Its lessons are spread over Day 1 to Day 5. Open a day to let students play its lessons.
        Opening a day opens it for all students.
      </p>
      {missing && (
        <p role="alert" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Day numbers aren’t saved in the database yet, so days can’t be opened. Run <code>php artisan migrate</code> in
          sned-api, then reload this page.
        </p>
      )}
      <ErrorText>{setDay.isError && errMsg(setDay.error)}</ErrorText>

      {levels.map((level) => (
        <section key={level} className="mb-6">
          <h3 className="mb-2 font-semibold">Level {level}</h3>
          <div className="grid gap-3 md:grid-cols-5">
            {DAY_NUMBERS.map((n) => {
              const items = lessons.filter((l) => Number(l.level_no) === level && Number(l.day_no) === n);
              const open = items.filter((l) => l.is_unlocked).length;
              const allOpen = items.length > 0 && open === items.length;
              const tone = allOpen ? "green" : open > 0 ? "amber" : "gray";

              return (
                <div key={n} className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Day {n}</p>
                    <Badge tone={tone}>{allOpen ? "Open" : open > 0 ? "Partly open" : "Locked"}</Badge>
                  </div>

                  {items.length ? (
                    <ul className="mb-3 flex-1 space-y-2 text-sm">
                      {items.map((l) => (
                        <li key={l.lesson_id}>
                          {l.title}
                          {l.subject && <span className="block text-xs text-gray-500">{l.subject}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mb-3 flex-1 text-xs text-gray-500">No lessons</p>
                  )}

                  <Button
                    variant={allOpen ? "ghost" : "primary"}
                    disabled={missing || items.length === 0 || setDay.isPending}
                    onClick={() => setDay.mutate({ level, day: n, unlock: !allOpen })}
                  >
                    {allOpen ? "Lock day" : "Open day"}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function Rewards({ master }) {
  const list = useQuery({ queryKey: ["rewards"], queryFn: () => get("/rewards") });
  const [form, setForm] = useState({ reward_name: "", emoji: "", description: "", cost_coins: 10 });
  const create = useAction(() => api.post("/rewards", { ...form, cost_coins: Number(form.cost_coins) }), "rewards");
  const toggle = useAction((r) => api.patch(`/rewards/${r.reward_id}`, { is_active: !r.is_active }), "rewards");

  return (
    <>
      {master && (
        <form
          className="mb-6 grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(undefined, { onSuccess: () => setForm({ reward_name: "", emoji: "", description: "", cost_coins: 10 }) });
          }}
        >
          <Field label="Item name">
            <Input value={form.reward_name} onChange={(e) => setForm({ ...form, reward_name: e.target.value })} required />
          </Field>
          <Field label="Emoji shown on the avatar" hint="For example 🎩 🎀 👑 🕶️">
            <Input value={form.emoji} maxLength={8} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
          </Field>
          <Field label="Cost in stars">
            <Input type="number" min="1" value={form.cost_coins} onChange={(e) => setForm({ ...form, cost_coins: e.target.value })} required />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <ErrorText>{create.isError && errMsg(create.error)}</ErrorText>
            <Button disabled={create.isPending}>Add item</Button>
          </div>
        </form>
      )}
      {list.isLoading ? (
        <Loading />
      ) : (
        <Table
          empty="No avatar items yet."
          rows={list.data}
          columns={[
            { label: "Item", render: (r) => <span className="font-medium">{r.emoji} {r.reward_name}</span> },
            { label: "Cost", render: (r) => `${r.cost_coins} stars` },
            { label: "Status", render: (r) => <Badge tone={r.is_active ? "green" : "gray"}>{r.is_active ? "Available" : "Hidden"}</Badge> },
            ...(master
              ? [{
                  label: "Action",
                  render: (r) => (
                    <Button variant="ghost" onClick={() => toggle.mutate(r)}>
                      {r.is_active ? "Hide" : "Show"}
                    </Button>
                  ),
                }]
              : []),
          ]}
        />
      )}
    </>
  );
}

export default function Content() {
  const { user } = useAuth();
  const master = user.role.name === "master_teacher";
  const [tab, setTab] = useState("daily");

  return (
    <>
      <PageHeader
        title={master ? "Learning Content" : "Gamified Curriculum & Levels"}
        subtitle="Daily lessons, the weekly games (Day 1 to Day 5), and the avatar shop."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "daily", label: "Daily lessons" },
          { value: "games", label: "Weekly games" },
          { value: "rewards", label: "Avatar shop" },
        ]}
      />
      <Card>
        {tab === "daily" && <DailyLessons />}
        {tab === "games" && <WeeklyGames />}
        {tab === "rewards" && <Rewards master={master} />}
      </Card>
    </>
  );
}