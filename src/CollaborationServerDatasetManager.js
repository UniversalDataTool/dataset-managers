import { EventEmitter } from "events"
import seamlessImmutable from "seamless-immutable"
import seamlessImmutablePatch from "seamless-immutable-patch"
import rfc6902 from "rfc6902"

const { from: seamless, set, merge, setIn } = seamlessImmutable

const getNewSampleRefId = () => "s" + Math.random().toString(36).slice(-8)

const defaultCollaborationServer = "https://collaboration.universaldatatool.com"

class CollaborativeDatasetManager extends EventEmitter {
  udtJSON = null
  type = "collaborative-session"

  sessionId = null
  summaryVersion = null
  ds = null

  // TODO we should cache samples in the future to allow preloading
  // currentlyLoadedSampleMap = {}
  // currentlyLoadedSampleIds = []

  constructor() {
    super()
    this.url = (
      JSON.parse(window.localStorage.app_config)["collaborationServer.url"] ||
      defaultCollaborationServer
    )
      .trim()
      .replace(/\/+$/, "")

    this.currentlyLoadedSampleMap = {}
  }

  createNewSession = async (ds) => {
    const res = await fetch(`${this.url}/api/session`, {
      method: "POST",
      body: JSON.stringify({ udt: ds }),
    }).then((r) => r.json())
    this.sessionId = res.short_id
    this.summaryVersion = res.summary_version
    this.diffPollingInterval = setInterval(this.pollDiffs, 1000)
    this.getSummary()
  }

  pollDiffs = async () => {
    if (this.sessionId && this.ds) {
      const { patch, latestVersion } = await fetch(
        `${this.url}/api/session/${this.sessionId}/diffs?since=${this.summaryVersion}`
      ).then((r) => r.json())
      if (latestVersion !== this.summaryVersion) {
        // Update summary object, but not samples
        const patchWithoutSampleUpdates = patch.filter(
          (p) => !p.path.startsWith("/samples")
        )
        this.ds = seamlessImmutablePatch(this.ds, patchWithoutSampleUpdates)

        this.summaryVersion = latestVersion
        this.emit("summary-changed")
      }
    } else {
      this.getSummary()
    }
  }

  // Called frequently to make sure the dataset is accessible, return true if
  // the dataset can be read. You might return false if there isn't a dataset
  // loaded
  // Protip: If you have a server you should establish a connection here if
  // you can
  isReady = async () => {
    return Boolean(this.sessionId) && Boolean(this.summary)
  }

  // Gives a summary of the dataset, mostly just indicating if the samples
  // are annotated are not.
  // https://github.com/UniversalDataTool/udt-format/blob/master/proposals/summary.md
  getSummary = async () => {
    // TODO
    if (!this.ds) {
      const res = await fetch(
        `${this.url}/api/session/${this.sessionId}`
      ).then((r) => r.json())
      const { summaryVersion, summary, name, interface: iface } = res
      this.ds = seamless({
        summary,
        interface: iface,
        name,
      })
      this.summaryVersion = summaryVersion
    }
    return this.ds.summary
  }

  // Get or set the dataset interface, training, or other top levels keys (not
  // samples). For example, getDatasetProperty('interface') returns the interface.
  // You can and should create a new object here if you have custom stuff you
  // want to store in the dataset for your server
  getDatasetProperty = async (key) => {
    if (!this.ds) await this.getSummary()
    return this.ds[key]
  }

  setDatasetProperty = async (key, newValue) => {
    // TODO
    this.ds = setIn(this.ds, [key], newValue)
    await fetch(`${this.url}/api/session/${this.sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({
        patch: [
          {
            op: "replace",
            path: `/${key}`,
            value: newValue,
          },
        ],
      }),
    })
    this.emit("dataset-property-changed", { key })
  }

  getSampleByIndex = async (index) => {
    const res = await fetch(
      `${this.url}/api/session/${this.sessionId}/sample/${index}`
    ).then((r) => r.json())
    return res
  }
  getSample = async (sampleRefId) => {
    const res = await fetch(
      `${this.url}/api/session/${this.sessionId}/sample/${sampleRefId}`
    ).then((r) => r.json())
    return res
  }

  // Set a new value for a sample
  setSample = async (sampleRefId, newSample) => {
    await fetch(`${this.url}/api/session/${this.sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({
        patch: [
          {
            op: "replace",
            path: `/samples/${sampleRefId}`,
            value: newSample,
          },
        ],
      }),
    }).then((r) => r.json())
  }

  // Called whenever application config is updated. Maybe you need the app config
  // to access some authentication variables
  onUpdateAppConfig = async (appConfig) => {
    this.url =
      appConfig["collaborationServer.url"] || defaultCollaborationServer
  }

  // Import an entire UDT JSON file
  setDataset = async (newUDT) => {
    if (!this.sessionId) {
      await this.createNewSession(newUDT)
      this.emit("dataset-reloaded")
    } else {
      const latestDS = await this.getDataset()
      const patch = rfc6902.createPatch(latestDS, newUDT)
      await fetch(`${this.url}/api/session/${this.sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ patch }),
      })
    }
  }

  // Get entire JSON dataset
  getDataset = async () => {
    const fullDataset = await fetch(
      `${this.url}/api/session/${this.sessionId}/download`
    ).then((r) => r.json())
    return fullDataset
  }

  // Add samples to the dataset
  addSamples = async (newSamples) => {
    if (!this.sessionId) throw new Error("Not in a collaborative session")
    if (!this.ds) await this.getSummary()
    const lastSampleIndex = this.ds.summary.samples.length
    await fetch(`${this.url}/api/session/${this.sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({
        patch: newSamples.map((s, i) => ({
          op: "add",
          path: `/samples/${lastSampleIndex + i}`,
          value: s,
        })),
      }),
    })
  }

  // Remove samples
  removeSamples = async (sampleIds) => {
    if (!this.sessionId) throw new Error("Not in a collaborative session")
    if (!this.ds) await this.getSummary()
    await fetch(`${this.url}/api/session/${this.sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({
        patch: this.ds.summary.samples
          .filter((s) => sampleIds.includes(s._id))
          .map((s) => ({
            op: "remove",
            path: `/samples/${s._id}`,
          })),
      }),
    })
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

export default CollaborativeDatasetManager
