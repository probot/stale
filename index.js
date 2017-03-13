const Stale = require('./lib/stale');

// TODO:
// - [ ] On an interval:
//   - [x] Get all installations & repositories
//   - [x] Run mark & sweep
// - [ ] on relevant issue activity: unmark
// - [ ] Get config from repo or org

const INTERVAL = 30 * 1000; // check every hour

module.exports = async function(robot) {
  setInterval(check, INTERVAL);
  check(); // check on startup

  async function check() {
    robot.log.info("Checking for stale issues");

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
      perform: false,
      ttl: 1000 * 60 * 60 * 2,
      logger: robot.log
    });
    return stale.markAndSweep();
  }
}
