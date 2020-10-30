import { EventEmitter } from "events"
import Amplify, { Auth, Storage } from "aws-amplify"
import seamlessImmutable from "seamless-immutable"
import getSampleNameFromUrl from "..\\..\\universal-data-tool\\src\\utils\\get-sample-name-from-url"
const { from: seamless, set, merge, setIn } = seamlessImmutable

class CognitoDatasetManager extends EventEmitter {
  type = "cognito"
  ds = null
  proxyUrl = "https://cors-anywhere.herokuapp.com/"
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

    Amplify.configure(this.authConfig)

    this.cognitoSetUp = Auth.signIn(user.username, user.password)
  }
  isReady = async () => {
    await this.cognitoSetUp
      .then(() => {
        this.worked = true
      })
      .catch(() => {
        this.worked = false
      })
    return this.worked
  }

  getSummary = async () => {
    if (!this.ds) {
      var index =  await this.getJSON(this.projectName+"/index.json")
      this.ds = seamless({
        summary: {
          samples: await this.getSamplesSummary(),
        },
        interface: index.interface,
        name: this.projectName,
      })
    } else {
      if (!this.ds.summary) {
        this.ds.summary = await this.getSamplesSummary()
      }
    }
    return this.ds.summary
  }

  getProjects = async () => {
    // should return a list of available projects to open
    /*if (this.projects) {
      return this.projects
    } else {*/
    this.projects = new Set()
    await Storage.list("", { level: this.dataPrivacyLevel })
      .then((result) => {
        result.forEach((obj) => {
          if (obj.size) {
            let possibleProjects = obj.key.split("/")[0]
            if (possibleProjects) this.projects.add(possibleProjects)
          } else {
            if (obj.key.split("/")[0] !== "") {
              this.projects.add(obj.key.split("/")[0])
            }
          }
        })
      })
      .catch((err) => {
        this.projects = null
      })

    return this.projects
    //}
  }

  getDataListFromProject = async ({
    projectName = false,
    noExtensions = false,
  }) => {
    if (!projectName) projectName = this.projectName

    let samples = []
    await Storage.list(`${projectName}/assets/`, {
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
    var result=await Storage.list(`${projectName}/samples/`, {
      level: this.dataPrivacyLevel,
    })
    let samples = result
      .filter((obj) => obj.key !== `${projectName}/samples/`)
      .map((obj) => obj.key)
    if (noExtensions) {
      samples = samples.map((eachFile) => {
        return eachFile.replace(/\.[^.]+$/, "")
      })
    }
    return samples
  }

  setProject = (projectName) => {
    // This should be moved in a project manager later on
    this.projectName = projectName
  }

  createProject = async (indexjson) => {
    // This should be moved in a project manager later on
    const projects = await this.getProjects()

    if (projects && !projects.has(indexjson.name)) {
      await Storage.put(
        `${indexjson.name}/index.json`,
        indexjson,
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
  readJSONAllSample = async (annotations) => {
    var json = new Array(annotations.length)
    
    for (var i = 0; i < annotations.length; i++) {
      json[i] = await this.getJSON(annotations[i])
    }
    return json
  }
  getJSON = async (path) => {
    var url = await Storage.get(path, {
      expires: this.privateDataExpire,
      level: this.dataPrivacyLevel,
      contentType: "application/json",
    })
    var blob=await fetch(this.proxyUrl+url)
    var json =await blob.json()
    return json
  }

  setJSON = async (path, json) => {
    await Storage.put(path, json, {
      level: this.dataPrivacyLevel,
    }).catch((err) => console.log(err))
  }

  getSamplesSummary = async () => {
    const annotations = await this.getAnnotationsListFromProject({
      projectName: this.projectName,
      noExtensions: false,
    })
    var json = await this.readJSONAllSample(annotations)
    const samplesList = json.map((obj, i) => ({
      hasAnnotation: obj.annotation ? true : false,
      _id: obj._id,
      _url: annotations[i],
    }))
    return samplesList
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
    switch (key) {
      case "samples":
        // TODO update the sample
        await newValue.forEach(async (sample) => {
          await this.setJSON(
            this.projectName + "/samples/" + sample._id + ".json",
            sample
          )
        })
        break
      default:
        var path = this.projectName + "/index.json"
        var jsonToChange = await this.getJSON(path)
        jsonToChange.setIn(jsonToChange, key, newValue)
        await this.setJSON(path, jsonToChange)
        break
    }

    //Promise<Object>

    return {}
  }

  getDataUrl = async (sampleRefId) => {
    //changer sampleRefId pour avoir aussi l'extension de fichier
    const url = await Storage.get(this.projectName + "/assets/" + sampleRefId, {
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
      annotation = await Storage.get(
        this.projectName + "/samples/" + sampleRefId + ".json",
        {
          expires: this.privateDataExpire,
          level: this.dataPrivacyLevel,
          download: true,
        }
      )
        .then(async (data) => await new Response(data.Body).json())
        .catch(() => null)
    }
    return annotation
  }
  getFileFromJson = async (json) => {
    var fileName = getSampleNameFromUrl(json)
    var url = await Storage.get(
      this.proxyUrl + this.projectName + "/assets/" + fileName
    )
    var response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Requested-With": "xmlhttprequest",
      },
    }).catch((error) => {
      console.log("Looks like there was a problem: \n", error)
    })
    const blob = await response.blob()
    return blob
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

  // Set a new value for a sample(File)
  setSample = async (sampleRefId, newSample) => {
    //Promise<void>;
<<<<<<< HEAD
    await Storage.put(
      sampleRefId
        .replace(/\.[^.]+$/, ".json")
        .replace("/data/", "/annotations/"),
      newSample,
      {
        level: this.dataPrivacyLevel,
        contentType: "application/json",
=======
    //bad code modify the json not the file ...
    var summary = await this.getSummary()
    await summary.samples.forEach(async (sample) => {
      if (sample._id == sampleRefId) {
        await this.setJSON(sample._url, newSample)
>>>>>>> 01f0e1c (bunch of test add)
      }
    ).then((response) => {
      console.log(response)
      return response
    })
  }

  // Add samples to the dataset
  addSamples = async (samples) => {
    // Promise<void>;
    await Promise.all(
      samples.map(async (obj) => {
        await this.setJSON(
          this.projectName + "/samples/" + obj._id + ".json",
          obj
        )
      })
    )
  }
  removeProject = async (projectName) => {
    var result = await Storage.list(projectName + "/", {
      level: this.dataPrivacyLevel,
    })
    await Promise.all(
      result.map(async (obj) => {
        await Storage.remove(obj.key, {
          level: this.dataPrivacyLevel,
        })
      })
    )
  }
  // Remove samples
  removeSamples = async (sampleIds) => {
    //Promise<void>;
    var result =await Storage.list(this.projectName+"/samples/",{
      level: this.dataPrivacyLevel,
    })
    await Promise.all(
      result.map(async (obj) => {
        if(obj.key.includes("/"+sampleIds))
          await Storage.remove(obj.key, {
            level: this.dataPrivacyLevel,
          })
      })
    )
  }

  // Import an entire UDT JSON file
  setDataset = async (udtObject) => {
    // Promise<void>;
    // todo upload file annotated
    var jsonSamples = udtObject.samples
    await jsonSamples.forEach(async (json, i) => {
      await this.setJSON(
        this.projectName + "/samples/sample" + i + ".json",
        json
      )
    })
    delete udtObject["samples"]
    var index = udtObject
    this.setJSON(this.projectName + "/index.json", index)
  }

  // Get full dataset JSON. Use sparingly if datasets are large.
  getDataset = async () => {
    //Promise<Object>;
    var index = await this.getJSON(this.projectName + "/index.json")
    var jsonSamples = await this.readJSONAllSample(
      await this.getAnnotationsListFromProject(false, false)
    )
    index.samples = jsonSamples
    return index
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
