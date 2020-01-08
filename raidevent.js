var fs = require('fs'); // for installing custom emojis to server
var logger = require('winston')

var logCatch = function (error) {
  logger.error(error.message || error)
}

var getEmoji = function (emoji, guild) {
  return guild.emojis.find((gEmo) => { return gEmo.name == emoji })
}
var getEmojiStr = function (emojiObj) {
  return "<:" + emojiObj.name + ":" + emojiObj.id + ">"
}

class RaidEvent {
  constructor(guild, title) {
    this.guild = guild
    this.title = title
    this.message = null
    this.signups = {} // dictionary< custom_emoji : array< username > >

    for (var role of RaidEvent.custom_emojis) {
      this.signups[role] = []
    }

    if (title) {
      //xxx todo: remove this, testing porpoises only 
      //this._testFakeInit()
    }
    
  }

  _testFakeInit() {
    this.signups["rogue"] = ["Loquilla", "Messanna", "Roguegath"]
    this.signups["prot_war"] = ["Bheshad", "Unmade", "Exitus"]
    this.signups["dps_war"] = ["Kinac", "Sundercatz"]
    this.signups["mage"] = ["Flaere", "Fippletrenix"]
    this.signups["warlock"] = ["Schwenke", "Dieinafire"]
    this.signups["resto"] = ["Oleris", "Dieform"]
    this.signups["hunter"] = ["Hozanto"]
    this.signups["shadow"] = ["Goldlining"]
  }

  parseFromEmbed(embed, message) {
    this.title = embed.title
    this.message = message

    var firstFieldIdx = 5
    for (var i = firstFieldIdx; i < embed.fields.length; i++) {
      var field = embed.fields[i]

      if (field.value == RaidEvent.EMPTY_CHAR) {
        continue //skip empty role
      }

      //ex field.name: "<:prot_war:663920063178473492> Prot Warriors (3) :"
      for (var role in RaidEvent.roleToNiceName) {
        if (field.name.indexOf(RaidEvent.roleToNiceName[role]) != -1) {
          var signupArr = this._fieldValueToSignups(field.value)
          this.signups[role] = signupArr
          break;
        }
      }
    }  
  }

  _fieldValueToSignups(value) {
    var values = value.split('\n')
    for (var i=0; i<values.length; i++) {
      values[i] = values[i].replace(/^\d+\.\s*/, '')
    }
    return values
  }

  getGroupedSignups() {
    var all = []
    var healers = []
    var tanks = []
    var melee = []
    var ranged = []
    for (var role in this.signups) {
      var roleArr = this.signups[role]
      all = all.concat(roleArr)

      switch(RaidEvent.roleForEmoji[role]) {
        case "Tank":
          tanks = tanks.concat(roleArr)
          break;
        case "Healer":
          healers = healers.concat(roleArr)
          break;
        case "Melee":
          melee = melee.concat(roleArr)
          break;
        default:
          ranged = ranged.concat(roleArr)
          break;
      }
    }
    return { all:all, healers:healers, tanks:tanks, melee:melee, ranged:ranged }
  }

  renderToEmbed() {
    var embed = {}
    embed.title = this.title

    embed.description = "**Reminder:** come prepared with food, potions, and elixers. Flasks optional."

    var isMC = (this.title.indexOf("MC") != -1 || this.title.indexOf("Molt") != -1)
    embed.thumbnail = isMC ? RaidEvent.thumbnails.mc : RaidEvent.thumbnails.ony
    embed.color = isMC ? 0xF5A623 : 0x000000

    //embed.url = "javascript:(function(){ alert('test') })();"

    embed.fields = []

    //NOTE: 25 fields max
    // 1-4 'breakdowns'
    // 5 - new line (empty field)
    // 6 - 13 'class lists'
    var roles = this.getGroupedSignups()
 
    embed.fields.push({ name: "Tanks", value: roles.tanks.length, inline: true})
    embed.fields.push({ name: "Healers", value: roles.healers.length, inline: true})
    embed.fields.push({ name: "DPS (m/r)", value: roles.melee.length + " / " + roles.ranged.length, inline: true})
    embed.fields.push({ name: "Total", value: roles.all.length, inline: true })

    embed.fields.push({ name: RaidEvent.EMPTY_CHAR, value: RaidEvent.EMPTY_CHAR, inline: false}) //new line

    for (var role of RaidEvent.custom_emojis) {
      embed.fields.push(this._fieldForRole(role))
    }

    //embed.footer = { text: '[export](javascript:alert("test"))' }

    return embed
  }

  _fieldForRole(role) {
    var roleName = RaidEvent.roleToNiceName[role]
    var emojiStr = getEmojiStr(getEmoji(role, this.guild))
    var list = this.signups[role]

    var fieldName = emojiStr + " " + roleName + " (" + list.length + ") :"

    var fieldValue = ""
    if (list.length > 0) {
      var order = 1
      for (var name of list) {
        if (order != 1) {
          fieldValue += "\n"
        }
        fieldValue += "" + order + ". " + name
        order++
      }
    } else {
      fieldValue = RaidEvent.EMPTY_CHAR
    }

    return { name: fieldName, value: fieldValue, inline: true}
  }

