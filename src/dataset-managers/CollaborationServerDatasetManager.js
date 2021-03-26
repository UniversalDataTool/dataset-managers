import { EventEmitter } from "events"
import seamlessImmutable from "seamless-immutable"
import seamlessImmutablePatch from "seamless-immutable-patch"
import { createPatch } from "rfc6902"
import axios from "axios"

const { from: seamless, set, merge, setIn } = seamlessImmutable

const getNewSampleRefId = () => "s" + Math.random().toString(36).slice(-8)

const defaultCollaborationServer = "https://collaboration.universaldatatool.com"

class CollaborativeDatasetManager extends EventEmitter {
  udtJSON = null
  type = "collaborative-session"

  sessionId = null
  summaryVersion = null
  ds = null

  pollingInterval = 1000
  requestTimeout = 120000

  // TODO we should cache samples in the future to allow preloading
  // currentlyLoadedSampleMap = {}
  // currentlyLoadedSampleIds = []

  constructor({ serverUrl, startSession } = {}) {
    super()
    this.url = (serverUrl || defaultCollaborationServer)
      .trim()
      .replace(/\/+$/, "")
    if (startSession) {
      this.createNewSession({})
    }
    this.currentlyLoadedSampleMap = {}
  }

  createNewSession = async (ds) => {
    const endpoint = `${this.url}/api/session`
    const res = await axios
      .post(endpoint, { udt: ds }, { timeout: this.requestTimeout })
      .catch((e) => {
        throw new Error(
          `Creating collaborative session failed (via POST "${endpoint}")\n\n${e.toString()}`
        )
      })
      .then((r) => r.data)
      .catch((e) => {
        throw new Error(
          `Couldn't parse response from collaborative server: ${e.toString()}`
        )
      })
    this.sessionId = res.short_id
    this.summaryVersion = res.summary_version
    this.diffPollingTimeout = setTimeout(this.pollDiffs, this.pollingInterval)
    await this.getSummary()
  }

  loadSession = async (sessionId) => {
    this.sessionId = sessionId
    await this.getSummary()
    clearTimeout(this.diffPollingTimeout)
    this.diffPollingTimeout = setTimeout(this.pollDiffs, this.pollingInterval)
  }

  pollDiffs = async () => {
    if (this.sessionId && this.ds) {
      const {
        patch,
        latestVersion,
      } = await axios
        .get(
          `${this.url}/api/session/${this.sessionId}/diffs?since=${this.summaryVersion}`,
          { timeout: this.requestTimeout }
        )
        .then((r) => r.data)
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
    if (this.sessionId) {
      this.diffPollingTimeout = setTimeout(this.pollDiffs, this.pollingInterval)
    }
  }

  // Called frequently to make sure the dataset is accessible, return true if
  // the dataset can be read. You might return false if there isn't a dataset
  // loaded
  // Protip: If you have a server you should establish a connection here if
  // you can
  isReady = async () => {
    var ready = Boolean(this.sessionId) && Boolean(this.ds && this.ds.summary)
    return ready
  }

  // Gives a summary of the dataset, mostly just indicating if the samples
  // are annotated are not.
  // https://github.com/UniversalDataTool/udt-format/blob/master/proposals/summary.md
  getSummary = async () => {
    // TODO
    if (!this.ds) {
      const res = await axios
        .get(`${this.url}/api/session/${this.sessionId}`, {
          timeout: this.requestTimeout,
        })
        .then((r) => r.data)
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
    await axios.patch(
      `${this.url}/api/session/${this.sessionId}`,
      {
        patch: [
          {
            op: "replace",
            path: `/${key}`,
            value: newValue,
          },
        ],
      },
      { timeout: this.requestTimeout }
    )
    this.emit("dataset-property-changed", { key })
  }

  getSampleByIndex = async (index) => {
    const res = await axios
      .get(`${this.url}/api/session/${this.sessionId}/sample/${index}`, {
        timeout: this.requestTimeout,
      })
      .then((r) => r.data)
    return res
  }
  getSample = async (sampleRefId) => {
    const res = await axios
      .get(`${this.url}/api/session/${this.sessionId}/sample/${sampleRefId}`, {
        timeout: this.requestTimeout,
      })
      .then((r) => r.data)
      console.log(res)
    return res
  }

  // Set a new value for a sample
  setSample = async (sampleRefId, newSample) => {
    await axios
      .patch(
        `${this.url}/api/session/${this.sessionId}`,
        {
          patch: [
            {
              op: "replace",
              path: `/sample/${sampleRefId}`,
              value: newSample,
            },
          ],
        },
        { timeout: this.requestTimeout }
      )
      .then((r) => r.data)
      .catch((err) => {
        console.log(err)
      })
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
      const patch = createPatch(latestDS, newUDT)
      await axios.patch(`${this.url}/api/session/${this.sessionId}`, {
        patch,
      })
    }
  }

  // Get entire JSON dataset
  getDataset = async () => {
    const fullDataset = await axios
      .get(`${this.url}/api/session/${this.sessionId}/download`, {
        timeout: this.requestTimeout,
      })
      .then((r) => r.data)
    return fullDataset
  }

  // Add samples to the dataset
  addSamples = async (newSamples) => {
    if (!this.sessionId) throw new Error("Not in a collaborative session")
    if (!this.ds) await this.getSummary()
    const lastSampleIndex = this.ds.summary.samples.length
    await axios.patch(
      `${this.url}/api/session/${this.sessionId}`,
      {
        patch: newSamples.map((s, i) => ({
          op: "add",
          path: `/samples/${lastSampleIndex + i}`,
          value: s,
        })),
      },
      { timeout: this.requestTimeout }
    )
  }

  // Remove samples
  removeSamples = async (sampleIds) => {
    if (!this.sessionId) throw new Error("Not in a collaborative session")
    if (!this.ds) await this.getSummary()
    await axios.patch(
      `${this.url}/api/session/${this.sessionId}`,
      {
        patch: this.ds.summary.samples
          .filter((s) => sampleIds.includes(s._id))
          .map((s) => ({
            op: "remove",
            path: `/samples/${s._id}`,
          })),
      },
      { timeout: this.requestTimeout }
    )
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
