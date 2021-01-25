import CollaborationServerDatasetManager from "../../src/CollaborationServerDatasetManager.js"
import test from "ava"
import basicSuite from "../utils/basic-suite.js"
import collaborationServer from "udt-collaboration-server"
import getPort from "get-port"

test("CollaborationServerDatasetManager join existing session", async (t) => {
  const port = await getPort()
  const service = collaborationServer({ port })
  t.teardown(() => service.close())

  await new Promise((resolve) => setTimeout(resolve, 2000))

  const dm = new CollaborationServerDatasetManager({
    serverUrl: "http://localhost:" + port,
  })
  dm.requestTimeout = 5000
  await dm.setDataset({
    interface: { type: "image_classification" },
    samples: [
      {
        imageUrl: "http://example.com/image1.png",
      },
    ],
  })
  const sessionId = dm.sessionId
  t.truthy(sessionId, "session id should be defined")

  const dm2 = new CollaborationServerDatasetManager({
    serverUrl: "http://localhost:" + port,
  })
  await dm2.loadSession(sessionId)

  const sample = await dm2.getSampleByIndex(0)

  t.is(sample.imageUrl, "http://example.com/image1.png")
})
