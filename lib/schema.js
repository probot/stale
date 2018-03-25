const Joi = require('joi')

const fields = {
  daysUntilStale: Joi.number()
    .description('Number of days of inactivity before an Issue or Pull Request becomes stale'),

  daysUntilClose: Joi.alternatives().try(Joi.number(), Joi.boolean().only(false))
    .error(() => '"daysUntilClose" must be a number or false')
    .description('Number of days of inactivity before a stale Issue or Pull Request is closed. If disabled, issues still need to be closed manually, but will remain marked as stale.'),

  exemptLabels: Joi.alternatives().try(Joi.any().valid(null), Joi.array().single())
    .description('Issues or Pull Requests with these labels will never be considered stale. Set to `[]` to disable'),

  exemptProjects: Joi.boolean()
    .description('Set to true to ignore issues in a project (defaults to false)'),

  exemptMilestones: Joi.boolean()
    .description('Set to true to ignore issues in a milestone (defaults to false)'),

  staleLabel: Joi.string()
    .description('Label to use when marking as stale'),

  markComment: Joi.alternatives().try(Joi.string(), Joi.any().only(false))
    .error(() => '"markComment" must be a string or false')
    .description('Comment to post when marking as stale. Set to `false` to disable'),

  unmarkComment: Joi.alternatives().try(Joi.string(), Joi.boolean().only(false))
    .error(() => '"unmarkComment" must be a string or false')
    .description('Comment to post when removing the stale label. Set to `false` to disable'),

  closeComment: Joi.alternatives().try(Joi.string(), Joi.boolean().only(false))
    .error(() => '"closeComment" must be a string or false')
    .description('Comment to post when closing a stale Issue or Pull Request. Set to `false` to disable'),

  limitPerRun: Joi.number().integer().min(1).max(30)
    .error(() => '"limitPerRun" must be an integer between 1 and 30')
    .description('Limit the number of actions per hour, from 1-30. Default is 30')
}

const schema = Joi.object().keys({
  daysUntilStale: fields.daysUntilStale.default(60),
  daysUntilClose: fields.daysUntilClose.default(7),
  exemptLabels: fields.exemptLabels.default(['pinned', 'security']),
  exemptProjects: fields.exemptProjects.default(false),
  exemptMilestones: fields.exemptMilestones.default(false),
  staleLabel: fields.staleLabel.default('wontfix'),
  markComment: fields.markComment.default(
    'This issue has been automatically marked as stale because ' +
    'it has not had recent activity. It will be closed if no further ' +
    'activity occurs. Thank you for your contributions.'
  ),
  unmarkComment: fields.unmarkComment.default(false),
  closeComment: fields.closeComment.default(false),
  limitPerRun: fields.limitPerRun.default(30),
  perform: Joi.boolean().default(!process.env.DRY_RUN),
  only: Joi.any().valid('issues', 'pulls', null).description('Limit to only `issues` or `pulls`'),
  pulls: Joi.object().keys(fields),
  issues: Joi.object().keys(fields)
})

module.exports = schema
