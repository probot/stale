# Probot: Stale

> a GitHub Integration built with [Probot](https://github.com/probot/probot) that closes abandoned Issues and Pull Requests after a period of inactivity.

[![](https://cloud.githubusercontent.com/assets/173/23858697/4885f0d6-07cf-11e7-96ed-716948027bbc.png)](https://github.com/probot/demo/issues/2)

Inspired by @parkr's [auto-reply](https://github.com/parkr/auto-reply#optional-mark-and-sweep-stale-issues) bot that runs @jekyllbot.

## Usage

1. **[Configure the GitHub Integration](https://github.com/integration/probot-stale)**
2. Create `.github/stale.yml`

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

See [docs/deploy.md](docs/deploy.md) if you would like to run your own instance of this plugin.

## Troubleshooting

Once probot-stale is configured and running, it can be difficult to tell if the bot is working.
The following sections should help clarify probot-stale's behavior.

### Is probot-stale running?

Once the bot starts, it scans for stale issues and/or pull requests every hour. When it begins
each hour, however, is randomly determined. The plugin delegates to GitHub for determining
updated time.

When the bot is first started (or the integration is installed, depending on your setup method)
and the config file is already in place, the bot will not comment on items right away. However,
if the config file is pushed up after the bot starts, it will start searching for issues
immediately.

The start-up delay is useful for organizations that enable probot-stale on many repositories
within the organization to avoid hitting API limits.

### Stale vs. Updated

When probot-stale searches for stale issues and/or pull requests, "stale" doesn't mean **only**
when a user comments on an issue. It can also mean when a milestone is applied, a label is changed,
a commit is added, etc.

The bot uses GitHub's [updated](https://help.github.com/articles/searching-issues/#search-based-on-when-an-issue-or-pull-request-was-created-or-last-updated)
search qualifier to find stale issues or pull requests.

An easy way to check and see which issues (or pull requests) probot-stale will initially mark as
stale is to add the `updated` search qualifier to either the issue or pull request page filter for
your repository.
