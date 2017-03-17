module.exports = class Stale {
  constructor(github, config = {}) {
    this.github = github;
    this.config = Object.assign({}, require('./defaults'), config || {});
    this.logger = config.logger || console;
  }

  async markAndSweep() {
    this.logger.trace(this.config, 'starting mark and sweep');

    await this.ensureStaleLabelExists();

    // TODO: paginate
    const data = await this.getIssues();

    data.items.forEach(issue => {
      if (this.isStale(issue)) {
        if (this.hasStaleLabel(issue)) {
          return this.close(issue);
        } else {
          return this.mark(issue);
        }
      }
    });
  }

  async getIssues() {
    const timestamp = this.since.toISOString().replace(/\.\d{3}\w$/, '');
    const {owner, repo} = this.config;

    const params = {
      q: `repo:${owner}/${repo} is:issue is:open updated:<${timestamp}`,
      sort: 'updated',
      order: 'desc',
      per_page: 100
    };

    this.logger.debug(params, 'searching %s/%s for stale issues', owner, repo);
    return this.github.search.issues(params);
  }

  isStale(issue) {
    return !this.recentlyUpdated(issue) && !this.hasExemptLabel(issue);
  }

  hasStaleLabel(issue) {
    return issue.labels.map(label => label.name).includes(this.config.staleLabel);
  }

  mark(issue) {
    const {owner, repo, staleLabel, markComment, perform} = this.config;
    const number = issue.number;

    if (perform) {
      this.logger.info('%s/%s#%d is being marked', owner, repo, number);
      return this.github.issues.addLabels({owner, repo, number, labels: [staleLabel]}).then(() => {
        if (markComment) {
          return this.github.issues.createComment({owner, repo, number, body: markComment});
        }
      });
    } else {
      this.logger.info('%s/%s#%d would have been marked (dry-run)', owner, repo, number);
    }
  }

  close(issue) {
    const {owner, repo, perform, closeComment} = this.config;
    const number = issue.number;

    if (perform) {
      this.logger.info('%s/%s#%d is being closed', owner, repo, number);
      return this.github.issues.edit({owner, repo, number, state: 'closed'}).then(() => {
        if (closeComment) {
          return this.github.issues.createComment({owner, repo, number, body: closeComment});
        }
      });
    } else {
      this.logger.info('%s/%s#%d would have been closed (dry-run)', owner, repo, number);
    }
  }

  unmark(issue) {
    const {owner, repo, perform, staleLabel} = this.config;
    const number = issue.number;

    if (perform) {
      this.logger.info('%s/%s#%d is being unmarked', owner, repo, number);
      return this.github.issues.removeLabel({owner, repo, number, name: staleLabel});
    } else {
      this.logger.info('%s/%s#%d would have been unmarked (dry-run)', owner, repo, number);
    }
  }

  recentlyUpdated(issue) {
    return Date.parse(issue.updated_at) >= this.since;
  }

  // Returns true if at least one exempt label is present.
  hasExemptLabel(issue) {
    return issue.labels.some(label => this.config.exemptLabels.includes(label.name));
  }

  async ensureStaleLabelExists() {
    const {owner, repo, staleLabel} = this.config;

    return this.github.issues.getLabel({owner, repo, name: staleLabel}).catch(() => {
      return this.github.issues.createLabel({owner, repo, name: staleLabel, color: 'ffffff'});
    });
  }

  get since() {
    const ttl = this.config.days * 24 * 60 * 60 * 1000;
    return new Date(new Date() - ttl);
  }
};
