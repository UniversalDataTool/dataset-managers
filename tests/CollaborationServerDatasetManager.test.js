global.window = {}
import "mock-local-storage"
import "isomorphic-fetch"
global.window.localStorage = global.localStorage
import CollaborationServerDatasetManager from "../src/CollaborationServerDatasetManager.js"
import test from "ava"
import basicSuite from "./utils/basic-suite.js"

test("CollaborationServerDatasetManager Basic Suite", async (t) => {
  window.localStorage.app_config = JSON.stringify({
    "collaborationServer.url": "http://localhost:3000",
  })
  const dm = new CollaborationServerDatasetManager()

  await basicSuite(dm, t)

  t.pass("completed basic suite")
})
