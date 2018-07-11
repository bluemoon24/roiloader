import sapbw from '@/services/sapbw.js'
import arcgis from '@/services/arcgis.js'
const fs = require('fs')
const axios = require('axios')

// private functions

// function hello(s) {
//   console.log('config from hello', this.config)
//   return s
// }

// return hello.bind(this)('0.1') // memorize: if we need 'this' in a private function

let state = {
  offline: false,
  datavolume: {
    definition: {},
    data: {},
    source: {},
    dvbase: {}
  },
  portlets: {},
  datasources: [],
  directories: {},
  portletConfigData: {}
}


function transformPortletConfig(config) {
    // helper function for (interim) transformation of service format to new standard
    // console.log('transformPortletConfig', config, typeof(config))
    if (typeof(config) !== 'object') return config
    for (let key in config) {
        if (config[key] && config[key]['@attributes']) {
          config[key] = {...config[key], ...config[key]['@attributes']}
          delete config[key]['@attributes']
        }
        if (key === 'query') {
          config.volume = config.query
          delete config.query
        }
        transformPortletConfig(config[key])
    }
    return config
}

class Services {
  // constructor() {}

  async writeStats(stobj) {
    fs.appendFile(`${state.directories.statistics}/stats.json`, JSON.stringify(stobj, null, '\t'), 'utf8', (err) => {
      if (err) throw err;
      console.log('stats appended to file');
    })
  }

  async getPortletHeaders() {
    function getCache() {
      try {
        let data = fs.readFileSync(state.portlets.headers, 'utf8')
        return JSON.parse(data)
      } catch (err) {
        console.log('Error getting header data from file', state.portlets.headers, err)
      }
      return data
    }
    if (state.offline) getCache()
    else
    try {
      let t0 = performance.now()
      let response = await axios.get(state.portlets.urls.headers.url, {
        params: state.portlets.urls.headers.params
        // responseType: 'stream'
      })
      let t1 = performance.now()
      this.writeStats({date: new Date(), id: 'portletHeaders', source: 'portlets', function: 'getPortletHeaders', time: (t1 - t0)/1000})

      // console.log('streaming response from service', response.data)
      this.cachePortletHeaderData(response.data)
      return response.data
    } catch (err) {
      console.log('reading portlet header data from cache. Error was', err)
      return getCache()
    }
  }

  async cachePortletHeaderData (data) {
    var mkdirp = require('mkdirp') // creates full path subdirectories, if don't exist
    mkdirp(state.directories.portlets, function (err) {
      if (err) console.error(err)
      else console.log('created:', state.directories.portlets)
    })
    fs.writeFile(state.portlets.headers, JSON.stringify(data, null, '\t'), 'utf8', (err) => {
      if (err) console.log('Error writing headers to cache', err)
      else console.log('header saved to cache', state.portlets.headers)
    })
  }

  async getPortletConfig (pid) {
    function getCache() {
      try {
        let fname = state.portlets.config.replace('<id>', '' + pid.scope + pid.id)
        let portlet = fs.readFileSync(fname, 'utf8')
        state.portletConfigData = JSON.parse(portlet)
      } catch (err) {
        console.log('Error getting config data from file', err)
      }
    }
    if (state.offline) getCache()
    else
    try {
      let t0 = performance.now()
      let response = await axios.get(state.portlets.urls.config.url, {
        params: {configId: pid.id, scope: pid.scope, ...state.portlets.urls.config.params}
      })
      let t1 = performance.now()
      this.writeStats({date: new Date(), id: pid.scope + pid.id, source: state.datavolume.source.sysid, function: 'portletConfig', time: (t1 - t0)/1000})
      console.log('stats:', state.stats)

      let pcd = transformPortletConfig(response.data[0])
      state.portletConfigData = pcd
      if (state.portletConfigData) this.cachePortletConfigData()
      else throw (`Config not found on server for ${pid.scope}${pid.id}`)
      return pcd
    } catch (err) {
      console.log('reading portlet config from cache. Error was', err)
      getCache()
    }
    return state.portletConfigData
  }

