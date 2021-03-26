import { EventEmitter } from "events"
import Amplify, { Storage, Auth } from "aws-amplify"
import seamlessImmutable, { setIn } from "seamless-immutable"
import getUrlFromJson from "../utils/get-url-from-json.js"
import isEmpty from "lodash/isEmpty.js"
const { from: seamless } = seamlessImmutable

class CognitoDatasetManager extends EventEmitter {
  type = "cognito"
  ds = null
  constructor({
    authConfig,
    userConfig,
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
    if (userConfig) Auth.signIn(userConfig.username, userConfig.password)
  }

  //Made sure the cognitoSetUp is finish and working
  isReady = async () => {
    return await Auth.currentAuthenticatedUser()
      .then(() => {
        return true
      })
      .catch(() => {
        return false
      })
  }

  //get the Summary of the current project
  getSummary = async () => {
    if (!this.ds) {
      var index = await this.getJSON(this.projectName + "/index.json")
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

  //get a property from the summary
  getDatasetProperty = async (key) => {
    if (!this.ds) await this.getSummary()
    return this.ds[key]
  }

  //set any property of the first layer of the json and force datasummary to reset
  setDatasetProperty = async (key, newValue) => {
    switch (key) {
      case "samples":
        await Promise.all(
          newValue.map(async (obj) => {
            await this.setJSON(
              this.projectName + "/samples/" + obj._id + ".json",
              obj
            )
          })
        )
        break
      case "name":
        var dataset = await this.getDataset()
        dataset.name = newValue
        await this.removeProject(this.projectName),
          await this.setDataset(dataset)
        this.setProject(dataset.name)
        break
      default:
        var path = this.projectName + "/index.json"
        var jsonToChange = await this.getJSON(path)
        jsonToChange[key] = newValue
        await this.setJSON(path, jsonToChange)
        break
    }
    this.ds = undefined
  }

  // set a new dataset by recreating the complete project
  // NOTE Extremely High consumming
  setDataset = async (udtObject) => {
    var index = { name: udtObject.name, interface: udtObject.interface }
    var jsons = udtObject.samples

    this.setProject(udtObject.name)
    await Promise.all([
      await this.setJSON(udtObject.name + "/index.json", index),
      await this.addSamples(jsons),
    ])
  }

  // get the complete dataset by loading all the json
  getDataset = async () => {
    var dataset = await this.getJSON(this.projectName + "/index.json")

    dataset.samples = await this.readJSONAllSamples(
      await this.getListSamples(false)
    )

    return dataset
  }

  //IMPORTANT index = the index of the array of samples :::: id = the property _id in a sample of the array

  //get sample by index (the index follows aphabetical order in AWS)
  //IMPORTANT It can not follow the original order of samples due to AWS ways of listing files
  getSampleByIndex = async (index) => {
    if (this.ds === null) {
      await this.getSummary()
    }

    const sampleRefId = this.ds.summary.samples[index]._id
    let sample = await this.getSample(sampleRefId)
    return sample
  }

  //get sample by id
  getSample = async (sampleRefId) => {
    var json = await this.getJSON(
      this.projectName + "/samples/" + sampleRefId + ".json"
    )
    return json
  }

  //set sample by id
  setSample = async (sampleRefId, newSample) => {
    await this.removeSamples([sampleRefId])
    await this.setJSON(
      this.projectName + "/samples/" + newSample._id + ".json",
      newSample
    )
  }

  //add new samples to existing one or rewrite one already existing
  addSamples = async (samples) => {
    await Promise.all(
      samples.map(async (obj) => {
        await this.setJSON(
          this.projectName + "/samples/" + obj._id + ".json",
          obj
        )
      })
    )
  }

  // remove all samples specified by an array of ids
  removeSamples = async (sampleIds) => {
    var result = await Storage.list(this.projectName + "/samples/", {
      level: this.dataPrivacyLevel,
    })
    await Promise.all(
      result.map(async (obj) => {
        for (var i = 0; i < sampleIds.length; i++) {
          if (obj.key.includes("/" + sampleIds[i] + ".json")) {
            await Storage.remove(obj.key, {
              level: this.dataPrivacyLevel,
            }).catch((err) => console.log(err))
          }
        }
      })
    )
  }

  // To Extract to a project manager ----------------------------------------------------------------------------------------------

  //remove an entire projects and all related files
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

  //create the folder of the project and store the index information (dataset first layer of information except samples)
  createProject = async (indexjson) => {
    this.removeProject(indexjson.name)
    this.setProject(indexjson.name)
    // This should be moved in a project manager later on
    return await Storage.put(`${indexjson.name}/index.json`, indexjson, {
      level: this.dataPrivacyLevel,
      contentType: "application/json",
    })
      .then(() => true)
      .catch(() => false)
  }
  //Select a project
  setProject = (projectName) => {
    // This should be moved in a project manager later on
    this.projectName = projectName
  }

  //get the existing project in the deposit
  getProjects = async () => {
    var list = await Storage.list("", { level: this.dataPrivacyLevel })
    var projets = new Set()

    await Promise.all(
      list.map(async (obj) => {
        if (obj.size) {
          let possibleProjects = obj.key.split("/")[0]
          if (possibleProjects) projets.add(possibleProjects)
        } else {
          if (obj.key.split("/")[0] !== "") {
            projets.add(obj.key.split("/")[0])
          }
        }
      })
    )
    return projets
  }
  // remove the samples folder
  removeSamplesFolder = async (projectName) => {
    var result = await Storage.list(projectName + "/samples/", {
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

  // remove the assets folder
  removeAssetsFolder = async (projectName) => {
    var result = await Storage.list(projectName + "/assets/", {
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
  // These function are exclusive to this dataset ------------------------------------------------------------------------------------------------------

  //Load the sample json and verify if exist the annotation or just the other infos
  getSamplesSummary = async () => {
    var listJson
    const listSamples = await this.getListSamples(this.projectName)
    var json = await this.readJSONAllSamples(listSamples)
    if (json !== [])
      listJson = json.map((obj) => ({
        hasAnnotation: obj.annotation ? true : false,
        _id: obj._id,
        _url: getUrlFromJson(obj),
      }))
    return listJson
  }

  getAssetUrl = async (sampleRefId, projectName) => {
    if (!projectName) projectName = this.projectName
    //changer sampleRefId pour avoir aussi l'extension de fichier
    const url = await Storage.get(projectName + "/assets/" + sampleRefId, {
      expires: this.privateDataExpire,
      level: this.dataPrivacyLevel,
    }).then((_url) => _url)

    return url
  }

  //get the list of existing assets
  getListAssets = async (projectName) => {
    if (!projectName) projectName = this.projectName
    var result = await Storage.list(`${projectName}/assets/`, {
      level: this.dataPrivacyLevel,
    })

    let assets = result
      .filter((obj) => obj.key !== `${projectName}/assets/`)
      .map((obj) => obj.key)
    return assets
  }

  //List the existing samples in the folder samples of the selected project
  getListSamples = async (projectName) => {
    if (!projectName) projectName = this.projectName
    var result = await Storage.list(`${projectName}/samples/`, {
      level: this.dataPrivacyLevel,
    })
    let samples = result
      .filter((obj) => obj.key !== `${projectName}/samples/`)
      .map((obj) => obj.key)
    return samples
  }
  //Create an array with all the samples annotation json
  readJSONAllSamples = async (listSamples) => {
    var jsons = new Array(listSamples.length)

    for (var i = 0; i < listSamples.length; i++) {
      jsons[i] = await this.getJSON(listSamples[i])
    }
    jsons = await Promise.all(
      jsons.map(async (json) => {
        return await this.renewUrlAws(json)
      })
    )
    return jsons
  }
  readJSONAllSample = this.readJSONAllSamples

  //get a json regardless of what it contain
  getJSON = async (path) => {
    var url = await Storage.get(path, {
      expires: this.privateDataExpire,
      level: this.dataPrivacyLevel,
      contentType: "application/json",
    })
    var blob = await fetch(url).catch((err) => console.log(err))
    var json = await blob.json()
    return json
  }

  //same as above but it set one
  setJSON = async (path, json) => {
    await Storage.put(path, json, {
      level: this.dataPrivacyLevel,
    }).catch((err) => console.log(err))
  }

  // NOTE This function is really consumming so be careful
  // Put an asset copy in AWS
  addAsset = async (name, blob, projectName) => {
    if (!projectName) projectName = this.projectName
    await Storage.put(projectName + "/assets/" + name, blob, {
      level: this.dataPrivacyLevel,
    }).catch((err) => console.log(err))
  }

  //Renew url aws if exist
  renewUrlAws = async (sample) => {
    var listAsset = await this.getListAssets()
    var newUrl = listAsset.filter((url) => {
      if (url.split("/assets/")[1] === this.getSampleName(sample)) return true
      return false
    })
    if (isEmpty(newUrl)) return sample
    sample = await this.setSampleUrl(
      sample,
      await this.getAssetUrl(newUrl[0].split("/assets/")[1])
    )
    return sample
  }

  //function for json management -----------------------------------------------------------------------------------------------
  getSampleName = (sample) => {
    var sampleName
    if (!sample) return
    if (!isEmpty(sample.sampleName)) {
      sampleName = sample.sampleName
    } else if (this.getSampleNameFromURL(sample)) {
      sampleName = this.getSampleNameFromURL(sample)[1]
    } else if (sample.document) {
      sampleName = "sample" + ".txt"
    } else if (sample.timeData) {
      sampleName = "sample" + ".json"
    }
    return sampleName
  }
  getAssetName = this.getSampleName

  addNamesToSample = async (sample, index, samples) => {
    if (isEmpty(samples[index])) return
    var sampleName
    if (!isEmpty(sample.document)) {
      // Deal with the exception of the text file (they don't have url)
      sampleName = "sample" + index.toString() + ".txt"
    }
    if (!isEmpty(sample.timeData)) {
      // Deal with the exception of the timeData file (they don't have url)
      sampleName = "sample" + index.toString() + ".json"
    } else {
      sampleName = this.getSampleNameFromURL(sample)
      if (sampleName)
        sampleName = this.renameSampleFromUrl(samples, sample, sampleName)
    }
    sample = await setIn(sample, ["sampleName"], sampleName)
    return sample
  }
  addNameToSample = this.addNamesToSample

  renameSampleFromUrl = (samples, sampleToChange, sampleName) => {
    var boolName = true
    var v = 1
    while (boolName) {
      var sampleWithSameSampleName = this.getSampleWithName(
        samples,
        sampleName[1]
      )
      var urlTocompare = this.getSampleUrl(sampleWithSameSampleName)
      var newSampleUrl = this.getSampleUrl(sampleToChange)
      var sampleNameToCompare = this.getSampleName(sampleWithSameSampleName)
      if (
        urlTocompare !== newSampleUrl &&
        sampleNameToCompare === sampleName[1]
      ) {
        if (sampleName[1].match("(.*)\\([0-9]*\\)$")) {
          sampleName[1] =
            sampleName[2].match("(.*)\\([0-9]*\\)$")[1] +
            "(" +
            v.toString() +
            ")" +
            "." +
            sampleName[3]
        } else {
          sampleName[1] =
            sampleName[2] + "(" + v.toString() + ")." + sampleName[3]
        }
        v++
      } else {
        boolName = false
      }
    }

    return sampleName[1]
  }

  getSampleWithName = (samples, sampleName) => {
    samples = samples.filter((sample) => {
      if (this.getSampleName(sample) === sampleName) return true
      return false
    })
    return samples[0]
  }

  getSampleUrl = (sample) => {
    if (!sample) return
    return (
      sample.imageUrl ||
      sample.videoUrl ||
      sample.audioUrl ||
      sample.pdfUrl ||
      sample.txtUrl ||
      sample.timeUrl ||
      undefined
    )
  }

  setSampleUrl = async (sample, newUrl) => {
    if (!sample) return
    if (sample.imageUrl) sample = await setIn(sample, ["imageUrl"], newUrl)
    if (sample.videoUrl) sample = await setIn(sample, ["videoUrl"], newUrl)
    if (sample.audioUrl) sample = await setIn(sample, ["audioUrl"], newUrl)
    if (sample.pdfUrl) sample = await setIn(sample, ["pdfUrl"], newUrl)
    if (sample.txtUrl) sample = await setIn(sample, ["txtUrl"], newUrl)
    if (sample.timeUrl) sample = await setIn(sample, ["timeUrl"], newUrl)
    return sample
  }

  getAssetText = async (sample) => {
    if (sample.document) {
      return sample.document
    }

    if (sample.txtUrl) {
      var response = await fetch(sample.txtUrl, {
        method: "GET",
      }).catch((error) => {
        console.log("Looks like there was a problem: \n", error)
      })
      const text = await response.text()
      return text
    }

    return undefined
  }
  getSampleText = this.getAssetText

  getAssetTime = async (sample) => {
    if (sample.timeData) {
      return { timeData: sample.timeData }
    }

    if (sample.timeUrl) {
      var response = await fetch(sample.timeUrl, {
        method: "GET",
      }).catch((error) => {
        console.log("Looks like there was a problem: \n", error)
      })
      const json = await response.json()
      return json
    }

    return undefined
  }
  getSampleTime = this.getAssetTime

  getSampleNameFromURL = (sample) => {
    var sampleName
    if (!isEmpty(sample)) {
      if (!isEmpty(this.getSampleUrl(sample))) {
        sampleName = decodeURI(this.getSampleUrl(sample)).match(
          `.*\\/(([^\\/\\\\&\\?]*)\\.([a-zA-Z0-9]*))(\\?|$)`
        )
      }
    }
    return sampleName
  }

  getSampleExtensionFromURL = (sample) => {
    var sampleName
    if (!isEmpty(sample)) {
      if (!isEmpty(this.getSampleUrl(sample))) {
        sampleName = decodeURI(this.getSampleUrl(sample)).match(
          `[^\\/\\\\&\\?]*\\.[a-zA-Z0-9]*(?:\\?|$)`
        )
      }
    }
    return sampleName
  }

  setSampleProperties = async (sampleId, key, newValue) => {
    var jsonToChange
    var path
    switch (key) {
      case "_id":
        break
      case "url":
        path = this.projectName + "/samples/" + sampleId
        jsonToChange = await this.getJSON(path)
        if (jsonToChange.imageUrl) {
          jsonToChange["imageUrl"] = newValue
        } else if (jsonToChange.videoUrl) {
          jsonToChange["videoUrl"] = newValue
        } else if (jsonToChange.audioUrl) {
          jsonToChange["audioUrl"] = newValue
        } else if (jsonToChange.pdfUrl) {
          jsonToChange["pdfUrl"] = newValue
        }
        await this.setJSON(path, jsonToChange)
        break
      default:
        path = this.projectName + "/samples/" + sampleId
        jsonToChange = await this.getJSON(path)
        jsonToChange[key] = newValue
        await this.setJSON(path, jsonToChange)
        break
    }
    this.ds = undefined
  }
}

export default CognitoDatasetManager
