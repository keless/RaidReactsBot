class RaidEvent {
  constructor(title) {
    this.title = title
    this.tanks = []
    this.healers = []
    this.ranged = []
    this.melee = []
  }

  parseFromEmbed(embed) {

  }

  renderToEmbed() {
    var embed = {}
    embed.title = this.title
    embed.thumbnail = { url:"https://steamuserimages-a.akamaihd.net/ugc/911298000368936052/7A367C1BBFACE797C39275EC4A67F96CD637D0DE/" } //onyxia icon
    //https://blzmedia-a.akamaihd.net/heroes/ragnaros/abilities/icons/molten-core.png
    embed.color = 0xF5A623  //orange?

    embed.fields = []

    var totalSignUps = this.tanks.length + this.healers.length + this.ranged.length + this.melee.length
    embed.fields.push({ name: "**Total**", value: "" + totalSignUps, inline: true})

    return embed
  }
}

module.exports = { RaidEvent: RaidEvent }  //note: ES6 Module format