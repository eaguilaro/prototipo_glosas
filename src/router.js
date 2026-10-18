import { createRouter, createWebHistory } from 'vue-router'
import FileLoadGlosaInicial from './views/FileLoadGlosaInicial.vue'
import FileLoadGlosaRespuesta from './views/FileLoadGlosaRespuesta.vue'
import FileLoadGlosaConciliacion from './views/FileLoadGlosaConciliacion.vue'
import WikiView from './views/WikiView.vue'
import GlosasComunicados from './views/GlosasComunicados.vue'
import ActasConciliacion from './views/ActasConciliacion.vue'
import MasivaConciliacion from './views/MasivaConciliacion.vue'
import DashboardGlosas from './views/DashboardGlosas.vue'
import TrazabilidadGlosas from './views/TrazabilidadGlosas.vue'
import GlosasSiifa from './views/GlosasSiifa.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div />' } },
    { path: '/carga-archivos', name: 'file-load', component: FileLoadGlosaInicial },
    { path: '/carga-respuesta', name: 'file-respuesta', component: FileLoadGlosaRespuesta },
    { path: '/carga-conciliacion', name: 'file-conciliacion', component: FileLoadGlosaConciliacion }, 
    { path: '/glosas-comunicados', name: 'glosas-comunicados', component: GlosasComunicados }, 
    { path: '/actas-glosas', name: 'actas-glosas', component: ActasConciliacion  },
    { path: '/conciliacion-administrativa', name: 'conciliacion-administrativa', component: MasivaConciliacion  }, 
    { path: '/trazabilidad-glosas', name: 'trazabilidad-glosas', component: TrazabilidadGlosas  }, 
     { path: '/siifa-glosas', name: 'integracion-siifa', component: GlosasSiifa  },   
    { path: '/dashboard-glosas', name: 'dashboard-glosas', component: DashboardGlosas  },         
    { path: '/wiki-validaciones', name: 'wiki', component: WikiView }
  ]
})

export default router
