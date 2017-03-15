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
      const stale = new Stale(github, context.repo({logger: robot.log}));
      const issue = event.payload.issue;

      if (stale.hasStaleLabel(issue)) {
        stale.unmark(issue);
      }
    }
  });

  // Unmark stale issues if an exempt label is added
  robot.on('issues.labeled', async (event, context) => {
    const github = await robot.auth(event.payload.installation.id);
    const stale = new Stale(github, context.repo({logger: robot.log}));
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
      return data.repositories.map(repo => checkRepository(client, repo));
    });
  }

  async function checkRepository(client, repository) {
    const stale = new Stale(client, {
      owner: repository.owner.login,
      repo: repository.name,
      ttl: 1000 * 60 * 60 * 2,
      logger: robot.log
    });
    return stale.markAndSweep();
  }
};
