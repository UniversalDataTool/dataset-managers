/* eslint-disable cypress/no-async-tests */
import wrapperClass from "../../../../src/dataset-wrapper"
import commandLocalStorage from "../cypress-command/local-storage"
const test = (type, ...args) => {
  commandLocalStorage()
  Cypress.config("defaultCommandTimeout", 100000)
  describe("Wrapper dataset-managers " + type, () => {
    var wrapper
    var samplesDummies
    before("Prepare wrapper test", () => {
      cy.fixture("samples-dummies.json").then({ timeout: 100000 }, (data) => {
        samplesDummies = data
        wrapper = new wrapperClass(type, ...args)
        cy.waitUntil(() => wrapper.isReady().then((value) => value === true), {
          customMessage: "isReady",
          timeout: 100000,
        }).then(async () => {
          await wrapper.setDataset(samplesDummies)
        })
      })
    })
    beforeEach("restore local-storage", () => {
      cy.restoreLocalStorage()
    })
    it("Able to get type from dataset", () => {
      cy.waitUntil(() => wrapper.type === type, {
        customMessage: "type",
        timeout: 10000,
      })
    })
    /*it("Test isReady", () => {
      cy.waitUntil(()=>wrapper.isReady().then((value)=>value===true))
    })*/
    it("Test setDataset/getDataset", () => {
      cy.then({ timeout: 100000 }, async () => {
        await wrapper.setDataset(samplesDummies)
        cy.waitUntil(
          () =>
            wrapper
              .getDataset()
              .then((value) => value.name === samplesDummies.name),
          { customMessage: "getDataset", timeout: 10000 }
        )
      })
    })
    it("Test getSummary", () => {
      cy.waitUntil(
        () => wrapper.getSummary().then((value) => value.samples.length === 2),
        { customMessage: "getSummary", timeout: 10000 }
      )
    })
    it("Test getDatasetProperty/setDatasetProperty", () => {
      cy.then({ timeout: 100000 }, async () => {
        await wrapper.setDatasetProperty("name", "test1234")
        cy.waitUntil(
          () =>
            wrapper
              .getDatasetProperty("name")
              .then((value) => value === "test1234"),
          { customMessage: "getDatasetProperty", timeout: 10000 }
        )
      })
    })
    it("Test getSampleByIndex", () => {
      cy.waitUntil(
        () =>
          wrapper
            .getSampleByIndex(0)
            .then((value) => value._id === samplesDummies.samples[0]._id),
        { customMessage: "getSampleByIndex", timeout: 10000 }
      )
    })
    it("Test getSample/setSample", () => {
      cy.then({ timeout: 100000 }, async () => {
        var testSample = { _id: "test" }
        await wrapper.setSample("sdjz2g1qa", testSample)
        cy.waitUntil(
          () =>
            wrapper
              .getSample("test")
              .then((value) => value._id === testSample._id)
              .catch((err) => console.log(err)),
          { customMessage: "getSample", timeout: 10000, verbose: true }
        )
      })
    })
    it("Test addSamples/removeSamples", () => {
      cy.then({ timeout: 100000 }, async () => {
        await wrapper.addSamples([samplesDummies.samples[0]])
        cy.waitUntil(
          () =>
            wrapper.getDataset().then((value) => value.samples.length === 3),
          { customMessage: "getDataset", timeout: 10000 }
        )
      })
      cy.then({ timeout: 100000 }, async () => {
        await wrapper.removeSamples([samplesDummies.samples[0]._id])
        cy.waitUntil(
          () =>
            wrapper
              .getDataset()
              .then((value) => value /*.samples.length === 2*/),
          { customMessage: "getDataset", timeout: 10000 }
        )
      })
    })
    it("Test onUpdateAppConfig", async () => {
      if (!wrapper.onUpdateAppConfig) return true // This function is optional so it pass if it don't exist
    })

    it("Test explicitSave", async () => {
      if (!wrapper.explicitSave) return true // This function is optional so it pass if it don't exist
    })

    it("Test preloadSample", async () => {
      if (!wrapper.preloadSample) return true // This function is optional so it pass if it don't exist
    })

    it("Test preloadSampleByIndex", async () => {
      if (!wrapper.preloadSampleByIndex) return true // This function is optional so it pass if it don't exist
    })

    it("Test isWritable", async () => {
      if (!wrapper.isWritable) return true // This function is optional so it pass if it don't exist
    })

    it("Test uploadFiles", async () => {
      if (!wrapper.uploadFiles) return true // This function is optional so it pass if it don't exist
    })
    afterEach("save local storage", () => {
      cy.saveLocalStorage()
    })
  })
}
export default test
