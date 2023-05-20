const Joi = require('@hapi/joi')

const fields = {
  daysUntilStale: Joi.number()
    .description('Number of days of inactivity before an Issue or Pull Request becomes stale'),

  daysUntilClose: Joi.alternatives().try(Joi.number(), Joi.boolean().only(false))
    .error(() => '"daysUntilClose" must be a number or false')
    .description('Number of days of inactivity before a stale Issue or Pull Request is closed. If disabled, issues still need to be closed manually, but will remain marked as stale.'),

  onlyLabels: Joi.alternatives().try(Joi.any().valid(null), Joi.array().single())
    .description('Only issues or pull requests with all of these labels are checked for staleness. Set to `[]` to disable'),

  exemptLabels: Joi.alternatives().try(Joi.any().valid(null), Joi.array().single())
    .description('Issues or Pull Requests with these labels will never be considered stale. Set to `[]` to disable'),

  exemptProjects: Joi.boolean()
    .description('Set to true to ignore issues in a project (defaults to false)'),

  exemptMilestones: Joi.boolean()
    .description('Set to true to ignore issues in a milestone (defaults to false)'),

  exemptAssignees: Joi.boolean()
    .description('Set to true to ignore issues with an assignee (defaults to false)'),

  staleLabel: Joi.string()
    .description('Label to use when marking as stale'),

  closedLabel: Joi.alternatives().try(Joi.string(), Joi.boolean().only(false))
    .error(() => '"closedLabel" must be a string or false')
    .description('Label to use when issue is closed. Set to `false` to disable'),

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
  onlyLabels: fields.onlyLabels.default([]),
  exemptLabels: fields.exemptLabels.default(['pinned', 'security']),
  exemptProjects: fields.exemptProjects.default(false),
  exemptMilestones: fields.exemptMilestones.default(false),
  exemptAssignees: fields.exemptMilestones.default(false),
  staleLabel: fields.staleLabel.default('wontfix'),
  closedLabel: fields.closeComment.default(false),
  markComment: fields.markComment.default(
    'Is this still relevant? If so, what is blocking it? ' +
    'Is there anything you can do to help move it forward?' +
    '\n\nThis issue has been automatically marked as stale ' +
    'because it has not had recent activity. ' +
    'It will be closed if no further activity occurs.'
  ),
  unmarkComment: fields.unmarkComment.default(false),
  closeComment: fields.closeComment.default(false),
  limitPerRun: fields.limitPerRun.default(30),
  perform: Joi.boolean().default(!process.env.DRY_RUN),
  only: Joi.any().valid('issues', 'pulls', null).description('Limit to only `issues` or `pulls`'),
  pulls: Joi.object().keys(fields),
  issues: Joi.object().keys(fields),
  _extends: Joi.string().description('Repository to extend settings from')
})

module.exports = schema
