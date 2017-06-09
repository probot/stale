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
      const stale = await forRepository(context.github, event.payload.repository);
      let issue = event.payload.issue || event.payload.pull_request;

      // Some payloads don't include labels
      if (!issue.labels) {
        issue = await context.github.issues.get(context.issue());
      }

      const staleLabelAdded = event.payload.action === 'labeled' &&
        event.payload.label.name === stale.config.staleLabel;

      if (stale.hasStaleLabel(issue) && issue.state !== 'closed' && !staleLabelAdded) {
        stale.unmark(issue);
      }
    }
  }

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
      const res = await github.repos.getContent({owner, repo, path});
      config = yaml.load(new Buffer(res.data.content, 'base64').toString()) || {};
    } catch (err) {
      visit.stop(repository);
      // Don't actually perform for repository without a config
      config = {perform: false};
    }

    config = Object.assign(config, {owner, repo, logger: robot.log});

    return new Stale(github, config);
  }
};
