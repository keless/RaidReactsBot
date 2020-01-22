
var logger = require('winston')
var RaidReactsFramework = require('./raidreactsFramework.js')

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class IntegrationTests {
  constructor(client, guild, user) {
    this.reportToUser = user
    this.client = client
    this.guild = guild
    this.channel = null
    this.tests = []
  }

  /**
  * @returns Promise
  */
  start() {
    this.tests.push(this.testCmdCopy.bind(this))
    this.tests.push(this.testCreateAndDeserializeEmbed.bind(this))

    return this.setup().then(()=>{
      console.log("rrbit - start tests")
      return this.doTests()
    }).then(()=>{
      this.reportToUser.getDMChannel().then((dmChannel) => {
        dmChannel.createMessage("finished running tests - all successful")
      }).catch((error)=>{ logger.error(error.message || error) })  //note: during integration test, this _should_ log
    }).catch((error)=>{
      this.reportToUser.getDMChannel().then((dmChannel) => {
        dmChannel.createMessage(error)
      }).catch((error) => { logger.error(error.message || error) }) //note: during integration test, this _should_ log
    }).finally(()=>{
      console.log("rrbit - finished running tests, begining teardown")
      return this.teardown()
    })
  }

  /**
  * @returns Promise
  */
  setup() {
    var channelName = "RaidReactsBotIntegration-" + uuidv4()
    // create testing channel
    console.log("rrbit - create channel")
    return this.guild.createChannel(channelName).then((channel) => {
      this.channel = channel
      console.log("rrbit - setup complete")
    }) //guild.createChannel
  }

  /**
  * @returns Promise
  */
  doTests() {
    return this.tests.reduce((p, fn) => p.then(fn), Promise.resolve())
  }

  /**
   * 
   * @returns Promise
   */
  testCmdCopy() {
    console.log("rribt - testCmdCopy()")

    var messageText = "testCopy message + reacts"

    // create a message with a react
    return this.client.createMessage(this.channel.id, messageText).then((message)=>{
      //add react
      return message.addReaction("⚔️").then(()=>{
        // run !copy
        //xxx TODO: fix bug- !copy will result in the bot trying to PM results, but since bot wrote !copy it cant PM itself..
        return this.client.createMessage(this.channel.id, "!copy " + messageText).then((message)=>{
          // now we need to somehow wait for and recieve a private message?!
          return Promise.resolve()
        })
      })
    })
  }

  /**
   * Test that we can create an embed from a RaidEvent, then load a RaidEvent from that embed, and they are the same
   * @returns Promise
   */
  testCreateAndDeserializeEmbed() {
    //1) create a RaidEvent to serialize into an embed
    //2) post the message with embed
    //3) read the embed and deserialize into a RaidEvent
    //4) compare the new RaidEvent to the original RaidEvent for equivalence
    //xxx WIP todo
    return Promise.resolve()
  }

  /**
  * @returns Promise
  */
  teardown() {
    console.log("rrbit - tear down")

    // destroy server
    console.log("rrbit - remove channel " + this.channel.name + " from guild " + this.guild.name)
    //xxx test leave it up for now: return this.client.deleteChannel(this.channel.id, "testing finished")
    return Promise.resolve()
  }
}

module.exports = IntegrationTests