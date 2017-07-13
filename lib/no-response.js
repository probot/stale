module.exports = class NoResponse {
  constructor(github, config = {}) {
    this.github = github;
    this.config = Object.assign({}, require('./defaults').noResponse, config || {});
    this.logger = config.logger || console;
  }

  async sweep() {
    this.logger.debug(this.config, 'starting sweep');

    await this.ensureResponseRequiredLabelExists();

    const closableIssues = await this.getClosableIssues();
    closableIssues.forEach(issue => this.close(issue));
  }

  async getClosableIssues() {
    const {owner, repo, responseRequiredLabel, daysUntilClose} = this.config;
    const query = `repo:${owner}/${repo} is:issue is:open label:"${responseRequiredLabel}"`;

    // Reason: These property names are for the GitHub search interface
    // eslint-disable-next-line camelcase
    const params = {q: query, sort: 'updated', order: 'desc', per_page: 100};
    const labeledEarlierThan = this.since(daysUntilClose);

    const issues = await this.github.paginate(this.github.search.issues(params), res => res.data.items);
    return issues.filter(async issue => {
      const event = await this.findLastLabeledEvent(issue);

      if (event.created_at < labeledEarlierThan) {
        issue.labeled = event.created_at;
        return issue;
      }
    });
  }

  async findLastLabeledEvent(issue) {
    const {owner, repo, responseRequiredLabel} = this.config;
    const number = issue.number;

    // Reason: These property names are for the GitHub search interface
    // eslint-disable-next-line camelcase
    const params = {owner, repo, issue_number: number, per_page: 100};
    const events = await this.github.paginate(this.github.issues.getEvents(params), res => res.data.items);
    return events.reverse()
                 .find(event => event.event === 'labeled' && event.label.name === responseRequiredLabel);
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
    const {owner, repo, perform, responseRequiredLabel} = this.config;
    const number = issue.number;

    if (perform) {
      this.logger.info('%s/%s#%d is being unmarked', owner, repo, number);
      return this.github.issues.removeLabel({owner, repo, number, name: responseRequiredLabel}).then(() => {
        if (issue.state === 'closed') {
          this.github.issues.edit({owner, repo, number, state: 'open'});
        }
      });
    } else {
      this.logger.info('%s/%s#%d would have been unmarked (dry-run)', owner, repo, number);
    }
  }

  hasResponseRequiredLabel(issue) {
    return issue.labels.map(label => label.name).includes(this.config.responseRequiredLabel);
  }

  async ensureResponseRequiredLabelExists() {
    const {owner, repo, responseRequiredLabel} = this.config;

    return this.github.issues.getLabel({owner, repo, name: responseRequiredLabel}).catch(() => {
      return this.github.issues.createLabel({owner, repo, name: responseRequiredLabel, color: 'ffffff'});
    });
  }

  since(days) {
    const ttl = days * 24 * 60 * 60 * 1000;
    return new Date(new Date() - ttl);
  }
};
