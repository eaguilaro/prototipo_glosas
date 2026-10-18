<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  mode: { type: String, default: 'response' },
  invoice: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const decision = ref('')
const code = ref('901')
const responseDetail = ref('Respuesta a devolución y glosa extemporánea')
const observation = ref('')
const internalAuditor = ref('')
const externalAuditor = ref('')
const generateConciliation = ref(false)
const responsibleType = ref('internal')
const internalResponsible = ref('')
const externalResponsible = ref('')

const responseCatalog = [
  { code: '901', detail: 'Respuesta a devolución y glosa extemporánea' },
  { code: '902', detail: 'Aceptación total de la glosa' },
  { code: '903', detail: 'Aceptación parcial de la glosa' },
  { code: '904', detail: 'Rechazo de la glosa con soporte' },
  { code: '905', detail: 'Solicitud de revisión del concepto' },
  { code: '906', detail: 'Acuerdo de valores en conciliación' },
  { code: '907', detail: 'Sin respuesta del prestador' }
]

const responseCodes = computed(() => responseCatalog.map(item => item.code))
const responseDetails = computed(() => responseCatalog.map(item => item.detail))

watch(code, value => {
  const response = responseCatalog.find(item => item.code === value)
  if (response && response.detail !== responseDetail.value) responseDetail.value = response.detail
})

watch(responseDetail, value => {
  const response = responseCatalog.find(item => item.detail === value)
  if (response && response.code !== code.value) code.value = response.code
})

const title = props.mode === 'conciliation' ? 'Conciliación de glosa' : 'Respuesta de glosa'
const subtitle = props.mode === 'conciliation'
  ? 'Registro del resultado de conciliación y valores acordados'
  : 'Registro de respuesta a la glosa aplicada'

