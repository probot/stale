const yaml = require('js-yaml');
const Stale = require('./lib/stale');
const paginate = require('./lib/paginate');

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

  // https://developer.github.com/early-access/integrations/webhooks/#integrationinstallationrepositoriesevent
  robot.on('integration_installation.created', async event => {
    return checkInstallation(event.payload.installation);
  });

  // https://developer.github.com/early-access/integrations/webhooks/#integrationinstallationrepositoriesevent
  robot.on('integration_installation_repositories.added', async event => {
    return checkInstallation(event.payload.installation);
  });

  async function check() {
    robot.log.info('Checking for stale issues');

    const github = await robot.integration.asIntegration();

    return github.integrations.getInstallations({}).then(paginate(installations => {
      return installations.map(checkInstallation);
    }));
  }

  async function checkInstallation(installation) {
    const github = await robot.auth(installation.id);
    return github.integrations.getInstallationRepositories({}).then(paginate(data => {
      data.repositories.forEach(async repo => {
        const stale = await forRepository(github, repo);
        return stale.markAndSweep();
      });
    }));
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
      // Don't actually perform for repository without a config
      config = {perform: false};
    }

    config = Object.assign(config, {owner, repo, logger: robot.log});

    return new Stale(github, config);
  }
};
