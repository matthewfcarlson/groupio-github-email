import { Application } from 'probot' // eslint-disable-line no-unused-vars

export = (app: Application) => {
  app.on('issues.opened', async _context => {
    // An issue was opened, what should we do with it?
    console.log("An issue was opened, what should we do with it?")
  });
  app.on('issues.edited', async _context => {
    // An issue was edited, what should we do with it?
    console.log("An issue was edited, what should we do with it?")
  });
  app.on(['issues.assigned', 'issues.unassigned'], async _context => {
    // An issue was assigned or unassigned, what should we do with it?
    console.log("An issue was assigned or unassigned, what should we do with it?")
  });
  app.on('issue_comment.created', async _context => {
    // An issue comment was created, what should we do with it?
    console.log("An issue comment was created, what should we do with it?")
  });
  app.on(['issue_comment.edited', 'issue_comment.deleted'], async _context => {
    // An issue comment was edited or deleted, what should we do with it?
    console.log("An issue comment was edited or deleted, what should we do with it?")
  });

  // PULL REQUESTS
  app.on('pull_request.opened', async _context => {
    // A PR was opened, what should we do with it?
    console.log("A PR was opened, what should we do with it?")
  });
  app.on(['pull_request.assigned', 'pull_request.unassigned'], async _context => {
    // A PR was assigned or unassigned, what should we do with it?
    console.log("A PR was assigned or unassigned, what should we do with it?")
  });

  app.on(['pull_request.closed', 'pull_request.edited', 'pull_request.reopened'], async _context => {
    // A PR was closed, edited, or reopened, what should we do with it?
    console.log(" A PR was closed, edited, or reopened, what should we do with it?")
  });

  // PR reviews
  app.on('pull_request_review.submitted', async _context => {
    // A PR review was submitted, what should we do with it?
    console.log("A PR review was submitted, what should we do with it?")
  });

  app.on(['pull_request_review.edited', 'pull_request_review.dismissed'], async _context => {
    // A PR review was edited or dismissed, what should we do with it?
    console.log("A PR review was edited or dismissed, what should we do with it?")
  });

  // PR review comments
  app.on('pull_request_review_comment.submitted', async _context => {
    // A PR review comment was submitted, what should we do with it?
    console.log("A PR review comment was submitted, what should we do with it?")
  });

  app.on(['pull_request_review_comment.edited', 'pull_request_review_comment.deleted'], async _context => {
    // A PR review comment was edited or deleted, what should we do with it?
    console.log("A PR review was edited or deleted, what should we do with it?")
  });

  
}
