import CognitoDatasetManager from "../../src/CognitoDatasetManager.js"
import test from "ava"
import {authConfig, dummyUser} from "./authConfig.js"

import Amplify, { Auth, Storage } from "aws-amplify"


Amplify.default.configure(authConfig)
let user = {}
await Amplify.Auth.signIn(dummyUser.username, dummyUser.password)
.then((_user)=>{
  user = _user
})

//console.log(user)

test("CollaborationServerDatasetManager when the server isn't working", async (t) => {
  const dm = new CognitoDatasetManager({authConfig})

  await Storage.list("", {level:"private"}).then((result) => {console.log(result)})

  //await dm.isReady()

  //console.log(await dm.getSummary())
  //t.truthy(await dm.getSummary())

  // TODO assert that the summary has samples?
})
