import { createApp } from 'vue'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import App from './App.vue'
import router from './router'
import './styles.css'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi }
  },
  theme: {
    defaultTheme: 'glosasTheme',
    themes: {
      glosasTheme: {
        dark: false,
        colors: {
          primary: '#284b63',
          secondary: '#8fa7b5',
          surface: '#ffffff',
          background: '#d4e0e6',
          error: '#a34943',
          success: '#287052'
        }
      }
    }
  },
  defaults: {
    VBtn: { variant: 'flat', rounded: 'sm' },
    VCard: { rounded: 'lg', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
    VSelect: { variant: 'outlined', density: 'compact', hideDetails: 'auto' }
  }
})

createApp(App).use(vuetify).use(router).mount('#app')
