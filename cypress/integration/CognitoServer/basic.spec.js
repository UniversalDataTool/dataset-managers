import CognitoDatasetManager from "../../../dist/CognitoDatasetManager.js"
import getAuthConfig from "./get-auth-config.js"

describe("Cognito Server Tests", () => {
  it("Create the CognitoDatasetManager object", () => {
    cy.wrap(null).then(async () => {
      const authConfig = getAuthConfig()

      const dummyUser = {
        username: Cypress.env().COGNITO_USER_NAME,
        password: Cypress.env().COGNITO_USER_PASS,
      }

      const dm = new CognitoDatasetManager({ authConfig, dummyUser })

      expect(true).to.equal(true)

      cy.log(await dm.isReady())

      cy.log(await dm.getProjects())

      dm.setProject("imageProject")

      cy.log(await dm.getSummary())

      cy.log(await dm.createProject("new project 2"))

      cy.log(await dm.getDatasetProperty("name"))

      cy.log(dm.getSampleByIndex(0))
    })
  })
})
