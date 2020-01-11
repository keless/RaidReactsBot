
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class IntegrationTests {
  constructor(client) {
    this.client = client
    this.guild = null
    this.channel = null
    this.tests = []
  }

  /**
  * @returns Promise
  */
  start() {
    this.tests.push(this.testCmdCopy.bind(this))

    return this.setup().then(()=>{
      console.log("rrbit - start tests")
      return this.doTests()
    }).finally(()=>{
      console.log("rrbit - finished running tests, begining teardown")
      return this.teardown()
    })
  }

  /**
  * @returns Promise
  */
  setup() {
    return this.client.getVoiceRegions().then((arrRegionObjs)=>{
      var regionID = arrRegionObjs[0].id
      var guildName = "RaidReactsBotIntegration-" + uuidv4()
      // create new guild
      console.log("rrbit - create guild " + guildName + " in region " + regionID)
      return this.client.createGuild(guildName, regionID).then((guild)=>{
        this.guild = guild;

//xxx need to wait for the guild.shard to come online before continuing
        return new Promise((resolve) => {
          setTimeout(() => {
            
            // create testing channel
            console.log("rrbit - create channel")
            return this.guild.createChannel("test").then((channel) => {
              this.channel = channel
              console.log("rrbit - setup complete")
            }) //guild.createChannel

          }, 3000)
        });


      }) //client.createGuild
    }) //client.getVoiceRegions
  }

  /**
  * @returns Promise
  */
  doTests() {
    return this.tests.reduce((p, fn) => p.then(fn), Promise.resolve())
  }

  /**
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
        return this.client.createMessage(this.channel.id, "!copy " + messageText).then((message)=>{
          // now we need to somehow wait for and recieve a private message?!
          return Promise.resolve()
        })
      })
    })
  }

  /**
  * @returns Promise
  */
  teardown() {
    console.log("rrbit - tear down")

    // destroy server
    console.log("rrbit - remove guild " + this.guild.name)
    return this.client.deleteGuild(this.guild.id)
  }
}

module.exports = IntegrationTests