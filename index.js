const yaml = require('js-yaml');
const Stale = require('./lib/stale');

// Check for stale issues every hour
const INTERVAL = 60 * 60 * 1000;

module.exports = async robot => {
  // Check for stale issues startup
  check();

  // Schedule interval to perform stale issue check
  setInterval(check, INTERVAL);

  // Unmark stale issues if a user comments
  robot.on('issue_comment.created', async (event, context) => {
    if (!context.isBot) {
      const github = await robot.auth(event.payload.installation.id);
      const stale = await forRepository(github, event.payload.repository);
      const issue = event.payload.issue;

      if (stale.hasStaleLabel(issue)) {
        stale.unmark(issue);
      }
    }
  });

  // Unmark stale issues if an exempt label is added
  robot.on('issues.labeled', async event => {
    const github = await robot.auth(event.payload.installation.id);
    const stale = await forRepository(github, event.payload.repository);
    const issue = event.payload.issue;

    if (stale.hasStaleLabel(issue) && stale.hasExemptLabel(issue)) {
      stale.unmark(issue);
    }
  });

  async function check() {
    robot.log.info('Checking for stale issues');

    const github = await robot.integration.asIntegration();
    // TODO: Pagination
    const installations = await github.integrations.getInstallations({});
    installations.forEach(async installation => {
      const client = await robot.auth(installation.id);
      // TODO: Pagination
      const data = await client.integrations.getInstallationRepositories({});
      return data.repositories.map(async repo => {
        const stale = await forRepository(client, repo);
        return stale.markAndSweep();
      });
    });
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
      config = {};
    }

    config = Object.assign(config, {owner, repo, logger: robot.log});

    return new Stale(github, config);
  }
};
