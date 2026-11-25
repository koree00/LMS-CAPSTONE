import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { errMsg, get } from "../../lib/api";
import { fmtDate } from "../../lib/csv";
import { weekPlan } from "../../lib/week";
import { Avatar, Badge, Button, Card, ErrorText, Input, Loading, Modal, PageHeader, Pager, ProgressBar, StatCard, Table } from "../../components/ui";

function prefChips(p = {}) {
  return [
    `Theme: ${p.theme ?? "calm"}`,
    `Text size: ${p.text_size ?? "medium"}`,
    p.reduced_motion ? "Less motion" : null,
    p.high_contrast ? "Stronger outlines" : null,
    p.sound === false ? "Sounds off" : null,
  ].filter(Boolean);
}

function StudentRecord({ student, onClose }) {
  const id = student.user_id;
  const progress = useQuery({ queryKey: ["student-progress", id], queryFn: () => get(`/students/${id}/progress`) });
  const rewards = useQuery({ queryKey: ["student-rewards", id], queryFn: () => get(`/students/${id}/rewards`) });
  const summary = useQuery({ queryKey: ["student-summary", id], queryFn: () => get(`/students/${id}/summary`) });

  const lessons = progress.data ?? [];
  const plan = weekPlan(lessons);
  const done = lessons.filter((l) => Number(l.completion_pct) >= 100).length;
  const overall = lessons.length
    ? Math.round(lessons.reduce((sum, l) => sum + Number(l.completion_pct), 0) / lessons.length)
    : 0;
  const sm = summary.data;
  const name = student.name ?? student.email;

  return (
    <Modal title="Student record" onClose={onClose} wide>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={name} size={52} />
        <div>
          <p className="text-lg font-semibold">{name}</p>
          <p className="text-sm text-gray-600">{student.guardian_email ?? student.email}</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Overall progress" value={`${overall}%`} />
        <StatCard label="Lessons done" value={`${done}/${lessons.length}`} />
        <StatCard label="Days finished" value={`${plan.days.filter((d) => d.done).length}/5`} hint={`Level ${plan.level}`} />
        <StatCard label="Total earned" value={sm?.coins_earned} hint="stars" />
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Learner details</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Exceptionality</dt><dd>{sm?.profile.exceptionality || student.exceptionality || "—"}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Sections</dt><dd>{sm?.sections?.join(", ") || student.sections || "—"}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Status</dt><dd>{student.status}</dd></div>
            <div className="flex gap-2"><dt className="w-32 text-gray-500">Best game score</dt><dd>{sm?.best_score ?? "—"}</dd></div>
          </dl>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Comfort &amp; sensory preferences</h3>
          <div className="flex flex-wrap gap-2">
            {sm ? prefChips(sm.profile.sensory_preferences ?? {}).map((c) => <Badge key={c}>{c}</Badge>) : <span className="text-sm text-gray-500">—</span>}
          </div>
        </div>
      </div>

      {progress.isError && <ErrorText>{errMsg(progress.error)}</ErrorText>}
      <h3 className="mb-2 text-sm font-semibold">Lesson progress</h3>
      {progress.isLoading ? (
        <Loading />
      ) : (
        <Table
          empty="No unlocked lessons yet."
          rows={lessons}
          columns={[
            { label: "Level", render: (r) => r.level_no },
            { label: "Lesson", render: (r) => r.title },
            {
              label: "Completion",
              render: (r) => (
                <div className="w-40">
                  <ProgressBar value={r.completion_pct} />
                  <span className="text-xs text-gray-500">{Number(r.completion_pct)}%</span>
                </div>
              ),
            },
            { label: "Last played", render: (r) => fmtDate(r.last_played_at) },
          ]}
        />
      )}

      <h3 className="mb-2 mt-6 text-sm font-semibold">Recent activity: avatar items bought</h3>
      {rewards.isLoading ? (
        <Loading />
      ) : (
        <Table
          empty="No items bought yet."
          rows={rewards.data}
          columns={[
            { label: "Reward", render: (r) => r.reward_name },
            { label: "Cost", render: (r) => `${r.cost_coins} stars` },
            { label: "Claimed", render: (r) => fmtDate(r.claimed_at) },
          ]}
        />
      )}
    </Modal>
  );
}

export default function Records() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);
  const list = useQuery({ queryKey: ["accounts", "student", page], queryFn: () => get("/accounts/student", { page }) });

  const rows = list.data?.data.filter((s) => (s.name ?? s.email).toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Grade 1 SNED Student Records"
        subtitle="San Mateo Elementary School · Grade 1 Inclusive Learning Management System"
      />
      <Card>
        <div className="mb-4 max-w-xs">
          <Input placeholder="Search name" aria-label="Search students" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {list.isLoading ? (
          <Loading />
        ) : (
          <>
            <Table
              empty="No students found."
              rows={rows}
              columns={[
                {
                  label: "Name",
                  render: (r) => (
                    <span className="flex items-center gap-2">
                      <Avatar name={r.name ?? r.email} size={30} />
                      <span className="font-medium">{r.name ?? r.email}</span>
                    </span>
                  ),
                },
                { label: "Section", render: (r) => r.sections || "—" },
                { label: "Parent email", render: (r) => r.guardian_email ?? "—" },
                { label: "Exceptionality", render: (r) => r.exceptionality || "—" },
                { label: "Status", render: (r) => <Badge tone={r.status === "active" ? "green" : "red"}>{r.status}</Badge> },
                {
                  label: "Actions",
                  render: (r) => (
                    <Button variant="ghost" onClick={() => setOpen(r)}>
                      View record
                    </Button>
                  ),
                },
              ]}
            />
            <Pager page={list.data.current_page} last={list.data.last_page} onPage={setPage} />
          </>
        )}
      </Card>
      {open && <StudentRecord student={open} onClose={() => setOpen(null)} />}
    </>
  );
}
