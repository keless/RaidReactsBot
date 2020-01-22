var logger = require('winston')
var RaidReactsFramework = require('./raidreactsFramework.js')

var emote_map = {
  ":dagger:": "Melee",
  ":dagger_knife:": "Melee",
  ":crossed_swords:": "Melee",
  ":shield:": "Tank",
  ":hearts:": "Healer",
  ":man_mage:": "Ranged",
  ":woman_mage:": "Ranged",
  ":mage:": "Ranged",
  "♥️": "Healer",
  "❤️": "Healer",
  "🛡️": "Tank",
  "⚔️": "Melee",
  "🧙": "Ranged",
  "🏹": "Ranged"
}

var processCopy = function (client, message, channelID, cmdUser, args) {
  var guild = message.channel.guild

  var searchString = args.join(' ')


  // get messages in current channel
  return client.getMessages(channelID).then((msgArr) => {
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
            return (userArr) => {
              logger.info("got users for " + react)
              return Promise.resolve({ emote: react, users: userArr })
            }
          };

          var reactPromise = foundMsg.getReaction(react).then(fnConvert(react))
          promiseArr.push(reactPromise)
        }

        Promise.all(promiseArr).then((promiseValues) => {
          var strResult = "!copy " + searchString + "\n"

          for (var result of promiseValues) {
            reactPeople[result.emote] = result.users
            for (var user of result.users) {
              var role = emote_map[result.emote]
              var member = guild.members.find((member, idx, obj) => {
                return member.user.id == user.id;
              })
              var nickname = member.nick
              logger.info("user: " + user.username + " role: " + role + " nick: " + nickname)

              var charName = nickname || user.username
              strResult += charName + " " + role + "\n"
            }
          }

          // we have all results now, map emojis to roles
          logger.info("send message '" + strResult + "'")
          // public response: 
          //client.createMessage(channelID, strResult).catch(RaidReactsFramework.logCatch);

          // private response:
          RaidReactsFramework.sendPM(cmdUser, strResult).catch(RaidReactsFramework.logCatch)
        }).catch(RaidReactsFramework.logCatch) // Promise.all

      } else {
        logger.error("No reacts found for '" + searchString + "'")
        RaidReactsFramework.sendPM(cmdUser, "No reacts found for '" + searchString + "'").catch(RaidReactsFramework.logCatch)
      }
    } else {
      logger.error("No message found for '" + searchString + "'")
      RaidReactsFramework.sendPM(cmdUser, "No message found for '" + searchString + "'").catch(RaidReactsFramework.logCatch)
    }
    message.delete("processed command").catch(RaidReactsFramework.logCatch)
  }).catch(RaidReactsFramework.logCatch) // client.getMessages
}

module.exports = processCopy