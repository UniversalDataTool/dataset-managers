global.window = {}
import "mock-local-storage"
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

  return basicSuite(dm, t).then(() => {
    t.pass("completed basic suite")
  })
})

test("CollaborationServerDatasetManager when the server isn't working", async (t) => {
  window.localStorage.app_config = JSON.stringify({
    "collaborationServer.url": "http://example.com:1234", // non-existant server
  })
  const dm = new CollaborationServerDatasetManager()
  await t.throwsAsync(
    dm.setDataset({
      interface: {
        type: "image_classification",
      },
      samples: [],
    })
  )
})
