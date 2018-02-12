const Joi = require('joi')

const options = {
  daysUntilStale: Joi.number().default(60)
    .description('Number of days of inactivity before an Issue or Pull Request becomes stale'),

  daysUntilClose: Joi.alternatives().try(Joi.number(), Joi.boolean().only(false))
    .default(7)
    .error(() => '"daysUntilClose" must be a number or false')
    .description('Number of days of inactivity before a stale Issue or Pull Request is closed. If disabled, issues still need to be closed manually, but will remain marked as stale.'),

  exemptLabels: Joi.array().default(['pinned', 'security'])
    .description('Issues or Pull Requests with these labels will never be considered stale. Set to `[]` to disable'),

  exemptProjects: Joi.boolean().default(false)
    .description('Set to true to ignore issues in a project (defaults to false)'),

  exemptMilestones: Joi.boolean().default(false)
    .description('Set to true to ignore issues in a milestone (defaults to false)'),

  staleLabel: Joi.string().default('wontfix')
    .description('Label to use when marking as stale'),

  markComment: Joi.alternatives().try(Joi.string(), Joi.any().only(false))
    .default(
      'This issue has been automatically marked as stale because ' +
      'it has not had recent activity. It will be closed if no further ' +
      'activity occurs. Thank you for your contributions.'
    )
    .error(() => '"markComment" must be a string or false')
    .description('Comment to post when marking as stale. Set to `false` to disable'),

  unmarkComment: Joi.alternatives().try(Joi.string(), Joi.boolean().only(false))
    .default(false)
    .error(() => '"unmarkComment" must be a string or false')
    .description('Comment to post when removing the stale label. Set to `false` to disable'),

  closeComment: Joi.alternatives().try(Joi.string(), Joi.boolean().only(false))
    .default(false)
    .error(() => '"closeComment" must be a string or false')
    .description('Comment to post when closing a stale Issue or Pull Request. Set to `false` to disable'),

  limitPerRun: Joi.number().integer().default(30).min(1).max(30)
    .error(() => '"limitPerRun" must be an integer between 1 and 30')
    .description('Limit the number of actions per hour, from 1-30. Default is 30')
}

const schema = Joi.object().keys({
  ...options,

  perform: Joi.boolean().default(!process.env.DRY_RUN),

  only: Joi.any().valid('issues', 'pulls', null)
    .description('Limit to only `issues` or `pulls`'),

  pulls: Joi.object().keys(options),

  issues: Joi.object().keys(options)
})

module.exports = schema
