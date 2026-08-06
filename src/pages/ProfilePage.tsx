import { useState, type ComponentType, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Hash, Mail, Pencil, Plus, X } from "lucide-react";

import { EmployeeProfileCard } from "@/components/EmployeeProfileCard";
import { EmployeeStatusBadge } from "@/components/EmployeeStatusBadge";
import { LeaveBalancesCard } from "@/components/LeaveBalancesCard";
import { MyLeaveCard } from "@/components/MyLeaveCard";
import { PageHeader } from "@/components/PageHeader";
import { ReimbursementStatusBadge } from "@/components/ReimbursementStatusBadge";
import { EmptyState, ErrorState } from "@/components/states";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Employee } from "@/apis/employees";
import type { User } from "@/lib/api";
import { canCancelReimbursement } from "@/apis/reimbursements";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import {
  useEmployeeAllowances,
  useEmployeeContracts,
  useEmployeeDocuments,
  useUpdateMyProfile,
} from "@/hooks/useEmployees";
import {
  useAllReimbursements,
  useCancelReimbursement,
} from "@/hooks/useReimbursements";
import { getApiErrorMessage } from "@/lib/api";
import { formatDate, formatNumber, humanizeEnum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useAuthStore } from "@/stores/authStore";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { employee, isLoading, isError, error } = useCurrentEmployee();

  if (isLoading) return <LoadingState />;

  // No linked employee record — show account basics and guidance.
  if (isError || !employee) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My profile"
          description="Your account details."
        />
        <AccountCard user={user} orgName={null} />
        <ErrorState
          error={error}
          notFoundLabel="Your account isn’t linked to an employee record."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileHero employee={employee} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProfileTabs employee={employee} />
        </div>
        <div className="space-y-6">
          <AccountCard user={user} orgName={employee.organization?.name ?? null} />
          <NicknameCard employee={employee} />
          <CompensationCard employee={employee} />
          <LeaveBalancesCard balances={employee.leaveBalances ?? []} />
        </div>
      </div>
    </div>
  );
}

