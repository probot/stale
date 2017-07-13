const yaml = require('js-yaml');
const visitor = require('probot-visitor');
const NoResponse = require('./lib/no-response');
const Stale = require('./lib/stale');

async function noResponseBehavior(robot) {
  // Visit all repositories to sweep issues with no response
  const visit = visitor(robot, sweep);

  // Remove response required label if the author comments
  robot.on('issue_comment', unmark);

  async function sweep(installation, repository) {
    const github = await robot.auth(installation.id);
    const noResponse = await forRepository(github, repository);
    if (noResponse.config.exists) {
      return noResponse.sweep();
    }
  }

  async function unmark(event, context) {
    if (!context.isBot) {
      const github = await robot.auth(event.payload.installation.id);
      const noResponse = await forRepository(github, event.payload.repository);
      const issue = event.payload.issue;
      const comment = event.payload.comment;

      if (noResponse.config.exists) {
        if (noResponse.hasResponseRequiredLabel(issue) && issue.user.login === comment.user.login) {
          noResponse.unmark(issue);
        }
      }
    }
  }

  async function forRepository(github, repository) {
    const owner = repository.owner.login;
    const repo = repository.name;
    const path = '.github/stale.yml';
    let config;

    try {
      const res = await github.repos.getContent({owner, repo, path});
      config = yaml.load(new Buffer(res.data.content, 'base64').toString()).noResponse || {};
      config.exists = true;
    } catch (err) {
      robot.log.debug(err, 'No configuration file found');
      visit.stop(repository);
      // Don't perform for repository without a config
      config = {exists: false};
    }

    config = Object.assign(config, {owner, repo, logger: robot.log});

    return new NoResponse(github, config);
  }
}

async function staleBehavior(robot) {
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
        issue = (await context.github.issues.get(context.issue())).data;
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

      if (config.stale) {
        config = config.stale;
      }
    } catch (err) {
      visit.stop(repository);
      // Don't actually perform for repository without a config
      config = {perform: false};
    }

    config = Object.assign(config, {owner, repo, logger: robot.log});

    return new Stale(github, config);
  }
}

module.exports = async robot => {
  noResponseBehavior(robot);
  staleBehavior(robot);
};
