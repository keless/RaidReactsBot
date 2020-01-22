var logger = require('winston');
var IntegrationTests = require('./integrationTests.js');

class RaidReactsFramework {
  constructor (client) {
    this.client = client
    this.integrationTest = null
  }

  /**
   * @param {Eris} erisClient
   * @param {Guild} guild 
   * @param {User} cmdUser 
   * @returns {Promise}
   */
  startIntegrationTests(erisClient, guild, cmdUser) {
    if (this.integrationTest != null) {
      return Promise.reject("tests are already running")
    }

    this.integrationTest = new IntegrationTests(erisClient, guild, cmdUser)
    return this.integrationTest.start().finally(()=>{
      console.log("rrbit - integration tests have ended, removing IntegrationTest instance")
      this.integrationTest = null
    })
  }

}

// class methods

/**
 * @returns {Promise}
 */
RaidReactsFramework.sendPM = function (user, msg) {
  var rr = RaidReactsFramework.sharedInstance()
  if (rr.integrationTest != null && rr.integrationTest.awaitingPM != null) {
    // Redirect PM to integrationTest's awaitingPM promise
    var promise = rr.integrationTest.awaitingPM
    rr.integrationTest.awaitingPM = null
    return promise.resolve(msg)
  } else {
    return user.getDMChannel().then((dmChannel) => {
      dmChannel.createMessage(msg).catch(RaidReactsFramework.logCatch)
    }).catch(RaidReactsFramework.logCatch) // cmdUser.getDMChannel
  }
}


RaidReactsFramework.logCatch = function (error) {
  var rr = RaidReactsFramework.sharedInstance()
  if (rr.integrationTest) {
    // during integration testing, dont catch errors
    rr.integrationTest.rejections.push(error)
  }

  logger.error(error.message || error)
}

/**
 * @returns {Promise}
 */
RaidReactsFramework.startIntegrationTests = function (client, guild, user) {
  var rr = RaidReactsFramework.sharedInstance()
  return rr.startIntegrationTests(client, guild, user)
}

// Singleton
RaidReactsFramework._sharedInstance = null
RaidReactsFramework.initialize = function (client) {
  RaidReactsFramework._sharedInstance = new RaidReactsFramework(client)
}
RaidReactsFramework.sharedInstance = function () {
  return RaidReactsFramework._sharedInstance
}

module.exports = RaidReactsFramework