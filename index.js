const createScheduler = require('probot-scheduler')
const Stale = require('./lib/stale')

module.exports = async robot => {
  // Visit all repositories to mark and sweep stale issues
  const scheduler = createScheduler(robot)

  // Unmark stale issues if a user comments
  robot.on(['issue_comment', 'issues', 'pull_request', 'pull_request_review', 'pull_request_review_comment'], unmark)
  robot.on('schedule.repository', markAndSweep)

  async function unmark (context) {
    if (!context.isBot) {
      const stale = await forRepository(context)
      let issue = context.payload.issue || context.payload.pull_request

      // Some payloads don't include labels
      if (!issue.labels) {
        issue = (await context.github.issues.get(context.issue())).data
      }

      const staleLabelAdded = context.payload.action === 'labeled' &&
        context.payload.label.name === stale.config.staleLabel

      if (stale.hasStaleLabel(issue) && issue.state !== 'closed' && !staleLabelAdded) {
        stale.unmark(issue)
      }
    }
  }

  async function markAndSweep (context) {
    const stale = await forRepository(context)
    if (stale.config.perform) {
      return stale.markAndSweep()
    }
  }

  async function forRepository (context) {
    let config

    try {
      config = await context.config('stale.yml')
    } catch (err) {
      scheduler.stop(context.payload.repository)
      // Don't actually perform for repository without a config
      config = {perform: false}
    }

    config = Object.assign(config, context.repo({logger: robot.log}))

    return new Stale(context.github, config)
  }
}