  async cachePortletConfigData () {
    var mkdirp = require('mkdirp') // creates full path subdirectories, if don't exist
    mkdirp(state.directories.portlets, function (err) {
      if (err) console.error('cachePortletConfigData', err)
      else console.log('created:', state.directories.portlets)
    })

    let p = state.portletConfigData
      let fname = state.portlets.config.replace('<id>', '' + p.scope + p.id)
      fs.writeFile(fname, JSON.stringify(p, null, '\t'), 'utf8', (err) => {
        if (err) console.log('Error writing config to cache', err, fname)
        else console.log('config saved to cache', fname)
      })
    // }
  }

  async getDatavolumeDefinition(dvbase) {
    let source = state.datasources.find((e) => (e.sysid === dvbase.sysid))
    let params = {
      endpoint: 'definition',
      basehash: dvbase.basehash
    }
    let def
    const path = `${state.directories.datavolumes}${dvbase.sysid}\/${dvbase.basehash}`
    function getCache() {
      try {
        return JSON.parse(fs.readFileSync(`${path}\/definition.json`, 'utf8'))
      } catch (err) {
        throw(err)
      }
    }
    if (state.offline) getCache()
    else
    try {
      let t0 = performance.now()
      switch (source.systype) {
        case 'sapbw':
          def = await sapbw.getDataVolumeDefinition(source, params)
          break
        case 'arcgis':
          def = await arcgis.getDataVolumeDefinition(source, params)
        break;
      }
      let t1 = performance.now()
      this.writeStats({date: new Date(), id: dvbase.basehash, source: source.sysid, function: 'getDatavolumeDefinition', time: (t1 - t0)/1000})

      this.cacheDefinition({path: path, data: def, source: source})
    } catch (err) {
      console.log('loading definition from cache. Exception was', err)
      def = getCache()
    }
    state.datavolume = {definition: def, data: null, source: source, dvbase: dvbase}
    return state.datavolume
  }

  async cacheDefinition(obj) {
    var mkdirp = require('mkdirp') // creates full path subdirectories, if don't exist
    mkdirp(obj.path, function (err) {
      if (err) console.error('cacheDefinition', err)
      else console.log('created:', obj.path)
    });
    fs.writeFile(`${obj.path}\/definition.json`, JSON.stringify(obj.data, null, '\t'), 'utf8', (err) => {
      if (err) console.log('Error writing definition to cache', err, path)
      else console.log('definition saved to cache', obj.path)
    })
    fs.writeFile(`${obj.path}\/source.json`, JSON.stringify(obj.source, null, '\t'), 'utf8', (err) => {
      if (err) console.log('Error writing source to cache', err, path)
      else console.log('source saved to cache', obj.path)
    })
  }

  async getDatavolume(params) {
    console.log('rl getDatavolume params, datavolume', params, state.datavolume)
    let md5 = require('md5')
    let data
    let source = state.datavolume.source
    let dvbase = state.datavolume.dvbase

    function getCache() {
      try {
            const path = `${state.directories.datavolumes}${dvbase.sysid}\/${dvbase.basehash}\/${md5(JSON.stringify(params))}.json`
            data = JSON.parse(fs.readFileSync(path, 'utf8'))
            state.datavolume = {definition: state.datavolume.definition, data: data, source: source,  dvbase: dvbase}
          } catch (err) {
            throw (err)
          }
    }
    if (state.offline) getCache()
    else
    try {
      let t0 = performance.now()
      switch (source.systype) {
        case 'sapbw':
          data = await sapbw.getDataVolume(source, state.datavolume.definition, params)
        break
        case 'arcgis':
          data = await arcgis.getDataVolume(source, state.datavolume.definition, params)
        break
      }
      let t1 = performance.now()
      this.writeStats({date: new Date(), id: dvbase.basehash, source: source.sysid, function: 'getDataVolume', time: (t1 - t0)/1000})

      state.datavolume = {definition: state.datavolume.definition, data: data, source: source,  dvbase: dvbase}
      this.cacheDatavolumeData(params)
    } catch (err) {
      console.log('loading data from cache. Exception was', err)
      getCache()
    }
    return state.datavolume

  }

