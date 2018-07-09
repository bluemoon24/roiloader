import axios from 'axios'

export default {
  props: ['source', 'endpoint'],

  copyToClipboard: function () {
    this.$refs.list.select()
    document.execCommand('Copy')
  },

  getBissoTicket: async function (type) {
    const result = await axios.get("http://bisso.intranet.cnb/authenticate/whoami.php", {
      withCredentials: true,
      params: {
        "mode": "json"
      }
    })

    console.log('getBissoTicket',  result)
    return result.data
  },

  getStructureDefinition: async function (source, params) {
    let auth = await this.getBissoTicket()
    console.log('got bisso', auth)
    let url = source.endpoints.structures
    let sparams = { // service parameters
      query2run: params.basehash,
      SAPLangu: 'E',
      version: '1.50'
    }
    console.log('sapbw call', url, {...auth, ...sparams})
    let response = await axios.get(url, {
      params: {...auth, ...sparams}
    })
    // console.log('bw response', response.data)
    let definition = []
    let desc
    let parseString = require('xml2js').parseString
    parseString(response.data, { explicitArray: false }, function (err, result) {
      console.log('parsed response from h2r structure', err, result)
      if (err) console.log('Error in parseString', err)
      else desc = result['bmsbi:result']['bmsbi:qresult'].query.struc_desc.item
      let structures = {}
      for (let s of desc) {
        if (!structures[s.structureid]) structures[s.structureid] = {}
        if (!structures[s.structureid].objects) structures[s.structureid].objects = []
        structures[s.structureid].id = s.structureid
        structures[s.structureid].name = s.structurename
        structures[s.structureid].mapname = s.structuremapname
        structures[s.structureid].position = s.structurepostion  // ... typo in service
        structures[s.structureid].layoutposition = s.layoutpostion // ... same
        structures[s.structureid].objects.push({
          id: s.objectid,
          name: s.objectname,
          mapname: s.objectmapname,
          position: s.objectpostion,
          hidden: s.objecthidden !== '',
          parent: s.objectparent,
          drillstate: s.objectdrillstate,
          range: s.objectrange
        })
      }
      for (let skey in structures) {
        definition.push(structures[skey])
      }
      })
    return definition
  },

  getDataVolumeDefinition: async function (source, params) {
    let auth = await this.getBissoTicket()
    console.log('got bisso', auth)
    let url = source.endpoints.definition
    let sparams = { // service parameters
      query2run: params.basehash,
      SAPLangu: 'E',
      version: '1.50'
    }
    console.log('sapbw call', url, {...auth, ...sparams})
    let response = await axios.get(url, {
      params: {...auth, ...sparams}
    })
    // console.log('bw response', response.data)
    let definition
    let parseString = require('xml2js').parseString
    parseString(response.data, { explicitArray: false }, function (err, result) {
      console.log('parsed response from h2r', err, result)
      if (err) console.log('Error in parseString', err)
      else  definition = transformResult(result)

        // this transformation result should be the target format that will be returned from the backend service.
        //
        function transformResult (result) {
          let qdetails = result['bmsbi:result']['bmsbi:qresult']['bmsbi:queryDetails']
          let query = {
            version: result['bmsbi:result']['bmsbi:qresult'].version,
            title: qdetails._,
          }

          for (let att in qdetails.$) {
            if (qdetails.$.hasOwnProperty(att)) {
              query[att] = qdetails.$[att]
            }
          }

          let qdef = result['bmsbi:result']['bmsbi:qresult']['query']
          query.available = !qdef.queryNotAvailable
          query.infoobjects = qdef.dimension.measure.map((el) => {
            let item = {}
            let ishier = el.ishierarchy === 'true'
            for (var itm in el) {
              // console.log('ishierarchy', , itm.includes('hie'), !el.ishierarchy && itm.includes('hie'))
              if (!el.hasOwnProperty(itm)) continue
              if (!ishier && itm.includes('hie')) continue
              if (itm === 'infoobject') item['id'] = el[itm]
              if (itm === 'descript') item['name'] = el[itm]
              item[itm] = el[itm]
            }
            if (ishier) {
              item.hierarchy =
              {
                id: el.hierarchy,
                name: el.hienmdesc,
                level: el.hienmlevel
              }
            }
            return item
          })
          query.variables = qdef.globalvardescrstr.vars.map((el) => {
            let item = {}
            item.id = el.vnam
            item.name = el.vnamdesc
            item.infoobject = { id: el.infoobject, name: el.infoobjectdesc }
            item.type = el.vartyp
            item.typetext = el.vartypdesc
            item.processtype = el.vproctyp
            item.processtypetext = el.vproctypdesc
            item.parsel = el.vparsel
            item.parseltext = el.vparseldesc
            item.input = el.varinput.toLowerCase() === 'x'
            item.mandatory = el.entrytp === '2' || el.entrytp === '1'
            item.entrytype = el.entrytp
            item.entrytypetext = el.entrytpdesc
            item.dynchange = el.dynchange
            item.dynchangedescr = el.dynchangedescr
            item.flags = {lh: el.flaglh, r: el.flagr}
            item.value = el.lowvalue
            item.highvalue = el.highvalue
            return item
          })

          // json-slim: minifies json (better than minify)
          // const slim = require('json-slim')
          // let q = slim(query)
          // // console.log('slim query:', q)
          return query
        } // transfromResult
      })
      definition.structures = await this.getStructureDefinition(source, params)
      console.log('data volume definition ...:', definition)
      return definition
  },

  getDataVolume: async function(source, vdef, params) {
    let sparams = { // service parameters
      query2run: vdef.id,
      SAPLangu: 'E',
      version: '1.50'
    }
    let i = 1
    for (let key in params) {
      // search for parameters in variables
      let v = vdef.variables.find(e => (e.id === key))
      if (v) sparams['varia_' + i++] = key + '+I+EQ+' + params[key]
    }

    let auth = await this.getBissoTicket()
    console.log('got bisso', auth)
    let url = source.endpoints.data
    console.log('sapbw call', url, {...auth, ...sparams})
    let response = await axios.get(url, {
      params: {...auth, ...sparams}
    })
    // console.log('bw data response', response.data)
    let data
    let parseString = require('xml2js').parseString
    parseString(response.data, { explicitArray: false }, function (err, result) {
      console.log('parsed response from h2r', err, result)
      if (err) console.log('Error in parseString', err)
      else data = transformResult(result)

      // transform into target format
      function transformResult(result) {
        let qres = result['bmsbi:result']['bmsbi:qresult'].query
        let query = {
          version: qres.version,
          title: result['bmsbi:result'].$.id,
          limitexceeded: result['bmsbi:result'].$.row_limit_reached !== '',
          nosuchuser: qres.userNotAvailable !== '',
          nodata: qres.noDataAvailable !== '',
          nosuchquery: qres.queryNotAvailable !== '',
          noauth: qres.noAuthorization !== ''
        }

        let meta = {}
        qres.meta.header.metadata.forEach((e) => {
          let ch = e.fieldname.substring(0,2) === 'ch'
          meta[e.fieldname] = {
            key: ch ? e.basedinfoobject : e.elementid,
            value: e.scrtext
          }
        })
        // let cube = qres.meta.header.metadata.map((e) => {
        //   let d = []
        //   let type = e.fieldname.substring(0,2)
        //   for (let row of qres.cube.row) {
        //     if (type === 'ch') d.push({key: row[e.fieldname].$.key, text: row[e.fieldname]._})
        //     else if (type === 'kf') d.push({unit: row[e.fieldname].$.u, value: row[e.fieldname]._})
        //   }
        //   return {
        //     oldid: e.fieldname,
        //     type: type === 'kf' ? 'value' : type === 'ch' ? 'category' : type,
        //     elementid: e.elementid,
        //     baseinfoobject: e.basedinfoobject,  // type in webservice, should be base not based
        //     isstructure: e.isstructure !== '',
        //     text: e.scrtext,
        //     structureid: e.structureid,
        //     technicalname: e.technicalName,
        //     data: d
        //   }
        // })
        // let meta = qres.meta.header.metadata.map((e) => {
        // let type = e.fieldname.substring(0,2)
        //   return {
        //     value: (type === 'ch' ? e.basedinfoobject : e.elementid),
        //     text: e.srctext
        //   }
        // }
        //
        console.log('metadata', meta)
        let cube = qres.cube.row.map((e) => {
          let obj = {}
          for (let k in e) {
            // let meta = qres.meta.header.metadata.find(el => el.fieldname === k)
            let ch = k.substring(0,2) === 'ch'
            obj[k] = ch ? {key: e[k].$.key, value: e[k]._} : {key: meta[k].key, value: e[k]._, unit: e[k].$.u}
          }
          return obj
        })

        let filters = qres.filters.filterdescrstr.map(e => ({
          id: e.infoobject,
          from: {key: e.key, value: e.value},
          to: {key: e.keyHigh, to: e.valueHigh}
        }))

        let variables = qres.variabs.vardescrstr.map(e => ({
          id: e.vnam,
          from: {key: e.key, value: e.value},
          to: {key: e.keyHigh, to: e.valueHigh}
        }))

        return {query: query, meta: meta, cube: cube, filters: filters, variables: variables}
      }
    })
    console.log('***getVolume result', data)
    return data
  }
}
