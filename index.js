const yaml = require('js-yaml');
const visitor = require('probot-visitor');
const Stale = require('./lib/stale');

module.exports = async robot => {
  // Visit all repositories to mark and sweep stale issues
  const visit = visitor(robot, markAndSweep);

  // Unmark stale issues if a user comments
  robot.on('issue_comment', unmark);
  robot.on('issues', unmark);
  robot.on('pull_request', unmark);
  robot.on('pull_request_review', unmark);
  robot.on('pull_request_review_comment', unmark);

  async function unmark(event, context) {
    if (!context.isBot) {
      const github = await robot.auth(event.payload.installation.id);
      const stale = await forRepository(github, event.payload.repository);
      let issue = event.payload.issue || event.payload.pull_request;

      // Some payloads don't include labels
      if (!issue.labels) {
        issue = await github.issues.get(context.issue());
      }

      if (stale.hasStaleLabel(issue)) {
        stale.unmark(issue);
      }
    }
  }

  // Unmark stale issues if an exempt label is added
  robot.on('issues.labeled', async event => {
    const github = await robot.auth(event.payload.installation.id);
    const stale = await forRepository(github, event.payload.repository);
    const issue = event.payload.issue;

    if (stale.hasStaleLabel(issue) && stale.hasExemptLabel(issue)) {
      stale.unmark(issue);
    }
  });

  async function markAndSweep(installation, repository) {
    const github = await robot.auth(installation.id);
    const stale = await forRepository(github, repository);
    if (stale.config.perform) {
      return stale.markAndSweep();
    }
  }

  async function forRepository(github, repository) {
    const owner = repository.owner.login;
    const repo = repository.name;
    const path = '.github/stale.yml';
    let config;

    try {
      const data = await github.repos.getContent({owner, repo, path});
      config = yaml.load(new Buffer(data.content, 'base64').toString());
    } catch (err) {
      visit.stop(repository);
      // Don't actually perform for repository without a config
      config = {perform: false};
    }

    config = Object.assign(config, {owner, repo, logger: robot.log});

    return new Stale(github, config);
  }
};
