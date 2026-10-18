<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SidebarNav from './components/SidebarNav.vue'
import InvoiceContext from './components/InvoiceContext.vue'
import ProcessNav from './components/ProcessNav.vue'
import ConceptWorkspace from './components/ConceptWorkspace.vue'
import GlosaDialog from './components/GlosaDialog.vue'
import ResponseDialog from './components/ResponseDialog.vue'
import AIAssistantDialog from './components/AIAssistantDialog.vue'
import GlosasConciliacion from './components/Glosaconciliaciondialog.vue'

const drawer = ref(true)
const route = useRoute()
const router = useRouter()
const dialog = ref('')
const invoice = ref('FE-2026-004581')
const snackbar = ref(false)
const snackbarText = ref('')


const notes = ref([
  {
    code: '102',
    concept: 'Consultas, interconsultas y atenciones domiciliarias',
    fecha: '04/09/2026',
    accepted: '$ 38.000',
    rejected: '$ 0',
    notaAceptacion: 'NA-2026-0187',
    notaRechazo: null,
    registro: { nombre: 'Laura Gómez', rol: 'Auditoría de cuentas' },
    conciliacion: { nombre: 'María Rodríguez', rol: 'Auditor interno', pct: 100 },
    observacion: 'Concepto aceptado por el prestador. Se registra en el comunicado de respuesta inicial.',
    expanded: true
  },
  {
    code: '103',
    concept: 'Traslado asistencial no cubierto por el plan',
    fecha: '04/09/2026',
    accepted: '$ 0',
    rejected: '$ 30.000',
    notaAceptacion: null,
    notaRechazo: 'NR-2026-0098',
    registro: { nombre: 'Carlos Méndez', rol: 'Auditoría médica' },
    conciliacion: { nombre: 'Auditoría Externa S.A.S.', rol: '', pct: 0 },
    observacion: 'Rechazado: el servicio no se encuentra incluido en la cobertura contratada.',
    expanded: true
  },
  {
    code: '104',
    concept: 'Insumo no incluido en el paquete contratado',
    fecha: null,
    accepted: '$ 0',
    rejected: '$ 0',
    notaAceptacion: null,
    notaRechazo: null,
    registro: null,
    conciliacion: { pct: 0 },
    observacion: '',
    expanded: false
  },
  {
    code: '105',
    concept: 'Servicio no pertinente para la atención',
    fecha: '05/09/2026',
    accepted: '$ 10.000',
    rejected: '$ 12.000',
    notaAceptacion: 'NA-2026-0191',
    notaRechazo: 'NR-2026-0102',
    registro: { nombre: 'Laura Gómez', rol: 'Auditoría de cuentas' },
    conciliacion: { nombre: 'Carlos Méndez', rol: 'Auditor interno', pct: 45 },
    observacion: 'Conciliación parcial: se acepta el 45% del valor por soporte remitido de forma extemporánea.',
    expanded: false
  },
  {
    code: '106',
    concept: 'Soporte administrativo incompleto',
    fecha: null,
    accepted: '$ 0',
    rejected: '$ 0',
    notaAceptacion: null,
    notaRechazo: null,
    registro: null,
    conciliacion: { pct: 0 },
    observacion: '',
    expanded: false
  }
])

const observacionDialog = ref(false)
const observacionActiva = ref(null)

function abrirObservacion(note) {
  observacionActiva.value = note
  observacionDialog.value = true
}

function previewObservacion(texto) {
  if (!texto) return 'Sin observaciones registradas.'
  return texto.length > 90 ? `${texto.slice(0, 90).trim()}…` : texto
}

function toggleObservacion(note) {
  note.expanded = !note.expanded
}

function pctColor(pct) {
  const value = pct ?? 0
  if (value >= 70) return 'success'
  if (value >= 30) return 'warning'
  return 'error'
}

function open(action) {
  // Las acciones que abren modales deben coincidir con sus identificadores de estado.
  if (['initial', 'response', 'conciliation', 'glosa-conciliacion', 'ai'].includes(action)) dialog.value = action
  else if (action === 'home') router.push({ name: 'home' })
  else if (action === 'file-load') router.push({ name: 'file-load' })
  else if (action === 'file-respuesta') router.push({ name: 'file-respuesta' })
  else if (action === 'file-conciliacion') router.push({ name: 'file-conciliacion' })
  else if (action === 'glosas-comunicados') router.push({ name: 'glosas-comunicados' })
  else if (action === 'actas-glosas') router.push({ name: 'actas-glosas' })
  else if (action === 'conciliacion-administrativa') router.push({ name: 'conciliacion-administrativa' })
  else if (action === 'trazabilidad-glosas') router.push({ name: 'trazabilidad-glosas' })
  else if (action === 'integracion-siifa') router.push({ name: 'integracion-siifa' })
  else if (action === 'dashboard-glosas') router.push({ name: 'dashboard-glosas' })
  else if (action === 'wiki') router.push({ name: 'wiki' })
  else show('Función disponible para conectar con el backend')
}
function show(message) {
  snackbarText.value = message
  snackbar.value = true
}
function closeDialog() { dialog.value = '' }
</script>

