# UDT Dataset Managers

This is a submodule of the [Universal Data Tool](https://github.com/UniversalDataTool/universal-data-tool).

A Dataset Manager manages the asynchronous access and saving of a Universal Data Tool dataset within the Universal Data Tool application. Some Dataset Managers
save to memory, while others save to disk, others may save to a server. Each
dataset manager shares common test suites, so they're all collected here.

## Tests

**To run tests this you need to be using Node 14 (for es6 module support).**

Try running `nvm use 14`

Then you can run `yarn test` to test each dataset manager.

### Why was this broken out?

This was broken out as a npm module because the tests are a bit tricky to do
within the Universal Data Tool and things like the `CollaborationServerDatasetManager` are first tested against the UDT collaboration
server prior to integration to the UDT, so it just made things easier.
