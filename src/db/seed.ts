import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Seed script — creates demo users, a workspace, members, tasks, expenses,
 * a rotation and optimised settlements so the app has realistic data.
 *
 * Run with: npm run db:seed
 * Re-running is safe: demo users (by email) are deleted and recreated.
 */
async function main() {
  const { db } = await import("./index");
  const schema = await import("./schema");
  const { eq, inArray } = await import("drizzle-orm");
  const { hashPassword } = await import("better-auth/crypto");
  const { genId, genJoinCode } = await import("@/lib/ids");
  const { calculateSplits } = await import("@/lib/algorithms/splits");
  const { settleWorkspace } = await import("@/lib/algorithms/settlement");

  function workspaceUserId(username: string) {
    return `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const demo = [
    { name: "Subodh Chauhan", username: "subodh", email: "subodh@demo.dev" },
    { name: "Rahul Verma", username: "rahul", email: "rahul@demo.dev" },
    { name: "Amit Singh", username: "amit", email: "amit@demo.dev" },
    { name: "Rohit Sharma", username: "rohit", email: "rohit@demo.dev" },
  ];
  const password = "password123";

  console.log("🧹 Clearing existing demo users…");
  const emails = demo.map((d) => d.email);
  const existing = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(inArray(schema.user.email, emails));
  if (existing.length) {
    await db
      .delete(schema.user)
      .where(
        inArray(
          schema.user.id,
          existing.map((u) => u.id),
        ),
      );
  }

  console.log("👤 Creating demo users…");
  const hashed = await hashPassword(password);
  for (const d of demo) {
    const userId = genId();
    await db.insert(schema.user).values({
      id: userId,
      name: d.name,
      email: d.email,
      emailVerified: true,
      username: d.username,
      workspaceUserId: workspaceUserId(d.username),
    });
    // Better Auth email/password stores credentials in the `account` table
    // under the "credential" provider with accountId === user id.
    await db.insert(schema.account).values({
      id: genId(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
    });
  }

  const users = await db
    .select()
    .from(schema.user)
    .where(inArray(schema.user.email, emails));
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const owner = byEmail["subodh@demo.dev"];
  const memberIds = users.map((u) => u.id);

  console.log("🏠 Creating workspace…");
  const wsId = genId();
  await db.insert(schema.workspaces).values({
    id: wsId,
    name: "Boys Hostel Room 302",
    description: "Shared chores and expenses for room 302.",
    ownerId: owner.id,
    joinCode: genJoinCode(),
    assignmentStrategy: "weighted",
  });
  await db.insert(schema.workspaceMembers).values(
    users.map((u) => ({
      id: genId(),
      workspaceId: wsId,
      userId: u.id,
      role: u.id === owner.id ? ("owner" as const) : ("member" as const),
    })),
  );

  console.log("✅ Creating tasks…");
  const taskDefs = [
    { title: "Clean the bathroom", weight: 3, priority: "high", status: "pending" },
    { title: "Take out the trash", weight: 1, priority: "low", status: "completed" },
    { title: "Buy groceries", weight: 2, priority: "medium", status: "in_progress" },
    { title: "Mop the floor", weight: 2, priority: "medium", status: "pending" },
    { title: "Fix the WiFi router", weight: 3, priority: "high", status: "pending" },
    { title: "Refill water cans", weight: 1, priority: "low", status: "completed" },
  ] as const;
  await db.insert(schema.tasks).values(
    taskDefs.map((t, i) => ({
      id: genId(),
      title: t.title,
      difficultyWeight: t.weight,
      priority: t.priority,
      status: t.status,
      workspaceId: wsId,
      createdBy: owner.id,
      assignedTo: memberIds[i % memberIds.length],
      completedAt: t.status === "completed" ? new Date() : null,
    })),
  );

  console.log("💰 Creating expenses…");
  const expenseDefs = [
    { desc: "Monthly groceries", amount: 4800, category: "food", payer: byEmail["rahul@demo.dev"].id },
    { desc: "Electricity bill", amount: 2400, category: "utilities", payer: byEmail["amit@demo.dev"].id },
    { desc: "Cab to station", amount: 600, category: "travel", payer: owner.id },
  ] as const;
  for (const e of expenseDefs) {
    const expId = genId();
    await db.insert(schema.expenses).values({
      id: expId,
      amount: e.amount,
      description: e.desc,
      category: e.category,
      splitMethod: "equal",
      paidBy: e.payer,
      workspaceId: wsId,
    });
    const splits = calculateSplits(
      "equal",
      e.amount,
      memberIds.map((id) => ({ userId: id })),
    );
    await db.insert(schema.expenseSplits).values(
      splits.map((s) => ({
        id: genId(),
        expenseId: expId,
        userId: s.userId,
        amount: s.amount,
      })),
    );
  }

  console.log("🔁 Creating rotation…");
  await db.insert(schema.taskRotations).values({
    id: genId(),
    workspaceId: wsId,
    title: "Kitchen cleaning duty",
    description: "Whoever's turn it is cleans the shared kitchen.",
    frequency: "weekly",
    memberOrder: memberIds,
    currentAssigneeId: memberIds[0],
    nextAssigneeId: memberIds[1],
    history: [{ userId: memberIds[0], rotatedAt: Math.floor(Date.now() / 1000) }],
    lastRotatedAt: new Date(),
  });

  console.log("⚖️  Generating settlements…");
  const allExpenses = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.workspaceId, wsId));
  const expenseInputs = [];
  for (const e of allExpenses) {
    const splits = await db
      .select()
      .from(schema.expenseSplits)
      .where(eq(schema.expenseSplits.expenseId, e.id));
    expenseInputs.push({
      amount: e.amount,
      paidBy: e.paidBy,
      splits: splits.map((s) => ({ userId: s.userId, amount: s.amount })),
    });
  }
  const { transactions } = settleWorkspace(memberIds, expenseInputs);
  if (transactions.length) {
    await db.insert(schema.settlements).values(
      transactions.map((t) => ({
        id: genId(),
        workspaceId: wsId,
        fromUserId: t.from,
        toUserId: t.to,
        amount: t.amount,
        status: "pending" as const,
      })),
    );
  }

  console.log("📝 Adding activity…");
  await db.insert(schema.activityLogs).values([
    {
      id: genId(),
      workspaceId: wsId,
      actorId: owner.id,
      type: "member_joined",
      message: "Subodh created the workspace",
    },
    {
      id: genId(),
      workspaceId: wsId,
      actorId: byEmail["rahul@demo.dev"].id,
      type: "expense_added",
      message: "Rahul added an expense “Monthly groceries” (₹4,800.00)",
    },
  ]);

  console.log("\n✅ Seed complete!");
  console.log("   Log in with any of:");
  demo.forEach((d) => console.log(`   • ${d.email} / ${password}`));
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
