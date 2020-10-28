export default () => ({
  Auth: {
    identityPoolId: process.env.TEST_AWS_IDENTITY_POOL_ID,
    region: process.env.TEST_AWS_AUTH_REGION,
    userPoolId: process.env.TEST_AWS_USER_POOL_ID,
    userPoolWebClientId: process.env.TEST_AWS_USER_POOL_WEB_CLIENT_ID,
    mandatorySignIn:
      (process.env.TEST_AWS_MANDATORY_SIGN_IN || "").toUpperCase() === "TRUE",
    authenticationFlowType: process.env.TEST_AWS_AUTHENTICATION_FLOW_TYPE
  },
  Storage: {
    AWSS3: {
      bucket: process.env.TEST_AWS_STORAGE_BUCKET,
      region: process.env.TEST_AWS_STORAGE_REGION
    }
  }
})
