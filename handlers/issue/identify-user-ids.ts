import { Comment, Issue, User } from "../../types/payload";
import { ContributorClasses } from "./contribution-style-types";

export async function sortUsersByClass(
  issue: Issue,
  contributorComments: Comment[],
  repoCollaborators: User[],
): Promise<ContributorClasses> {
  const { issuer, assignees, collaborators, contributors } = await filterUsers(issue, contributorComments, repoCollaborators);

  return returnValues(issuer, assignees, collaborators, contributors);
}

async function filterUsers(issue: Issue, contributorComments: Comment[], collaborators: User[]) {
  const issuer = issue.user;
  const assignees = issue.assignees.filter((assignee): assignee is User => assignee !== null);

  const allRoleUsers: User[] = [
    issuer,
    ...assignees.filter((user): user is User => user !== null),
    ...collaborators.filter((user): user is User => user !== null),
  ];
  const humanUsersWhoCommented = contributorComments
    .filter((comment) => comment.user.type === "User")
    .map((comment) => comment.user);

  const contributors = humanUsersWhoCommented.filter(
    (user: User) => !allRoleUsers.some((_user) => _user?.id === user.id)
  );
  const uniqueContributors = Array.from(new Map(contributors.map((user) => [user.id, user])).values());
  return {
    issuer,
    assignees,
    collaborators: collaborators.filter((collaborator) => collaborator.id !== issuer.id),
    contributors: uniqueContributors,
  };
}

function returnValues(
  issuer: User,
  assignees: User[],
  collaborators: User[],
  contributors: User[]
): ContributorClasses {
  return {
    "Issue Issuer Comment": issuer,
    "Issue Assignee Comment": assignees,
    "Issue Collaborator Comment": collaborators,
    "Issue Contributor Comment": contributors,

    "Issue Issuer Specification": issuer,
    "Issue Assignee Task": assignees,

    "Review Issuer Comment": issuer,
    "Review Assignee Comment": assignees,
    "Review Collaborator Comment": collaborators,
    "Review Contributor Comment": contributors,
    "Review Issuer Approval": issuer,
    "Review Issuer Rejection": issuer,
    "Review Collaborator Approval": collaborators,
    "Review Collaborator Rejection": collaborators,
    "Review Issuer Code": issuer,
    "Review Assignee Code": assignees,
    "Review Collaborator Code": collaborators,
  };
}
