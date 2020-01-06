var Eris = require('eris');
var logger = require('winston');
var auth = require('./auth.json');
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

var emote_map = {
  ":dagger:" : "Melee",
  ":dagger_knife:" : "Melee",
  ":crossed_swords:" : "Melee",
  ":shield:" : "Tank",
  ":hearts:" : "Healer",
  ":man_mage:" : "Ranged",
  ":woman_mage:" : "Ranged",
  ":mage:" : "Ranged",
  "♥️" : "Healer",
  "❤️" : "Healer",
  "🛡️" : "Tank",
  "⚔️" : "Melee",
  "🧙" : "Ranged",
  "🏹" : "Ranged"
};

var logCatch = function (error) { logger.error(error) }

var processCopy = function(message, channelID, cmdUser, args) {
  var guild = message.channel.guild

  var searchString = args.join(' ')

  cmdUser.getDMChannel().then((dmChannel)=>{

    // get messages in current channel
    bot.getMessages(channelID).then((msgArr) => {
      var foundMsg = null
      // search for the message we want
      for (var sMessage of msgArr) {
        //logger.info("searching message " + message.content + " with reacts " + message.reactions)
        if (sMessage.content.indexOf("!copy") != -1) {
          // skip bot commands
          continue
        }

        if (sMessage.content.indexOf(searchString) != -1) {
          foundMsg = sMessage
          break;
        }
      }

      if (foundMsg != null) {
        if (foundMsg.reactions && Object.keys(foundMsg.reactions).length > 0) {
            // copy names of people who reacted
            logger.info("found message with " + Object.keys(foundMsg.reactions).length + " reactions")

            var reactPeople = {}

            var promiseArr = []
            for (var react of Object.keys(foundMsg.reactions)) {
              logger.info("get users for react " + react)

              var fnConvert = function (react) {
                return (userArr)=>{
                    logger.info("got users for " + react)
                    return Promise.resolve({emote:react, users:userArr})
                  }
              };

              var reactPromise = foundMsg.getReaction(react).then(fnConvert(react))
              promiseArr.push(reactPromise)
            }

            Promise.all(promiseArr).then((promiseValues)=>{
              var strResult = "!copy " + searchString + "\n"

              for (var result of promiseValues) {
                reactPeople[result.emote] = result.users
                for (var user of result.users) {
                  var role = emote_map[result.emote]
                  var member = guild.members.find((member, idx, obj)=>{
                    return member.user.id == user.id;
                  })
                  var nickname = member.nick
                  logger.info("user: " + user.username + " role: " + role + " nick: " + nickname )

                  var charName = nickname || user.username
                  strResult += charName + " " + role + "\n"
                }
              }

              // we have all results now, map emojis to roles
              logger.info("send message '" + strResult + "'")
              // public response: 
              //bot.createMessage(channelID, strResult).catch(logCatch);

              // private response:
              dmChannel.createMessage(strResult).catch(logCatch);
            }).catch(logCatch); // Promise.all
          
        } else {
          logger.error( "No reacts found for '" + searchString + "'")
          dmChannel.createMessage("No reacts found for '" + searchString + "'").catch(logCatch);
        }
      } else {
        logger.error( "No message found for '" + searchString + "'")
        dmChannel.createMessage("No message found for '" + searchString + "'").catch(logCatch);
      }
    }).catch(logCatch); // bot.getMessages

    message.delete("bot processed command")
  }).catch(logCatch); // cmdUser.getDMChannel
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
    }
  }
});

bot.connect()