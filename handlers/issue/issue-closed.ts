import { Comment } from "../../types/payload";
import { generatePermits } from "./generate-permits";
import { aggregateAndScoreContributions } from "./scoreSources";
import { sumTotalScores } from "./sumTotalScoresPerContributor";

export const botCommandsAndHumanCommentsFilter = (comment: Comment) =>
  !comment.body.startsWith("/") /* No Commands */ && comment.user.type === "User"; /* No Bots */

const botCommentsFilter = (comment: Comment) => comment.user.type === "Bot"; /* No Humans */

export async function issueClosed(issue, issueComments, openAi, repoCollaborators, pullRequestComments, config) {
  const sourceScores = await aggregateAndScoreContributions({
    issue,
    issueComments,
    repoCollaborators,
    openAi,
    pullRequestComments
  });
  // 2. sum total scores will sum the scores of every contribution, and organize them by contributor
  const contributorTotalScores = sumTotalScores(sourceScores);
  // 3. generate permits will generate a payment for every contributor
  const permitComment = await generatePermits(contributorTotalScores, issue, config);
  // 4. return the permit comment
  return permitComment;
}