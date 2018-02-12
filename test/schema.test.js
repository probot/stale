const schema = require('../lib/schema')

const validConfigs = [
  [{daysUntilClose: false}],
  [{daysUntilClose: 1}],
  [{exemptLabels: ['foo']}],
  [{exemptLabels: 'foo'}, {exemptLabels: ['foo']}],
  [{exemptLabels: null}],
  [{exemptLabels: []}],
  [{exemptProjects: true}],
  [{exemptProjects: false}],
  [{exemptMilestones: true}],
  [{exemptMilestones: false}],
  [{staleLabel: 'stale'}],
  [{markComment: 'stale yo'}],
  [{markComment: false}],
  [{unmarkComment: 'not stale'}],
  [{unmarkComment: false}],
  [{closeComment: 'closing yo'}],
  [{closeComment: false}],
  [{limitPerRun: 1}],
  [{limitPerRun: 30}],
  [{only: null}],
  [{only: 'issues'}],
  [{only: 'pulls'}],
  [{pulls: {daysUntilStale: 2}}],
  [{issues: {staleLabel: 'stale-issue'}}]
]

const invalidConfigs = [
  [{daysUntilClose: true}, 'must be a number or false'],
  [{exemptProjects: 'nope'}, 'must be a boolean'],
  [{exemptMilestones: 'nope'}, 'must be a boolean'],
  [{staleLabel: ''}, 'not allowed to be empty'],
  [{staleLabel: false}, 'must be a string'],
  [{staleLabel: ['a', 'b']}, 'must be a string'],
  [{markComment: true}, 'must be a string or false'],
  [{unmarkComment: true}, 'must be a string or false'],
  [{closeComment: true}, 'must be a string or false'],
  [{limitPerRun: 31}, 'must be an integer between 1 and 30'],
  [{limitPerRun: 0}, 'must be an integer between 1 and 30'],
  [{limitPerRun: 0.5}, 'must be an integer between 1 and 30'],
  [{only: 'donuts'}, 'must be one of [issues, pulls, null]'],
  [{pulls: {daysUntilStale: 'no'}}, 'must be a number'],
  [{pulls: {lol: 'nope'}}, '"lol" is not allowed'],
  [{issues: {staleLabel: ''}}, 'not allowed to be empty']

]

describe('schema', () => {
  test('defaults', async () => {
    expect(schema.validate({}).value).toEqual({
      daysUntilStale: 60,
      daysUntilClose: 7,
      exemptLabels: ['pinned', 'security'],
      exemptProjects: false,
      exemptMilestones: false,
      staleLabel: 'wontfix',
      perform: true,
      markComment: 'This issue has been automatically marked as stale because ' +
        'it has not had recent activity. It will be closed if no further ' +
        'activity occurs. Thank you for your contributions.',
      unmarkComment: false,
      closeComment: false,
      limitPerRun: 30
    })
  })

  test('does not set defaults for pulls and issues', () => {
    expect(schema.validate({pulls: {daysUntilStale: 90}}).value.pulls).toEqual({
      daysUntilStale: 90
    })

    expect(schema.validate({issues: {daysUntilStale: 90}}).value.issues).toEqual({
      daysUntilStale: 90
    })
  })

  validConfigs.forEach(([example, expected = example]) => {
    test(`${JSON.stringify(example)} is valid`, () => {
      const result = schema.validate(example)
      expect(result.error).toBe(null)
      expect(result.value).toMatchObject(expected)
    })
  })

  invalidConfigs.forEach(([example, message]) => {
    test(`${JSON.stringify(example)} is invalid`, () => {
      const {error} = schema.validate(example)
      expect(error && error.toString()).toMatch(message)
    })
  })
})
