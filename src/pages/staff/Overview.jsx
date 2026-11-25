import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../lib/api";
import { fmtDate } from "../../lib/csv";
import { useAuth } from "../../auth/AuthContext";
import { BarChart, Card, Loading, PageHeader, StatCard, Table } from "../../components/ui";

export default function Overview() {
  const { user } = useAuth();
  const master = user.role.name === "master_teacher";

  const sections = useQuery({ queryKey: ["sections"], queryFn: () => get("/sections") });
  const students = useQuery({ queryKey: ["accounts", "student", 1], queryFn: () => get("/accounts/student", { page: 1 }) });
  const lessons = useQuery({ queryKey: ["lessons"], queryFn: () => get("/lessons") });
  const completion = useQuery({ queryKey: ["completion"], queryFn: () => get("/analytics/completion") });
  const summary = useQuery({ queryKey: ["summary"], queryFn: () => get("/analytics/summary"), enabled: master });
  const logs = useQuery({ queryKey: ["audit", "recent"], queryFn: () => get("/audit-logs"), enabled: master });

  const s = summary.data;
  const unlocked = lessons.data?.filter((l) => l.is_unlocked).length;
  const chart = (completion.data?.levels ?? []).map((l) => ({
    label: `Level ${l.level_no}`,
    completed: Number(l.completed),
    in_progress: Number(l.in_progress),
  }));
  const avg = completion.data ? `${completion.data.avg_completion}%` : undefined;

  return (
    <>
      <PageHeader
        title={master ? "System Overview Analytics Dashboard" : "System Overview & Classroom Dashboard"}
        subtitle="San Mateo Elementary School · Grade 1 Inclusive Learning Management System"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {master ? (
          <>
            <StatCard label="Total Sections" value={sections.data?.length} hint="Grade 1 Inclusive Sections" />
            <StatCard label="Active Teachers" value={s?.accounts.teachers} hint="Grade 1 Educators" />
            <StatCard label="SNED Students" value={s?.accounts.students} hint="Across all inclusive sections" />
            <StatCard label="Average Completion" value={avg ?? (s ? `${s.progress.avg_completion}%` : undefined)} hint="Average lesson completion" />
          </>
        ) : (
          <>
            <StatCard label="Assigned Sections" value={sections.data?.length} hint="Grade 1 Inclusive Sections" />
            <StatCard label="Total Enrolled" value={students.data?.total ?? students.data?.data?.length} hint="Learners" />
            <StatCard label="Gamified Activities" value={unlocked} hint="Unlocked lessons" />
            <StatCard label="Class Completion Rate" value={avg} hint="Across unlocked lessons" />
          </>
        )}
      </div>

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold">Lesson Completion Overview</h2>
        {completion.isLoading ? (
          <Loading />
        ) : (
          <BarChart
            data={chart}
            empty={completion.isError ? "Chart data needs the backend patch (see BACKEND_PATCH.md)." : "No progress to chart yet."}
          />
        )}
      </Card>

      {master && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent System Activity Summary</h2>
            <Link to="/app/reports" className="text-sm text-brand underline">
              View detailed audit log
            </Link>
          </div>
          {logs.isLoading ? (
            <Loading />
          ) : (
            <Table
              empty="No activity yet."
              rows={logs.data?.data?.slice(0, 6)}
              columns={[
                { label: "Timestamp", render: (r) => fmtDate(r.created_at) },
                { label: "User", render: (r) => r.actor_email },
                { label: "Action", render: (r) => r.action.replaceAll("_", " ") },
              ]}
            />
          )}
        </Card>
      )}
    </>
  );
}
