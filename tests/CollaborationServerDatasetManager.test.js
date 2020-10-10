global.window = {}
import "mock-local-storage"
import "isomorphic-fetch"
global.window.localStorage = global.localStorage
import CollaborationServerDatasetManager from "../src/CollaborationServerDatasetManager.js"
import test from "ava"
import basicSuite from "./utils/basic-suite.js"
import collaborationServer from "udt-collaboration-server"

test("CollaborationServerDatasetManager Basic Suite", async (t) => {
  const service = collaborationServer({ port: 3030 })
  t.teardown(() => service.close())

  window.localStorage.app_config = JSON.stringify({
    "collaborationServer.url": "http://localhost:3030",
  })
  const dm = new CollaborationServerDatasetManager()

  await basicSuite(dm, t)

  t.pass("completed basic suite")
})
