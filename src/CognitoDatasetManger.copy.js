class CognitoDatasetManager extends EventEmitter {
    type = "cognito" 
    ds = null

    constructor({
        authConfig,
        user,
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
    
        this.cognitoSetUp = Auth.signIn(user.username, user.password)
      }
       isReady = async () => {
        await this.cognitoSetUp
          .then(() => {
            this.worked = true
          })
          .catch(() => {
            this.worked = false
          })
        return this.worked
      }
  
    getSummary = async () => {
        if (!this.ds) {
          var index =  await this.getJSON(this.projectName+"/index.json")
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
  
    // Get or set the dataset training, file paths or other top levels keys (not
    // samples). For example, getDatasetProperty('training') returns the labeler
    // training configuration. getDatasetProperty('name') returns the name.
    // You can and should create a new object here if you have custom stuff you
    // want to store in the dataset
    getDatasetProperty(key: string): Promise<Object>;
    setDatasetProperty(key: string, newValue: Object): Promise<Object>;
  
    // Two ways to get a sample. Using `sampleRefId` will return the sample with
    // an `_id` === sampleRefId
    getSampleByIndex(index: number): Promise<Object>;
    getSample(sampleRefId: string): Promise<Object>;
  
    // Set a new value for a sample
    setSample(sampleRefId: string, newSample: Object): Promise<void>;
  
    // Add samples to the dataset
    addSamples(samples: Array<Object>): Promise<void>;
  
    // Remove samples
    removeSamples(sampleIds: Array<string>): Promise<void>;
  
    // Import an entire UDT JSON file
    setDataset(udtObject: Object): Promise<void>;
  
    // Get full dataset JSON. Use sparingly if datasets are large.
    getDataset(): Promise<Object>;
  
    // -------------------------------
    // EVENTS
    // You don't need to implement events, but they may help in collaborative
    // settings or for displaying notifications.
    // -------------------------------
  
    on(
      event:
        | "dataset-reloaded"
        | "dataset-property-changed" // passes { key: "interface" | "training" | "etc" }
        | "summary-changed" // passes { }
        | "sample-changed" // passes { sampleRefId }
        | "sampled-changed-by-someone-else" // passes { sampleRefId }
        | "error" // passes { message }
        | "notify-user" // passes { message }
        | "connected"
        | "disconnected",
      Function
    ): void;
  
    // -------------------------------
    // OPTIONAL
    // -------------------------------
  
    // Called whenever application config is updated. Maybe you need the app config
    // to access some authentication variables
    onUpdateAppConfig?: (appConfig: Object) => void;
  
    // Datasets can be explictly saved for some interfaces (e.g. FileSystem)
    explicitSave?: () => Promise<void>;
  
    // Can be called to preload the contents of a sample to make for a more
    // responsive interface
    preloadSampleByIndex?: (index: number) => void;
    preloadSample?: (sampleRefId: string) => void;
  
    // We assume we can write to the dataset if not specified
    isWritable?: () => boolean;


    getSamplesSummary = async () => {
        const annotations = await this.getAnnotationsListFromProject({
          projectName: this.projectName,
          noExtensions: false,
        })
        var json = await this.readJSONAllSample(annotations)
        const samplesList = json.map((obj, i) => ({
          hasAnnotation: obj.annotation ? true : false,
          _id: obj._id,
          _url: annotations[i],
        }))
        return samplesList
      }

      getJSON = async (path) => {
        var url = await Storage.get(path, {
          expires: this.privateDataExpire,
          level: this.dataPrivacyLevel,
          contentType: "application/json",
        })
        var data=await fetch(this.proxyUrl+url)
        var json =await data.json()
        return json
      }

  }
  
  export default CognitoDatasetManager