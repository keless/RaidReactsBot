var Eris = require('eris');
var logger = require('winston');
var auth = require('./auth.json');
var RaidEvent = require('./raidevent.js').RaidEvent;

var VERSION_STR = "1.0.3b"

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

var getMemberForUserInGuild = function (guild, user) {
  var member = guild.members.find((member, idx, obj) => {
    return member.user.id == user.id;
  })

  return member
}

var getRoleIDForNameInGuild = function (guild, roleName) {
  var role = guild.roles.find((roleObj)=>{
    return roleObj.name == roleName
  })

  if (role) {
    return role.id
  }
  return null
}

//xxx TODO: add the ability to change the title message
var processSet = function (cmdMessage, channelID, cmdUser, args) {
  if (args.length < 3) {
    // not enough arguments
    cmdUser.getDMChannel().then((dmChannel) => {
      dmChannel.createMessage("not enough params-  !add messageID name role").catch(logCatch)
      cmdMessage.delete("send error response")
    }).catch(logCatch)
    return;
  }

  var channel = cmdMessage.channel
  var guild = channel.guild
  var member = getMemberForUserInGuild(guild, cmdUser)

  // get botmaster roleID from guild

  // authenticate user as botmaster before performing command
  var isBotMaster = member.roles.includes(getRoleIDForNameInGuild(guild, "Botmaster"))
  if (!isBotMaster) {
    return;
  }

  var raidEventMessageID = args[0]
  // find embed for raidEventMessageID
  bot.getMessage(channelID, raidEventMessageID).then((message)=>{
    if (message.embeds.length <= 0) {
      return Promise.reject("MessageID did not have embed")
    }

    var raidEmbed = message.embeds[0]
    var raidEvent = new RaidEvent(guild)
    raidEvent.parseFromEmbed(raidEmbed, message)

    // perform set title, or set char signup
    if (args[1] == "title") {
      var newTitle = args[2]
  
      raidEvent.updateTitle(newTitle)

      cmdUser.getDMChannel().then((dmChannel) => {
        dmChannel.createMessage('updated title to ' + newTitle).catch(logCatch)
        cmdMessage.delete("handled message")
      }).catch(logCatch) // cmdUser.getDMChannel
    } else {
      var charName = args[1]
      var emojiRole = args[2]
      if (!RaidEvent.custom_emojis.includes(emojiRole)) {
        cmdUser.getDMChannel().then((dmChannel) => {
          dmChannel.createMessage("Invalid role: " + emojiRole + "\nSelect from: " + RaidEvent.custom_emojis.join(', ')).catch(logCatch)
          cmdMessage.delete("send error response")
        }).catch(logCatch) // cmdUser.getDMChannel
        return;
      }

      var added = raidEvent.performAdd(charName, emojiRole)
  
      cmdUser.getDMChannel().then((dmChannel) => {
        dmChannel.createMessage("" + (added ? "added " : "removed ") + charName + " as " + emojiRole).catch(logCatch)
        cmdMessage.delete("handled message")
      }).catch(logCatch) // cmdUser.getDMChannel
    } // if-else: title / charName
  }).catch((error) => {
    // couldnt find the RaidEvent embed
    cmdUser.getDMChannel().then((dmChannel) => {
      dmChannel.createMessage("Could not find RaidEvent for MessageID " + raidEventMessageID + "\nMake sure you used the correct MessageID").catch(logCatch)
      cmdMessage.delete("send error response")
    }).catch(logCatch)
  });
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
        processCopy(bot, message, channelID, cmdUser, args)
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
      case 'set':
        if (isPrivateMessage) {
          break;
        }
        processSet(message, channelID, cmdUser, args)
      break;
      case 'version': //fallthru
      case 'ver':
        if (!isPrivateMessage) {
          break;
        }
        cmdUser.getDMChannel().then((dmChannel) => {
          dmChannel.createMessage(VERSION_STR).catch(logCatch);
        }).catch(logCatch)
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