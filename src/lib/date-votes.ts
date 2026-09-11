export type DateVoteStatus = "ATTENDING" | "CONDITIONAL" | "DECLINED";

export function summarizeDateVotes(
  votes: Array<{ status: DateVoteStatus }>,
  participantCount: number,
) {
  const summary = { attending: 0, conditional: 0, declined: 0, unanswered: 0 };

  for (const vote of votes) {
    if (vote.status === "ATTENDING") summary.attending += 1;
    if (vote.status === "CONDITIONAL") summary.conditional += 1;
    if (vote.status === "DECLINED") summary.declined += 1;
  }
  summary.unanswered = Math.max(0, participantCount - votes.length);

  return summary;
}
