import LocalStorageDatasetManager from "../../dataset-managers/CollaborationServerDatasetManager.js"
import test from "ava"
import basicSuite from "../utils/basic-suite.js"

test("LocalStorageDatasetManager Basic Suite", async (t) => {
  const dm = new LocalStorageDatasetManager()
  await basicSuite(dm, t)
  t.pass("completed basic suite")
})
