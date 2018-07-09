import axios from 'axios'

// where=1%3D1&outFields=*&outSR=4326
let state = {
  services: [],
  volumecatalogue: [],
  volumedefinition: {}
}
export default {
  getDataVolumeServices: async function (source){
    let url = source.endpoints.services
    let response = await axios.get(url)
    state.services = response.data.services
    console.log(state.services)
    return state.services
  },

  getDataVolumeCatalogue: async function (source, service) {
    let srv = state.services.find(e => e.name === service)
    let url = source.endpoints.volumecatalogue.replace('<service>', srv.name)
    url = url.replace('<type>', srv.type)
    let response = await axios.get(url)
    state.volumecatalogue = response.data.layers
    return state.volumecatalogue
  },

  getDataVolumeDefinition: async function (source, params) {
    let url = source.endpoints.definition.replace('<volid>', params.basehash)
    console.log('getDataVolumeDefinition', url)
    let response = await axios.get(url)
    //add some mandatory private fields
    state.volumedefinition.version = response.data.currentVersion
    state.volumedefinition.title = response.data.name
    state.volumedefinition.id = params.basehash
    state.volumedefinition.data = response.data
    return state.volumedefinition
  },

  getDataVolume: async function(source, voldef, params) {
    params =  {
      where: '1=1',
      outFields: '*',
      outSR: '4326',
      returnGeometry: false
    }
    params.f = 'json'

    let url = source.endpoints.data.replace('<volid>', voldef.id)
    console.log('getDataVolume url', url)
    let response = await axios.get(url, {
      params: params
    })
    return response.data
  }

}
