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
      //Basic Function
      this.type = this.dm.type
      this.isReady = this.dm.isReady

      this.getSummary = this.dm.getSummary

      this.getDataset = this.dm.getDataset
      this.setDataset =  async (newUDT)=>{
        if(!this.dm.setDataset) return
        await this.dm.setDataset(newUDT)

        if(!this.sessionId)this.emit("dataset-reloaded")
        if(this.udtJSON){
          if (newUDT.samples !== this.udtJSON.samples) this.emit("summary-changed")
          if (newUDT.name !== this.udtJSON.name)
            this.emit("dataset-property-changed", { key: "name" })
          if (newUDT.interface !== this.udtJSON.interface)
            this.emit("dataset-property-changed", { key: "interface" })
        }
      }

      this.getDatasetProperty = this.dm.getDatasetProperty
      this.setDatasetProperty = async (key,newValue)=>{
        if(!this.dm.setDatasetProperty) return
        await this.dm.setDatasetProperty(key,newValue)
        this.emit("dataset-property-changed", { key })
      }

      this.getSampleByIndex = this.dm.getSampleByIndex

      this.getSample = this.dm.getSample
      this.setSample =async (sampleRefId,newSample)=> {
        if(!this.dm.setSample) return
        await this.dm.setSample(sampleRefId,newSample)
        this.emit("summary-changed")
      }

      this.addSamples = async (newSamples) =>{
        if(!this.dm.addSamples) return
        await this.dm.addSamples(newSamples)
        this.emit("summary-changed")
      }
      this.removeSamples = async (sampleIds)=>{
        if(!this.dm.removeSamples) return
        await this.dm.removeSamples(sampleIds)
        this.emit("summary-changed")
      }

      this.onUpdateAppConfig = this.dm.onUpdateAppConfig
      this.explicitSave = this.dm.explicitSave
      this.preloadSample = this.dm.preloadSample
      this.preloadSampleByIndex = this.dm.preloadSampleByIndex

      this.isWritable = this.dm.isWritable

      this.uploadFiles = this.dm.uploadFiles

      this.on = this.dm.on
      this.off = this.dm.off
      // LocalStorage
      this.udtJSON = this.dm.udtJSON
      // Collaboration Server Function
      this.createNewSession = this.dm.createNewSession
      this.loadSession = this.dm.loadSession
      this.sessionId = this.dm.sessionId
      this.summaryVersion = this.dm.summaryVersion
      // Cognito
      this.removeProject = this.dm.removeProject
      this.createProject = this.dm.createProject
      this.setProject = this.dm.setProject
      this.getProjects = this.dm.getProjects
      this.removeSamplesFolder = this.dm.removeSamplesFolder
      this.removeAssetsFolder = this.dm.removeAssetsFolder
      this.getSamplesSummary = this.dm.getSamplesSummary
      this.getAssetUrl = this.dm.getAssetUrl
      this.getListAssets = this.dm.getListAssets
      this.getListSamples = this.dm.getListSamples
      this.readJSONAllSamples = this.dm.readJSONAllSamples
      this.getJSON = this.dm.getJSON
      this.setJSON = this.dm.setJSON
      this.addAsset = this.dm.addAsset
      this.renewUrlAws = this.dm.renewUrlAws
      this.getSampleName = this.dm.getSampleName
      this.addNamesToSample = this.dm.addNamesToSample
      this.renameSampleFromUrl = this.dm.renameSampleFromUrl
      this.getSampleWithName = this.dm.getSampleWithName
      this.getSampleUrl = this.dm.getSampleUrl
      this.setSampleUrl = this.dm.setSampleUrl
      this.getAssetText = this.dm.getAssetText
      this.getAssetTime = this.dm.getAssetTime
      this.getSampleNameFromUrl = this.dm.getSampleNameFromURL
      this.getSampleExtensionFromUrl = this.dm.getSampleExtensionFromURL
      this.setSampleProperties = this.dm.setSampleProperties
      
    }
  }
}
export default datasetWrapper
