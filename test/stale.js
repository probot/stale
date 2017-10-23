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
        removeLabel: expect.createSpy().andReturn(Promise.reject(notFoundError))
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
})
