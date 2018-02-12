const Joi = require('joi')

module.exports = Joi.object().keys({
  daysUntilStale: Joi.number().default(60)
    .description('Number of days of inactivity before an Issue or Pull Request becomes stale'),

  daysUntilClose: Joi.alternatives().try(
    Joi.number(),
    Joi.boolean()
  ).default(7).description('Number of days of inactivity before a stale Issue or Pull Request is closed. Set to false to disable. If disabled, issues still need to be closed manually, but will remain marked as stale.'),

  exemptLabels: Joi.array().default(['pinned', 'security'])
    .description('Issues or Pull Requests with these labels will never be considered stale. Set to `[]` to disable'),

  exemptProjects: Joi.boolean().default(false)
    .description('Set to true to ignore issues in a project (defaults to false)'),

  exemptMilestones: Joi.boolean().default(false)
    .description('Set to true to ignore issues in a milestone (defaults to false)'),

  staleLabel: Joi.string().default('wontfix')
    .description('Label to use when marking as stale'),

  perform: Joi.boolean().default(!process.env.DRY_RUN),

  markComment: Joi.alternatives().try(
      Joi.string(),
      Joi.boolean().allow(false)
    )
    .default(
      'This issue has been automatically marked as stale because ' +
      'it has not had recent activity. It will be closed if no further ' +
      'activity occurs. Thank you for your contributions.'
    )
    .description('Comment to post when marking as stale. Set to `false` to disable'),

  unmarkComment: Joi.alternatives().try(Joi.boolean(), Joi.string())
    .default(false)
    .description('Comment to post when removing the stale label. Set to `false` to disable'),

  closeComment: Joi.alternatives().try(Joi.boolean(), Joi.string())
    .default(false)
    .description('Comment to post when closing a stale Issue or Pull Request. Set to `false` to disable'),

  limitPerRun: Joi.number().integer().default(30).max(30)
    .description('Limit the number of actions per hour, from 1-30. Default is 30'),

  only: Joi.string().allow('issues', 'pulls')
    .description('Limit to only `issues` or `pulls`')

  // # pulls:
  // #   daysUntilStale: 30
  // #   markComment: >
  // #     This pull request has been automatically marked as stale because it has not had
  // #     recent activity. It will be closed if no further activity occurs. Thank you
  // #     for your contributions.
  // # issues:
  // #   exemptLabels:
  // #     - confirmed
})
