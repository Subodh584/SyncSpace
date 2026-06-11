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

export function settleWorkspace(
  memberIds: string[],
  expenses: ExpenseInput[],
): { balances: MemberBalance[]; transactions: Transaction[] } {
  const balances = computeBalances(memberIds, expenses);
  const transactions = minimizeTransactions(balances);
  return { balances, transactions };
}
