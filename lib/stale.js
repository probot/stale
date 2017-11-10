module.exports = class Stale {
  constructor (github, config = {}) {
    this.github = github
    this.config = Object.assign({}, require('./defaults'), config || {})
    this.logger = config.logger || console
  }

  async markAndSweep () {
    this.logger.trace(this.config, 'starting mark and sweep')

    await this.ensureStaleLabelExists()

    this.getStaleIssues().then(res => {
      res.data.items.filter(issue => !issue.locked)
        .forEach(issue => this.mark(issue))
    })

    this.getClosableIssues().then(res => {
      res.data.items.filter(issue => !issue.locked)
        .forEach(issue => this.close(issue))
    })
  }

  getStaleIssues () {
    const labels = [this.config.staleLabel].concat(this.config.exemptLabels)
    const query = labels.map(label => `-label:"${label}"`).join(' ')
    const days = this.config.days || this.config.daysUntilStale
    return this.search(days, query)
  }

  getClosableIssues () {
    const query = `label:"${this.config.staleLabel}"`
    const days = this.config.days || this.config.daysUntilClose
    return this.search(days, query)
  }

  search (days, query) {
    const {owner, repo, only} = this.config
    const timestamp = this.since(days).toISOString().replace(/\.\d{3}\w$/, '')

    query = `repo:${owner}/${repo} is:open updated:<${timestamp} ${query}`

    if (only === 'issues') {
      query += ` is:issue`
    } else if (only === 'pulls') {
      query += ` is:pr`
    }

    const params = {q: query, sort: 'updated', order: 'desc', per_page: 30}

    this.logger.debug(params, 'searching %s/%s for stale issues', owner, repo)
    return this.github.search.issues(params)
  }

  async mark (issue) {
    const {owner, repo, staleLabel, markComment, perform, exemptLabels} = this.config
    const number = issue.number
    const labels = exemptLabels.map(label => `\`${label}\``).join(', ')
    const body = markComment.replace(/%EXEMPT_LABELS%/g, labels)

    if (perform) {
      this.logger.info('%s/%s#%d is being marked', owner, repo, number)
      if (markComment) {
        await this.github.issues.createComment({owner, repo, number, body})
      }
      return this.github.issues.addLabels({owner, repo, number, labels: [staleLabel]})
    } else {
      this.logger.info('%s/%s#%d would have been marked (dry-run)', owner, repo, number)
    }
  }

  async close (issue) {
    const {owner, repo, perform, closeComment} = this.config
    const number = issue.number

    if (perform) {
      this.logger.info('%s/%s#%d is being closed', owner, repo, number)
      if (closeComment) {
        await this.github.issues.createComment({owner, repo, number, body: closeComment})
      }
      return this.github.issues.edit({owner, repo, number, state: 'closed'})
    } else {
      this.logger.info('%s/%s#%d would have been closed (dry-run)', owner, repo, number)
    }
  }

  async unmark (issue) {
    const {owner, repo, perform, staleLabel, unmarkComment} = this.config
    const number = issue.number

    if (perform) {
      this.logger.info('%s/%s#%d is being unmarked', owner, repo, number)

      if (unmarkComment) {
        await this.github.issues.createComment({owner, repo, number, body: unmarkComment})
      }

      return this.github.issues.removeLabel({owner, repo, number, name: staleLabel}).catch((err) => {
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
  hasExemptLabel (issue) {
    return issue.labels.some(label => this.config.exemptLabels.includes(label.name))
  }

  hasStaleLabel (issue) {
    return issue.labels.map(label => label.name).includes(this.config.staleLabel)
  }

  async ensureStaleLabelExists () {
    const {owner, repo, staleLabel} = this.config

    return this.github.issues.getLabel({owner, repo, name: staleLabel}).catch(() => {
      return this.github.issues.createLabel({owner, repo, name: staleLabel, color: 'ffffff'})
    })
  }

  since (days) {
    const ttl = days * 24 * 60 * 60 * 1000
    return new Date(new Date() - ttl)
  }
}
