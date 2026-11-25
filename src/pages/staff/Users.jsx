import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMsg, get } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { Avatar, Badge, Button, Card, ErrorText, Field, Input, Loading, Modal, PageHeader, Pager, Select, Switch, Table } from "../../components/ui";
import { SectionDetail } from "./Sections";

const EXCEPTIONALITIES = [
  "Mild Attention-deficit/hyperactivity disorder (ADHD)",
  "Mild Autism Spectrum Disorder (ASD)",
];

function Credentials({ result, onClose }) {
  return (
    <Modal title="Account created" onClose={onClose}>
      <p className="mb-3 text-sm text-gray-700">
        Share these details now. The temporary password is shown only once. At first sign-in, the person sets up their
        Authenticator app.
      </p>
      <div className="mb-4 space-y-1 rounded-md bg-gray-50 p-3 font-mono text-sm">
        <p>Sign in with: {result.login_email ?? result.email}</p>
        <p>Temporary password: {result.temporary_password}</p>
      </div>
      <Button onClick={onClose}>Done</Button>
    </Modal>
  );
}

function InviteModal({ master, onClose, onCreated }) {
  const [role, setRole] = useState(master ? "teacher" : "student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [exceptionality, setExceptionality] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [picked, setPicked] = useState([]);
  const [newSections, setNewSections] = useState("");
  const sections = useQuery({ queryKey: ["sections"], queryFn: () => get("/sections") });

  const create = useMutation({
    mutationFn: async () => {
      if (role === "teacher") {
        const { data } = await api.post("/teachers", {
          email,
          display_name: name,
          section_ids: picked,
          new_sections: newSections.split(",").map((s) => s.trim()).filter(Boolean),
        });
        return data;
      }
      const { data } = await api.post("/students", {
        nickname: name,
        guardian_email: email,
        exceptionality: exceptionality || null,
      });
      if (sectionId) {
        await api.post(`/sections/${sectionId}/students`, { student_id: data.user_id });
      }
      return data;
    },
    onSuccess: onCreated,
  });

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal title={master ? "Invite Account" : "Invite Learner"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>

        {master && (
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="teacher">Teacher</option>
              <option value="student">SNED Student</option>
            </Select>
          </Field>
        )}

        <Field
          label={role === "teacher" ? "School email" : "Email (the learner signs in with this)"}
          hint={role === "student" ? "Use the parent or guardian Gmail. It can’t be used for another account." : undefined}
        >
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>

        {role === "student" ? (
          <>
            <Field label="Exceptionality" hint="Optional. Choose a suggestion or type your own.">
              <Input list="exceptionalities" value={exceptionality} onChange={(e) => setExceptionality(e.target.value)} />
              <datalist id="exceptionalities">
                {EXCEPTIONALITIES.map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </Field>
            <Field label="Section">
              <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">No section yet</option>
                {sections.data?.map((s) => (
                  <option key={s.section_id} value={s.section_id}>
                    {s.section_name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <>
            <p className="mb-1 text-xs font-medium text-gray-700">Assign existing sections</p>
            <div className="mb-3 max-h-32 overflow-y-auto rounded-md border border-gray-200 p-2">
              {sections.data?.length ? (
                sections.data.map((s) => (
                  <label key={s.section_id} className="flex items-center gap-2 py-1 text-sm">
                    <input type="checkbox" checked={picked.includes(s.section_id)} onChange={() => toggle(s.section_id)} />
                    {s.section_name} <span className="text-xs text-gray-500">(now: {s.teacher_name})</span>
                  </label>
                ))
              ) : (
                <p className="text-xs text-gray-500">No sections yet.</p>
              )}
            </div>
            <Field label="Or create new sections" hint="Separate names with commas, for example: Grade 1 - Aso, Grade 1 - Pusa">
              <Input value={newSections} onChange={(e) => setNewSections(e.target.value)} />
            </Field>
          </>
        )}

        <ErrorText>{create.isError && errMsg(create.error)}</ErrorText>
        <div className="flex gap-2">
          <Button disabled={create.isPending}>{create.isPending ? "Creating…" : master ? "Invite account" : "Invite learner"}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function getStudentNickname(row) {
  const realName = (row.name ?? row.email ?? "").trim();
  const customNickname = (row.display_nickname ?? row.student_nickname ?? "").trim();
  if (customNickname && customNickname !== realName) {
    return customNickname;
  }
  const fallbackNickname = (row.nickname ?? "").trim();
  if (fallbackNickname && fallbackNickname !== realName) {
    return fallbackNickname;
  }
  return "";
}

export default function Users() {
  const { user } = useAuth();
  const master = user.role.name === "master_teacher";
  const qc = useQueryClient();

  const [role, setRole] = useState(master ? "all" : "student");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [search, setSearch] = useState("");
  const [inviting, setInviting] = useState(false);
  const [created, setCreated] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [rowError, setRowError] = useState("");

  const sections = useQuery({ queryKey: ["sections"], queryFn: () => get("/sections") });
  const list = useQuery({ queryKey: ["accounts", role, page], queryFn: () => get(`/accounts/${role}`, { page }) });

  const toggle = useMutation({
    mutationFn: (row) => api.patch(`/accounts/${row.user_id}/status`, { status: row.status === "active" ? "disabled" : "active" }),
    onSuccess: () => {
      setRowError("");
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e) => setRowError(errMsg(e)),
  });

  const done = (result) => {
    setInviting(false);
    setCreated(result);
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["sections"] });
  };

  const q = search.toLowerCase();
  const rows = list.data?.data.filter((r) => {
    const nickname = getStudentNickname(r);
    return (
      (!status || r.status === status) &&
      (!sectionName || (r.sections || "").includes(sectionName)) &&
      (!q ||
        (r.name ?? r.email).toLowerCase().includes(q) ||
        nickname.toLowerCase().includes(q) ||
        (r.exceptionality || "").toLowerCase().includes(q))
    );
  });

  const columns = [
    {
      label: "Name",
      render: (r) => {
        const realName = r.name ?? r.email;
        const nickname = getStudentNickname(r);
        return (
          <span className="flex items-center gap-2">
            <Avatar name={realName} size={30} />
            <span className="font-medium">{realName}</span>
            {nickname && <span className="text-xs text-gray-500">({nickname})</span>}
          </span>
        );
      },
    },
    ...(master
      ? [{ label: "Role", render: (r) => ((r.role ?? role) === "teacher" ? "Teacher" : "SNED Student") }]
      : []),
    { label: "Assigned section", render: (r) => r.sections || "—" },
    { label: master ? "Email / parent Gmail" : "Parent email", render: (r) => r.guardian_email ?? r.email },
    { label: "Exceptionality", render: (r) => r.exceptionality || "—" },
    { label: "Status", render: (r) => <Badge tone={r.status === "active" ? "green" : "red"}>{r.status}</Badge> },
    {
      label: "Actions",
      render: (r) => (
        <span className="flex items-center gap-2 text-xs text-gray-600">
          {r.status === "active" ? "Disable" : "Enable"}
          <Switch
            checked={r.status === "active"}
            label={`${r.status === "active" ? "Disable" : "Enable"} ${r.name ?? r.email}`}
            disabled={toggle.isPending}
            onChange={() => toggle.mutate(r)}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={master ? "User Management & Account Provisioning" : "Section & Learners"}
        subtitle="San Mateo Elementary School · Grade 1 Inclusive Learning Management System"
        action={<Button onClick={() => setInviting(true)}>+ {master ? "Invite Account" : "Invite Learner"}</Button>}
      />

      {!master && sections.data?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {sections.data.map((s) => (
            <Button key={s.section_id} variant="ghost" onClick={() => setOpenSection(s.section_id)}>
              {s.section_name} · {s.students_count} learners
            </Button>
          ))}
        </div>
      )}

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {master && (
            <Select
              aria-label="Filter by role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All roles</option>
              <option value="teacher">Teachers</option>
              <option value="student">SNED Students</option>
            </Select>
          )}
          <Select aria-label="Filter by section" value={sectionName} onChange={(e) => setSectionName(e.target.value)}>
            <option value="">All inclusive sections</option>
            {sections.data?.map((s) => (
              <option key={s.section_id} value={s.section_name}>
                {s.section_name}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>
          <Input placeholder="Search name" aria-label="Search name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <ErrorText>{rowError}</ErrorText>
        {list.isLoading ? (
          <Loading />
        ) : list.isError ? (
          <ErrorText>
            {errMsg(list.error)}
            {list.error.response?.status === 404 && " Apply the backend patch in BACKEND_PATCH.md, or pick a single role."}
          </ErrorText>
        ) : (
          <>
            <Table columns={columns} rows={rows} empty="No accounts match. Invite the first one." />
            <Pager page={list.data.current_page} last={list.data.last_page} onPage={setPage} />
          </>
        )}
      </Card>

      {inviting && <InviteModal master={master} onClose={() => setInviting(false)} onCreated={done} />}
      {created && <Credentials result={created} onClose={() => setCreated(null)} />}
      {openSection && <SectionDetail id={openSection} master={false} meId={user.user_id} onClose={() => setOpenSection(null)} />}
    </>
  );
}