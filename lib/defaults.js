module.exports = {
  daysUntilStale: 60,
  daysUntilClose: 7,
  exemptLabels: ['pinned', 'security'],
  staleLabel: 'wontfix',
  perform: !process.env.DRY_RUN,
  markComment: 'This issue has been automatically marked as stale because ' +
    'it has not had recent activity. It will be closed if no further ' +
    'activity occurs.  Label this with any of %EXEMPT_LABELS% to hold this open. ' +
    'Thank you for your contributions.',
  unmarkComment: false,
  closeComment: false
}