/** Banner header: gradient strip, overlapping avatar, name + key facts. */
function ProfileHero({ employee }: { employee: Employee }) {
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const nickname = employee.nickname?.trim();
  const orgName = employee.organization?.name;

  return (
    <Card className="overflow-hidden">
      <div className="h-24 bg-linear-to-r from-primary to-[oklch(0.4_0.14_var(--brand-h))]" />
      <div className="px-6 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Avatar
            name={fullName}
            src={employee.profilePicture}
            size="xl"
            className="-mt-12 ring-4 ring-card"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
              <EmployeeStatusBadge status={employee.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {nickname ? `“${nickname}” · ` : ""}
              {humanizeEnum(employee.role)}
              {orgName ? ` · ${orgName}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <Fact icon={Mail} value={employee.email} />
          <Fact icon={Hash} value={employee.employeeCode} />
          <Fact icon={CalendarDays} value={`Joined ${formatDate(employee.hireDate)}`} />
        </div>
      </div>
    </Card>
  );
}

function Fact({
  icon: Icon,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  );
}

const PROFILE_TABS = [
  { value: "profile", label: "Profile" },
  { value: "leave", label: "Leave" },
  { value: "reimbursements", label: "Reimbursements" },
  { value: "contracts", label: "Contracts" },
  { value: "documents", label: "Documents" },
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number]["value"];

/**
 * Tabbed main content. Only the active tab's component is mounted, so each
 * tab's API is called only when that tab is opened (not all at once).
 */
function ProfileTabs({ employee }: { employee: Employee }) {
  const [tab, setTab] = useState<ProfileTab>("profile");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex items-center gap-1 overflow-x-auto border-b border-border"
      >
        {PROFILE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "relative -mb-px cursor-pointer border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              tab === t.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {tab === "profile" && (
          <EmployeeProfileCard
            employee={employee}
            title="Employee profile"
            resolveReferences={false}
          />
        )}
        {tab === "leave" && <MyLeaveCard employeeId={employee.id} />}
        {tab === "reimbursements" && (
          <MyReimbursementsCard employeeId={employee.id} />
        )}
        {tab === "contracts" && <MyContractsCard employeeId={employee.id} />}
        {tab === "documents" && <MyDocumentsCard employeeId={employee.id} />}
      </div>
    </div>
  );
}

/** The employee's own reimbursements — submit new, cancel pending. */
function MyReimbursementsCard({ employeeId }: { employeeId: string }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, isLoading, isError, error } = useAllReimbursements({
    employeeId,
  });
  const cancelMut = useCancelReimbursement();

  async function cancel(id: string) {
    const ok = await confirm({
      title: "Cancel reimbursement",
      description: "This withdraws the request. You can submit a new one later.",
      confirmLabel: "Cancel reimbursement",
      destructive: false,
    });
    if (!ok) return;
    try {
      await cancelMut.mutateAsync(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Reimbursements</CardTitle>
        <Button size="sm" onClick={() => navigate("/reimbursements/new")}>
          <Plus />
          New reimbursement
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} />}
        {data &&
          (data.length === 0 ? (
            <EmptyState>No reimbursements yet.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Expense date</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.category}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(r.amount)}
                    </TableCell>
                    <TableCell>{formatDate(r.expenseDate)}</TableCell>
                    <TableCell>
                      {r.receiptUrl ? (
                        <a
                          href={r.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <ReimbursementStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {canCancelReimbursement(r, employeeId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancel(r.id)}
                            disabled={cancelMut.isPending}
                          >
                            <X />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
      </CardContent>
    </Card>
  );
}

/** Read-only list of the employee's own contracts. */
function MyContractsCard({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError, error } = useEmployeeContracts(employeeId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contracts</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} />}
        {data &&
          (data.length === 0 ? (
            <EmptyState>No contracts on file.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{humanizeEnum(c.contractType)}</TableCell>
                    <TableCell>{formatDate(c.startDate)}</TableCell>
                    <TableCell>{formatDate(c.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{humanizeEnum(c.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.fileUrl ? (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
      </CardContent>
    </Card>
  );
}

/** Read-only list of the employee's own documents. */
function MyDocumentsCard({ employeeId }: { employeeId: string }) {
  const { data, isLoading, isError, error } = useEmployeeDocuments(employeeId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState />}
        {isError && <ErrorState error={error} />}
        {data &&
          (data.length === 0 ? (
            <EmptyState>No documents on file.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.documentType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.description || "—"}
                    </TableCell>
                    <TableCell>
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        Open
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
      </CardContent>
    </Card>
  );
}

/** Account facts from the auth token (always available). */
function AccountCard({
  user,
  orgName,
}: {
  user: User | null;
  orgName: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-y-3 [&>dt]:text-sm [&>dt]:text-muted-foreground [&>dd]:mb-1 [&>dd]:text-sm">
          <dt>Email</dt>
          <dd>{user?.email ?? "—"}</dd>
          <dt>Role</dt>
          <dd>{user?.role ? humanizeEnum(user.role) : "—"}</dd>
          <dt>Organization</dt>
          <dd>{orgName ?? "— (platform-wide)"}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

/** Read-only monthly compensation: base salary + each allowance + gross total. */
function CompensationCard({ employee }: { employee: Employee }) {
  const { data, isLoading, isError, error } = useEmployeeAllowances(employee.id);
  const allowances = data ?? [];
  const base = Number(employee.salary) || 0;
  const allowancesTotal = allowances.reduce(
    (sum, a) => sum + (Number(a.amount) || 0),
    0,
  );
  const gross = base + allowancesTotal;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compensation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Base salary</span>
            <span className="tabular-nums">
              {formatNumber(employee.salary)}
            </span>
          </div>

          {isLoading && <LoadingState />}
          {isError && <ErrorState error={error} />}

          {data && (
            <>
              {allowances.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-muted-foreground">{a.name}</span>
                  <span className="tabular-nums">{formatNumber(a.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-border pt-2 font-medium">
                <span>Gross monthly</span>
                <span className="tabular-nums">{formatNumber(gross)}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
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
          <form onSubmit={save} className="flex flex-col gap-3">
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
