import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* ────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────── */

const createdAt = integer("created_at", { mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`);

const updatedAt = integer("updated_at", { mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`);

/* ────────────────────────────────────────────────────────────
 * Better Auth core tables (user / session / account / verification)
 * The `user` table is extended with SyncSpace profile fields.
 * ──────────────────────────────────────────────────────────── */

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"), // avatar URL
    // SyncSpace profile additions
    username: text("username").notNull().unique(),
    // Unique searchable Workspace ID used for invitations, e.g. "subodh_1234"
    workspaceUserId: text("workspace_user_id").notNull().unique(),
    createdAt,
    updatedAt,
  },
  (t) => ({
    usernameIdx: index("user_username_idx").on(t.username),
    workspaceUserIdIdx: index("user_workspace_user_id_idx").on(
      t.workspaceUserId,
    ),
  }),
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  (t) => ({
    userIdIdx: index("session_user_id_idx").on(t.userId),
  }),
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    userIdIdx: index("account_user_id_idx").on(t.userId),
  }),
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => ({
    identifierIdx: index("verification_identifier_idx").on(t.identifier),
  }),
);

/* ────────────────────────────────────────────────────────────
 * Workspaces & membership
 * ──────────────────────────────────────────────────────────── */

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinCode: text("join_code").notNull().unique(),
    // Default automatic task-assignment strategy for this workspace
    assignmentStrategy: text("assignment_strategy", {
      enum: ["round_robin", "random", "equal", "weighted"],
    })
      .notNull()
      .default("round_robin"),
    currency: text("currency").notNull().default("INR"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    ownerIdIdx: index("workspaces_owner_id_idx").on(t.ownerId),
    joinCodeIdx: index("workspaces_join_code_idx").on(t.joinCode),
  }),
);

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] })
      .notNull()
      .default("member"),
    joinedAt: createdAt,
  },
  (t) => ({
    uniqMember: uniqueIndex("workspace_members_unique").on(
      t.workspaceId,
      t.userId,
    ),
    workspaceIdIdx: index("workspace_members_workspace_id_idx").on(
      t.workspaceId,
    ),
    userIdIdx: index("workspace_members_user_id_idx").on(t.userId),
  }),
);

export const workspaceInvitations = sqliteTable(
  "workspace_invitations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    inviteeId: text("invitee_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    inviteeIdentifier: text("invitee_identifier"), // workspaceUserId / email used to invite
    method: text("method", { enum: ["user_id", "join_code"] })
      .notNull()
      .default("user_id"),
    status: text("status", {
      enum: ["pending", "accepted", "rejected", "expired"],
    })
      .notNull()
      .default("pending"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => ({
    workspaceIdIdx: index("invitations_workspace_id_idx").on(t.workspaceId),
    inviteeIdIdx: index("invitations_invitee_id_idx").on(t.inviteeId),
    statusIdx: index("invitations_status_idx").on(t.status),
  }),
);

/* ────────────────────────────────────────────────────────────
 * Tasks & rotations
 * ──────────────────────────────────────────────────────────── */

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    // 1 = easy, 2 = medium, 3 = hard (used by weighted distribution & fairness)
    difficultyWeight: integer("difficulty_weight").notNull().default(1),
    priority: text("priority", { enum: ["low", "medium", "high"] })
      .notNull()
      .default("medium"),
    status: text("status", {
      enum: ["pending", "in_progress", "completed"],
    })
      .notNull()
      .default("pending"),
    // Position within a status column for the drag-and-drop board
    position: integer("position").notNull().default(0),
    dueDate: integer("due_date", { mode: "timestamp" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedTo: text("assigned_to").references(() => user.id, {
      onDelete: "set null",
    }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt,
    updatedAt,
  },
  (t) => ({
    workspaceIdIdx: index("tasks_workspace_id_idx").on(t.workspaceId),
    assignedToIdx: index("tasks_assigned_to_idx").on(t.assignedTo),
    statusIdx: index("tasks_status_idx").on(t.status),
  }),
);

export const taskRotations = sqliteTable(
  "task_rotations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    frequency: text("frequency", {
      enum: ["daily", "weekly", "monthly"],
    })
      .notNull()
      .default("weekly"),
    // Ordered JSON array of userIds defining who rotates and in what order
    memberOrder: text("member_order", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    currentAssigneeId: text("current_assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    nextAssigneeId: text("next_assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    // Append-only history: [{ userId, rotatedAt }]
    history: text("history", { mode: "json" })
      .$type<{ userId: string; rotatedAt: number }[]>()
      .notNull()
      .default(sql`'[]'`),
    lastRotatedAt: integer("last_rotated_at", { mode: "timestamp" }),
    nextRotationAt: integer("next_rotation_at", { mode: "timestamp" }),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt,
    updatedAt,
  },
  (t) => ({
    workspaceIdIdx: index("rotations_workspace_id_idx").on(t.workspaceId),
  }),
);

/* ────────────────────────────────────────────────────────────
 * Expenses & splits
 * ──────────────────────────────────────────────────────────── */

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    amount: real("amount").notNull(),
    description: text("description").notNull(),
    category: text("category", {
      enum: ["food", "travel", "rent", "utilities", "shopping", "misc"],
    })
      .notNull()
      .default("misc"),
    splitMethod: text("split_method", {
      enum: ["equal", "percentage", "fixed", "custom"],
    })
      .notNull()
      .default("equal"),
    paidBy: text("paid_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    date: integer("date", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdAt,
    updatedAt,
  },
  (t) => ({
    workspaceIdIdx: index("expenses_workspace_id_idx").on(t.workspaceId),
    paidByIdx: index("expenses_paid_by_idx").on(t.paidBy),
  }),
);

