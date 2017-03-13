const Stale = require('./lib/stale');

// TODO:
// - [ ] On an interval:
//   - [ ] Get all installations & repositories
//   - [ ] Run mark & sweep
// - [ ] on relevant issue activity: unmark
// - [ ] Get config from repo or org

// Hackery to test against a single repository
const GitHubApi = require("github");
const github = new GitHubApi({
    debug: true
});

// user token
github.authenticate({
    type: "token",
    token: process.env.GITHUB_TOKEN,
});

const stale = new Stale(github, {owner: "robotland", repo: "test", perform: false});
stale.markAndSweep();

// Show trace for any unhandled rejections
process.on('unhandledRejection', reason => {
  console.error(reason);
});
