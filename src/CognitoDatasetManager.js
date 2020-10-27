class CognitoDatasetManager extends EventEmitter {
  type = "cognito"

  constructor({ region /* ... other cognito stuff */ } = {}) {
    super()
    if (!region) throw new Error('"region" is required')
    this.region = region
  }

  // Called frequently to make sure the dataset is accessible, return true if
  // the dataset can be read. You might return false if there isn't a dataset
  // loaded
  // Protip: If you have a server you should establish a connection here (if not connected)
  isReady = async () => {}

  // Gives a summary of the dataset, mostly just indicating if the samples
  // are annotated are not.
  // https://github.com/UniversalDataTool/udt-format/blob/master/proposals/summary.md
  getSummary = async () => {
    // TODO return summary object
    return {}
  }

  // Get or set the dataset training, file paths or other top levels keys (not
  // samples). For example, getDatasetProperty('training') returns the labeler
  // training configuration. getDatasetProperty('name') returns the name.
  // You can and should create a new object here if you have custom stuff you
  // want to store in the dataset
  getDatasetProperty = async (key: string) => {
    // Promise<Object>
    return {}
  }
  setDatasetProperty = async (key: string, newValue: Object) => {
    //Promise<Object>
    return {}
  }

  // Two ways to get a sample. Using `sampleRefId` will return the sample with
  // an `_id` === sampleRefId
  getSampleByIndex = async (index: number) => {
    //Promise<Object>;
    return {}
  }
  getSample = async (sampleRefId: string) => {
    //Promise<Object>;
  }

  // Set a new value for a sample
  setSample = async (sampleRefId: string, newSample: Object) => {
    //Promise<void>;
  }

  // Add samples to the dataset
  addSamples = async (samples: Array<Object>) => {
    // Promise<void>;
  }

  // Remove samples
  removeSamples = (sampleIds: Array<string>) => {
    //Promise<void>;
  }

  // Import an entire UDT JSON file
  setDataset = (udtObject: Object) => {
    // Promise<void>;
  }

  // Get full dataset JSON. Use sparingly if datasets are large.
  getDataset = () => {
    //Promise<Object>;
  }

  // -------------------------------
  // EVENTS
  // You don't need to implement events, but they may help in collaborative
  // settings or for displaying notifications.
  // -------------------------------

  on = (event) => {
    // void;
  }

  // -------------------------------
  // OPTIONAL
  // -------------------------------

  // Called whenever application config is updated. Maybe you need the app config
  // to access some authentication variables
  // onUpdateAppConfig?: (appConfig) => void;

  // Datasets can be explictly saved for some interfaces (e.g. FileSystem)
  // explicitSave?: () => Promise<void>;

  // Can be called to preload the contents of a sample to make for a more
  // responsive interface
  // preloadSampleByIndex?: (index: number) => void;
  // preloadSample?: (sampleRefId: string) => void;

  // We assume we can write to the dataset if not specified
  // isWritable?: () => boolean;
}
