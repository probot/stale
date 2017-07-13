module.exports = {
  noResponse: {
    daysUntilClose: 14,
    perform: !process.env.DRY_RUN,
    responseRequiredLabel: 'more-information-needed',
    closeComment:
      'This issue has been automatically closed because there has been no response ' +
      'to our request for more information from the original author. With only the ' +
      'information that is currently in the issue, we don\'t have enough information ' +
      'to take action. Please reach out if you have or find the answers we need so ' +
      'that we can investigate further.'
  },
  stale: {
    daysUntilStale: 60,
    daysUntilClose: 7,
    exemptLabels: ['pinned', 'security'],
    staleLabel: 'wontfix',
    perform: !process.env.DRY_RUN,
    markComment: 'This issue has been automatically marked as stale because ' +
      'it has not had recent activity. It will be closed if no further ' +
      'activity occurs. Thank you for your contributions.',
    unmarkComment: false,
    closeComment: false
  }
};
