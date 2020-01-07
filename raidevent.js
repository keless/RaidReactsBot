var fs = require('fs'); // for installing custom emojis to server

class RaidEvent {
  constructor(title) {
    this.title = title
    this.signups = {} // dictionary< custom_emoji : array< username > >

    for (var role of RaidEvent.custom_emojis) {
      this.signups[role] = []
    }
  }

  parseFromEmbed(embed) {

  }

  getGroupedSignups() {
    var all = []
    var healers = []
    var tanks = []
    var melee = []
    var ranged = []
    for (var role in this.signups) {
      var roleArr = this.signups[role]
      all.concat(roleArr) 
      if (role == "priest_heals" || role == "holy_pali" || role == "resto") {
        healers.concat(roleArr)
      } else if (role == "prot_war" || role == "prot_pali" || role == "bear") {
        tanks.concat(roleArr)
      } else if (role == "dps_war" || role == "rogue" || role == "ret" || role == "cat") {
        melee.concat(roleArr)
      } else {
        ranged.concat(roleArr)
      }
    }
    return { all:all, healers:healers, tanks:tanks, melee:melee, ranged:ranged }
  }

  renderToEmbed() {
    var embed = {}
    embed.title = this.title

    var isMC = (this.title.indexOf("MC") != -1 || this.title.indexOf("Molt") != -1)
    embed.thumbnail = isMC ? RaidEvent.thumbnails.mc : RaidEvent.thumbnails.ony
    embed.color = isMC ? 0xF5A623 : 0x000000

    embed.fields = []

    var roles = this.getGroupedSignups()
    embed.fields.push({ name: "Total ", value: roles.all.length, inline: true})
    embed.fields.push({ name: "Tanks ", value: roles.tanks.length, inline: true})
    embed.fields.push({ name: "Healers ", value: roles.healers.length, inline: true})
    embed.fields.push({ name: "Melee ", value: roles.melee.length, inline: true})
    embed.fields.push({ name: "Ranged ", value: roles.ranged.length, inline: true})

    return embed
  }
}

RaidEvent.thumbnails = {
  "mc" : { url: "https://blzmedia-a.akamaihd.net/heroes/ragnaros/abilities/icons/molten-core.png" },
  "ony" : { url: "https://steamuserimages-a.akamaihd.net/ugc/911298000368936052/7A367C1BBFACE797C39275EC4A67F96CD637D0DE/" }
}

// coresponds to reacts/signup_<name>.png
RaidEvent.custom_emojis = [
  "prot_war",
  "dps_war",
  "rogue",
  "hunter",
  "mage",
  "warlock",
  "priest_heals",
  "shadow",
  "prot_pali",
  "holy_pali",
  "ret",
  "resto",
  "bear",
  "cat",
  "boomkin"
]

function base64_encode(file) {
  // read binary data
  var bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return Buffer.from(bitmap).toString('base64');
}

//xxx WIP 
//xxx TODO: move add reactions method here

// NOTE: this _will_ install duplicates if called more than once (which eats up max emoji count for your server)
RaidEvent.InstallEmojis = function (guild) {
  for (var emoji of RaidEvent.custom_emojis) {
    var base64str = base64_encode("reacts/signup_" + emoji + ".png")
    guild.createEmoji({ name: emoji, image: "data:image/png;base64," + base64str }).catch(logCatch)
  }
}

module.exports = { RaidEvent: RaidEvent }  //note: ES6 Module format