  handleAddedReact(emoji, user) {
    if (!this.message) {
      logger.error("por que no tengo message?")
      return // cant update embed if we dont know what message it is on (this shouldnt happen)
    }
    if (!RaidEvent.custom_emojis.includes(emoji.name)) {
      logger.error("ignoring invalid react " + emoji.name)
      return // ignore unknown react 
    }

    // get guild nickname if applicable
    var member = this.guild.members.find((member, idx, obj) => {
      return member.user.id == user.id;
    })
    var nickname = member.nick
    var charName = nickname || user.username

    // ensure charName is not already signed up anywhere
    var unsignup = false
    var all = this.getGroupedSignups()
    for (var role of RaidEvent.custom_emojis) {
      if (this.signups[role].includes(charName)) {
        if (role == emoji.name) {
          // interpret action as removing signup
          unsignup = true
        }

        //remove from role
        var idx = this.signups[role].indexOf(charName)
        if (idx != -1) {
          this.signups[role].splice(idx, 1);
        }
      }
    }

    if (!unsignup) {
      // add char name to signups for role
      this.signups[emoji.name].push(charName)
    }

    // update embed
    this.message.edit({ embed: this.renderToEmbed()}).catch(logCatch)
  }

  sendRosterToUser(user) {
    user.getDMChannel().then((dmChannel) => {
      var rosterStr = this.title + "\n\n"

      for (var role in this.signups) {
        rosterStr += this._rosterLinesForRole(role)
      }

      dmChannel.createMessage(rosterStr)
    }).catch(logCatch)
  }

  _rosterLinesForRole(role) {
    var str = ""
    var list = this.signups[role]

    var strClass = RaidEvent.classForRole[role]
    var strRole = RaidEvent.roleForEmoji[role]

    for( var user of list ) {
      str += user + " " + strClass + " " + strRole + "\n"
    }

    return str
  }
}

RaidEvent.thumbnails = {
  "mc" : { url: "https://blzmedia-a.akamaihd.net/heroes/ragnaros/abilities/icons/molten-core.png" },
  "ony" : { url: "https://steamuserimages-a.akamaihd.net/ugc/911298000368936052/7A367C1BBFACE797C39275EC4A67F96CD637D0DE/" }
}

// coresponds to reacts/signup_<name>.png
RaidEvent.custom_emojis = [
  //tank roles
  "prot_war",
  "bear",
  "prot_pali",

  //healers
  "priest_heals",
  "holy_pali",
  "resto",

  //melee
  "dps_war",
  "rogue",
  "ret",
  "cat",

  //ranged
  "hunter",
  "mage",
  "warlock",
  "shadow",
  "boomkin"
]

RaidEvent.classForRole = {
  "prot_war": "Warrior",
  "dps_war": "Warrior",
  "rogue": "Rogue",
  "hunter": "Hunter",
  "mage": "Mage",
  "warlock": "Warlock",
  "priest_heals": "Priest",
  "shadow": "Priest",
  "prot_pali": "Paladin",
  "holy_pali": "Paladin",
  "ret": "Paladin",
  "resto": "Druid",
  "bear": "Druid",
  "cat": "Druid",
  "boomkin": "Druid"
}

RaidEvent.roleForEmoji = {
  "prot_war": "Tank",
  "dps_war": "Melee",
  "rogue": "Melee",
  "hunter": "Ranged",
  "mage": "Ranged",
  "warlock": "Ranged",
  "priest_heals": "Healer",
  "shadow": "Ranged",
  "prot_pali": "Tank",
  "holy_pali": "Healer",
  "ret": "Melee",
  "resto": "Healer",
  "bear": "Tank",
  "cat": "Melee",
  "boomkin": "Ranged"
}

RaidEvent.roleToNiceName = {
  "prot_war": "Prot Warriors",
  "dps_war": "Arms/Fury",
  "rogue": "Rogues",
  "hunter": "Huntars",
  "mage": "Mages",
  "warlock": "Warlocks",
  "priest_heals": "Priests",
  "shadow": "S. Priest",
  "prot_pali": "Prot Palis",
  "holy_pali": "Holy Palis",
  "ret": "Retadins",
  "resto": "Tree Form",
  "bear": "Bear Tanks",
  "cat": "kittehIs4fite",
  "boomkin": "Boomkins"
}

RaidEvent.addTemplateReactions = function (message, guild) {
  for (var emoji of RaidEvent.custom_emojis) {
    var customEmoji = getEmoji(emoji, guild)
    message.addReaction(customEmoji.name + ":" + customEmoji.id).catch(logCatch)
  }
  message.addReaction("🦎").catch(logCatch)  // this react will be used to trigger copying the roster
}

RaidEvent.EMPTY_CHAR = "\u200B"

function base64_encode(file) {
  // read binary data
  var bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return Buffer.from(bitmap).toString('base64');
}
// NOTE: this _will_ install duplicates if called more than once (which eats up max emoji count for your server)
RaidEvent.InstallEmojis = function (guild) {
  for (var emoji of RaidEvent.custom_emojis) {
    var base64str = base64_encode("reacts/signup_" + emoji + ".png")
    guild.createEmoji({ name: emoji, image: "data:image/png;base64," + base64str }).catch(logCatch)
  }
}

module.exports = { RaidEvent: RaidEvent }  //note: ES6 Module format