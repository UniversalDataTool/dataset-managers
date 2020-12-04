import CognitoDatasetManager from "../../../dist/CognitoDatasetManager.js"
import getAuthConfig from "./get-auth-config.js"
import { Auth } from "aws-amplify"

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
  var catPicture
  var samplesDummies
  before("prepare test", async () => {
    cy.fixture("samples-dummies.json").then((data) => {
      samplesDummies = data
    })
    cy.fixture("chat.jpg").then((data) => {
      catPicture = data
    })
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
  it("Made sure no asset exist", async () => {
    var sampleList = await dm.getListAssets(false)
    expect(sampleList.length).to.equal(0)
  })

  it("Test addSamples", async () => {
    await dm.addSamples(samplesDummies.samples)
    var annotationsList = await dm.getListSamples(false)
    expect(annotationsList.length).to.equal(2)
  })

  it("Test readJSONAllSmple", async () => {
    var json = await dm.readJSONAllSamples(await dm.getListSamples(false))
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
    console.log(list)
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

  it("Remove Folder Samples", async () => {
    await dm.removeSamplesFolder(samplesDummies.name)
    var list = await dm.getListSamples(samplesDummies.name)
    expect(list.length).to.equal(0)
  })
  it("Add file ", async () => {
    await dm.addFile("chat.jpg", catPicture)
    var list = await dm.getListAssets(samplesDummies.name)
    expect(list.length).to.equal(1)
  })
  it("Remove Folder Assets", async () => {
    await dm.removeAssetsFolder(samplesDummies.name)
    var list = await dm.getListAssets(samplesDummies.name)
    expect(list.length).to.equal(0)
  })

  it("Test removeProject", async () => {
    await dm.removeProject(nameProjectTest)
    await dm.removeProject(nameProjectTest + "2")
    await dm.removeProject(nameProjectTest + "3")
    await dm.removeProject(nameProjectTest + "4")
    var projects = await dm.getProjects()
    expect(projects).to.not.include(nameProjectTest)
  })
})