<template>
  <v-app>
    <!-- Navegacion lateral: acciones globales de la cuenta. -->
    <SidebarNav v-model="drawer" @navigate="item => open(item.action || 'notice')" />
    <v-main class="app-main">
      <!-- Encabezado institucional y selector de resolucion normativa. -->
      <v-app-bar color="#1b3446" flat height="78" class="px-2 px-md-4">
        <v-avatar color="rgba(255,255,255,.14)" rounded="sm" class="mr-3" size="42"><span
            class="mono text-body-2 text-white">GI</span></v-avatar>
        <div class="text-white">
          <div class="app-toolbar-title font-weight-bold">GESTIÓN DE CUENTAS MÉDICAS, GLOSAS Y DEVOLUCIONES</div>
          <div class="app-toolbar-subtitle text-blue-grey-lighten-3 mt-1">Registro y consulta · Auditoría de cuentas
            médicas</div>
        </div>
        <v-spacer />
        <span class="text-body-2 text-blue-grey-lighten-3 mr-3 d-none d-lg-block">Codificación normativa</span>
        <v-btn-toggle divided mandatory selected-class="bg-white text-primary" class="mr-1" model-value="0"><v-btn
            size="default">Res. 2284</v-btn><v-btn size="default" disabled>Res. 3374</v-btn></v-btn-toggle>
      </v-app-bar>

      <v-container v-if="route.name === 'home'" fluid class="pa-4 pa-md-6">
        <div class="page-grid">
          <!-- Contexto de factura: busqueda, datos generales y metricas. -->
          <InvoiceContext @loaded="invoice = $event" />
          <!-- Procesos disponibles para abrir los dialogos de gestion. -->
          <ProcessNav class="mt-5" @open="open" />
          <!-- Detalle navegable de conceptos, valores e items. -->
          <ConceptWorkspace class="mt-5" />
          <!-- Historico detallado de notas y conciliacion por concepto. -->

          <v-card class="surface-border mt-5" rounded="lg">
            <v-card-title class="text-body-1 section-title d-flex align-center px-5 py-4">
              <v-avatar color="#1b3446" size="26" class="mr-2">
                <span class="text-white text-caption font-weight-bold">4</span>
              </v-avatar>
              Notas y conciliación por concepto
              <v-spacer />
              <v-chip size="small" color="success" variant="tonal">
                <v-icon icon="mdi-circle" size="8" class="mr-1" />
                Histórico de Notas Conciliacion
              </v-chip>
            </v-card-title>

            <div class="px-5 pb-2 text-caption text-medium-emphasis">
              Consulta informativa de valores, notas, observaciones y responsables del registro.
            </div>

            <v-divider />

            <v-table density="comfortable" class="compact-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Fecha de la nota</th>
                  <th>Vr. aceptado</th>
                  <th>Vr. rechazado</th>
                  <th>Nota aceptación</th>
                  <th>Nota rechazo</th>
                  <th>Registro de la nota</th>
                  <th>Conciliación y aceptación</th>
                  <th>Observación del auditor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="note in notes" :key="note.code">
                  <td>
                    <span class="mono text-primary">{{ note.code }}</span><br>{{ note.concept }}
                  </td>

                  <td>
                    <span v-if="note.fecha">{{ note.fecha }}</span>
                    <span v-else class="text-medium-emphasis">Pendiente</span>
                  </td>

                  <td class="mono text-success">{{ note.accepted }}</td>
                  <td class="mono text-error">{{ note.rejected }}</td>

                  <td>
                    <v-chip v-if="note.notaAceptacion" size="small" variant="outlined" color="success">
                      <span class="mono">{{ note.notaAceptacion }}</span>
                    </v-chip>
                    <v-chip v-else-if="note.notaRechazo" size="small" variant="outlined">No aplica</v-chip>
                    <v-chip v-else size="small" variant="outlined">Pendiente</v-chip>
                  </td>

                  <td>
                    <v-chip v-if="note.notaRechazo" size="small" variant="outlined" color="error">
                      <span class="mono">{{ note.notaRechazo }}</span>
                    </v-chip>
                    <v-chip v-else-if="note.notaAceptacion" size="small" variant="outlined">No aplica</v-chip>
                    <v-chip v-else size="small" variant="outlined">Pendiente</v-chip>
                  </td>

                  <td>
                    <template v-if="note.registro">
                      <div class="font-weight-medium">{{ note.registro.nombre }}</div>
                      <div class="text-caption text-medium-emphasis">{{ note.registro.rol }}</div>
                    </template>
                    <span v-else class="text-primary font-weight-medium">Pendiente de registro</span>
                  </td>

                  <td>
                    <template v-if="note.conciliacion?.nombre">
                      <div class="font-weight-medium">{{ note.conciliacion.nombre }}</div>
                      <div v-if="note.conciliacion.rol" class="text-caption text-medium-emphasis">{{
                        note.conciliacion.rol }}</div>
                    </template>
                    <div v-else class="text-primary font-weight-medium">Pendiente de conciliación</div>
                    <v-chip size="small" variant="tonal" :color="pctColor(note.conciliacion?.pct)" class="mt-1">
                      {{ note.conciliacion?.pct ?? 0 }}% aceptación
                    </v-chip>
                  </td>

                  <td>
                    <div class="text-caption text-medium-emphasis observacion-preview">{{
                      previewObservacion(note.observacion) }}</div>
                    <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-text-box-search-outline"
                      @click="abrirObservacion(note)">
                      Ver completa
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>

          <v-dialog v-model="observacionDialog" max-width="640">
            <v-card v-if="observacionActiva">
              <v-card-title class="dialog-title d-flex align-center">
                <span class="mono text-primary mr-2">{{ observacionActiva.code }}</span>
                {{ observacionActiva.concept }}
              </v-card-title>

              <v-card-text>
                <div class="observacion-meta">
                  <div class="observacion-meta-item">
                    <span class="observacion-meta-label">Fecha de la nota</span>
                    <span class="observacion-meta-value">{{ observacionActiva.fecha || 'Pendiente' }}</span>
                  </div>

                  <div class="observacion-meta-item">
                    <span class="observacion-meta-label">Registro de la nota</span>
                    <span class="observacion-meta-value">
                      <template v-if="observacionActiva.registro">
                        {{ observacionActiva.registro.nombre }} · {{ observacionActiva.registro.rol }}
                      </template>
                      <span v-else class="text-primary font-weight-medium">Pendiente de registro</span>
                    </span>
                  </div>

                  <div class="observacion-meta-item">
                    <span class="observacion-meta-label">Conciliación y aceptación</span>
                    <span class="observacion-meta-value">
                      <template v-if="observacionActiva.conciliacion?.nombre">
                        {{ observacionActiva.conciliacion.nombre }}<span v-if="observacionActiva.conciliacion.rol"> · {{
                          observacionActiva.conciliacion.rol }}</span>
                      </template>
                      <span v-else class="text-primary font-weight-medium">Pendiente de conciliación</span>
                    </span>
                    <v-chip size="small" variant="tonal" :color="pctColor(observacionActiva.conciliacion?.pct)"
                      class="mt-1">
                      {{ observacionActiva.conciliacion?.pct ?? 0 }}% aceptación
                    </v-chip>
                  </div>
                </div>

                <v-divider class="my-3" />

                <div class="observacion-body">{{ observacionActiva.observacion || 'Sin observaciones registradas.' }}
                </div>
              </v-card-text>

              <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="observacionDialog = false">Cerrar</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>
      </v-container>

      <router-view v-else />

      <!-- Acceso flotante al asistente contextual. -->
      <v-btn class="ai-button" size="large" color="primary"  @click="open('ai')"><v-icon icon="mdi-creation mr-3" size="18" />Agente
        IA</v-btn>
     </v-main>


    <!-- Registro y respuesta tienen estado propio; glosa-conciliacion abre el flujo integral. -->
    <GlosaDialog :model-value="dialog === 'initial'" :invoice="invoice"
      @update:model-value="value => !value && closeDialog()" @saved="show" />
    <ResponseDialog :model-value="dialog === 'response'" :invoice="invoice"
      @update:model-value="value => !value && closeDialog()" @saved="show" />
    <ResponseDialog :model-value="dialog === 'conciliation'" mode="conciliation" :invoice="invoice"
      @update:model-value="value => !value && closeDialog()" @saved="show" />
    <GlosasConciliacion :model-value="dialog === 'glosa-conciliacion'" :invoice="invoice"
      @update:model-value="value => !value && closeDialog()" @saved="show" />
    <AIAssistantDialog :model-value="dialog === 'ai'" :invoice="invoice"
      @update:model-value="value => !value && closeDialog()" @saved="show" />
    <v-snackbar v-model="snackbar" color="success" location="bottom" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-app>
</template>

<style scoped>
.ai-button {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 4;    
  border-radius: 22px !important;  
}

.ai-button :deep(.v-btn__content) {
  justify-content: center;  /* centra ícono + texto dentro del botón */
  gap: 8px;
}

.observacion-preview {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dialog-title {
  color: #1b3446;
  font-weight: 600;
  border-bottom: 1px solid #d3dde1;
}

.observacion-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

.observacion-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.observacion-meta-label {
  font-size: 11px;
  color: #7f939c;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.observacion-meta-value {
  font-size: 13px;
  color: #1b3446;
  font-weight: 500;
}

.observacion-body {
  max-height: 55vh;
  overflow-y: auto;
  padding-right: 6px;
  color: #33454f;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
