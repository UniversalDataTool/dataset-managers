import { EventEmitter } from "events"
import CollaborationServerDatasetManager from "./dataset-managers/CollaborationServerDatasetManager.js"
import LocalStorageDatasetManager from "./dataset-managers/LocalStorageDatasetManager.js"
import CognitoDatasetManager from "./dataset-managers/CognitoDatasetManager.js"
class datasetWrapper extends EventEmitter {
  constructor(typeDataset, ...args) {
    super()
    if (typeDataset === "collaborative-session")
      this.dm = new CollaborationServerDatasetManager(...args)
    else if (typeDataset === "local-storage")
      this.dm = new LocalStorageDatasetManager(...args)
    else if (typeDataset === "cognito")
      this.dm = new CognitoDatasetManager(...args)
    else this.dm = undefined
    if (this.dm) {
      this.type = this.dm.type
      this.isReady = this.dm.isReady
      this.getSummary = this.dm.getSummary
      this.getDataset = this.dm.getDataset
      this.setDataset = this.dm.setDataset
      this.getDatasetProperty = this.dm.getDatasetProperty
      this.setDatasetProperty = this.dm.setDatasetProperty
      this.getSampleByIndex = this.dm.getSampleByIndex
      this.setSample = this.dm.setSample
      this.getSample = this.dm.getSample
      this.addSamples = this.dm.addSamples
      this.removeSamples = this.dm.removeSamples
      this.onUpdateAppConfig = this.dm.onUpdateAppConfig
      this.explicitSave = this.dm.explicitSave
      this.preloadSample = this.dm.preloadSample
      this.preloadSampleByIndex = this.dm.preloadSampleByIndex
      this.isWritable = this.dm.isWritable
      this.uploadFiles = this.dm.uploadFiles
      this.on = this.dm.on
      this.off = this.dm.off
    }
  }
}
export default datasetWrapper