function save() {
  emit('saved', `${title} guardada como borrador`)
  emit('update:modelValue', false)
}
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    max-width="1500"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="dialog-card response-dialog">
      <v-card-title class="dialog-header text-white d-flex justify-space-between align-center">
        <div class="d-flex align-center ga-2">
          <v-avatar color="rgba(255,255,255,.14)" rounded="sm" size="30">
            <v-icon :icon="mode === 'conciliation' ? 'mdi-scale-balance' : 'mdi-reply-outline'" size="18" />
          </v-avatar>
          <div>
            <div class="dialog-title">{{ title }}</div>
            <div class="dialog-subtitle">{{ subtitle }}</div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" aria-label="Cerrar" @click="emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text class="dialog-body">
        <!-- Seccion 1: contexto de la factura y glosa seleccionada. -->
        <v-card class="dialog-section capture-section" rounded="lg">
          <div class="dialog-section-title"><span>1</span> Contexto de la glosa</div>
          <v-row class="form-grid" align="end">
            <v-col cols="12" md="3"><v-text-field label="Tipo de glosa" model-value="Glosas por Facturación" readonly /></v-col>
            <v-col cols="12" md="2"><v-text-field label="Valor de la glosa" model-value="$ 38.000" readonly /></v-col>
            <v-col cols="12" md="5"><v-text-field label="Concepto de glosa" model-value="Consultas, interconsultas y atenciones domiciliarias" readonly /></v-col>
            <v-col cols="12" md="2"><v-text-field label="Factura" :model-value="invoice" readonly /></v-col>
          </v-row>
        </v-card>

        <!-- Seccion 2: decision y observaciones de la respuesta. -->
        <v-card class="dialog-section capture-section" rounded="lg">
          <div class="dialog-section-title"><span>2</span> Datos de la respuesta</div>
          <v-row class="form-grid" align="end">
            <v-col cols="12" md="3"><v-select v-model="code" label="Código de la respuesta" :items="responseCodes" /></v-col>
            <v-col cols="12" md="9"><v-select v-model="responseDetail" label="Detalle de la respuesta" :items="responseDetails" /></v-col>
            <v-col v-if="mode === 'conciliation'" cols="12">
              <v-radio-group v-model="decision" inline label="Resultado de la conciliación" hide-details>
                <v-radio label="Acepta todo" value="accept-all" />
                <v-radio label="Rechaza todo" value="reject-all" />
              </v-radio-group>
            </v-col>
            <v-col cols="12"><v-textarea v-model="observation" label="Observaciones de la respuesta" placeholder="Describa la respuesta, soporte y fundamento..." rows="3" /></v-col>
          </v-row>
        </v-card>

        <!-- Seccion 3: detalle economico, conservado como tabla de consulta y respuesta. -->
        <v-card class="dialog-section capture-section" rounded="lg">
          <div class="dialog-section-heading d-flex justify-space-between align-center">
            <div class="dialog-section-title"><span>3</span> Detalle de conceptos</div>
            <span class="text-caption text-blue-grey-darken-2">1 registro</span>
          </div>
          <div class="capture-table-wrap">
            <v-table density="comfortable" class="compact-table capture-table">
              <thead>
                <tr><th>Código</th><th>Descripción</th><th>Vr. glosado</th><th>Vr. aceptado</th><th>Vr. rechazado</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td class="mono">902101</td>
                  <td>Consulta médica domiciliaria</td>
                  <td class="mono text-right">$ 20.000</td>
                  <td><v-text-field model-value="$ 20.000" hide-details density="compact" aria-label="Valor aceptado" /></td>
                  <td><v-text-field model-value="$ 0" hide-details density="compact" aria-label="Valor rechazado" /></td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card>

        <!-- Seccion 4: responsables del registro. -->
        <v-card class="dialog-section capture-section" rounded="lg">
          <div class="dialog-section-title"><span>4</span> Responsables</div>
          <v-row class="form-grid" align="end">
            <v-col cols="12" md="6"><v-select v-model="internalAuditor" label="Auditor interno" placeholder="Seleccione auditor interno..." :items="['Pedro Páramo · Laboratorio', 'María Rodríguez · Auditoría médica', 'Carlos Méndez · Cuentas médicas']" /></v-col>
            <v-col cols="12" md="6"><v-select v-model="externalAuditor" label="Auditor externo" placeholder="Seleccione auditor externo..." :items="['Clínica Vida Integral S.A.S.', 'Hospital Universitario San Gabriel']" /></v-col>
          </v-row>
        </v-card>

        <!-- La conciliacion solo aparece cuando el usuario la solicita. -->
        <v-card class="dialog-section capture-section reconciliation-section" rounded="lg">
          <v-checkbox v-model="generateConciliation" label="Genera conciliación" hide-details density="compact" />
          <div v-if="generateConciliation" class="reconciliation-panel">
            <div class="dialog-section-title"><span>5</span> Responsable de Glosa</div>
            <v-radio-group v-model="responsibleType" inline hide-details class="responsible-type">
              <v-radio label="Responsable interno" value="internal" />
              <v-radio label="Responsable externo" value="external" />
            </v-radio-group>
            <v-select
              v-if="responsibleType === 'internal'"
              v-model="internalResponsible"
              label="Responsable interno"
              placeholder="Seleccione un usuario o área interna..."
              :items="['Pedro Páramo · Laboratorio', 'Ana Torres · Auditoría', 'Área de cuentas médicas']"
            />
            <v-select
              v-else
              v-model="externalResponsible"
              label="Responsable externo"
              placeholder="Seleccione una empresa..."
              :items="['Clínica Vida Integral S.A.S.', 'Hospital Universitario San Gabriel', 'Laboratorio Central S.A.S.']"
            />
          </div>
        </v-card>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancelar</v-btn>
        <v-btn color="primary" @click="save">Guardar {{ mode === 'conciliation' ? 'conciliación' : 'respuesta' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.response-dialog {
  overflow: hidden;
  border: 1px solid #718b99;
}

.dialog-header {
  min-height: 60px;
  padding: 9px 16px;
  background: #284b63;
}

.dialog-title {
  font-size: 14px;
  font-weight: 700;
}

.dialog-subtitle {
  margin-top: 2px;
  color: #cbdbe4;
  font-size: 10px;
}

.dialog-body {
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  padding: 12px 16px;
  background: #f2f6f7;
}

.capture-section {
  padding: 10px 12px;
  margin-bottom: 10px;
  border: 1px solid #9bb0bb !important;
  background: #ffffff;
}

.capture-section:last-child {
  margin-bottom: 0;
}

.dialog-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  color: #284b63;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .25px;
  text-transform: uppercase;
}

.dialog-section-title span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: #fff;
  background: #284b63;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
}

.dialog-section-heading {
  min-height: 28px;
  margin-bottom: 4px;
}

.form-grid {
  margin: 0 -6px;
}

.form-grid > .v-col {
  padding: 4px;
}

.reconciliation-section {
  background: #f7fafb;
}

.reconciliation-panel {
  margin-top: 8px;
  padding: 12px;
  border: 1px solid #9bb0bb;
  background: #e8f0f3;
}

.reconciliation-panel .dialog-section-title {
  margin-bottom: 6px;
}

.responsible-type {
  margin: 0 0 8px;
}

.capture-table-wrap {
  overflow-x: auto;
  border: 1px solid #8da6b3;
  border-radius: 6px;
}

.capture-table {
  min-width: 850px;
  background: #fff;
}

.capture-table th {
  height: 32px !important;
  padding: 0 8px !important;
  border-bottom: 2px solid #7f9aa8 !important;
  background: #c9dbe4 !important;
  color: #173342 !important;
  font-size: 11px !important;
  white-space: nowrap;
}

.capture-table td {
  height: 40px;
  padding: 5px 8px !important;
  border-bottom: 1px solid #c1cfd5;
  white-space: nowrap;
}

.capture-table tbody tr:nth-child(even) {
  background: #f3f7f8;
}

.capture-table .v-field {
  min-width: 130px;
}

.text-right {
  text-align: right;
}

.dialog-actions {
  min-height: 52px;
  justify-content: flex-end;
  padding: 8px 16px;
  border-top: 1px solid #9bb0bb;
  background: #fff;
}

@media (max-width: 960px) {
  .dialog-body {
    padding: 10px 12px;
  }
}
</style>
