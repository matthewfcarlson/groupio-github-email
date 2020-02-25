import { Application, Octokit, Context } from 'probot' // eslint-disable-line no-unused-vars
import { WebhookPayloadPullRequestPullRequest, WebhookPayloadIssuesIssue, WebhookPayloadPullRequestReviewPullRequest } from '@octokit/webhooks';
import SendGrid from "@sendgrid/mail";
import striptags from "striptags";
import marked from "marked";
import bent from "bent";
import truncate from 'truncate';
const groupio_email = "seans-test-group+int+1348+6716101840366656337@groups.io";
const bent_string = bent("string", 200);

//bent_string("https://patch-diff.githubusercontent.com/raw/matthewfcarlson/musupport/pull/47.patch").then(x => console.log(x));
//bent_string("https://github.com/matthewfcarlson/musupport/pull/49.patch").then(x => console.log(x));


// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs

if (process.env.SENDGRID_API_KEY == undefined) {
  console.log("We don't have a SENDGRID_API_KEY");
  process.exit(0);
}
else {
  SendGrid.setApiKey(process.env.SENDGRID_API_KEY);
}

function send_message(subject: string, html: string, text?: string) {
  if (text == undefined) text = striptags(html);
  const msg = {
    to: groupio_email,
    from: 'test@em4404.matthewc.dev',
    subject: subject,
    text: text,
    html: html,
  };
  console.log("Sending message");
  console.log(msg);
  SendGrid.send(msg);
}

// Formats a user into
function format_user(user: any): string {
  if (user == undefined || user["type"] != "User") {
    console.error("Unknown User");
    console.log(user);
    return "Unknown";
  }
  return "<a href='" + user["html_url"] + "'>" + user["login"] + "</a>"
}

async function get_patch_set(pr: any): Promise<string> {
  const patch_url = pr.patch_url.replace("https://github.com/", "https://patch-diff.githubusercontent.com/raw/");
  console.log("REQUEST PATCH " + patch_url);
  //https://github.com/matthewfcarlson/musupport/pull/49.patch becomes
  //https://patch-diff.githubusercontent.com/raw/matthewfcarlson/musupport/pull/49.patch
  try {
    const patch = truncate(await bent_string(patch_url), 5000, {ellipsis:"... (truncated over 2000 characters)"});
    return "<pre>" + patch + "</pre>"
  }
  catch {
    console.log("Failed to get patch set at " + patch_url);
    return "<p><a href='" + pr.patch_url + "'> Patch set </a></p>";
  }

}

interface linkable {
  html_url: string;
}
function get_body_footer(pr: linkable): string {
  const url = pr.html_url;
  return "<hr/><a href='" + url + "'>See this on Github</p>";
}

async function format_issue_subject(issue: WebhookPayloadIssuesIssue, context?: Context<any>): Promise<string> {
  const isPR = "pull_request" in issue;

  if (isPR && context == null) {
    console.error("We don't have the context needed to request the PR")
  }
  else if (isPR && context != null) {
    try {
      const pull_request_url = context.issue();
      const PR = await context.github.pulls.get(pull_request_url);
      return format_pr_subject(PR.data);
    }
    catch {
      console.error("Failed to fetch PR#" + issue.number);
    }
  }

  const user = issue.user.login;

  const subject = "Issue " + issue.number + " " + issue.title + " by " + user + " #github";
  return subject
}

function format_pr_subject(pr: WebhookPayloadPullRequestPullRequest | WebhookPayloadPullRequestReviewPullRequest | Octokit.PullsGetResponse): string {
  const user = pr.user.login;
  const subject = "PR " + pr.number + " " + pr.title + " by " + user + " #github";
  return subject
}


function makeCommaSeparatedString(arr: string[], useOxfordComma?: boolean): string {
  if (useOxfordComma == undefined) useOxfordComma = true;
  const listStart = arr.slice(0, -1).join(', ');
  const listEnd = arr.slice(-1);
  const conjunction = arr.length <= 1 ? '' :
    useOxfordComma && arr.length > 2 ? ', and ' : ' and ';

  return [listStart, listEnd].join(conjunction);
}

