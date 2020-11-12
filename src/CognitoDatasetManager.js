import { EventEmitter } from "events"
import Amplify, { Auth, Storage } from "aws-amplify"

import seamlessImmutable from "seamless-immutable"

const { from: seamless, set, merge, setIn } = seamlessImmutable

class CognitoDatasetManager extends EventEmitter {
  type = "cognito"
  ds = null

  constructor({
    authConfig,
    user,
    dataPrivacyLevel = "private",
    privateDataExpire = 24 * 60 * 60,
  } = {}) {
    super()
    if (!authConfig.Auth.region) throw new Error("Auth region is required")
    if (!authConfig.Auth.userPoolId)
      throw new Error("Auth userPoolId is required")
    if (!authConfig.Auth.userPoolWebClientId)
      throw new Error("Auth userPoolWebClientId is required")
    if (!authConfig.Auth.identityPoolId)
      throw new Error("Auth identityPoolId is required")

    if (!authConfig.Storage.AWSS3.bucket)
      throw new Error("Storage bucket name is required")
    if (!authConfig.Storage.AWSS3.region)
      throw new Error("Storage bucket region is required")

    this.authConfig = authConfig
    this.privateDataExpire = privateDataExpire
    this.dataPrivacyLevel = dataPrivacyLevel

    console.log(Amplify.configure(this.authConfig))

    this.cognitoSetUp = Auth.signIn(user.username, user.password)
  }

  // Called frequently to make sure the dataset is accessible, return true if
  // the dataset can be read. You might return false if there isn't a dataset
  // loaded
  // Protip: If you have a server you should establish a connection here (if not connected)
  isReady = async () => {
    await this.cognitoSetUp
    return true
  }

  getDataListFromProject = async ({
    projectName = false,
    noExtensions = false,
  }) => {
    if (!projectName) projectName = this.projectName

    let samples = []
    await Amplify.Storage.list(`${projectName}/data/`, {
      level: this.dataPrivacyLevel,
    }).then((result) => {
      samples = result
        .filter((obj) => obj.key !== `${projectName}/data/`)
        .map((obj) => obj.key)
    })

    if (noExtensions) {
      samples = samples.map((eachFile) => {
        return eachFile.replace(/\.[^.]+$/, "")
      })
    }
    return samples
  }

  getAnnotationsListFromProject = async ({
    projectName = false,
    noExtensions = false,
  }) => {
    if (!projectName) projectName = this.projectName

    let samples = []
    await Amplify.Storage.list(`${projectName}/annotations/`, {
      level: this.dataPrivacyLevel,
    }).then((result) => {
      samples = result
        .filter((obj) => obj.key !== `${projectName}/annotations/`)
        .map((obj) => obj.key)
    })

    if (noExtensions) {
      samples = samples.map((eachFile) => {
        return eachFile.replace(/\.[^.]+$/, "")
      })
    }
    return samples
  }

  getProjects = async () => {
    // This should be moved in a project manager later on
    // Should return a list of available projects to open
    if (this.projects) {
      return this.projects
    } else {
      await Storage.list("", { level: this.dataPrivacyLevel }).then(
        (result) => {
          this.projects = new Set(
            result
              .map((obj) => {
                if (obj.key.split("/")[0] !== "") {
                  return obj.key.split("/")[0]
                }
              })
              .filter((n) => n)
          )
        }
      )
      return this.projects
    }
  }

  setProject = (projectName) => {
    // This should be moved in a project manager later on
    this.projectName = projectName
  }

  createProject = async (newProjectName) => {
    // This should be moved in a project manager later on
    const projects = await this.getProjects()

    if (projects && !projects.has(newProjectName)) {
      await Storage.put(
        `${newProjectName}/project.json`,
        {},
        {
          level: this.dataPrivacyLevel,
          contentType: "application/json",
        }
      )
      return true
    } else {
      console.log("Project with the same name already exist")
      return false
    }
  }

  getSamplesSummary = async () => {
    const data = await this.getDataListFromProject({})
    const annotations = await this.getAnnotationsListFromProject({
      projectName: this.projectName,
      noExtensions: true,
    })

    const samplesList = data.map((sample) => ({
      hasAnnotation: annotations.includes(
        sample.replace(/\.[^.]+$/, "").replace("/data/", "/annotations/")
      ),
      _id: sample,
    }))

    return samplesList
  }

  // Gives a summary of the dataset, mostly just indicating if the samples
  // are annotated are not.
  // https://github.com/UniversalDataTool/udt-format/blob/master/proposals/summary.md
  getSummary = async () => {
    if (!this.ds) {
      this.ds = seamless({
        summary: {
          samples: await this.getSamplesSummary(),
        },
        interface: {},
        name: this.projectName,
      })
    } else {
      if (!this.ds.summary) {
        this.ds.summary = await this.getSamplesSummary()
      }
    }
    return this.ds.summary
  }

