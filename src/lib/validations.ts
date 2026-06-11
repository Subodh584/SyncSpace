import { z } from "zod";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  EXPENSE_CATEGORIES,
  SPLIT_METHODS,
  ASSIGNMENT_STRATEGIES,
  ROTATION_FREQUENCIES,
} from "./constants";

/* Auth */
export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(60),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  email: z.string().email(),
  password: z.string().min(8, "Minimum 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  image: z.string().url().optional().or(z.literal("")),
});

/* Workspace */
export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  description: z.string().max(300).optional(),
  assignmentStrategy: z.enum(ASSIGNMENT_STRATEGIES).default("round_robin"),
  currency: z.string().default("INR"),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

/* Invitations */
export const inviteByIdSchema = z.object({
  workspaceId: z.string().min(1),
  workspaceUserId: z.string().min(1, "Enter a workspace user ID"),
});

export const joinByCodeSchema = z.object({
  joinCode: z.string().min(4, "Enter a join code"),
});

export const respondInvitationSchema = z.object({
  invitationId: z.string().min(1),
  action: z.enum(["accept", "reject"]),
});

/* Tasks */
export const createTaskSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(2, "Title is too short").max(120),
  description: z.string().max(1000).optional(),
  difficultyWeight: z.coerce.number().int().min(1).max(3).default(1),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  status: z.enum(TASK_STATUSES).default("pending"),
  dueDate: z.coerce.date().optional(),
  assignedTo: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema
  .omit({ workspaceId: true })
  .partial()
  .extend({ id: z.string().min(1) });

export const moveTaskSchema = z.object({
  id: z.string().min(1),
  status: z.enum(TASK_STATUSES),
  position: z.coerce.number().int().min(0),
});

export const autoAssignSchema = z.object({
  workspaceId: z.string().min(1),
  strategy: z.enum(ASSIGNMENT_STRATEGIES),
  onlyUnassigned: z.boolean().default(true),
});

/* Rotations */
export const createRotationSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  frequency: z.enum(ROTATION_FREQUENCIES).default("weekly"),
  memberOrder: z.array(z.string()).min(1, "Add at least one member"),
});

/* Expenses */
const splitMemberSchema = z.object({
  userId: z.string().min(1),
  value: z.number().optional(),
  included: z.boolean().optional(),
});

export const createExpenseSchema = z.object({
  workspaceId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().min(2).max(200),
  category: z.enum(EXPENSE_CATEGORIES).default("misc"),
  splitMethod: z.enum(SPLIT_METHODS).default("equal"),
  paidBy: z.string().min(1),
  date: z.coerce.date().optional(),
  members: z.array(splitMemberSchema).min(1),
});

export const updateExpenseSchema = createExpenseSchema
  .omit({ workspaceId: true })
  .extend({ id: z.string().min(1) });

/* Settlements */
export const markSettledSchema = z.object({
  settlementId: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
