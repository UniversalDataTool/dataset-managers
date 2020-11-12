import { EventEmitter } from "events";
import Amplify, { Auth } from "aws-amplify";

class CognitoDatasetManager extends EventEmitter {
  type = "cognito";

  constructor({ authConfig, dummyUser } = {}) {
    super();
    if (!authConfig.Auth.region) throw new Error("Auth region is required");
    if (!authConfig.Auth.userPoolId)
      throw new Error("Auth userPoolId is required");
    if (!authConfig.Auth.userPoolWebClientId)
      throw new Error("Auth userPoolWebClientId is required");
    if (!authConfig.Auth.identityPoolId)
      throw new Error("Auth identityPoolId is required");

    if (!authConfig.Storage.AWSS3.bucket)
      throw new Error("Storage bucket name is required");
    if (!authConfig.Storage.AWSS3.region)
      throw new Error("Storage bucket region is required");

    this.authConfig = authConfig;

    console.log(Amplify.configure(this.authConfig));

    this.cognitoSetUp = new Promise((resolve, reject) => {
      Auth.signIn(dummyUser.username, dummyUser.password)
        .then((_user) => {
          resolve();
        })
        .catch((err) => {
          reject();
        });
    });
  }

  // Called frequently to make sure the dataset is accessible, return true if
  // the dataset can be read. You might return false if there isn't a dataset
  // loaded
  // Protip: If you have a server you should establish a connection here (if not connected)
  isReady = async () => {
    await this.cognitoSetUp
      .then(() => {
        this.worked = true;
      })
      .catch(() => {
        this.worked = false;
      });
    return this.worked;
  };

  getProjects = async () => {
    // should return a list of available projects to open

    await Amplify.Storage.list("", { level: "private" })
      .then((result) => {
        this.projects = result
          .filter(
            (obj) =>
              (obj.key.endsWith("/")||obj.key.endsWith("/*.*")) &&
              obj.key.split("/").filter((item) => item).length === 1
          )
          .map((obj) => obj.key);
      })
      .catch((err) => {
        this.projects = null;
      });
    return this.projects;
  };

  getDataFromProject = async ({
    targetProject = false,
    noExtensions = false,
  }) => {
    if (!targetProject) targetProject = this.projectName;

    let samples = [];
    await Amplify.Storage.list(`${targetProject}/data/`, { level: "private" })
      .then((result) => {
        samples = result
          .filter((obj) => obj.key !== `${targetProject}/data/`)
          .map((obj) => obj.key);
      })
      .catch((err) => {
        samples = null;
      });
    if (noExtensions) {
      samples = samples.map((eachFile) => {
        return eachFile.split(".").slice(0, -1).join(".");
      });
    }
    return samples;
  };

  getAnnotationsFromProject = async ({
    targetProject = false,
    noExtensions = false,
  }) => {
    if (!targetProject) targetProject = this.projectName;

    let samples = [];
    await Amplify.Storage.list(`${targetProject}/annotations/`, {
      level: "private",
    })
      .then((result) => {
        console.log(result);
        samples = result
          .filter((obj) => obj.key !== `${targetProject}/annotations/`)
          .map((obj) => obj.key);
      })
      .catch((err) => {
        samples = null;
      });
    if (noExtensions) {
      samples = samples.map((eachFile) => {
        return eachFile.split(".").slice(0, -1).join(".");
      });
    }
    return samples;
  };

  setProject = (projectName) => {
    console.log("setting project name as ", projectName);
    this.projectName = projectName;
  };

  // Gives a summary of the dataset, mostly just indicating if the samples
  // are annotated are not.
  // https://github.com/UniversalDataTool/udt-format/blob/master/proposals/summary.md
  getSummary = async () => {
    const samples = await this.getDataFromProject({});
    const annotations = await this.getAnnotationsFromProject({
      projectTarget: this.projectName,
      noExtensions: true,
    });

    return {
      samples: samples.map((sample) => ({
        hasAnnotation: annotations.includes(
          sample
            .split(".")
            .slice(0, -1)
            .join(".")
            .replace("/data/", "/annotations/")
        ),
        _id: sample,
      })),
    };
  };

  // Get or set the dataset training, file paths or other top levels keys (not
  // samples). For example, getDatasetProperty('training') returns the labeler
  // training configuration. getDatasetProperty('name') returns the name.
  // You can and should create a new object here if you have custom stuff you
  // want to store in the dataset
  getDatasetProperty = async (key) => {
    // Promise<Object>
    return {};
  };
  setDatasetProperty = async (key, newValue) => {
    //Promise<Object>
    return {};
  };

  // Two ways to get a sample. Using `sampleRefId` will return the sample with
  // an `_id` === sampleRefId
  getSampleByIndex = async (index) => {
    //Promise<Object>;
    return {};
  };
  getSample = async (sampleRefId) => {
    //Promise<Object>;
  };

  // Set a new value for a sample
  setSample = async (sampleRefId, newSample) => {
    //Promise<void>;
  };

  // Add samples to the dataset
  addSamples = async (samples) => {
    // Promise<void>;
  };

  // Remove samples
  removeSamples = (sampleIds) => {
    //Promise<void>;
  };

  // Import an entire UDT JSON file
  setDataset = (udtObject) => {
    // Promise<void>;
  };

  // Get full dataset JSON. Use sparingly if datasets are large.
  getDataset = () => {
    //Promise<Object>;
  };

  // -------------------------------
  // EVENTS
  // You don't need to implement events, but they may help in collaborative
  // settings or for displaying notifications.
  // -------------------------------

  on = (event) => {
    // void;
  };

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

export default CognitoDatasetManager;