  // Get or set the dataset training, file paths or other top levels keys (not
  // samples). For example, getDatasetProperty('training') returns the labeler
  // training configuration. getDatasetProperty('name') returns the name.
  // You can and should create a new object here if you have custom stuff you
  // want to store in the dataset
  getDatasetProperty = async (key) => {
    if (!this.ds) await this.getSummary()
    return this.ds[key]
  }
  setDatasetProperty = async (key, newValue) => {
    this.ds = setIn(this.ds, [key], newValue)

    // TODO update the project file

    //Promise<Object>

    return {}
  }

  getDataUrl = async (sampleRefId) => {
    const url = await Storage.get(sampleRefId, {
      expires: this.privateDataExpire,
      level: this.dataPrivacyLevel,
    })
      .then((_url) => _url)
      .catch((err) => null)

    return url
  }

  getJsonAnnotation = async (sampleRefId) => {
    let annotation = null
    if (
      this.ds.summary.samples.filter((sample) => sample._id === sampleRefId)[0]
        .hasAnnotation
    ) {
      const annotationFileName = sampleRefId
        .replace("/data/", "/annotations/")
        .replace(/\.[^.]+$/, ".json")

      annotation = await Storage.get(annotationFileName, {
        expires: this.privateDataExpire,
        level: this.dataPrivacyLevel,
        download: true,
      })
        .then(async (data) => await new Response(data.Body).json())
        .catch(() => null)
    }
    return annotation
  }

  // Two ways to get a sample. Using `sampleRefId` will return the sample with
  // an `_id` === sampleRefId
  getSampleByIndex = async (index) => {
    const sampleRefId = this.ds.summary.samples[index]._id

    let sample = await this.getSample(sampleRefId)

    return sample
  }
  getSample = async (sampleRefId) => {
    const fileExtension = sampleRefId.split(".").pop()

    // handle images/audio/video data
    const allowedImageExtensions = ["jpeg", "jpg", "png"]
    if (allowedImageExtensions.includes(fileExtension.toLowerCase())) {
      return {
        imageUrl: await this.getDataUrl(sampleRefId),
        annotation: await this.getJsonAnnotation(sampleRefId),
      }
    }

    // handle audio
    const allowedAudioExtensions = ["mp3", "wav"]
    if (allowedAudioExtensions.includes(fileExtension.toLowerCase())) {
      return {
        audioUrl: await this.getDataUrl(sampleRefId),
        annotation: await this.getJsonAnnotation(sampleRefId),
      }
    }

    // handle video
    const allowedVideoExtensions = ["mp4"]
    if (allowedVideoExtensions.includes(fileExtension.toLowerCase())) {
      return {
        videoUrl: await this.getDataUrl(sampleRefId),
        annotation: await this.getJsonAnnotation(sampleRefId),
      }
    }

    // handle text data
    const allowedTextExtensions = ["txt"]
    if (allowedTextExtensions.includes(fileExtension.toLowerCase())) {
      return {
        textUrl: await this.getDataUrl(sampleRefId),
        annotation: await this.getJsonAnnotation(sampleRefId),
      }
    }

    // handle time series
    const allowedTimeSeriesExtensions = ["csv"]
    if (allowedTimeSeriesExtensions.includes(fileExtension.toLowerCase())) {
      return {
        csvUrl: await this.getDataUrl(sampleRefId),
        annotation: await this.getJsonAnnotation(sampleRefId),
      }
    }
  }

  // Set a new value for a sample
  setSample = async (sampleRefId, newSample) => {
    //Promise<void>;
    await Storage.put(
      sampleRefId
        .replace(/\.[^.]+$/, ".json")
        .replace("/data/", "/annotations/"),
      newSample,
      {
        level: this.dataPrivacyLevel,
        contentType: "application/json",
      }
    ).then((response) => {
      console.log(response)
      return response
    })
  }

  // Add samples to the dataset
  addSamples = async (samples) => {
    // Promise<void>;
  }

  // Remove samples
  removeSamples = (sampleIds) => {
    //Promise<void>;
  }

  // Import an entire UDT JSON file
  setDataset = (udtObject) => {
    // Promise<void>;
  }

  // Get full dataset JSON. Use sparingly if datasets are large.
  getDataset = () => {
    //Promise<Object>;
  }

  // -------------------------------
  // EVENTS
  // You don't need to implement events, but they may help in collaborative
  // settings or for displaying notifications.
  // -------------------------------

  on = (event) => {
    // void;
  }

  // -------------------------------
  // OPTIONAL
  // -------------------------------

  // Called whenever application config is updated. Maybe you need the app config
  // to access some authentication variables
  // onUpdateAppConfig?: (appConfig) => void;

  // Datasets can be explictly saved for some interfaces (e.g. FileSystem)
  // explicitSave?: () => Promise<void>;

  // Can be called to preload the contents of a sample to make for a more
  // responsive interface
  // preloadSampleByIndex?: (index: number) => void;
  // preloadSample?: (sampleRefId: string) => void;

  // We assume we can write to the dataset if not specified
  // isWritable?: () => boolean;
}

export default CognitoDatasetManager
