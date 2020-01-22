var logger = require('winston');
var IntegrationTests = require('./integrationTests.js');

class RaidReactsFramework {
  constructor (client) {
    this.client = client
    this.integrationTest = null
  }

  /**
   * 
   * @param {Eris} erisClient
   * @param {Guild} guild 
   * @param {User} cmdUser 
   */
  startIntegrationTests(erisClient, guild, cmdUser) {
    if (this.integrationTest != null) {
      return Promise.reject("tests are already running")
    }

    this.integrationTest = new IntegrationTests(erisClient, guild, cmdUser)
    return this.integrationTest.start()
  }

}

// class methods
RaidReactsFramework.logCatch = function (error) {
  var rr = RaidReactsFramework.sharedInstance()
  if (rr.integrationTest) {
    // during integration testing, dont catch errors
    return error 
  } else {
    logger.error(error.message || error)
  }
}
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