  async cacheDatavolumeData (params) {
    let md5 = require('md5')
    let source = state.datavolume.source
    let dvbase = state.datavolume.dvbase
    const path = `${state.directories.datavolumes}${dvbase.sysid}\/${dvbase.basehash}\/${md5(JSON.stringify(params))}.json`
    fs.writeFile(path, JSON.stringify(state.datavolume.data, null, '\t'), 'utf8', (err) => {
      if (err) console.log('Error writing datavolume to cache', err)
      else console.log('Datavolume saved to cache', path)
    })
  }

}

const services = new Services()

export class RoiLoader {

  constructor(config, isPath = true) {
    config = config || 'data/config.json'
    console.log('RoiLoader config file', config)
    if (isPath) config = JSON.parse(fs.readFileSync(config))
    console.log('RoiLoader config', config)
    if (!config) throw ('Error - no configuratoin file')
    config.portlets.headers = config.directories.portlets + config.portlets.headers
    config.portlets.config = config.directories.portlets + config.portlets.config
    this.state.portlets = config.portlets
    this.state.datasources = config.datasources
    this.state.directories = config.directories

    let mkdirp = require('mkdirp') // creates full path subdirectories, if don't exist
    mkdirp(state.directories.statistics, function (err) {
      if (err) console.error(err)
      else console.log('created:', state.directories.statistics)
    })

  }

  get state() {
    return state
  }

  get version() {
    return '0.1'
  }

  get data() {
    return state.datavolume.data
  }

  set offline(offline) {
    state.offline = offline
  }

  async getPortletHeaders () {
    let data = await services.getPortletHeaders()
    console.log('data from roiloader', data)
    return data
  }

  async getPortletConfig (pid) {
    if (typeof pid === 'string') {
      let [p, scope, id] = pid.match(/([A-Za-z]+)(\d+)/i)
      console.log('pid is string', pid, p, scope, id)
      pid = {id: id, scope: scope}
    }

    console.log('getPortletConfig pid', pid)
    let data = await services.getPortletConfig(pid)
    state.portletConfigData = data
    console.log('config data from roiloader', data)
    return data
  }

  async getDatavolumeDefinition (dvbase) {
    let data = await services.getDatavolumeDefinition(dvbase)
    // state.datavolume = data
    console.log('data volume definition from roiloader', data, dvbase)
    return data
  }

  async getDatavolume (params) {
    let data = await services.getDatavolume(params)
    // state.datavolume = data
    console.log('data volume  from roiloader', data)
    return data
  }

}

export class RoiDataLoader {
  constructor(config, isPath = true) {
    this.rl = new RoiLoader(config)
  }

  get version() {
    return this.rl.version
  }

  set offline(offline) {
    this.rl.offline = offline
  }

  async getPortletHeaders() {
    return await this.rl.getPortletHeaders()
  }

  async getData(pid, params) {
    if (typeof pid === 'string') {
      let [p, scope, id] = pid.match(/([A-Za-z]+)(\d+)/i)
      console.log('pid is string', pid, p, scope, id)
      pid = {id: id, scope: scope}
    }
    let pc = await this.rl.getPortletConfig(pid)
    console.log('getData portlet Config', pc, {sysid: pc.config.system.toLowerCase(), basehash: pc.config.volume.id})
    await this.rl.getDatavolumeDefinition({sysid: pc.config.system.toLowerCase(), basehash: pc.config.volume.id})
    await this.rl.getDatavolume(params)
    console.log('state datavolume', state.datavolume.data)
    return this.rl.data
  }
}
