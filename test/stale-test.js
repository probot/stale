const expect = require('expect');

const Stale = require('../lib/stale');

const FakeGitHub = require('./fake-github');

describe('Stale behavior', function () {
  let createLabelSpy;
  let getLabelSpy;
  let github;
  let issues;
  let stale;

  beforeEach(function () {
    github = new FakeGitHub();
    createLabelSpy = expect.spyOn(github.issues, 'createLabel');
    getLabelSpy = expect.spyOn(github.issues, 'getLabel');

    stale = new Stale(github, {
      owner: 'owner',
      repo: 'repo',
      staleLabel: 'stale-label',
      exemptLabels: ['exempt-one', 'exempt-two']
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
});
