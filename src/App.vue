<template>
  <v-app>
    <v-content>
      <roi-loader/>
    </v-content>
  </v-app>
</template>

<script>
import RoiLoader from './components/RoiLoader'

export default {
  name: 'App',
  components: {
    RoiLoader
  },
  data () {
    return {
      clipped: false,
      drawer: true,
      fixed: false,
      items: [{
        icon: 'bubble_chart',
        title: 'Inspire'
      }],
      miniVariant: false,
      right: true,
      rightDrawer: false,
      title: 'Vuetify.js'
    }
  }
}
</script>
