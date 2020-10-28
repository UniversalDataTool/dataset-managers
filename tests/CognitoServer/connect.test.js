import CognitoDatasetManager from "../../src/CognitoDatasetManager.js"
import test from "ava"

test("CollaborationServerDatasetManager when the server isn't working", async (t) => {
  const dm = new CognitoDatasetManager({
    region: "us-east-1",
    // ...other cognito stuff
  })

  console.log(await dm.getSummary())
  t.truthy(await dm.getSummary())

  // TODO assert that the summary has samples?
})
