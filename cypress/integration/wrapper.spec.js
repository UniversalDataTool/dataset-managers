import wrapperTestSuit from "./utils/test-suit/wrapper-test-suit"
import getAuthConfig from "./utils/get-auth-config.js"

var authConfig = getAuthConfig()
const userConfig = {
  username: Cypress.env().COGNITO_USER_NAME,
  password: Cypress.env().COGNITO_USER_PASS,
}
if(authConfig.Auth.identityPoolId)
wrapperTestSuit("cognito", { authConfig, userConfig })
wrapperTestSuit("local-storage")
wrapperTestSuit("collaborative-session", {
  serverUrl: "http://localhost:3000/",
  startSession: true,
})
