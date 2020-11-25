import CognitoDatasetManager from "../../../dist/CognitoDatasetManager.js"
import getAuthConfig from "./get-auth-config.js"
import { Auth } from "aws-amplify"
var samplesDummies = {
  name: "TestCypress",
  interface: {
    type: "image_segmentation",
    labels: ["valid", "invalid"],
    regionTypesAllowed: ["bounding-box", "polygon", "point"],
  },
  samples: [
    {
      _id: "shcscmhiv",
      imageUrl:
        "https://fr.cdn.v5.futura-sciences.com/buildsv6/images/wide1920/0/0/d/00dd1479a5_108485_chat-domestique.jpg",
      annotation: [
        {
          regionType: "bounding-box",
          id: "7676796589570372",
          centerX: 0.39035591274397247,
          centerY: 0.48036739380022964,
          width: 0.09184845005740527,
          height: 0.10838117106773826,
          color: "#ff0000",
        },
        {
          regionType: "bounding-box",
          id: "7047613988829033",
          centerX: 0.5964408725602756,
          centerY: 0.37841561423650977,
          width: 0.07003444316877161,
          height: 0.1102181400688863,
          color: "#ff0000",
        },
      ],
      brush: "complete",
    },
    {
      _id: "sdjz2g1qa",
      imageUrl:
        "https://www.filalapat.fr/sites/default/files/2020-02/age_chat.jpg",
    },
  ],
}
var nameProjectTest = "TestCypress"
const dummyUser = {
  username: Cypress.env().COGNITO_USER_NAME,
  password: Cypress.env().COGNITO_USER_PASS,
}
Cypress.config("defaultCommandTimeout", 100000)
describe("Cognito Server Tests", () => {
  var authConfig
  var dm
  var user
  before("prepare test", async () => {
    authConfig = getAuthConfig()
    dm = await new CognitoDatasetManager({ authConfig })
    user = await Auth.signIn(dummyUser.username, dummyUser.password)
  })
  it("Create the CognitoDatasetManager object", async () => {
    var ready = await dm.isReady()
    expect(ready).to.equal(true)
    await Auth.signOut()
    ready = await dm.isReady()
    expect(ready).to.equal(false)
    user = await Auth.signIn(dummyUser.username, dummyUser.password)
  })

  it("Made sure project " + nameProjectTest + " don't exist", async () => {
    await dm.removeProject(nameProjectTest)
    var projects = await dm.getProjects()
    expect(projects).to.not.include(nameProjectTest)
  })

  it("Test create project", async () => {
    var index = {
      name: samplesDummies.name,
      interface: samplesDummies.interface,
    }
    await dm.createProject(index)
    var projects = await dm.getProjects(index)
    expect(projects).to.include(nameProjectTest)
  })

  it("Test setProject", async () => {
    dm.setProject(nameProjectTest)
    expect(dm.projectName).to.equal(nameProjectTest)
  })

  it("Made sure no sample exist", async () => {
    var sampleList = await dm.getListSamples(false)
    expect(sampleList.length).to.equal(0)
  })

  it("Test addSamples", async () => {
    await dm.addSamples(samplesDummies.samples)
    var annotationsList = await dm.getListSamples(false)
    expect(annotationsList.length).to.equal(2)
  })

  /*await it("Test addFile", async () => {
    var blob1 = await dm.fetchAFile(samplesDummies.samples[0].imageUrl)
    console.log("blob1")
    await dm.addFile(
      "00dd1479a5_108485_chat-domestique.jpg",
      blob1
    )
    var datalist = await dm.getDataListFromProject(false, false)
    expect(datalist.length).to.equal(1)
  })*/

  it("Test readJSONAllSmple", async () => {
    var json = await dm.readJSONAllSample(await dm.getListSamples(false))
    expect(json.length).to.equal(samplesDummies.samples.length)
  })

  it("Test getJSON", async () => {
    var json = await dm.getJSON(
      nameProjectTest + "/samples/" + samplesDummies.samples[0]._id + ".json"
    )
    expect(json._id).to.equal(samplesDummies.samples[0]._id)
  })

  it("Test setJSON", async () => {
    await dm.setJSON(
      nameProjectTest + "/samples/" + samplesDummies.samples[0]._id + ".json",
      samplesDummies.samples[1]
    )
    var json = await dm.getJSON(
      nameProjectTest + "/samples/" + samplesDummies.samples[0]._id + ".json"
    )
    expect(json._id).to.equal(samplesDummies.samples[1]._id)
  })

  it("Test getSamplesSummary", async () => {
    var samplesSummary = await dm.getSamplesSummary()
    expect(samplesSummary[1].hasAnnotation).to.equal(false)
  })

  it("Test getSummary", async () => {
    var summary = await dm.getSummary()
    expect(summary.samples[1].hasAnnotation).to.equal(false)
  })

  it("Test getDatasetProperty", async () => {
    var datasetProperty = await dm.getDatasetProperty("name")
    expect(datasetProperty).to.equal(samplesDummies.name)
  })

  it("Test setDatasetProperty", async () => {
    await dm.setDatasetProperty("samples", samplesDummies.samples)
    var summary = await dm.getSummary()
    expect(summary.samples[1].hasAnnotation).to.equal(true)

    await dm.setDatasetProperty("name", "TestCypress2")
    var projects = await dm.getProjects()
    expect(projects).to.include("TestCypress2")
    expect(projects).to.not.include(nameProjectTest)

    await dm.setDatasetProperty("interface", {})
    var value = await dm.getDatasetProperty("interface")
    expect(value.type).to.equal(undefined)
  })

  it("Test getSampleByIndex", async () => {
    var sample = await dm.getSampleByIndex(0)
    expect(samplesDummies.samples[1]._id).to.include(sample._id)
  })

  it("Test getSample", async () => {
    var sample = await dm.getSample("shcscmhiv")
    expect(sample._id).to.equal("shcscmhiv")
  })

  it("Test setSample", async () => {
    await dm.setSample("adfaef", {})
    var annotation = await dm.getListSamples(nameProjectTest)
    expect(annotation.length).to.equal(3)
  })

  it("Test removeSamples", async () => {
    await dm.removeSamples(["adfaef"])
    var list = await dm.getListSamples(false, false)
    expect(list.length).to.equal(2)
  })

  it("Test setDataset", async () => {
    samplesDummies.name = "TestCypress3"
    await dm.setDataset(samplesDummies)
    var projects = await dm.getProjects()
    expect(projects).to.include(samplesDummies.name)
  })

  it("Test getDataset", async () => {
    samplesDummies.name = "TestCypress4"
    await dm.setDataset(samplesDummies)
    var dataset = await dm.getDataset()
    expect(dataset.name).to.include(samplesDummies.name)
  })

  it("Test removeProject", async () => {
    await dm.removeProject(nameProjectTest)
    await dm.removeProject(nameProjectTest + "2")
    await dm.removeProject(nameProjectTest + "3")
    var projects = await dm.getProjects()
    expect(projects).to.not.include(nameProjectTest)
  })
})
