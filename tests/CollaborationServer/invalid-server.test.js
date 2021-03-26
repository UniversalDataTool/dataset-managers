import CollaborationServerDatasetManager from "../../src/dataset-managers/CollaborationServerDatasetManager.js"
import test from "ava"

test("CollaborationServerDatasetManager when the server isn't working", async (t) => {
  const dm = new CollaborationServerDatasetManager({
    serverUrl: "http://example.com:1234",
  })
  dm.requestTimeout = 2000
  await t.throwsAsync(
    dm.setDataset({
      interface: {
        type: "image_classification",
      },
      samples: [],
    })
  )
})
