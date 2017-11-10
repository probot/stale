const expect = require('expect')
const {createRobot} = require('probot')
const Stale = require('../lib/stale')
const notFoundError = {
  code: 404,
  status: 'Not Found',
  headers: {}
}

describe('stale', () => {
  let robot
  let github

  beforeEach(() => {
    robot = createRobot()

    // Mock out the GitHub API
    github = {
      integrations: {
        getInstallations: expect.createSpy()
      },
      paginate: expect.createSpy(),
      issues: {
        removeLabel: expect.createSpy().andReturn(Promise.reject(notFoundError)),
        createComment: expect.createSpy().andReturn(Promise.resolve()),
        addLabels: expect.createSpy().andReturn(Promise.resolve())
      }
    }

    // Mock out GitHub client
    robot.auth = () => Promise.resolve(github)
  })

  it('removes the stale label and ignores if it has already been removed', async () => {
    let stale = new Stale(github, {perform: true, owner: 'probot', repo: 'stale'})

    try {
      await stale.unmark({number: 123})
    } catch (_) {
      throw new Error('Should not have thrown an error')
    }
  })

  it('replaced %EXEMPT_LABELS% variable with exempt labels', async () => {
    let stale = new Stale(github, {perform: true, owner: 'probot', repo: 'stale', exemptLabels: ['organic', 'free range']})
    const number = 124
    const body = 'This issue has been automatically marked as stale because ' +
      'it has not had recent activity. It will be closed if no further ' +
      'activity occurs.  Label this with any of `organic`, `free range` to hold this open. ' +
      'Thank you for your contributions.'

    await stale.mark({number})
    expect(github.issues.createComment.calls[0].arguments[0].body).toBe(body)
  })
})
