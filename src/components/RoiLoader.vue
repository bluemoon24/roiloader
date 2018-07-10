<template>
  <v-container fluid>
    <v-toolbar light>
      <v-toolbar-title>Config</v-toolbar-title>
      <!-- <v-spacer></v-spacer> -->
      <v-btn small flat @click="getPortletHeaders()">Headers</v-btn>
      <v-btn small flat @click="getPortletConfig('PROD4068')">PROD4068</v-btn>
      <v-btn small flat @click="getPortletConfig('PROD4069')">PROD4069</v-btn>
      <v-btn small flat @click="getPortletConfig('PROD2576')">PROD2576</v-btn>
      <v-btn small flat @click="getPortletConfig('EXPERIMENTAL0001')">EXPERIMENTAL0001</v-btn>
      <v-spacer></v-spacer>
    <v-switch v-model="rdl.offline" label="offline" small flat ></v-switch>
  </v-toolbar>
      <v-toolbar light>
        <v-toolbar-title>Data</v-toolbar-title>
        <!-- <v-spacer></v-spacer> -->
      <v-btn small flat @click="getData('PROD4068')">PROD4068</v-btn>
      <v-btn small flat @click="getData('PROD4069')">PROD4069</v-btn>
      <v-btn small flat @click="getData('PROD2576')">PROD2576</v-btn>
      <v-btn small flat @click="getData('EXPERIMENTAL0001')">EXPERIMENTAL0001</v-btn>
    </v-toolbar>
      <v-layout column align-center>
        <v-container fluid grid-list-md>
            <v-textarea
              box
              auto-grow
              :value="textarea"
              clearable
              readonly
            >
          </v-textarea>
          </v-container>
        </v-layout>
  </v-container>
</template>

<script>
import { RoiDataLoader, RoiLoader } from '@/components/roi-dataloader.js'
import arcgis from '@/services/arcgis.js'

export default {
  name: 'roi-loader',
  data: () => ({
    cache_only: false,
    ignore_cache: false,
    textarea: '',
    data: '',
    rdl: '',
    rl: '',
    taloading: false,
    asource:
      {
        sysid: "agho",
        syname: "ArcGIS Hub online",
        systype: "arcgis",
        endpoints: {
          services: "http://maps6.arcgisonline.com/ArcGIS/rest/services/A-16/?f=pjson",
          volumecatalogue: "http://maps6.arcgisonline.com/arcgis/rest/services/<service>/<type>?f=pjson",
          volume: "http://maps6.arcgisonline.com/arcgis/rest/services/<service>/<type>/<volid>?f=pjson",
          data: "http://maps6.arcgisonline.com/ArcGIS/rest/services/<service>/<type>/<volid>/query?f=json"
        }
      }
  }),

  created () {
    this.rdl = new RoiDataLoader()
    this.rl = new RoiLoader()
  },

  methods: {
    async getPortletHeaders() {
      this.taloading = true
      this.data = await this.rdl.getPortletHeaders()
      this.taloading = false
      this.textarea = JSON.stringify(this.data, null, '\t')
    },

    async getPortletConfig(pid) {
      this.taloading = true
      this.data = await this.rl.getPortletConfig(pid)
      this.taloading = false
      this.textarea = JSON.stringify(this.data, null, '\t')
    },

    async getData(pid) {
      this.textarea = ''
      this.taloading = true
      let params = {
        D0FISCPER_CXSNI00: '09.2017',
        DCURRENCY_CDSOI01: 'EUR'
      }
       this.data = await this.rdl.getData(pid, params)
       this.taloading = false
       this.textarea = JSON.stringify(this.data, null, '\t')
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
