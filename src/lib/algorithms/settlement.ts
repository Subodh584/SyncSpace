/**
 * Settlement engine.
 *
 * Given every expense and its splits, compute each member's net balance and
 * then produce a minimal set of transactions that settles all debts.
 *
 * The minimisation uses the classic greedy debt-simplification heuristic:
 * repeatedly match the largest creditor with the largest debtor. This does not
 * guarantee the theoretical minimum (that problem is NP-hard) but in practice
 * yields at most n-1 transactions and is what Splitwise-style apps use.
 */
import { round2 } from "@/lib/utils";

export interface ExpenseInput {
  amount: number;
  paidBy: string;
  splits: { userId: string; amount: number }[];
}

export interface MemberBalance {
  userId: string;
  totalPaid: number;
  totalOwed: number;
  net: number; // positive = should receive, negative = owes
}

export interface Transaction {
  from: string; // debtor
  to: string; // creditor
  amount: number;
}

export interface Payment {
  from: string; // who paid
  to: string; // who received
  amount: number;
}

export function computeBalances(
  memberIds: string[],
  expenses: ExpenseInput[],
): MemberBalance[] {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  for (const id of memberIds) {
    paid.set(id, 0);
    owed.set(id, 0);
  }

  for (const exp of expenses) {
    paid.set(exp.paidBy, (paid.get(exp.paidBy) ?? 0) + exp.amount);
    for (const split of exp.splits) {
      owed.set(split.userId, (owed.get(split.userId) ?? 0) + split.amount);
    }
  }

  return memberIds.map((id) => {
    const totalPaid = round2(paid.get(id) ?? 0);
    const totalOwed = round2(owed.get(id) ?? 0);
    return {
      userId: id,
      totalPaid,
      totalOwed,
      net: round2(totalPaid - totalOwed),
    };
  });
}

/**
 * Reduce balances to a minimal transaction list.
 * Amounts under 1 paisa are treated as settled (floating point tolerance).
 */
export function minimizeTransactions(
  balances: MemberBalance[],
): Transaction[] {
  const EPS = 0.01;
  const creditors = balances
    .filter((b) => b.net > EPS)
    .map((b) => ({ userId: b.userId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = balances
    .filter((b) => b.net < -EPS)
    .map((b) => ({ userId: b.userId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount);

  const txns: Transaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = round2(Math.min(debtor.amount, creditor.amount));
    if (amount > EPS) {
      txns.push({ from: debtor.userId, to: creditor.userId, amount });
    }
    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);
    if (debtor.amount <= EPS) i++;
    if (creditor.amount <= EPS) j++;
  }
  return txns;
}

/**
 * Apply already-settled payments to net balances. A completed payment from
 * `from` to `to` discharges debt: the payer's net rises (they owe less) and the
 * receiver's net falls (they are owed less). Without this, a settlement that was
 * marked paid would reappear every time settlements are recalculated, because
 * balances are otherwise derived purely from expenses. Mutates and returns the
 * given balances.
 *
 * Payments can only discharge debt that currently exists — they never push a
 * balance past zero into a reverse debt. Each member's net is clamped between 0
 * and their expense-only (raw) net. This matters when an expense is edited or
 * deleted *after* a settlement was marked paid: the historical payment would
 * otherwise over-discharge the (now smaller) debt and fabricate phantom
 * "creditor owes debtor a refund" transactions. The excess is simply ignored.
 */
export function applyPayments(
  balances: MemberBalance[],
  payments: Payment[],
): MemberBalance[] {
  if (payments.length === 0) return balances;
  // Capture the expense-only net so the clamp can use it as a bound.
  const rawNet = new Map(balances.map((b) => [b.userId, b.net]));
  const byId = new Map(balances.map((b) => [b.userId, b]));
  for (const p of payments) {
    const from = byId.get(p.from);
    const to = byId.get(p.to);
    if (from) from.net = round2(from.net + p.amount);
    if (to) to.net = round2(to.net - p.amount);
  }
  for (const b of balances) {
    const raw = rawNet.get(b.userId) ?? 0;
    const lo = Math.min(0, raw);
    const hi = Math.max(0, raw);
    b.net = round2(Math.min(hi, Math.max(lo, b.net)));
  }
  return balances;
}

export function settleWorkspace(
  memberIds: string[],
  expenses: ExpenseInput[],
  completedPayments: Payment[] = [],
): { balances: MemberBalance[]; transactions: Transaction[] } {
  const balances = applyPayments(
    computeBalances(memberIds, expenses),
    completedPayments,
  );
  const transactions = minimizeTransactions(balances);
  return { balances, transactions };
}
