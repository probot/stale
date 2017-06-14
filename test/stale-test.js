const expect = require('expect');

const Stale = require('../lib/stale');

const FakeGitHub = require('./fake-github');

const {createSpy, spyOn} = expect;

describe('Stale behavior', function () {
  let createLabelSpy;
  let getLabelSpy;
  let github;
  let issues;
  let issueSearchSpy;
  let logger;
  let stale;

  beforeEach(function () {
    github = new FakeGitHub();
    createLabelSpy = spyOn(github.issues, 'createLabel');
    getLabelSpy = spyOn(github.issues, 'getLabel');
    issueSearchSpy = spyOn(github.search, 'issues');
    logger = {
      debug: createSpy(),
      trace: createSpy()
    };

    stale = new Stale(github, {
      owner: 'owner',
      repo: 'repo',
      staleLabel: 'stale-label',
      exemptLabels: ['exempt-one', 'exempt-two'],
      logger
    });
  });

  describe('defaults', function () {
    it('has the expected defaults', function () {
      stale = new Stale(github, {});

      expect(stale.config.daysUntilStale).toBe(60);
      expect(stale.config.daysUntilClose).toBe(7);
      expect(stale.config.exemptLabels).toEqual(['pinned', 'security']);
      expect(stale.config.staleLabel).toEqual('wontfix');
      expect(stale.config.unmarkComment).toBe(false);
      expect(stale.config.closeComment).toBe(false);
    });
  });

  describe('ensureStaleLabelExists', function () {
    it('does not try to create the label if it already exists', async function () {
      getLabelSpy.andReturn(Promise.resolve({}));

      const returnValue = await stale.ensureStaleLabelExists();

      expect(returnValue).toExist();
      expect(getLabelSpy).toHaveBeenCalled();
      expect(getLabelSpy.calls[0].arguments[0])
        .toMatch({owner: 'owner', repo: 'repo', name: 'stale-label'});
      expect(createLabelSpy).toNotHaveBeenCalled();
    });

    it('it creates the label if the label does not already exist', async function () {
      getLabelSpy.andReturn(Promise.reject());
      createLabelSpy.andReturn(Promise.resolve({}));

      const returnValue = await stale.ensureStaleLabelExists();

      expect(returnValue).toExist();
      expect(getLabelSpy).toHaveBeenCalled();
      expect(getLabelSpy.calls[0].arguments[0])
        .toMatch({owner: 'owner', repo: 'repo', name: 'stale-label'});
      expect(createLabelSpy).toHaveBeenCalled();
      expect(createLabelSpy.calls[0].arguments[0])
        .toMatch({owner: 'owner', repo: 'repo', name: 'stale-label'});
    });
  });

  describe('hasExemptLabel', function () {
    it('returns true if at least one of the exempt labels exists', function () {
      expect(stale.hasExemptLabel({labels: [{name: 'exempt-two'}]})).toBe(true);
    });

    it('returns false if none of the exempt labels exists', function () {
      expect(stale.hasExemptLabel({labels: [{name: 'some-other-label'}]})).toBe(false);
    });

    it('returns false if the issue has no labels', function () {
      expect(stale.hasExemptLabel({labels: []})).toBe(false);
    });
  });

  describe('hasStaleLabel', function () {
    it('returns true if one of the labels is the stale label', function () {
      expect(stale.hasStaleLabel({labels: [{name: 'stale-label'}]})).toBe(true);
    });

    it('returns false if none of the labels is the stale label', function () {
      expect(stale.hasStaleLabel({labels: [{name: 'some-other-label'}]})).toBe(false);
    });

    it('returns false if there are no labels', function () {
      expect(stale.hasStaleLabel({labels: []})).toBe(false);
    });
  });

  describe('search', function () {
    it('crafts the correct search query', function () {
      stale.search(100, 'foo');

      const params = issueSearchSpy.calls[0].arguments[0];
      const timestamp = new Date(new Date() - (100 * 24 * 60 * 60 * 1000)).toISOString().replace(/\.\d{3}\w$/, '');

      expect(params.q)
        .toMatch(/repo:owner\/repo/)
        .toMatch(/is:open/)
        .toMatch(/foo/)
        .toMatch(new RegExp(`updated:<${timestamp}`));

      expect(params.per_page).toBe(100);
      expect(params.sort).toEqual('updated');
      expect(params.order).toEqual('desc');
    });

    it('searches for both issues and PRs by default', function () {
      stale.search(100, 'foo');

      expect(issueSearchSpy.calls[0].arguments[0].q)
        .toNotMatch(/is:pr/)
        .toNotMatch(/is:issue/);
    });

    it('searches for only issues if configured', function () {
      stale.config.only = 'issues';
      stale.search(100, 'foo');

      const params = issueSearchSpy.calls[0].arguments[0];

      expect(params.q).toMatch(/is:issue/);
    });

    it('searches for only PRs if configured', function () {
      stale.config.only = 'pulls';
      stale.search(100, 'foo');

      const params = issueSearchSpy.calls[0].arguments[0];

      expect(params.q).toMatch(/is:pr/);
    });
  });
});
