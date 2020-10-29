import CognitoDatasetManager from "../../../dist/CognitoDatasetManager.js"
import Amplify from "aws-amplify"
import getAuthConfig from "./get-auth-config.js"

describe("Cognito Server Tests", () => {
  it("Should do something", () => {
    cy.wrap(null).then(async () => {
      const authConfig = getAuthConfig()
      cy.log(authConfig)
      expect(true).to.equal(true)

      const dummyUser = {
        username: Cypress.env().COGNITO_USER_NAME,
        password: Cypress.env().COGNITO_USER_PASS
      }

      Amplify.configure(authConfig)
      let user = {}
      await Amplify.Auth.signIn(dummyUser.username, dummyUser.password).then(
        _user => {
          user = _user
        }
      )

      await Amplify.Storage.list("", { level: "private" }).then(result => {
        cy.log(result)
      })

      // const dm = new CognitoDatasetManager({ authConfig })
    })
  })
})
