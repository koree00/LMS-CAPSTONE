import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import PasswordForm from "../../components/PasswordForm";
import { Avatar, Badge, Button, Card, PageHeader } from "../../components/ui";

export default function Settings() {
  const { user, signOut } = useAuth();
  const master = user.role.name === "master_teacher";
  const [changing, setChanging] = useState(false);

  return (
    <>
      <PageHeader title="Profile & Credential Management" subtitle="Your account details and security." />

      <Card className="mb-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.full_name ?? user.email} src={user.photo} size={56} />
          <div>
            <p className="text-lg font-semibold">{user.full_name ?? user.email}</p>
            {user.full_name && <p className="text-sm text-gray-600">{user.email}</p>}
            <Badge tone="red">{master ? "Master Teacher" : "Teacher"}</Badge>
            <p className="mt-1 text-sm text-gray-600">San Mateo Elementary School</p>
          </div>
          <Link to="/app/profile" className="ml-auto text-sm text-brand underline">
            Edit profile
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Personal &amp; Academic Information</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Role</dt>
              <dd>{master ? "Master Teacher (full access)" : "Teacher (inclusive classroom access)"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Account status</dt>
              <dd>{user.status}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Account Security &amp; Access Summary</h2>
          <div className="space-y-4 text-sm">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-medium">System password</p>
                <Button variant="ghost" onClick={() => setChanging(!changing)}>
                  {changing ? "Close" : "Change password"}
                </Button>
              </div>
              {changing && (
                <div className="mt-3">
                  <PasswordForm />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <div>
                <p className="font-medium">Two-factor authentication</p>
                <p className="text-gray-600">Authenticator app</p>
              </div>
              <Badge tone="green">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <div>
                <p className="font-medium">This device</p>
                <p className="text-gray-600">You are signed in here.</p>
              </div>
              <Button variant="danger" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
