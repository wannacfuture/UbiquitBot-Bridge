import Decimal from "decimal.js";

import { Comment, Issue, User } from "../../types/payload";
import { allCommentScoring } from "./allCommentScoring";
import { CommentScoring } from "./comment-scoring-rubric";
import { ContributorView } from "./contribution-style-types";
import { UserScoreDetails } from "./issue-shared-types";
import { addRelevanceAndFormatScoring } from "./relevance-format-scoring";
import { relevanceScoring } from "./relevance-scoring";
import OpenAI from "openai";

export async function commentsScoring({
  issue,
  source,
  view,
  repoCollaborators,
  openAi,
}: {
  issue: Issue;
  source: Comment[];
  view: ContributorView;
  repoCollaborators: User[];
  openAi: OpenAI;
}): Promise<UserScoreDetails[]> {
  const relevance = await relevanceScoring(issue, source, openAi);
  const relevanceWithMetaData = relevance.score.map(enrichRelevanceData(source));

  const formatting: CommentScoring[] = await allCommentScoring({issue, comments: source, view, repoCollaborators });
  const formattingWithRelevance: CommentScoring[] = addRelevanceAndFormatScoring(relevanceWithMetaData, formatting);

  const userScoreDetails = formattingWithRelevance.reduce((acc, commentScoring) => {
    for (const userId in commentScoring.commentScores) {
      const userScore = commentScoring.commentScores[userId];

      const userScoreDetail: UserScoreDetails = {
        score: userScore.totalScoreTotal,
        view,
        role: null,
        contribution: "Comment",
        scoring: {
          issueComments: view === "Issue" ? commentScoring : null,
          reviewComments: view === "Review" ? commentScoring : null,
          specification: null,
          task: null,
        },
        source: {
          issue,
          user: Object.values(userScore.details)[0].comment.user,
        },
      };

      acc.push(userScoreDetail);
    }
    return acc;
  }, [] as UserScoreDetails[]);

  return userScoreDetails;
}

export interface EnrichedRelevance {
  comment: Comment;
  user: User;
  score: Decimal;
}

export function enrichRelevanceData(
  contributorComments: Comment[]
): (value: Decimal, index: number, array: Decimal[]) => EnrichedRelevance {
  return (score, index) => ({
    comment: contributorComments[index],
    user: contributorComments[index].user,
    score,
  });
}
