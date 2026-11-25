import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, errMsg } from "../lib/api";
import { Button, ErrorText, Field, Input } from "./ui";

export default function PasswordForm({ className = "" }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", new_password_confirmation: "" });
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const change = useMutation({
    mutationFn: () => api.post("/account/password", form),
    onSuccess: () => {
      setDone(true);
      setForm({ current_password: "", new_password: "", new_password_confirmation: "" });
    },
  });

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        setDone(false);
        change.mutate();
      }}
    >
      <Field label="Current password">
        <Input type="password" value={form.current_password} onChange={set("current_password")} required />
      </Field>
      <Field label="New password" hint="At least 8 characters, with letters and numbers.">
        <Input type="password" value={form.new_password} onChange={set("new_password")} required />
      </Field>
      <Field label="Confirm new password">
        <Input
          type="password"
          value={form.new_password_confirmation}
          onChange={set("new_password_confirmation")}
          required
        />
      </Field>
      <ErrorText>{change.isError && errMsg(change.error)}</ErrorText>
      {done && <p className="mb-3 text-sm text-green-700">Password changed.</p>}
      <Button disabled={change.isPending}>{change.isPending ? "Saving…" : "Change password"}</Button>
    </form>
  );
}
