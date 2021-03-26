import { EventEmitter } from "events"
import seamlessImmutable from "seamless-immutable"
import isEmpty from "lodash/isEmpty.js"

const { from: seamless, set, merge, setIn } = seamlessImmutable

const getNewSampleRefId = (NewSampleId) =>
  NewSampleId ? NewSampleId : "s" + Math.random().toString(36).slice(-8)

class LocalStorageDatasetManager extends EventEmitter {
  type = "local-storage"

  constructor() {
    super()
    this.setLocalStorage( seamless({
      name: "New Dataset",
      interface: {},
      samples: [],
    }))
  }

  // Called frequently to make sure the dataset is accessible, return true if
  // the dataset can be read. You might return false if there isn't a dataset
  // loaded
  // Protip: If you have a server you should establish a connection here if
  // you can
  isReady = async () => {
    return true
  }

  // Gives a summary of the dataset, mostly just indicating if the samples
  // are annotated are not.
  // https://github.com/UniversalDataTool/udt-format/blob/master/proposals/summary.md
  getSummary = async () => {
    return {
      samples: this.getLocalStorage().samples.map((s) => ({
        hasAnnotation: Boolean(s.annotation) && !isEmpty(s.annotation),
        _id: s._id,
        brush: s.brush
      })),
    }
  }

  // Get or set the dataset interface, training, or other top levels keys (not
  // samples). For example, getDatasetProperty('interface') returns the interface.
  // You can and should create a new object here if you have custom stuff you
  // want to store in the dataset for your server
  getDatasetProperty = async (key) => {
    return this.getLocalStorage()[key]
  }
  setDatasetProperty = async (key, newValue) => {
    var dataset = this.getLocalStorage()
    if (typeof newValue === "object") {
      this.setLocalStorage(set(
        dataset,
        key,
        merge(dataset[key], newValue, { deep: true })
      ))
    } else {
      this.setLocalStorage(set(dataset, key, newValue))
    }
  }

  // Two ways to get a sample. Using `sampleRefId` will return the sample with
  // an `_id` === sampleRefId
  getSampleByIndex = async (index) => {
    return this.getLocalStorage().samples[index]
  }
  getSample = async (sampleRefId) => {
    return this.getLocalStorage().samples.find((s) => s._id === sampleRefId)
  }

  // Set a new value for a sample
  setSample = async (sampleRefId, newSample) => {
    var dataset = this.getLocalStorage()
    const sampleIndex = dataset.samples.findIndex(
      (s) => s._id === sampleRefId
    )
    if (sampleIndex !== -1) {
      this.setLocalStorage(setIn(dataset, ["samples", sampleIndex], newSample))
    } else {
      await this.addSamples([newSample])
    }
  }

  // Called whenever application config is updated. Maybe you need the app config
  // to access some authentication variables
  onUpdateAppConfig = async (appConfig) => {}

  // Import an entire UDT JSON file
  setDataset = async (newUDT) => {
    var dataset = this.getLocalStorage()
    const usedSampleIds = new Set()
    this.setLocalStorage(seamless({
      name: "New Dataset",
      interface: {},
      ...newUDT,
      samples: (newUDT.samples || []).map((s) => {
        const newSample = {
          _id: getNewSampleRefId(s._id),
          ...s,
        }
        if (usedSampleIds.has(newSample._id)) {
          newSample._id = getNewSampleRefId(newSample._id)
        }
        usedSampleIds.add(newSample._id)
        return newSample
      }),
    }))
  }

  // Get entire JSON dataset
  getDataset = async () => this.getLocalStorage()

  // Add samples to the dataset
  addSamples = async (newSamples) => {
    var dataset = this.getLocalStorage()
    this.setLocalStorage(setIn(
      dataset,
      ["samples"],
      dataset.samples.concat(
        newSamples.map((s) => ({
          _id: getNewSampleRefId(s._id),
          ...s,
        }))
      )
    ))
  }

  // Remove samples
  removeSamples = async (sampleIds) => {
    var dataset = this.getLocalStorage()
    this.setLocalStorage(await setIn(
      dataset,
      ["samples"],
      dataset.samples.filter((s) => !sampleIds.includes(s._id))
    ))
  }

  getLocalStorage = () => {
    return JSON.parse(localStorage.getItem("udtJSON"))
  }
  setLocalStorage= (Dataset)=>{
    localStorage.setItem("udtJSON",JSON.stringify(Dataset))
  }
  // -------------------------------
  // OPTIONAL
  // -------------------------------

  // Datasets can be explictly saved for some interfaces (e.g. FileSystem)
  // explicitSave(): Promise<void> {}

  // Can be called to preload the contents of a sample to make for a more
  // responsive interface
  // preloadSampleByIndex(index: number) {}
  // preloadSample(sampleRefId: string) {}

  // We assume we can write to the dataset if not specified
  isWritable = async () => {
    return true
  }
}

export default LocalStorageDatasetManager

