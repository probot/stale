# Probot: Stale

> a GitHub Integration built with [Probot](https://github.com/probot/probot) that closes abandoned Issues and Pull Requests after a period of inactivity.

[![](https://cloud.githubusercontent.com/assets/173/23858697/4885f0d6-07cf-11e7-96ed-716948027bbc.png)](https://github.com/probot/demo/issues/2)

Inspired by @parkr's [auto-reply](https://github.com/parkr/auto-reply#optional-mark-and-sweep-stale-issues) bot that runs @jekyllbot.

## Usage

1. **[Configure the GitHub App](https://github.com/apps/probot-stale)**
2. Create `.github/stale.yml` based on the following template
3. It will start scanning for stale issues and/or pull requests within an hour.

A `.github/stale.yml` file is required to enable the plugin. The file can be empty, or it can override any of these default settings:

```yml
# Configuration for probot-stale - https://github.com/probot/stale

# Number of days of inactivity before an Issue or Pull Request becomes stale
daysUntilStale: 60
# Number of days of inactivity before a stale Issue or Pull Request is closed
daysUntilClose: 7
# Issues or Pull Requests with these labels will never be considered stale. Set to `[]` to disable
exemptLabels:
  - pinned
  - security
# Label to use when marking as stale
staleLabel: wontfix
# Comment to post when marking as stale. Set to `false` to disable
markComment: >
  This issue has been automatically marked as stale because it has not had
  recent activity. It will be closed if no further activity occurs. Thank you
  for your contributions.
# Comment to post when removing the stale label. Set to `false` to disable
unmarkComment: false
# Comment to post when closing a stale Issue or Pull Request. Set to `false` to disable
closeComment: false
# Limit to only `issues` or `pulls`
# only: issues
```

## How are issues & pull requests considered stale?

The app uses GitHub's [updated](https://help.github.com/articles/searching-issues/#search-based-on-when-an-issue-or-pull-request-was-created-or-last-updated) search qualifier to determine staleness. Any change to an issues and pull request is considered an update, including comments, changing labels, applying or removing milestones,  or pushing commits.

An easy way to check and see which issues or pull requests will initially be marked as stale is to add the `updated` search qualifier to either the issue or pull request page filter for your repository: `updated:<2017-07-01`. Adjust the date to be 60 days ago (or whatever you set for `daysUntilStale`) to see which issues or pull requests will be marked.

## Deployment

See [docs/deploy.md](docs/deploy.md) if you would like to run your own instance of this plugin.
