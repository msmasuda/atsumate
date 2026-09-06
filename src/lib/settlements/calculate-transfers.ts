export type Balance = {
  participantId: string;
  amount: number;
};

export type Transfer = {
  fromId: string;
  toId: string;
  amount: number;
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
