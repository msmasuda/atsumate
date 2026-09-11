export type Balance = {
  participantId: string;
  amount: number;
};

export type Transfer = {
  fromId: string;
  toId: string;
  amount: number;
};

export type SettlementExpense = {
  id: string;
  amount: number;
  paidById: string;
};

export type ExpenseAllocation = {
  expenseId: string;
  participantId: string;
  allocatedAmount: number;
};

/**
 * 円単位のネット残高から送金を集約する。
 * 送金回数は最大N-1回になるが、すべての入力で厳密な最小回数を保証するものではない。
 */
export function calculateReducedTransfers(balances: Balance[]): Transfer[] {
  if (balances.some(({ amount }) => !Number.isSafeInteger(amount))) {
    throw new Error("残高は円単位の安全な整数で指定してください。");
  }

  const total = balances.reduce((sum, balance) => sum + balance.amount, 0);
  if (total !== 0) throw new Error("残高の合計が0円ではありません。");

  const debtors = balances
    .filter(({ amount }) => amount < 0)
    .map((balance) => ({ ...balance }))
    .sort((a, b) => a.amount - b.amount);
  const creditors = balances
    .filter(({ amount }) => amount > 0)
    .map((balance) => ({ ...balance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(-debtor.amount, creditor.amount);

    transfers.push({
      fromId: debtor.participantId,
      toId: creditor.participantId,
      amount,
    });

    debtor.amount += amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return transfers;
}

export function calculateEqualSettlement(
  expenses: SettlementExpense[],
  participantIds: string[],
) {
  if (participantIds.length === 0 || new Set(participantIds).size !== participantIds.length) {
    throw new Error("参加者を重複なく1名以上指定してください。");
  }
  if (expenses.some(({ amount }) => !Number.isSafeInteger(amount) || amount <= 0)) {
    throw new Error("立替金額は1円以上の安全な整数で指定してください。");
  }

  const allocations: ExpenseAllocation[] = [];
  const balances = new Map(participantIds.map((participantId) => [participantId, 0]));
  let totalExpense = 0;

  for (const expense of expenses) {
    const base = Math.floor(expense.amount / participantIds.length);
    const remainder = expense.amount % participantIds.length;
    participantIds.forEach((participantId, index) => {
      const allocatedAmount = base + (index < remainder ? 1 : 0);
      allocations.push({ expenseId: expense.id, participantId, allocatedAmount });
      balances.set(participantId, (balances.get(participantId) ?? 0) - allocatedAmount);
    });
    balances.set(expense.paidById, (balances.get(expense.paidById) ?? 0) + expense.amount);
    totalExpense += expense.amount;
  }

  if (!Number.isSafeInteger(totalExpense)) {
    throw new Error("立替金額の合計が安全な整数ではありません。");
  }

  return {
    allocations,
    totalExpense,
    transfers: calculateReducedTransfers(
      [...balances].map(([participantId, amount]) => ({ participantId, amount })),
    ),
  };
}
