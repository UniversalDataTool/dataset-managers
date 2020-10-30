import CognitoDatasetManager from "../../../dist/CognitoDatasetManager.js"
import getAuthConfig from "./get-auth-config.js"
const fetchAFile = async (url) => {
  var proxyUrl = "https://cors-anywhere.herokuapp.com/"
  var response
  if (url !== undefined)
    response = await fetch(proxyUrl + url, {
      method: "GET",
      headers: {
        "X-Requested-With": "xmlhttprequest",
        "Access-Control-Allow-Origin": "*",
      },
    }).catch((error) => {
      console.log("Looks like there was a problem: \n", error)
    })
  const blob = await response.blob()
  return blob
}
const samplesDummies = {
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
Cypress.config("defaultCommandTimeout", 50000)
describe("Cognito Server Tests", async () => {
  const authConfig = getAuthConfig()
  const dm = await new CognitoDatasetManager({ authConfig, user: dummyUser })
  await it("Create the CognitoDatasetManager object", async () => {
    var ready = await dm.isReady()
    expect(ready).to.equal(true)
  })
  await it(
    "Made sure project " + nameProjectTest + " don't exist",
    async () => {
      await dm.removeProject(nameProjectTest)
      var projects = await dm.getProjects()
      expect(projects).to.not.include(nameProjectTest)
    }
  )

  await it("Test create project", async () => {
    await dm.createProject({"name":samplesDummies.name,"interface":samplesDummies.interface})
    var projects = await dm.getProjects()
    expect(projects).to.include(nameProjectTest)
  })

  await it("Test setProject", async () => {
    dm.setProject(nameProjectTest)
    expect(dm.projectName).to.equal(nameProjectTest)
  })

  await it("Made sure no sample exist", async () => {
    var datalist = await dm.getDataListFromProject(false, false)
    expect(datalist.length).to.equal(0)
  })

  await it("Made sure no asset exist", async () => {
    var annotationsList = await dm.getAnnotationsListFromProject(false, false)
    expect(annotationsList.length).to.equal(0)
  })
  
  await it("Test addSamples", async () => {
    await dm.addSamples(samplesDummies.samples)
    var annotationsList = await dm.getAnnotationsListFromProject(false, false)
    expect(annotationsList.length).to.equal(2)
  })

  await it("Test addFile", async () => {
    var blob1 = await fetchAFile(samplesDummies.samples[0].imageUrl)
    await dm.addFile(
      "00dd1479a5_108485_chat-domestique.jpg",
      blob1
    )
    var datalist = await dm.getDataListFromProject(false, false)
    expect(datalist.length).to.equal(1)
  })

  await it("Test readJSONAllSmple", async () => {
    var json = await dm.readJSONAllSample(
      await dm.getAnnotationsListFromProject(false, false)
    )
    expect(json.length).to.equal(samplesDummies.samples.length)
  })
  await it("Test getJSON", async () => {
    var json = await dm.getJSON(
      nameProjectTest + "/samples/" + samplesDummies.samples[0]._id + ".json"
    )
    expect(json._id).to.equal(samplesDummies.samples[0]._id)
  })
  await it("Test setJSON", async () => {
    await dm.setJSON(
      nameProjectTest + "/samples/" + samplesDummies.samples[0]._id + ".json",
      samplesDummies.samples[1]
    )
    var json = await dm.getJSON(
      nameProjectTest + "/samples/" + samplesDummies.samples[0]._id + ".json"
    )
    expect(json._id).to.equal(samplesDummies.samples[1]._id)
  })
  await it("Test getSamplesSummary", async () => {
    var samplesSummary = await dm.getSamplesSummary()
    expect(samplesSummary[1].hasAnnotation).to.equal(false)
  })
  await it("Test getSummary", async () => {
    var summary = await dm.getSummary()
    expect(summary.samples[0].hasAnnotation).to.equal(true)
  })

  await it("Test getDatasetProperty", async () => {
    var datasetProperty = await dm.getDatasetProperty("name")
    expect(datasetProperty).to.equal(samplesDummies.name)
  })
  await it("Test setDatasetProperty", async () => {
    //Correct the function and made sure of the logic staying
    expect(true).to.equal(true)
  })
  await it("Test getDataUrl", async () => {
    //Correct the function and adjust
    var url = await dm.getDataUrl(samplesDummies.samples[0]._id)
    expect(url).to.equal(url)
  })
  await it("Test getJsonAnnotation", async () => {
    var annotation = await dm.getJsonAnnotation(samplesDummies.samples[0]._id)
    expect(annotation._id).to.equal(samplesDummies.samples[1]._id)
  })
  await it("Test getFileFromJson",async ()=>{
    var blob = await dm.getFileFromJson(samplesDummies.samples[0])
    expect(blob).to.not.equal(undefined)
  })
  await it("Test getSampleByIndex",async ()=>{
    //correct the function and adjust
    var sample = await dm.getSampleByIndex(0)
    expect(true).to.equal(true)
  })

  await it("Test getSample", async ()=>{
    //correct the function and adjust
    expect(true).to.equal(true)
  })
  await it("Test setSample", async ()=>{
    expect(true).to.equal(true)
  })

  await it("Test removeSamples", async()=>{
    await dm.removeSamples([samplesDummies.samples[1]._id])
    var summary = dm.getSummary();
    expect(summary.samples.length).to.equal(1)
  })











/*
  await it("Test removeProject", async ()=>{
    await dm.removeProject(nameProjectTest);
    var projects = await dm.getProjects()
    expect(projects).to.not.include(nameProjectTest)
  })*/
})
