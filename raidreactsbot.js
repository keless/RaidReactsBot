var Eris = require('eris');
var logger = require('winston');
var auth = require('./auth.json');
var RaidEvent = require('./raidevent.js').RaidEvent;

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Eris(auth.token);
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.user.username + ' - (' + bot.user.id + ')');
});

var logCatch = function (error) {
  logger.error(error.message || error) 
}

var processCopy = require('./copyReacts.js')

var processCreate = function (message, channelID, cmdUser, args) {
  var eventTitle = args.join(' ')
  var guild = message.channel.guild

  var raidEvent = new RaidEvent(guild, eventTitle)
  var embed = raidEvent.renderToEmbed()

  bot.createMessage(channelID, { embed: embed }).then((raidEventMessage)=>{
    // set up the example emojis
    RaidEvent.addTemplateReactions(raidEventMessage, guild)

    message.delete().catch(logCatch)
  }).catch(logCatch);
}

bot.on('messageCreate', function (message) {
  // Our bot needs to know if it will execute a command
  // It will listen for messages that will start with `!`
  var channelID = message.channel.id
  var isPrivateMessage = (message.channel.type == 1)
  var cmdUser = message.author

  if (message.content.substring(0, 1) == '!') {
    var args = message.content.substring(1).split(' ');
    var cmd = args[0];
    
    args = args.splice(1);
    switch(cmd) {
      case 'ping':
        // public response:
        //bot.createMessage(channelID, 'Pong!').catch((error)=> { logger.error(error) });

        // private response:
        cmdUser.getDMChannel().then((dmChannel)=>{
          dmChannel.createMessage('Pong!').then(()=>{
            logger.info("sent pong response")
            message.delete("bot responded")
          }).catch(logCatch);
        }).catch(logCatch)
      break;
      case 'copy':
        if (isPrivateMessage) {
          break;
        }
        processCopy(message, channelID, cmdUser, args)
      break;
      case 'installEmojis':
        if (isPrivateMessage) {
          break;
        }
        // NOTE: this _will_ install duplicates if called more than once (which eats up max emoji count for your server)
        RaidEvent.InstallEmojis(message.channel.guild)
      break;
      case 'create':
        if (isPrivateMessage) {
          break;
        }
        processCreate(message, channelID, cmdUser, args)
      break;
    }
  }
});

bot.on('messageReactionAdd', (partialMessageData, emojiObj, userID) => {
  var channelID = partialMessageData.channel.id
  var messageID = partialMessageData.id

  bot.getMessage(channelID, messageID).then((message)=>{
    if (message.author != bot.user || message.embeds.length == 0) {
      return // not our message, or not a raid event
    }
    if (userID == bot.user.id) {
      return // dont listen to reacts the bot sets
    }

    var reactUser = bot.users.get(userID)
    var guild = message.channel.guild

    //logger.info("got react " + emojiObj.name +" for " + message.embeds[0].title)

    var raidEmbed = message.embeds[0]
    var raidEvent = new RaidEvent(guild)
    raidEvent.parseFromEmbed(raidEmbed, message)

    if (emojiObj.name == "🦎") {
      // get roster and send as private message
      raidEvent.sendRosterToUser(reactUser)
      // now reset the react (remove the userID's react)
      message.removeReaction("🦎", userID)
    } else {
      raidEvent.handleAddedReact(emojiObj, reactUser)
      // now reset the react (remove the userID's react)
      message.removeReaction(emojiObj.name + ":" + emojiObj.id, userID)
    }
  }).catch(logCatch)
})

bot.connect()