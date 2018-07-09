<template>
  <v-container fluid>
      <v-toolbar>
      <v-btn @click="getData('PROD4068')">Get PROD4068 Data</v-btn>
      <v-btn @click="getData('PROD4069')">Get PROD4069 Data</v-btn>
      <v-btn @click="getData('PROD2576')">Get PROD2576 Data</v-btn>
      <v-btn @click="getData('EXPERIMENTAL0001')">Get EXPERIMENTAL0001</v-btn>
    </v-toolbar>
      <v-layout column align-center>
        <v-container fluid grid-list-md>
            <v-textarea
              box
              auto-grow
              :value="textarea"
              clearable
              readonly
              :loading="taloading"
            ></v-textarea>
          </v-container>
        </v-layout>
  </v-container>
</template>

<script>
import { RoiDataLoader } from '@/components/roi-dataloader.js'
import arcgis from '@/services/arcgis.js'

export default {
  name: 'roi-loader',
  data: () => ({
    textarea: '',
    data: '',
    rdl: '',
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
  },

  methods: {
    async getPortletHeaders() {
      this.taloading = true
      this.data = await this.rdl.getPortletHeaders()
      this.taloading = false
      this.textarea = JSON.stringify(this.data)
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
