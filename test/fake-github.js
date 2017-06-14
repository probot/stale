class FakeIssues {
  createLabel(options) {
    throw new Error('Not implemented');
  }

  getLabel(options) {
    throw new Error('Not implemented');
  }
}

/**
 * Implements a fake version of the npm github module.
 */
class FakeGitHub {
  constructor() {
    this.issues = new FakeIssues();
  }
}

module.exports = FakeGitHub;
