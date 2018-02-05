const initiateStream = require(`${__dirname}/../../Stream/initiateStream`);

const requiredPermissions = [
  'addReactions',
  'readMessages',
  'sendMessages',
  'manageMessages',
  'embedLinks',
  'readMessageHistory',
  'externalEmojis'
];

async function setupCommand (msg) {
  if (!msg.channelMentions[0]) {
    return 'You need to mention a channel.';
  }

  if (!msg.member.permission.has('manageChannels')) {
    return 'You need the `Manage Channels` permission to set up a timeline channel.';
  }

  const perms = msg.channel.guild.channels
    .get(msg.channelMentions[0])
    .permissionsOf(this.bot.user.id);
  for (const perm of requiredPermissions) {
    if (!perms.has(perm)) {
      return `This channel doesn't have the \`${perm}\` permission for me. I need it to work.`;
    }
  }


  const link = await this.db.getLink(msg.author.id);
  if (!link) {
    return `You haven't linked your Twitter account yet. Please do here: ${this.config.web.domain}/link?id=${msg.author.id}`;
  }

  const potentialTimeline = await this.db.getTimeline(msg.channelMentions[0], msg.author.id);

  if (potentialTimeline) {
    const channel = potentialTimeline.channelID === msg.channelMentions[0];
    return channel ?
      `The channel <#${msg.channelMentions}> has already been linked with ${link.twitterID === potentialTimeline.twitterID ? 'your twitter account' : await this.RestClient.getTagByID(potentialTimeline.userID)}.` :
      `You've already linked with <#${potentialTimeline.channelID}>.`;
  }

  this.bot.sendMessage(msg.channel.id, `Are you sure you want to link <#${msg.channelMentions[0]}> with your twitter account (\`@${link.name}\`)?\nThis means anyone who can see <#${msg.channelMentions[0]}> will be able to read any new tweets, likes, retweets or follows on your timeline.\n\nRespond with \`yes\` or \`no\`.`);

  const message = await this.bot.MessageCollector.awaitMessage(msg.channel.id, msg.author.id, 30e3, (m) => ['y', 'n', 'yes', 'no'].includes(m.content.toLowerCase()));
  if (!message) {
    return 'Prompt timed out.';
  }

  if (['n', 'no'].includes(message.content.toLowerCase())) {
    return 'Cancelled.';
  } else {
    await this.db.addTimeline({
      channelID: msg.channelMentions[0],
      userID: msg.author.id,
      twitterID: link.twitterID
    });
    await initiateStream.call(this, await this.db.getTimeline(null, msg.author.id));
    return `<#${msg.channelMentions[0]}> has been successfully set up for your timeline. Any new events will now appear there.`;
  }
}

module.exports = {
  command: setupCommand,
  name: 'setup',
  aliases: ['setchannel'],
  description: ''
};