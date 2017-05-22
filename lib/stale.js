module.exports = class Stale {
  constructor(github, config = {}) {
    this.github = github;
    this.config = Object.assign({}, require('./defaults'), config || {});
    this.logger = config.logger || console;
  }

  async markAndSweep() {
    this.logger.trace(this.config, 'starting mark and sweep');

    await this.ensureStaleLabelExists();

    this.mark();
    this.sweep();
  }

  mark() {
    const staleDays = this.config.days || this.config.daysUntilStale;

    var markedIssues = new Set()

    this.getStaleIssuesSearches(staleDays).forEach(search =>
      this.github.paginate(search, res => {
        res.data.items.filter(issue => !issue.locked)
                  .filter(issue => !markedIssues.includes(issue))
                  .forEach(issue => this.mark(issue))
                  .forEach(issue => markedIssues.add(issue));
      })
    );
  }

  sweep() {
    const closeDays = this.config.days || this.config.daysUntilClose;

    this.github.paginate(this.getClosableIssuesSearch(), res => {
      res.data.items.filter(issue => !issue.locked)
                .forEach(issue => this.close(issue));
    });
  }

  getStaleIssuesSearches(staleDays) {
    const onlyLabels = this.config.onlyLabels;

    if (onlyLabels.length == 0) {
      const labels = [this.config.staleLabel].concat(this.config.exemptLabels);
      const query = labels.map(label => `-label:"${label}"`).join(' ');
      return [this.search(staleDays, query)];
    } else {
      return onlyLabels.map(label => this.getStaleIssuesSearch(staleDays, label));
    }
  }

  getStaleIssuesSearch(staleDays, label) {
    const query = `label:"${label}" -label:"${this.config.staleLabel}"`;
    return this.search(staleDays, query);
  }

  getClosableIssuesSearch(closeDays) {
    const query = `label:$"{this.config.staleLabel}"`;
    return this.search(closeDays, query);
  }

  search(days, query) {
    const {owner, repo, only} = this.config;
    const timestamp = this.since(days).toISOString().replace(/\.\d{3}\w$/, '');

    query = `repo:${owner}/${repo} is:open updated:<${timestamp} ${query}`;

    if (only === 'issues') {
      query += ` is:issue`;
    } else if (only === 'pulls') {
      query += ` is:pr`;
    }

    const params = {q: query, sort: 'updated', order: 'desc', per_page: 100};

    this.logger.debug(params, 'searching %s/%s for stale issues', owner, repo);
    return this.github.search.issues(params);
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
    const {owner, repo, perform, staleLabel, unmarkComment} = this.config;
    const number = issue.number;

    if (perform) {
      this.logger.info('%s/%s#%d is being unmarked', owner, repo, number);
      return this.github.issues.removeLabel({owner, repo, number, name: staleLabel}).then(() => {
        if (unmarkComment) {
          return this.github.issues.createComment({owner, repo, number, body: unmarkComment});
        }
      });
    } else {
      this.logger.info('%s/%s#%d would have been unmarked (dry-run)', owner, repo, number);
    }
  }

  // Returns true if at least one exempt label is present.
  hasExemptLabel(issue) {
    return issue.labels.some(label => this.config.exemptLabels.includes(label.name));
  }

  hasStaleLabel(issue) {
    return issue.labels.map(label => label.name).includes(this.config.staleLabel);
  }

  async ensureStaleLabelExists() {
    const {owner, repo, staleLabel} = this.config;

    return this.github.issues.getLabel({owner, repo, name: staleLabel}).catch(() => {
      return this.github.issues.createLabel({owner, repo, name: staleLabel, color: 'ffffff'});
    });
  }

  since(days) {
    const ttl = days * 24 * 60 * 60 * 1000;
    return new Date(new Date() - ttl);
  }
};
