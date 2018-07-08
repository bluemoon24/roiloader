<template>
  <v-container fluid>
      <v-toolbar>
      <v-btn @click="getData('PROD4068')">Get PROD4068 Data</v-btn>
      <v-btn @click="getData('PROD4069')">Get PROD4069 Data</v-btn>
      <v-btn @click="getData('PROD2576')">Get PROD2576 Data</v-btn>
      <v-btn @click="getPortletHeaders()">Get Portlet Headers</v-btn>
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


export default {
  name: 'roi-loader',
  data: () => ({
    textarea: '',
    data: '',
    rdl: '',
    taloading: false
  }),

  created () {
    console.log('reated')
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
       this.textarea = JSON.stringify(this.data)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
