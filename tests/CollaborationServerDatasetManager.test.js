import CollaborationServerDatasetManager from "../src/CollaborationServerDatasetManager.js"
import test from "ava"
import basicSuite from "./utils/basic-suite.js"
import collaborationServer from "udt-collaboration-server"

test("CollaborationServerDatasetManager Basic Suite", async (t) => {
  const service = collaborationServer({ port: 3030 })
  t.teardown(() => service.close())

  const dm = new CollaborationServerDatasetManager({
    serverUrl: "http://localhost:3030",
  })

  return basicSuite(dm, t).then(() => {
    t.pass("completed basic suite")
  })
})

test("CollaborationServerDatasetManager when the server isn't working", async (t) => {
  const dm = new CollaborationServerDatasetManager({
    serverUrl: "http://example.com:1234",
  })
  await t.throwsAsync(
    dm.setDataset({
      interface: {
        type: "image_classification",
      },
      samples: [],
    })
  )
})
