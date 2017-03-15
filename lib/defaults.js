module.exports = {
  ttl: 60 * 24 * 60 * 60 * 100, // 60 days
  exemptLabels: ['pinned', 'security'],
  staleLabel: 'stale',
  perform: !process.env.DRY_RUN,
  markComment: 'This issue has been automatically marked as stale because ' +
    'it has not had recent activity. It will be closed if no further ' +
    'activity occurs. Thank you for your contributions.',
  closeComment: false
};
