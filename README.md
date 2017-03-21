# Probot: Stale

> a GitHub Integration built with [Probot](https://github.com/probot/probot) that closes abandoned issues after a period of inactivity.

[![](https://cloud.githubusercontent.com/assets/173/23858697/4885f0d6-07cf-11e7-96ed-716948027bbc.png)](https://github.com/probot/demo/issues/2)

Inspired by @parkr's [auto-reply](https://github.com/parkr/auto-reply#optional-mark-and-sweep-stale-issues) bot that runs @jekyllbot.

## Usage

1. **[Configure the GitHub Integration](https://github.com/integration/probot-stale)**
2. Create `.github/stale.yml`

Configuration in `.github/stale.yml` can override these defaults:

```yml
# Number of days of inactivity before an issue becomes stale
days: 60
# Issues with these labels will never be considered stale
exemptLabels:
  - pinned
  - security
# Label to use when marking an issue as stale
staleLabel: wontfix
# Comment to post when marking an issue as stale. Set to `false` to disable
markComment: >
  This issue has been automatically marked as stale because it has not had
  recent activity. It will be closed if no further activity occurs. Thank you
  for your contributions.
# Comment to post when closing a stale issue. Set to `false` to disable
closeComment: false
```

## Deploying to Heroku

1. [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy) - Click this button and pick an **App Name** that Heroku is happy with. Before you can complete this, you'll need config variables from the next step.
1. In another tab, [create an integration](https://github.com/settings/integrations/new) on GitHub, using `https://[yourappname].herokuapp.com/` (replacing `[yourappname]` with the name from step 1) as the **Callback URL** and **Webhook URL**, and under **Permissions & events**, set:
    - Issues - **Read & Write**
      - [x] Check the box for **Issue comment** events
      - [x] Check the box for **Issues** events
1. After creating your GitHub integration, go back to the Heroku tab and fill in the configuration variables with the values for the GitHub Integration
1. Create a `.github/ISSUE_REPLY_TEMPLATE.md` file in your repository.
