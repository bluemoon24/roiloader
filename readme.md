## RoiLoader
Project to develop module roi-loader.

`roi-loader.js` is a module that encapsulates data loading for roi application data consumption. Applications of the roi suite (roiPE, PortletBuilder, ...) must always retrieve their data through this module, since it handles data caching as well as data format transformations.

#### Major dependencies
For visualization of data calls the module is being developed with `Vuejs`, using `Vuetify.js` plugin for UI components. Because of required access to the local file system, the module is based on `nodejs`, which is included in the visualization framework `electronjs`. Hence we develop on a local app. The roi-loader module only requires the nodejs environment.

#### Development
To develop the module, use `yarn serve:electron`. Module is contained in project file `src/components/roi-loader.js`.

#### Production
A production version can be created with `yarn build:electron`. Depending on the OS this is run, it will create an installation file on Windows and a .app file on MacOS
