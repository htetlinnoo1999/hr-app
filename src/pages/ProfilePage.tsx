import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";

import { EmployeeProfileCard } from "@/components/EmployeeProfileCard";
import { LeaveBalancesCard } from "@/components/LeaveBalancesCard";
import { MyLeaveCard } from "@/components/MyLeaveCard";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/spinner";
import type { Employee } from "@/apis/employees";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useUpdateMyProfile } from "@/hooks/useEmployees";
import { getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { employee, isLoading, isError, error } = useCurrentEmployee();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Your account and employee details."
      />

      {/* Account (from the auth token) is always available. */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 [&>dt]:text-sm [&>dt]:text-muted-foreground [&>dd]:text-sm">
            <dt>Email</dt>
            <dd>{user?.email ?? "—"}</dd>
            <dt>Role</dt>
            <dd>{user?.role ?? "—"}</dd>
            <dt>Organization</dt>
            {employee && (
              <dd className="font-mono text-xs">
                {employee?.organization?.name ?? "— (platform-wide)"}
              </dd>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Employee record for this account (GET /employees/{user.id}). A 404
          means the account has no employee record. */}
      {isLoading && <LoadingState />}
      {isError && (
        <ErrorState
          error={error}
          notFoundLabel="Your account isn’t linked to an employee record."
        />
      )}
      {!isLoading && !isError && employee && (
        <>
          <NicknameCard employee={employee} />
          <LeaveBalancesCard balances={employee.leaveBalances ?? []} />
          <MyLeaveCard employeeId={employee.id} />
          <EmployeeProfileCard employee={employee} title="Employee profile" />
        </>
      )}
    </div>
  );
}

/** Edit the caller's preferred name via PATCH /employees/me. */
function NicknameCard({ employee }: { employee: Employee }) {
  const mut = useUpdateMyProfile();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(employee.nickname ?? "");
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setNickname(employee.nickname ?? "");
    setError(null);
    setEditing(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await mut.mutateAsync({ nickname: nickname.trim() });
      setEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Preferred name</CardTitle>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={save} className="flex flex-col gap-3 sm:max-w-sm">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Janie"
              autoFocus
              maxLength={100}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={mut.isPending}>
                {mut.isPending ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={mut.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm">
            {employee.nickname?.trim() || (
              <span className="text-muted-foreground">Not set</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
