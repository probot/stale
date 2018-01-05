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

    const issueAction = expect.createSpy().andReturn(Promise.resolve(notFoundError))

    // Mock out the GitHub API
    github = {
      integrations: {
        getInstallations: expect.createSpy()
      },
      paginate: expect.createSpy(),
      issues: {
        removeLabel: issueAction,
        getLabel: expect.createSpy().andReturn(Promise.reject(notFoundError)),
        createLabel: issueAction,
        addLabels: issueAction,
        createComment: issueAction,
        edit: issueAction
      },
      search: {
        issues: issueAction
      }
    }

    // Mock out GitHub client
    robot.auth = () => Promise.resolve(github)
  })

  it('removes the stale label and ignores if it has already been removed', async () => {
    let stale = new Stale(github, {perform: true, owner: 'probot', repo: 'stale'})

    for (const type of ['pulls', 'issues']) {
      try {
        await stale.unmark(type, {number: 123})
      } catch (_) {
        throw new Error('Should not have thrown an error')
      }
    }
  })

  it('should limit the number of actions it takes each run', async () => {
    const staleLabel = 'stale'
    const limitPerRun = 30

    const issueCount = 40
    const staleCount = 3

    const issues = []
    for (let i = 1; i <= issueCount; i++) {
      const labels = (i <= staleCount) ? [{name: staleLabel}] : []
      issues.push({number: i, labels: labels})
    }

    const prs = []
    for (let i = 101; i <= 100 + issueCount; i++) {
      const labels = (i <= 100 + staleCount) ? [{name: staleLabel}] : []
      prs.push({number: i, labels: labels})
    }

    github.search.issues = ({q, sort, order, per_page}) => {
      let items = []
      if (q.includes('is:pr')) {
        items = items.concat(prs.slice(0, per_page))
      } else if (q.includes('is:issue')) {
        items = items.concat(issues.slice(0, per_page))
      } else {
        throw new Error('query should specify PullRequests or Issues')
      }

      if (q.includes(`-label:"${staleLabel}"`)) {
        items = items.filter(item => !item.labels.map(label => label.name).includes(staleLabel))
      } else if (q.includes(`label:"${staleLabel}"`)) {
        items = items.filter(item => item.labels.map(label => label.name).includes(staleLabel))
      }

      expect(items.length).toBeLessThanOrEqualTo(per_page)

      return Promise.resolve({
        data: {
          items: items
        }
      })
    }

    for (const type of ['pulls', 'issues']) {
      let comments = 0
      let closed = 0
      let labeledStale = 0
      github.issues.createComment = expect.createSpy().andCall(() => comments++).andReturn(Promise.resolve(notFoundError))
      github.issues.edit = ({owner, repo, number, state}) => {
        if (state === 'closed') {
          closed++
        }
      }
      github.issues.addLabels = ({owner, repo, number, labels}) => {
        if (labels.includes(staleLabel)) {
          labeledStale++
        }
      }

      // Mock out GitHub client
      robot.auth = () => Promise.resolve(github)

      const stale = new Stale(github, {perform: true, owner: 'probot', repo: 'stale'})
      stale.config.limitPerRun = limitPerRun
      stale.config.staleLabel = staleLabel
      stale.config.closeComment = 'closed'

      await stale.markAndSweep(type)

      expect(comments).toEqual(limitPerRun)
      expect(closed).toEqual(staleCount)
      expect(labeledStale).toEqual(limitPerRun - staleCount)
    }
  })

  it('should not close issues if daysUntilClose is configured as false', async () => {
    let stale = new Stale(github, {perform: true, owner: 'probot', repo: 'stale'})
    stale.config.daysUntilClose = false
    stale.getStale = expect.createSpy().andReturn(Promise.resolve({data: {items: []}}))
    stale.getClosable = expect.createSpy()

    await stale.markAndSweep('issues')
    expect(stale.getClosable).toNotHaveBeenCalled()

    await stale.markAndSweep('pulls')
    expect(stale.getClosable).toNotHaveBeenCalled()
  })
})
