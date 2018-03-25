const { inspect } = require('util');
const ProgrammaticREPL = require('programmatic-repl'); // Our own module :')

async function replCommand (msg) {
  const REPL = new ProgrammaticREPL({
    includeNative: true,
    includeBuiltinLibs: true,
    stringifyResults: true,
    name: 'tweetcord.repl'
  }, {
    ...this
  });

  const runCommand = async () => {
    const commandMsg = await this.bot.MessageCollector.awaitMessage(msg.channel.id, msg.author.id, 120e3);
    if (!commandMsg) {
      return this.bot.sendMessage(msg.channel.id, 'Timed out, automatically exiting REPL...');
    }

    if (commandMsg.content === '.exit') {
      return this.bot.sendMessage(msg.channel.id, 'Successfully exited.');
    }

    REPL.ctx.msg = commandMsg;

    let result;
    try {
      result = await REPL.execute(commandMsg.content);
    } catch (e) {
      const error = e.stack || e;
      result = `ERROR:\n${typeof error === 'string' ? error : inspect(error, { depth: 1 })}`;
    }

    if (typeof result !== 'string') {
      result = inspect(result, {
        depth: +!(inspect(result, { depth: 1, showHidden: true }).length > 1990), // Results in either 0 or 1
        showHidden: true
      });
    }

    result = this.misc.redact(result);
    if (result.length > 1980) {
      // If it's over the 2k char limit, we break off the result, pop the last line and close off
      result = result.slice(0, 1980).split('\n');
      result.pop();
      result = result.join('\n') + '\n\n...';
    }

    this.bot.sendMessage(msg.channel.id, '```js\n' + result + '\n```');

    runCommand();
  };

  runCommand();
  return 'REPL started. Available commands:\n```\n.exit\n.clear\n_\n```';
}

module.exports = {
  command: replCommand,
  name: 'repl',
  usage: '{command}',
  ownerOnly: true,
  description: 'Bot owner only.'
};
