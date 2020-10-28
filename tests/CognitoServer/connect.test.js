import "dotenv/config.js"
import browserEnv from "browser-env"
browserEnv()

import CognitoDatasetManager from "../../src/CognitoDatasetManager.js"
import test from "ava"
import getAuthConfig from "./get-auth-config.js"

import Amplify from "aws-amplify"

test("CollaborationServerDatasetManager when the server isn't working", async t => {
  const authConfig = getAuthConfig()

  const dummyUser = {
    username: process.env.DUMMY_USER_NAME,
    password: process.env.DUMMY_USER_PASS
  }

  Amplify.default.configure(authConfig)
  let user = {}
  await Amplify.Auth.signIn(dummyUser.username, dummyUser.password).then(
    _user => {
      user = _user
    }
  )

  const dm = new CognitoDatasetManager({ authConfig })

  await Amplify.Storage.list("", { level: "private" }).then(result => {
    console.log(result)
  })

  //await dm.isReady()

  //console.log(await dm.getSummary())
  //t.truthy(await dm.getSummary())

  // TODO assert that the summary has samples?
})
