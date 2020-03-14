const schema = require('./schema')
const maxActionsPerRun = 30

module.exports = class Stale {
  constructor (github, { owner, repo, logger = console, ...config }) {
    this.github = github
    this.logger = logger
    this.remainingActions = 0

    const { error, value } = schema.validate(config)

    this.config = value
    if (error) {
      // Report errors to sentry
      logger.warn({ err: new Error(error), owner, repo }, 'Invalid config')
    }

    Object.assign(this.config, { owner, repo })
  }

  async markAndSweep (type) {
    const { only } = this.config
    if (only && only !== type) {
      return
    }
    if (!this.getConfigValue(type, 'perform')) {
      return
    }

    this.logger.info(this.config, `starting mark and sweep of ${type}`)

    const limitPerRun = this.getConfigValue(type, 'limitPerRun') || maxActionsPerRun
    this.remainingActions = Math.min(limitPerRun, maxActionsPerRun)

    await this.mark(type)
    await this.sweep(type)
  }

  async mark (type) {
    await this.ensureStaleLabelExists(type)

    const staleItems = (await this.getStale(type)).data.items

    await Promise.all(staleItems.filter(issue => !issue.locked).map(issue => {
      return this.markIssue(type, issue)
    }))
  }

  async sweep (type) {
    const { owner, repo } = this.config
    const daysUntilClose = this.getConfigValue(type, 'daysUntilClose')

    if (daysUntilClose) {
      this.logger.trace({ owner, repo }, 'Configured to close stale issues')
      const closableItems = (await this.getClosable(type)).data.items

      await Promise.all(closableItems.filter(issue => !issue.locked).map(issue => {
        this.close(type, issue)
      }))
    } else {
      this.logger.trace({ owner, repo }, 'Configured to leave stale issues open')
    }
  }

  async getStale (type) {
    const onlyLabels = this.getConfigValue(type, 'onlyLabels')
    const staleLabel = this.getConfigValue(type, 'staleLabel')
    const exemptLabels = this.getConfigValue(type, 'exemptLabels')
    const exemptProjects = this.getConfigValue(type, 'exemptProjects')
    const exemptMilestones = this.getConfigValue(type, 'exemptMilestones')
    const exemptAssignees = this.getConfigValue(type, 'exemptAssignees')
    const labels = [staleLabel].concat(exemptLabels)
    const queryParts = labels.map(label => `-label:"${label}"`)
    queryParts.push(...onlyLabels.map(label => `label:"${label}"`))
    queryParts.push(Stale.getQueryTypeRestriction(type))

    queryParts.push(exemptProjects ? 'no:project' : '')
    queryParts.push(exemptMilestones ? 'no:milestone' : '')
    queryParts.push(exemptAssignees ? 'no:assignee' : '')

    const query = queryParts.join(' ')
    const days = this.getConfigValue(type, 'days') || this.getConfigValue(type, 'daysUntilStale')
    const results = await this.search(type, days, query)

    return results
  }

  async getPinnedNumbers(type) {
    if (type === 'pulls') {
      // Pull Requests cannot be pinned
      return []
    } else if (type !== 'issues') {
      throw new Error(`Unknown type: ${type}. Valid types are 'pulls' and 'issues'`)
    }

    const { owner, repo } = this.config

    try {
      // GitHub's v3 REST API doesn't support Pinned Issues; v4 GraphQL API does
      const {data, errors} = await this.github.graphql(
        `
          query Issues($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
              pinnedIssues(first: 100) {
                nodes {
                  number
                }
                pageInfo {
                  # This should always be false, as only 3 issues can be pinned at the same time
                  hasNextPage
                }
              }
            }
          }
        `,
        {
          owner,
          repo,
          headers: {
            // Opt-in to Pinned Issues API preview
            accept: 'application/vnd.github.elektra-preview+json'
          },
        },
      )

      if (errors && errors.length) {
        throw new Error(errors[0].message)
      }

      return data.repository.pinnedIssues.nodes.map(issue => issue.number)
    } catch (error) {
      this.logger.error(`Encountered an error while excluding pinned items for ${owner}/${repo}: ${error}`)
      // In the event of an error, proceed as if no pinned issues found
      return []
    }
  }

  getClosable (type) {
    const staleLabel = this.getConfigValue(type, 'staleLabel')
    const queryTypeRestriction = Stale.getQueryTypeRestriction(type)
    const query = `label:"${staleLabel}" ${queryTypeRestriction}`
    const days = this.getConfigValue(type, 'days') || this.getConfigValue(type, 'daysUntilClose')
    return this.search(type, days, query)
  }

  static getQueryTypeRestriction (type) {
    if (type === 'pulls') {
      return 'is:pr'
    } else if (type === 'issues') {
      return 'is:issue'
    }
    throw new Error(`Unknown type: ${type}. Valid types are 'pulls' and 'issues'`)
  }

  search (type, days, query) {
    const { owner, repo } = this.config
    const timestamp = this.since(days).toISOString().replace(/\.\d{3}\w$/, '')

    query = `repo:${owner}/${repo} is:open updated:<${timestamp} ${query}`

    const params = { q: query, sort: 'updated', order: 'desc', per_page: maxActionsPerRun }

    this.logger.info(params, 'searching %s/%s for stale issues', owner, repo)
    return this.github.search.issues(params)
  }

  async markIssue (type, issue) {
    if (this.remainingActions === 0) {
      return
    }
    this.remainingActions--

    const { owner, repo } = this.config
    const perform = this.getConfigValue(type, 'perform')
    const staleLabel = this.getConfigValue(type, 'staleLabel')
    const markComment = this.getConfigValue(type, 'markComment')
    const number = issue.number

    if (perform) {
      this.logger.info('%s/%s#%d is being marked', owner, repo, number)
      if (markComment) {
        await this.github.issues.createComment({ owner, repo, number, body: markComment })
      }
      return this.github.issues.addLabels({ owner, repo, number, labels: [staleLabel] })
    } else {
      this.logger.info('%s/%s#%d would have been marked (dry-run)', owner, repo, number)
    }
  }

  async close (type, issue) {
    if (this.remainingActions === 0) {
      return
    }
    this.remainingActions--

    const { owner, repo } = this.config
    const perform = this.getConfigValue(type, 'perform')
    const closeComment = this.getConfigValue(type, 'closeComment')
    const number = issue.number

    if (perform) {
      this.logger.info('%s/%s#%d is being closed', owner, repo, number)
      if (closeComment) {
        await this.github.issues.createComment({ owner, repo, number, body: closeComment })
      }
      return this.github.issues.edit({ owner, repo, number, state: 'closed' })
    } else {
      this.logger.info('%s/%s#%d would have been closed (dry-run)', owner, repo, number)
    }
  }

  async unmarkIssue (type, issue) {
    const { owner, repo } = this.config
    const perform = this.getConfigValue(type, 'perform')
    const staleLabel = this.getConfigValue(type, 'staleLabel')
    const unmarkComment = this.getConfigValue(type, 'unmarkComment')
    const number = issue.number

    if (perform) {
      this.logger.info('%s/%s#%d is being unmarked', owner, repo, number)

      if (unmarkComment) {
        await this.github.issues.createComment({ owner, repo, number, body: unmarkComment })
      }

      return this.github.issues.removeLabel({ owner, repo, number, name: staleLabel }).catch((err) => {
        // ignore if it's a 404 because then the label was already removed
        if (err.code !== 404) {
          throw err
        }
      })
    } else {
      this.logger.info('%s/%s#%d would have been unmarked (dry-run)', owner, repo, number)
    }
  }

  // Returns true if at least one exempt label is present.
  hasExemptLabel (type, issue) {
    const exemptLabels = this.getConfigValue(type, 'exemptLabels')
    return issue.labels.some(label => exemptLabels.includes(label.name))
  }

  hasStaleLabel (type, issue) {
    const staleLabel = this.getConfigValue(type, 'staleLabel')
    return issue.labels.map(label => label.name).includes(staleLabel)
  }

  // returns a type-specific config value if it exists, otherwise returns the top-level value.
  getConfigValue (type, key) {
    if (this.config[type] && typeof this.config[type][key] !== 'undefined') {
      return this.config[type][key]
    }
    return this.config[key]
  }

  async ensureStaleLabelExists (type) {
    const { owner, repo } = this.config
    const staleLabel = this.getConfigValue(type, 'staleLabel')

    return this.github.issues.getLabel({ owner, repo, name: staleLabel }).catch(() => {
      return this.github.issues.createLabel({ owner, repo, name: staleLabel, color: 'ffffff' })
    })
  }

  since (days) {
    const ttl = days * 24 * 60 * 60 * 1000
    let date = new Date(new Date() - ttl)

    // GitHub won't allow it
    if (date < new Date(0)) {
      date = new Date(0)
    }
    return date
  }
}