export const expenseSplits = sqliteTable(
  "expense_splits",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(), // amount this user owes for the expense
    percentage: real("percentage"), // populated for percentage splits
  },
  (t) => ({
    uniqSplit: uniqueIndex("expense_splits_unique").on(t.expenseId, t.userId),
    expenseIdIdx: index("expense_splits_expense_id_idx").on(t.expenseId),
    userIdIdx: index("expense_splits_user_id_idx").on(t.userId),
  }),
);

/* ────────────────────────────────────────────────────────────
 * Settlements
 * ──────────────────────────────────────────────────────────── */

export const settlements = sqliteTable(
  "settlements",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id") // debtor
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id") // creditor
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    status: text("status", { enum: ["pending", "completed"] })
      .notNull()
      .default("pending"),
    settledAt: integer("settled_at", { mode: "timestamp" }),
    createdAt,
    updatedAt,
  },
  (t) => ({
    workspaceIdIdx: index("settlements_workspace_id_idx").on(t.workspaceId),
    fromUserIdIdx: index("settlements_from_user_id_idx").on(t.fromUserId),
    toUserIdIdx: index("settlements_to_user_id_idx").on(t.toUserId),
  }),
);

/* ────────────────────────────────────────────────────────────
 * Notifications & activity logs
 * ──────────────────────────────────────────────────────────── */

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    type: text("type", {
      enum: [
        "invitation",
        "task_assigned",
        "task_created",
        "task_completed",
        "expense_added",
        "settlement_completed",
        "rotation_changed",
        "member_joined",
      ],
    }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    createdAt,
  },
  (t) => ({
    userIdIdx: index("notifications_user_id_idx").on(t.userId),
    readIdx: index("notifications_read_idx").on(t.read),
  }),
);

export const activityLogs = sqliteTable(
  "activity_logs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    type: text("type", {
      enum: [
        "member_joined",
        "task_assigned",
        "task_completed",
        "task_created",
        "expense_added",
        "settlement_completed",
        "rotation_changed",
      ],
    }).notNull(),
    message: text("message").notNull(),
    metadata: text("metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    createdAt,
  },
  (t) => ({
    workspaceIdIdx: index("activity_logs_workspace_id_idx").on(t.workspaceId),
    createdAtIdx: index("activity_logs_created_at_idx").on(t.createdAt),
  }),
);

/* ────────────────────────────────────────────────────────────
 * Relations
 * ──────────────────────────────────────────────────────────── */

export const userRelations = relations(user, ({ many }) => ({
  memberships: many(workspaceMembers),
  ownedWorkspaces: many(workspaces),
}));

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(user, {
    fields: [workspaces.ownerId],
    references: [user.id],
  }),
  members: many(workspaceMembers),
  tasks: many(tasks),
  expenses: many(expenses),
  invitations: many(workspaceInvitations),
}));

export const workspaceMemberRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(user, {
      fields: [workspaceMembers.userId],
      references: [user.id],
    }),
  }),
);

export const taskRelations = relations(tasks, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [tasks.workspaceId],
    references: [workspaces.id],
  }),
  assignee: one(user, {
    fields: [tasks.assignedTo],
    references: [user.id],
  }),
  creator: one(user, {
    fields: [tasks.createdBy],
    references: [user.id],
  }),
}));

export const expenseRelations = relations(expenses, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [expenses.workspaceId],
    references: [workspaces.id],
  }),
  payer: one(user, {
    fields: [expenses.paidBy],
    references: [user.id],
  }),
  splits: many(expenseSplits),
}));

export const expenseSplitRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  user: one(user, {
    fields: [expenseSplits.userId],
    references: [user.id],
  }),
}));

/* ────────────────────────────────────────────────────────────
 * Inferred types
 * ──────────────────────────────────────────────────────────── */

export type User = typeof user.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskRotation = typeof taskRotations.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
