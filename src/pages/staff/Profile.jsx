import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, errMsg } from "../../lib/api";
import { toAvatarDataUrl } from "../../lib/image";
import { useAuth } from "../../auth/AuthContext";
import { Avatar, Badge, Button, Card, ErrorText, Field, Input, PageHeader, Select } from "../../components/ui";

const TITLES = ["Mr.", "Ms.", "Mrs."];

export default function Profile() {
  const { user, setUser } = useAuth();
  const master = user.role.name === "master_teacher";
  const fileRef = useRef(null);

  const [title, setTitle] = useState(user.title ?? "");
  const [name, setName] = useState(user.name ?? "");
  // undefined = keep the current picture, null = remove it, string = a newly chosen one
  const [photo, setPhoto] = useState(undefined);
  const [photoError, setPhotoError] = useState("");
  const [saved, setSaved] = useState(false);

  const shownPhoto = photo === undefined ? user.photo : photo;
  const shownName = [title, name.trim()].filter(Boolean).join(" ") || user.email;

  const choosePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again
    if (!file) return;
    setPhotoError("");
    setSaved(false);
    try {
      setPhoto(await toAvatarDataUrl(file));
    } catch (err) {
      setPhotoError(err.message);
    }
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { title, display_name: name };
      if (typeof photo === "string") body.photo = photo;
      if (photo === null) body.remove_photo = true;
      return api.post("/account/profile", body).then((r) => r.data);
    },
    onSuccess: (data) => {
      setUser(data.user);
      setTitle(data.user.title ?? "");
      setName(data.user.name ?? "");
      setPhoto(undefined);
      setSaved(true);
    },
  });

  return (
    <>
      <PageHeader title="My Profile" subtitle="Update how your name and picture appear in EduQuest AI." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          save.mutate();
        }}
        className="grid max-w-3xl gap-4 md:grid-cols-[220px_1fr]"
      >
        <Card className="flex flex-col items-center text-center">
          <Avatar name={shownName} src={shownPhoto} size={120} />
          <p className="mt-3 text-sm font-semibold">{shownName}</p>
          <Badge tone="red">{master ? "Master Teacher" : "Teacher"}</Badge>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={choosePhoto}
            aria-label="Upload profile picture"
          />
          <div className="mt-4 flex w-full flex-col gap-2">
            <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
              {shownPhoto ? "Change picture" : "Upload picture"}
            </Button>
            {shownPhoto && (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setPhoto(null);
                  setSaved(false);
                }}
              >
                Remove picture
              </Button>
            )}
          </div>
          {photoError && (
            <p role="alert" className="mt-3 text-xs text-brand">
              {photoError}
            </p>
          )}
          <p className="mt-3 text-xs text-gray-500">JPG, PNG or WebP. Press Save to keep your changes.</p>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Personal Information</h2>

          <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
            <Field label="Title">
              <Select value={title} onChange={(e) => setTitle(e.target.value)} required>
                <option value="" disabled>
                  Select
                </option>
                {TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Input name"
                maxLength={100}
                autoComplete="name"
                required
              />
            </Field>
          </div>

          <Field label="Email" hint="Your sign-in email. It cannot be changed here.">
            <Input value={user.email} disabled readOnly />
          </Field>

          <ErrorText>{save.isError && errMsg(save.error)}</ErrorText>
          {saved && <p className="mb-3 text-sm text-green-700">Profile saved.</p>}

          <Button disabled={save.isPending || !title || name.trim().length < 2}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </Card>
      </form>
    </>
  );
}
