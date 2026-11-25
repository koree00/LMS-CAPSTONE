import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, errMsg, get } from "../../lib/api";
import { downloadCsv, fmtDate, saveBlob } from "../../lib/csv";
import { useAuth } from "../../auth/AuthContext";
import { Button, Card, ErrorText, Field, Input, Loading, PageHeader, Pager, Select, StatCard, Table, Tabs } from "../../components/ui";

function ProgressReport() {
  const { user } = useAuth();
  const master = user.role.name === "master_teacher";
  const sections = useQuery({ queryKey: ["sections"], queryFn: () => get("/sections") });
  const [sectionId, setSectionId] = useState("");
  const [error, setError] = useState("");

  const report = useQuery({
    queryKey: ["section-progress", sectionId],
    queryFn: () => get(`/sections/${sectionId}/progress`),
    enabled: !!sectionId,
  });

  const students = report.data?.students ?? [];
  const avg = students.length
    ? (students.reduce((sum, s) => sum + Number(s.avg_completion), 0) / students.length).toFixed(1)
    : "0";
  const completed = students.reduce((sum, s) => sum + Number(s.lessons_completed), 0);
  const active = students.filter((s) => Number(s.lessons_started) > 0).length;

  const exportSection = () => {
    const name = report.data.section.section_name;
    downloadCsv(`progress-${name.replace(/\s+/g, "-")}.csv`, [
      ["Nickname", "Lessons started", "Lessons completed", "Average completion (%)", "Last played"],
      ...students.map((s) => [s.nickname, s.lessons_started, s.lessons_completed, s.avg_completion, s.last_played_at ?? ""]),
    ]);
  };

  const exportAll = async () => {
    setError("");
    try {
      const res = await api.get("/exports/student-progress", { responseType: "blob" });
      saveBlob("student-progress.csv", res.data);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      {sectionId && report.data && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Class completion" value={`${avg}%`} hint="Average across learners" />
          <StatCard label="Learners" value={students.length} />
          <StatCard label="Active learners" value={`${active}/${students.length}`} hint="Started at least one lesson" />
          <StatCard label="Lessons completed" value={completed} />
        </div>
      )}
      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-xs">
            <Field label="Section">
              <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">Choose a section…</option>
                {sections.data?.map((s) => (
                  <option key={s.section_id} value={s.section_id}>
                    {s.section_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mb-3 flex flex-wrap gap-2 print:hidden">
            <Button variant="ghost" onClick={() => window.print()}>
              Save as PDF
            </Button>
            <Button variant="ghost" disabled={!report.data} onClick={exportSection}>
              Export section CSV
            </Button>
            {master && <Button onClick={exportAll}>Export all students</Button>}
          </div>
        </div>
        <ErrorText>{error || (report.isError && errMsg(report.error))}</ErrorText>

        {!sectionId ? (
          <p className="py-8 text-center text-sm text-gray-500">Choose a section to see its progress.</p>
        ) : report.isLoading ? (
          <Loading />
        ) : (
          <Table
            empty="No students in this section yet."
            rows={students}
            columns={[
              { label: "Nickname", render: (r) => <span className="font-medium">{r.nickname}</span> },
              { label: "Started", render: (r) => r.lessons_started },
              { label: "Completed", render: (r) => r.lessons_completed },
              { label: "Average completion", render: (r) => `${r.avg_completion}%` },
              { label: "Last played", render: (r) => fmtDate(r.last_played_at) },
            ]}
          />
        )}
      </Card>
    </>
  );
}

function AuditLog() {
  const [filters, setFilters] = useState({ action: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const params = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
  const logs = useQuery({ queryKey: ["audit", params], queryFn: () => get("/audit-logs", params) });
  const summary = useQuery({ queryKey: ["summary"], queryFn: () => get("/analytics/summary") });
  const s = summary.data;

  const set = (k) => (e) => {
    setPage(1);
    setFilters({ ...filters, [k]: e.target.value });
  };

  const exportLog = () =>
    downloadCsv("audit-log.csv", [
      ["Timestamp", "User", "Action", "Details"],
      ...logs.data.data.map((r) => [r.created_at, r.actor_email, r.action, r.details ? JSON.stringify(r.details) : ""]),
    ]);

  return (
    <>
      {s && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Class progress" value={`${s.progress.avg_completion}%`} hint="Average completion" />
          <StatCard label="Verified accounts" value={s.accounts.teachers + s.accounts.students} hint="Active teachers and students" />
          <StatCard label="Learners" value={s.accounts.students} />
          <StatCard label="Rewards claimed" value={s.rewards_claimed} />
        </div>
      )}
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Field label="Action" hint="For example: create_student">
            <Input value={filters.action} onChange={set("action")} />
          </Field>
          <Field label="From">
            <Input type="date" value={filters.from} onChange={set("from")} />
          </Field>
          <Field label="To">
            <Input type="date" value={filters.to} onChange={set("to")} />
          </Field>
        </div>
        <div className="mb-4 flex gap-2 print:hidden">
          <Button variant="ghost" disabled={!logs.data?.data?.length} onClick={exportLog}>
            Export log (CSV)
          </Button>
          <Button onClick={() => window.print()}>Export report (PDF)</Button>
        </div>
        <ErrorText>{logs.isError && errMsg(logs.error)}</ErrorText>
        {logs.isLoading ? (
          <Loading />
        ) : (
          <>
            <Table
              empty="No activity matches these filters."
              rows={logs.data?.data}
              columns={[
                { label: "Timestamp", render: (r) => fmtDate(r.created_at) },
                { label: "User", render: (r) => r.actor_email },
                { label: "Action", render: (r) => r.action.replaceAll("_", " ") },
                {
                  label: "Target",
                  render: (r) => <span className="font-mono text-xs text-gray-600">{r.details ? JSON.stringify(r.details) : "—"}</span>,
                },
              ]}
            />
            <Pager page={logs.data.current_page} last={logs.data.last_page} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const master = user.role.name === "master_teacher";
  const [tab, setTab] = useState("audit");

  return (
    <>
      <PageHeader
        title={master ? (tab === "audit" ? "System Audit Log" : "Reports & Analytics") : "Reports & Analytics"}
        subtitle="San Mateo Elementary School · Grade 1 Inclusive Learning Management System"
      />
      {master && (
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "audit", label: "System audit log" },
            { value: "reports", label: "Progress reports" },
          ]}
        />
      )}
      {master && tab === "audit" ? <AuditLog /> : <ProgressReport />}
    </>
  );
}