export = (app: Application) => {
  app.on('issues.opened', async context => {
    // An issue was opened, what should we do with it?
    console.log("An issue was opened, what should we do with it?");
    const issue = context.payload.issue;
    const body = marked(issue.body) + get_body_footer(issue);
    send_message(await format_issue_subject(issue), body)
  });
  app.on('issues.edited', async context => {
    // An issue was edited, what should we do with it?
    console.log("An issue was edited, what should we do with it?")

    const issue = context.payload.issue;
    const subject = await format_issue_subject(issue);
    const sender = format_user(context.payload.sender);
    const body = "<p>" + sender + " edited: </p>" + marked(issue.body);
    send_message(subject, body);
  });
  app.on(['issues.assigned', 'issues.unassigned'], async context => {
    // An issue was assigned or unassigned, what should we do with it?
    console.log("An issue was assigned or unassigned")
    const issue = context.payload.issue;
    const assignees = context.payload.issue.assignees;
    const subject = await format_issue_subject(issue);
    const sender = format_user(context.payload.sender);
    if (assignees == null || assignees.length == 0) {
      send_message(subject, "Issue was assigned to No one by " + sender + get_body_footer(issue));
    }
    else {
      const assigned = makeCommaSeparatedString(assignees.map(format_user));
      send_message(subject, "Issue was assigned to " + assigned + " by " + sender + get_body_footer(issue));
    }
  });
  app.on(['issues.closed', 'issues.reopened', 'issues.deleted'], async context => {
    // An issue was opened, what should we do with it?
    console.log("An issue was reopened, what should we do with it?");
    const issue = context.payload.issue;
    const action = context.payload.action;
    const sender = format_user(context.payload.sender);
    send_message(await format_issue_subject(issue), action + " by " + sender + get_body_footer(issue))
  });

  // ISSUE COMMENTS
  // An issue comment can be on a PR or an issue
  app.on('issue_comment.created', async context => {
    console.log("An issue comment was created, what should we do with it?");
    // An issue comment was created, what should we do with it?
    const issue = context.payload.issue;
    const comment = context.payload.comment;
    const subject = await format_issue_subject(issue, context);

    const body = "<p>" + format_user(comment.user) + " said: </p>" + marked(comment.body) + get_body_footer(comment);
    send_message(subject, body);

  });
  app.on(['issue_comment.edited'], async context => {
    // An issue comment was edited or deleted, what should we do with it?
    console.log("An issue comment was edited or deleted, what should we do with it?")
    const issue = context.payload.issue;
    const comment = context.payload.comment;
    const subject = await format_issue_subject(issue, context);
    const body = "<p>" + format_user(comment.user) + " edited: </p>" + marked(comment.body) + get_body_footer(comment);
    send_message(subject, body);
  });


  // PULL REQUESTS
  app.on('pull_request.opened', async context => {
    // A PR was opened, what should we do with it?
    console.log("A PR was opened, what should we do with it?")
    const pr = context.payload.pull_request;

    const patch = await get_patch_set(pr);
    const sender = format_user(context.payload.sender);
    const body = "<p>" + sender + " opened a new PR: </p>" + marked(pr.body) + "<br/>" + patch + get_body_footer(pr);
    send_message(format_pr_subject(pr), body)
  });
  //Synchronize means to get pushes
  app.on('pull_request.synchronize', async context => {
    console.log("A PR was synced, what should we do with it?")
    const pr = context.payload.pull_request;
    const subject = format_pr_subject(pr);
    const patch = await get_patch_set(pr);
    const sender = format_user(context.payload.sender);
    const body = "<p>" + sender + " pushed new commits: </p>" + "<br/>" + patch + get_body_footer(pr);
    send_message(subject, body)
  });
  app.on('pull_request.edited', async context => {
    // A PR was opened, what should we do with it?
    console.log("A PR was edited, what should we do with it?")
    const pr = context.payload.pull_request;
    const sender = format_user(context.payload.sender);
    const body = "<p>" + sender + " edited: </p>" + marked(pr.body) + get_body_footer(pr);
    send_message(format_pr_subject(pr), body)
  });
  app.on(['pull_request.assigned', 'pull_request.unassigned'], async context => {
    // A PR was assigned or unassigned, what should we do with it?
    console.log("A PR was assigned or unassigned, what should we do with it?")
    const pr = context.payload.pull_request;
    const assignees = pr.assignees;
    const subject = format_pr_subject(pr);
    const sender = format_user(context.payload.sender);
    if (assignees == null || assignees.length == 0) {
      send_message(subject, "PR was assigned to No one by " + sender + get_body_footer(pr));
    }
    else {
      const assigned = makeCommaSeparatedString(assignees.map(format_user));
      send_message(subject, "PR was assigned to " + assigned + " by " + sender + get_body_footer(pr));
    }

  });

  app.on(['pull_request.closed', 'pull_request.reopened'], async context => {
    // A PR was closed, edited, or reopened, what should we do with it?
    console.log(" A PR was closed, edited, or reopened, what should we do with it?")
    const pr = context.payload.pull_request;
    const action = context.payload.action;
    const sender = format_user(context.payload.sender);
    send_message(format_pr_subject(pr), action + " by " + sender + get_body_footer(pr))
  });

  // PR reviews
  app.on('pull_request_review.submitted', async context => {
    // A PR review was submitted, what should we do with it?
    console.log("A PR review was submitted, what should we do with it?")
    const pr = context.payload.pull_request;
    const review = context.payload.review;
    const subject = format_pr_subject(pr);
    const sender = format_user(context.payload.sender);
    const status = review.state;
    const body = "<p>" + sender + " submitted a review that " + status + ": </p>" + marked(review.body || "REVIEW HERE") + get_body_footer(review);
    send_message(subject, body)
  });

  app.on(['pull_request_review.edited'], async context => {
    // A PR review was edited, what should we do with it?
    console.log("A PR review was edited or dismissed, what should we do with it?")
    const pr = context.payload.pull_request;
    const review = context.payload.review;
    const sender = format_user(context.payload.sender);
    const subject = format_pr_subject(pr);
    const status = review.state;
    const body = "<p>" + sender + " editted their review that " + status + ": </p>" + marked(review.body || "REVIEW HERE") + get_body_footer(review);
    send_message(subject, body);
  });

  app.on('pull_request_review.dismissed', async context => {
    // A PR review was dismissed, what should we do with it?
    console.log("A PR review was edited or dismissed, what should we do with it?")
    const pr = context.payload.pull_request;
    const review = context.payload.review;
    const sender = format_user(context.payload.sender);
    const subject = format_pr_subject(pr);
    const body = "<p>" + sender + " dismissed their review </p>" + get_body_footer(review);
    send_message(subject, body);
  });
  // PR review comments
  app.on('pull_request_review_comment.submitted', async context => {
    // A PR review comment was submitted, what should we do with it?
    console.log("A PR review comment was submitted, what should we do with it?")
    const pr = context.payload.pull_request;
    const comment = context.payload.comment;
    const sender = format_user(context.payload.sender);
    const subject = format_pr_subject(pr);
    const diff = "<pre>" + comment.diff_hunk + "</pre>";
    const body = "<p>" + sender + " added a comment on the review for " + comment.path + ": </p>" + marked(comment.body || "REVIEW HERE") + diff + get_body_footer(comment);
    send_message(subject, body);
  });

  app.on(['pull_request_review_comment.edited', 'pull_request_review_comment.deleted'], async context => {
    // A PR review comment was edited or deleted, what should we do with it?
    console.log("A PR review comment was submitted, what should we do with it?")
    const pr = context.payload.pull_request;

    const comment = context.payload.comment;
    const sender = format_user(context.payload.sender);
    const subject = format_pr_subject(pr);
    const action = context.payload.action;
    const diff = "<pre>" + comment.diff_hunk + "</pre>";
    const body = "<p>" + sender + " " + action + " their comment on their review for " + comment.path + ": </p>" + marked(comment.body || "REVIEW HERE") + diff + get_body_footer(comment);
    send_message(subject, body);
  });
}
