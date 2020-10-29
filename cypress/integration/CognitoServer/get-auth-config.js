export default () => {
  const env = Cypress.env()

  return {
    Auth: {
      identityPoolId: env.AWS_IDENTITY_POOL_ID,
      region: env.AWS_AUTH_REGION,
      userPoolId: env.AWS_USER_POOL_ID,
      userPoolWebClientId: env.AWS_USER_POOL_WEB_CLIENT_ID,
      mandatorySignIn:
        (env.AWS_MANDATORY_SIGN_IN || "").toUpperCase() === "TRUE",
      authenticationFlowType: env.AWS_AUTHENTICATION_FLOW_TYPE
    },
    Storage: {
      AWSS3: {
        bucket: env.AWS_STORAGE_BUCKET,
        region: env.AWS_STORAGE_REGION
      }
    }
  }
}
