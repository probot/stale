# Probot: Stale

> a GitHub Integration built with [Probot](https://github.com/probot/probot) that closes abandoned issues after a few months of inactivity.

Inspired by @parkr's [auto-reply](https://github.com/parkr/auto-reply#optional-mark-and-sweep-stale-issues) bot that runs @jekyllbot.

## TODO:

- [x] On an interval:
  - [x] Get all installations & repositories
  - [x] Run mark & sweep
- [x] on relevant issue activity: unmark
- [ ] Get config from repo or org
- [ ] Deploy demo instance
- [ ] Add docs on usage/deployment
- [ ] Release v1.0

## Deploying to Heroku

0. [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy) - Click this button and pick an **App Name** that Heroku is happy with. Before you can complete this, you'll need config variables from the next step.

0. In another tab, [create an integration](https://github.com/settings/integrations/new) on GitHub, using `https://[yourappname].herokuapp.com/` (replacing `[yourappname]` with the name from step 1) as the **Homepage URL**, **Callback URL**, and **Webhook URL**, and under **Permissions & events**, set:
  - Issues - **Read & Write**
    - [x] Check the box for **Issue comment** events
    - [x] Check the box for **Issues** events

0. After creating your GitHub integration, go back to the Heroku tab and fill in the configuration variables with the values for the GitHub Integration

0. Create a `.github/ISSUE_REPLY_TEMPLATE.md` file in your repository.
