import CollaborationServerDatasetManager from "../../src/CollaborationServerDatasetManager.js"
import test from "ava"
import basicSuite from "../utils/basic-suite.js"
import collaborationServer from "udt-collaboration-server"
import getPort from "get-port"

test("CollaborationServerDatasetManager Basic Suite", async (t) => {
  const port = await getPort()
  const service = collaborationServer({ port })
  t.teardown(() => service.close())

  const dm = new CollaborationServerDatasetManager({
    serverUrl: "http://localhost:" + port,
  })

  return basicSuite(dm, t).then(() => {
    t.pass("completed basic suite")
  })
})
