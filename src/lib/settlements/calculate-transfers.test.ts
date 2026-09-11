import { describe, expect, it } from "vitest";

import { calculateEqualSettlement, calculateReducedTransfers } from "./calculate-transfers";

describe("calculateReducedTransfers", () => {
  it("複数の立替残高を集約する", () => {
    expect(
      calculateReducedTransfers([
        { participantId: "a", amount: -4_000 },
        { participantId: "b", amount: -2_000 },
        { participantId: "c", amount: 6_000 },
      ]),
    ).toEqual([
      { fromId: "a", toId: "c", amount: 4_000 },
      { fromId: "b", toId: "c", amount: 2_000 },
    ]);
  });

  it("入力を変更しない", () => {
    const balances = [
      { participantId: "a", amount: -500 },
      { participantId: "b", amount: 500 },
    ];
    calculateReducedTransfers(balances);
    expect(balances).toEqual([
      { participantId: "a", amount: -500 },
      { participantId: "b", amount: 500 },
    ]);
  });

  it("合計が0円でない入力を拒否する", () => {
    expect(() =>
      calculateReducedTransfers([{ participantId: "a", amount: 100 }]),
    ).toThrow("残高の合計が0円ではありません。");
  });

  it("小数の入力を拒否する", () => {
    expect(() =>
      calculateReducedTransfers([
        { participantId: "a", amount: -100.5 },
        { participantId: "b", amount: 100.5 },
      ]),
    ).toThrow("残高は円単位の安全な整数で指定してください。");
  });
});

describe("calculateEqualSettlement", () => {
  it("1円未満の端数を参加者順に配り、送金を集約する", () => {
    expect(
      calculateEqualSettlement([{ id: "expense", amount: 1_000, paidById: "a" }], ["a", "b", "c"]),
    ).toEqual({
      allocations: [
        { expenseId: "expense", participantId: "a", allocatedAmount: 334 },
        { expenseId: "expense", participantId: "b", allocatedAmount: 333 },
        { expenseId: "expense", participantId: "c", allocatedAmount: 333 },
      ],
      totalExpense: 1_000,
      transfers: [
        { fromId: "b", toId: "a", amount: 333 },
        { fromId: "c", toId: "a", amount: 333 },
      ],
    });
  });
});
