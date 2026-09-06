import { useState } from "react"
import { ChevronDown, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Field, FormDialog } from "@/components/form-dialog"
import { ResourceList, RowActions } from "@/components/resource-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useHasPermission } from "@/hooks/use-has-permissions"
import { usePagedQuery } from "@/hooks/use-paged-query"
import {
  ALL,
  type AppUser,
  type Role,
  fieldErrorsFrom,
  formErrorFrom,
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
} from "@/lib/api"
import { useAppSelector } from "@/lib/redux/hooks"
import { formatDisplayDateTime } from "@/lib/utils/date"
import { notifier } from "@/lib/utils/notifier"

/** Every account that can sign in, and the roles it holds. */
export function AccountsSection() {
  const roles = useGetRolesQuery({ ...ALL, assignable: true })
  const { params, offset, setOffset, filters, setFilters } = usePagedQuery({
    search: "",
  })
  const { data, isLoading, isFetching, error, refetch } =
    useGetUsersQuery(params)

  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [archiving, setArchiving] = useState<AppUser | null>(null)
  const [archive, { isLoading: isArchiving }] = useDeleteUserMutation()
  const [update] = useUpdateUserMutation()
  const currentAccountId = useAppSelector((state) => state.auth.profile?.id)

  const canAdd = useHasPermission("add_user")
  const canEdit = useHasPermission("edit_user")
  const canDelete = useHasPermission("delete_user")

  const toggleRole = async (
    user: AppUser,
    roleId: number,
    checked: boolean
  ) => {
    const current = user.roles
      .filter((role) => role.codename !== "SYSTEM-USER")
      .map((role) => role.id)
    const next = checked
      ? Array.from(new Set([...current, roleId]))
      : current.filter((id) => id !== roleId)

    try {
      await update({ id: user.id, body: { roles: next } }).unwrap()
      notifier.success(`Role updated for ${user.username}.`)
    } catch {
      notifier.error("Could not change that role.")
    }
  }

  return (
    <>
      <ResourceList
        rows={data?.results}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        refetch={refetch}
        count={data?.count}
        offset={offset}
        onOffsetChange={setOffset}
        search={{
          value: filters.search,
          onChange: (value) => setFilters({ search: value }),
          placeholder: "Search accounts",
        }}
        action={
          canAdd ? (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" aria-hidden />
              New account
            </Button>
          ) : null
        }
        emptyTitle="No accounts match that"
        emptyMessage="Everyone who signs in to this college appears here."
        columns={[
          {
            header: "#",
            className: "w-12 text-right tabular-nums text-muted-foreground",
            cell: (_row, rowIndex) => offset + rowIndex + 1,
          },
          {
            header: "Name",
            cell: (row) => (
              <span className="font-medium">
                {row.fullName || "—"}
                {row.isSuperuser && (
                  <Badge className="ml-2 gap-1 text-xs">
                    <ShieldCheck className="size-3" aria-hidden />
                    Admin
                  </Badge>
                )}
              </span>
            ),
          },
          {
            header: "Username",
            className: "font-mono text-xs text-muted-foreground",
            cell: (row) => row.username,
          },
          {
            header: "Email",
            className: "text-muted-foreground",
            cell: (row) => row.email,
          },
          {
            header: "Phone",
            className: "whitespace-nowrap text-muted-foreground tabular-nums",
            cell: (row) => (
              <div className="space-y-0.5">
                <div>{row.phoneNo || "—"}</div>
                {row.alternatePhoneNo && (
                  <div className="text-xs">Alt: {row.alternatePhoneNo}</div>
                )}
              </div>
            ),
          },
          {
            header: "Role",
            className: "w-56",
            cell: (row) =>
              row.isSuperuser ? (
                <span className="text-sm text-muted-foreground">
                  All permissions
                </span>
              ) : canEdit ? (
                <RolePicker
                  roles={roles.data?.results ?? []}
                  selectedIds={row.roles.map((role) => role.id)}
                  ariaLabel={`Roles for ${row.username}`}
                  onToggle={(roleId, checked) =>
                    void toggleRole(row, roleId, checked)
                  }
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  {row.roles
                    .filter((role) => role.codename !== "SYSTEM-USER")
                    .map((role) => role.name)
                    .join(", ") || "—"}
                </span>
              ),
          },
          {
            header: "Status",
            className: "whitespace-nowrap",
            cell: (row) => (
              <Badge variant={row.isActive ? "secondary" : "destructive"}>
                {row.isActive ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            header: "Last login",
            className: "min-w-40 whitespace-nowrap",
            cell: (row) =>
              row.lastLogin ? (
                <div>
                  <div className="text-sm tabular-nums">
                    {formatDisplayDateTime(row.lastLogin)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Details locked
                  </div>
                </div>
              ) : (
                <Badge variant="outline">Never signed in</Badge>
              ),
          },
          {
            header: "",
            className: "w-20 text-right",
            cell: (row) => (
              <RowActions>
                {canEdit && !row.isSuperuser && row.id !== currentAccountId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${row.username}`}
                    title={
                      row.lastLogin ? "Manage account access" : "Edit account"
                    }
                    onClick={() => setEditing(row)}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                )}
                {canDelete &&
                  !row.isSuperuser &&
                  row.id !== currentAccountId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Archive ${row.username}`}
                      onClick={() => setArchiving(row)}
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                    </Button>
                  )}
              </RowActions>
            ),
          },
        ]}
      />

      {isCreating && <UserForm onClose={() => setIsCreating(false)} />}
      {editing && <UserForm user={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(open) => !open && setArchiving(null)}
        title={`Archive ${archiving?.username}?`}
        description="They can no longer sign in. Everything they created is kept."
        isPending={isArchiving}
        onConfirm={async () => {
          if (!archiving) return
          try {
            await archive(archiving.id).unwrap()
            notifier.success("Account archived.")
            setArchiving(null)
          } catch {
            notifier.error("Could not archive that account.")
          }
        }}
      />
    </>
  )
}

function RolePicker({
  roles,
  selectedIds,
  onToggle,
  ariaLabel,
}: {
  roles: Role[]
  selectedIds: number[]
  onToggle: (roleId: number, checked: boolean) => void
  ariaLabel: string
}) {
  const selected = roles.filter((role) => selectedIds.includes(role.id))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
          aria-label={ariaLabel}
        >
          <span className="truncate">
            {selected.map((role) => role.name).join(", ") || "No role yet"}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        {roles.map((role) => (
          <DropdownMenuCheckboxItem
            key={role.id}
            checked={selectedIds.includes(role.id)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => onToggle(role.id, checked === true)}
          >
            {role.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserForm({ user, onClose }: { user?: AppUser; onClose: () => void }) {
  const roles = useGetRolesQuery({ ...ALL, assignable: true })
  const [create, createState] = useCreateUserMutation()
  const [update, updateState] = useUpdateUserMutation()
  const state = user ? updateState : createState
  const detailsEditable = !user?.lastLogin
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    middleName: user?.middleName ?? "",
    lastName: user?.lastName ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    phoneNo: user?.phoneNo ?? "",
    alternatePhoneNo: user?.alternatePhoneNo ?? "",
    password: "",
    roles:
      user?.roles
        .filter((role) => role.codename !== "SYSTEM-USER")
        .map((role) => role.id) ?? ([] as number[]),
    isActive: user?.isActive ?? true,
  })

  const errors = fieldErrorsFrom(state.error)

  return (
    <FormDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={user ? `Edit ${user.username}` : "New Account"}
      description={
        !user
          ? "Create a sign-in and assign the user's initial role."
          : detailsEditable
            ? "This account has not signed in yet, so its details and access can still be corrected."
            : "Identity details are locked after first sign-in. You can still activate or deactivate access."
      }
      formError={formErrorFrom(state.error)}
      isSubmitting={state.isLoading}
      canSubmit={Boolean(
        user
          ? !detailsEditable || (form.username.trim() && form.email.trim())
          : form.username.trim() && form.email.trim() && form.password
      )}
      submitLabel={user ? "Save changes" : "Create account"}
      contentClassName="sm:max-w-2xl"
      onSubmit={async () => {
        try {
          if (user) {
            const body = detailsEditable
              ? {
                  username: form.username.trim(),
                  email: form.email.trim(),
                  phoneNo: form.phoneNo.trim(),
                  alternatePhoneNo: form.alternatePhoneNo.trim(),
                  firstName: form.firstName.trim(),
                  middleName: form.middleName.trim(),
                  lastName: form.lastName.trim(),
                  roles: form.roles,
                  isActive: form.isActive,
                  ...(form.password ? { password: form.password } : {}),
                }
              : { isActive: form.isActive }

            await update({ id: user.id, body }).unwrap()
            notifier.success(
              form.isActive === user.isActive
                ? "Account updated."
                : form.isActive
                  ? "Account activated."
                  : "Account deactivated."
            )
          } else {
            await create({
              username: form.username.trim(),
              email: form.email.trim(),
              phoneNo: form.phoneNo.trim(),
              alternatePhoneNo: form.alternatePhoneNo.trim(),
              password: form.password,
              firstName: form.firstName.trim(),
              middleName: form.middleName.trim(),
              lastName: form.lastName.trim(),
              roles: form.roles,
            }).unwrap()
            notifier.success("Account created.")
          }
          onClose()
        } catch {
          /* the form shows the error */
        }
      }}
    >
      {detailsEditable && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="First name"
              htmlFor="u-first"
              error={errors.firstName}
            >
              <Input
                id="u-first"
                value={form.firstName}
                onChange={(event) =>
                  setForm({ ...form, firstName: event.target.value })
                }
              />
            </Field>
            <Field
              label="Middle name"
              htmlFor="u-middle"
              error={errors.middleName}
            >
              <Input
                id="u-middle"
                value={form.middleName}
                onChange={(event) =>
                  setForm({ ...form, middleName: event.target.value })
                }
                placeholder="Optional"
              />
            </Field>
            <Field label="Last name" htmlFor="u-last" error={errors.lastName}>
              <Input
                id="u-last"
                value={form.lastName}
                onChange={(event) =>
                  setForm({ ...form, lastName: event.target.value })
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Username"
              htmlFor="u-username"
              error={errors.username}
            >
              <Input
                id="u-username"
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
              />
            </Field>
            <Field label="Email" htmlFor="u-email" error={errors.email}>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Primary phone"
              htmlFor="u-phone"
              error={errors.phoneNo}
            >
              <Input
                id="u-phone"
                type="tel"
                inputMode="tel"
                value={form.phoneNo}
                onChange={(event) =>
                  setForm({ ...form, phoneNo: event.target.value })
                }
                placeholder="Optional"
              />
            </Field>
            <Field
              label="Alternate phone"
              htmlFor="u-alt-phone"
              error={errors.alternatePhoneNo}
            >
              <Input
                id="u-alt-phone"
                type="tel"
                inputMode="tel"
                value={form.alternatePhoneNo}
                onChange={(event) =>
                  setForm({ ...form, alternatePhoneNo: event.target.value })
                }
                placeholder="Optional"
              />
            </Field>
          </div>

          <Field
            label={user ? "New temporary password" : "Temporary password"}
            htmlFor="u-password"
            error={errors.password}
            hint={
              user
                ? "Leave blank to keep the current temporary password."
                : "The user can change this after signing in."
            }
          >
            <Input
              id="u-password"
              type="text"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              placeholder={user ? "Unchanged" : undefined}
            />
          </Field>

          <Field
            label="Roles"
            error={errors.roles}
            hint="Select every responsibility this account should have."
          >
            <RolePicker
              roles={roles.data?.results ?? []}
              selectedIds={form.roles}
              ariaLabel="Roles"
              onToggle={(roleId, checked) =>
                setForm({
                  ...form,
                  roles: checked
                    ? [...form.roles, roleId]
                    : form.roles.filter((id) => id !== roleId),
                })
              }
            />
          </Field>
        </>
      )}

      {user?.lastLogin && (
        <div className="border bg-band p-3 text-sm">
          <div className="font-semibold">Account details are locked</div>
          <p className="mt-1 text-muted-foreground">
            First sign-in has occurred. Last login:{" "}
            {formatDisplayDateTime(user.lastLogin)}.
          </p>
        </div>
      )}

      {user && (
        <Field label="Account access" error={errors.isActive}>
          <label
            htmlFor="u-active"
            className="flex cursor-pointer items-start gap-3 border bg-card p-3"
          >
            <Checkbox
              id="u-active"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm({ ...form, isActive: checked === true })
              }
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-semibold">
                {form.isActive ? "Account is active" : "Account is deactivated"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {form.isActive
                  ? "This user can sign in according to their assigned role."
                  : "Sign-in and authenticated access are blocked until reactivated."}
              </span>
            </span>
          </label>
        </Field>
      )}
    </FormDialog>
  )
}
