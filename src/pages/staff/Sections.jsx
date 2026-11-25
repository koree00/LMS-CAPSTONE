import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMsg, get } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { Avatar, Button, Card, ErrorText, Field, Input, Loading, Modal, PageHeader, Select, Table } from "../../components/ui";

function CreateSection({ onClose }) {
  const qc = useQueryClient();
  const teachers = useQuery({ queryKey: ["accounts", "teacher", 1], queryFn: () => get("/accounts/teacher", { page: 1 }) });
  const students = useQuery({ queryKey: ["accounts", "student", 1], queryFn: () => get("/accounts/student", { page: 1 }) });
  const [grade, setGrade] = useState("");
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [picked, setPicked] = useState([]);

  const create = useMutation({
    mutationFn: async () => {
      const section_name = grade.trim() ? `${grade.trim()} - ${name.trim()}` : name.trim();
      const { data } = await api.post("/sections", {
        section_name,
        ...(owner ? { teacher_id: Number(owner) } : {}),
      });
      for (const id of picked) {
        await api.post(`/sections/${data.section_id}/students`, { student_id: id });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sections"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
  });

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal title="Create New Section" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Field label="Grade level">
          <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade 1" />
        </Field>
        <Field label="Section name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aso" required />
        </Field>
        <Field label="Inclusive lead teacher">
          <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">Myself</option>
            {teachers.data?.data.map((t) => (
              <option key={t.user_id} value={t.user_id}>
                {t.name ?? t.email}
              </option>
            ))}
          </Select>
        </Field>

        <p className="mb-1 text-xs font-medium text-gray-700">Add students &amp; learning profiles</p>
        <div className="mb-3 max-h-32 overflow-y-auto rounded-md border border-gray-200 p-2">
          {students.data?.data.length ? (
            students.data.data.map((s) => (
              <label key={s.user_id} className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" checked={picked.includes(s.user_id)} onChange={() => toggle(s.user_id)} />
                {s.name ?? s.email}
                {s.exceptionality && <span className="text-xs text-gray-500">({s.exceptionality})</span>}
              </label>
            ))
          ) : (
            <p className="text-xs text-gray-500">No students yet. You can add them later.</p>
          )}
        </div>

        <ErrorText>{create.isError && errMsg(create.error)}</ErrorText>
        <div className="flex gap-2">
          <Button disabled={create.isPending}>{create.isPending ? "Creating…" : "Create section"}</Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function SectionDetail({ id, master, meId, onClose }) {
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ["section", id], queryFn: () => get(`/sections/${id}`) });
  const students = useQuery({ queryKey: ["accounts", "student", 1], queryFn: () => get("/accounts/student", { page: 1 }) });
  const teachers = useQuery({
    queryKey: ["accounts", "teacher", 1],
    queryFn: () => get("/accounts/teacher", { page: 1 }),
    enabled: master,
  });
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["section", id] });
    qc.invalidateQueries({ queryKey: ["sections"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  const add = useMutation({
    mutationFn: () => api.post(`/sections/${id}/students`, { student_id: Number(studentId) }),
    onSuccess: () => {
      setError("");
      setStudentId("");
      refresh();
    },
    onError: (e) => setError(errMsg(e)),
  });

  const remove = useMutation({
    mutationFn: (sid) => api.delete(`/sections/${id}/students/${sid}`),
    onSuccess: refresh,
    onError: (e) => setError(errMsg(e)),
  });

  const assign = useMutation({
    mutationFn: (teacher_id) => api.patch(`/sections/${id}`, { teacher_id: Number(teacher_id) }),
    onSuccess: refresh,
    onError: (e) => setError(errMsg(e)),
  });

  const section = detail.data?.section;
  const inSection = new Set(detail.data?.students.map((s) => s.student_id));

  return (
    <Modal title={section?.section_name ?? "Section"} onClose={onClose} wide>
      {detail.isLoading ? (
        <Loading />
      ) : (
        <>
          {master && (
            <Field label="Inclusive lead teacher" hint="Choose yourself to teach this section.">
              <Select value={section.teacher_id} onChange={(e) => assign.mutate(e.target.value)}>
                <option value={meId}>Myself</option>
                {teachers.data?.data.map((t) => (
                  <option key={t.user_id} value={t.user_id}>
                    {t.name ?? t.email}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <h3 className="mb-2 text-sm font-semibold">Students ({detail.data.students.length})</h3>
          <Table
            empty="No students in this section yet."
            rows={detail.data.students}
            columns={[
              {
                label: "Nickname",
                render: (r) => (
                  <span className="flex items-center gap-2">
                    <Avatar name={r.nickname} size={28} /> {r.nickname}
                  </span>
                ),
              },
              {
                label: "Action",
                render: (r) => (
                  <Button variant="danger" onClick={() => remove.mutate(r.student_id)}>
                    Remove
                  </Button>
                ),
              },
            ]}
          />

          <div className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <Field label="Add a student">
                <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  <option value="">Choose a student…</option>
                  {students.data?.data
                    .filter((s) => !inSection.has(s.user_id))
                    .map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.name ?? s.email}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            <Button className="mb-3" disabled={!studentId || add.isPending} onClick={() => add.mutate()}>
              Add
            </Button>
          </div>
          <ErrorText>{error}</ErrorText>
        </>
      )}
    </Modal>
  );
}

export default function Sections() {
  const { user } = useAuth();
  const master = user.role.name === "master_teacher";
  const sections = useQuery({ queryKey: ["sections"], queryFn: () => get("/sections") });
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState("");

  const rows = sections.data?.filter((s) => s.section_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Sections & Inclusive Classrooms"
        subtitle="San Mateo Elementary School · Grade 1 Inclusive Learning Management System"
        action={master && <Button onClick={() => setCreating(true)}>+ Create Section</Button>}
      />
      <Card>
        <div className="mb-4 max-w-xs">
          <Input placeholder="Search sections" aria-label="Search sections" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {sections.isLoading ? (
          <Loading />
        ) : (
          <Table
            empty={master ? "No sections yet. Create the first one." : "No sections are assigned to you yet."}
            rows={rows}
            onRowClick={(r) => setOpenId(r.section_id)}
            columns={[
              { label: "Section name", render: (r) => <span className="font-medium">{r.section_name}</span> },
              {
                label: "Inclusive teacher",
                render: (r) => (
                  <span className="flex items-center gap-2">
                    <Avatar name={r.teacher_name} size={28} /> {r.teacher_name}
                  </span>
                ),
              },
              { label: "Accommodations", render: (r) => `${r.students_count} students` },
              { label: "", render: () => <span className="text-gray-400">›</span> },
            ]}
          />
        )}
      </Card>
      {creating && <CreateSection onClose={() => setCreating(false)} />}
      {openId && <SectionDetail id={openId} master={master} meId={user.user_id} onClose={() => setOpenId(null)} />}
    </>
  );
}
