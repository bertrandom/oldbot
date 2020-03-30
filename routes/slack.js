const config = require('config');

const Router = require('express-promise-router');
const router = new Router();

const { createEventAdapter } = require('@slack/events-api');
const slackEvents = createEventAdapter(config.slack.signing_secret);

const { WebClient } = require('@slack/web-api');
const web = new WebClient(config.slack.bot_access_token);

const RecursiveIterator = require('recursive-iterator');

const Knex = require('knex');
const knexConfig = require('../knexfile');

const { Model } = require('objection');
const { Link } = require('../models/Link');

var environment = process.env.NODE_ENV;

const knex = Knex(knexConfig[environment]);

Model.knex(knex);

router.use('/events', slackEvents.expressMiddleware());

router.get('/oauth', async (req, res) => {

    return client.oauth.access({
        client_id: config.slack.client_id,
        client_secret: config.slack.client_secret,
        code: req.query.code,
    }).then((results) => {

        res.redirect(`https://slack.com/app_redirect?app=${config.slack.app_id}&team=${results.team_id}`);

    });

});

async function checkAndInsertLink(event, url) {

    const link = await Link.query().findOne({
        "team_id": event.team,
        "channel_id": event.channel,
        "url": url
    });

    if (link) {

        const permalinkResult = await web.chat.getPermalink({
            channel: link.channel_id,
            message_ts: link.message_ts,
        });

        if (permalinkResult.ok) {

            const result = await web.chat.postMessage({
                channel: event.channel,
                text: permalinkResult.permalink,
                thread_ts: event.ts
            });

            console.log(link.url + " " + permalinkResult.permalink);

        }

    } else {

        await Link.query().insert({
            team_id: event.team,
            channel_id: event.channel,
            url: url,
            message_ts: event.ts
        });

    }

}


slackEvents.on('message', (event) => {
    if (event.type === 'message' && !event.subtype) {

        if (event.blocks) {

            var links = [];

            for (let {node, path} of new RecursiveIterator(event.blocks)) {
                if (node.type === 'link' && node.url) {
                    checkAndInsertLink(event, node.url);
                }
            }

        }

    }
});

slackEvents.on('error', console.error);

module.exports = router;