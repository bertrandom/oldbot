
exports.up = function(knex) {
    return knex.schema.createTable('links', table => {
        table.increments('id').primary();
        table.string('team_id');
        table.string('channel_id');
        table.string('url');
        table.string('message_ts');
        table.index(['team_id', 'channel_id', 'url']);
    });  
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('links');
};
