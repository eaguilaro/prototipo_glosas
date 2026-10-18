<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  invoice: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const type = ref('')
const additionalType = ref('')
const additionalConcept = ref('')
const additionalSearch = ref('')
const otherConcepts = ref([])
const showOtherConcepts = ref(false)
const service = ref('')
const code = ref('')
const concept = ref('')
const quantity = ref(1)
const glosaQuantity = ref(1)
const observation = ref('')
const auditor = ref('')
const detail = ref('')
const allItems = ref(false)

const conceptsByType = {
  Facturación: ['Diferencia en cantidad facturada', 'Servicio cobrado no prestado', 'Factura sin soporte de cobro'],
  Soportes: ['Soporte incompleto', 'Documento no legible', 'Falta orden o autorización'],
  'Pertinencia médica': ['Servicio no pertinente', 'Servicio no relacionado con diagnóstico'],
  Autorización: ['Servicio sin autorización', 'Autorización vencida'],
  Afiliación: ['Usuario no afiliado', 'Afiliación no vigente'],
  Devolución: ['Devolución por inconsistencia', 'Factura para devolución']
}

const additionalConceptsByType = {
  Facturación: ['F001 · Diferencia en cantidad facturada', 'F002 · Servicio cobrado no prestado', 'F003 · Factura sin soporte de cobro'],
  Soportes: ['S001 · Soporte incompleto', 'S002 · Documento no legible'],
  'Pertinencia médica': ['P001 · Servicio no pertinente', 'P002 · Servicio no relacionado con diagnóstico'],
  Autorización: ['A001 · Servicio sin autorización', 'A002 · Autorización vencida'],
  Afiliación: ['AF001 · Usuario no afiliado', 'AF002 · Afiliación no vigente'],
  Devolución: ['D001 · Devolución por inconsistencia', 'D002 · Factura para devolución']
}

const items = ref([
  { service: 'Medicamentos', code: '20B02', name: 'JERINGA 3P X 5ML C/A 21G X 1 1/2 (LUER LOCK) UNI', quantity: 1, unitValue: 985, center: '28011', centerName: 'MEDICAMENTOS', glosaQuantity: 0, glosaAmount: 0, marked: '' },
  { service: 'Medicamentos', code: '20C00', name: 'CATETER PERIFERICO VIALON DE SEGURIDAD 18G X 1 1/4 (1.16) UNI', quantity: 1, unitValue: 7039, center: '28011', centerName: 'MEDICAMENTOS', glosaQuantity: 0, glosaAmount: 0, marked: '' },
  { service: 'Medicamentos', code: '20E02', name: 'EXTENSION ANESTESIA ADULTO UND', quantity: 1, unitValue: 6757, center: '28011', centerName: 'MEDICAMENTOS', glosaQuantity: 0, glosaAmount: 0, marked: '' },
  { service: 'Medicamentos', code: '20E03', name: 'EQUIPO MACROGOTEO 10GOT/CC CON AGUJA 21G 1 1/2 UNI', quantity: 2, unitValue: 3643, center: '28011', centerName: 'MEDICAMENTOS', glosaQuantity: 0, glosaAmount: 0, marked: '' },
  { service: 'Medicamentos', code: '20E18', name: 'JERINGAS PRELLENADAS CON SOLUCION SALINA POSIFLUSH', quantity: 1, unitValue: 1813, center: '28011', centerName: 'MEDICAMENTOS', glosaQuantity: 0, glosaAmount: 0, marked: '' },
  { service: 'Medicamentos', code: '20G10', name: 'ADAPTADOR DE SEGURIDAD LIBRE DE AGUJA Q-SYTE REF 385100', quantity: 2, unitValue: 6155, center: '28011', centerName: 'MEDICAMENTOS', glosaQuantity: 0, glosaAmount: 0, marked: '' },
  { service: 'Medicamentos', code: '20Y05', name: 'LLAVE 3 VIAS DE 1 RAMPA 2LL-1LS UND', quantity: 1, unitValue: 6053, center: '28011', centerName: 'MEDICAMENTOS', glosaQuantity: 0, glosaAmount: 0, marked: '' },
  { service: 'Urgencias', code: '865101', name: 'SUTURA DE HERIDA UNICA, EN AREA GENERAL - POR MEDICO GENERAL', quantity: 1, unitValue: 17990, center: '21043', centerName: 'URGENCIAS CRITICOS - PROCEDIMIENTOS', glosaQuantity: 0, glosaAmount: 0, marked: '' },
  { service: 'Radiologia', code: '879420', name: 'TOMOGRAFIA COMPUTADA DE ABDOMEN Y PELVIS', quantity: 1, unitValue: 584580, center: '25011', centerName: 'IMAGENOLOGIA', glosaQuantity: 0, glosaAmount: 0, marked: '' }
])

const services = computed(() => [...new Set(items.value.map(item => item.service))])
const concepts = computed(() => conceptsByType[type.value] || [])
const additionalTypes = computed(() => Object.keys(additionalConceptsByType))
const availableAdditionalConcepts = computed(() => (additionalConceptsByType[additionalType.value] || []).filter(item => item.toLowerCase().includes(additionalSearch.value.toLowerCase())))
const codes = computed(() => items.value.filter(item => !service.value || item.service === service.value).map(item => item.code))
const details = computed(() => items.value.filter(item => (!service.value || item.service === service.value) && (!code.value || item.code === code.value)).map(item => item.name))
const filteredItem = computed(() => items.value.find(item => item.service === service.value && item.code === code.value && item.name === detail.value))
const filteredAmount = computed(() => filteredItem.value ? `$ ${(filteredItem.value.unitValue * Math.min(Math.max(Number(glosaQuantity.value) || 1, 1), filteredItem.value.quantity)).toLocaleString('es-CO')}` : '$ 0')
const total = computed(() => items.value.reduce((sum, item) => sum + item.glosaAmount, 0))

watch(type, value => {
  concept.value = ''
  if (!additionalType.value) additionalType.value = value
})

watch([service, code], () => {
  const match = items.value.find(item => item.service === service.value && item.code === code.value)
  if (!match) {
    detail.value = ''
    quantity.value = 1
    return
  }
  detail.value = match.name
  quantity.value = match.quantity
})

watch(additionalType, () => {
  additionalConcept.value = ''
  additionalSearch.value = ''
})

function addItem() {
  if (!filteredItem.value) return
  const item = filteredItem.value
  item.glosaQuantity = Math.min(Math.max(Number(glosaQuantity.value) || 1, 1), item.quantity)
  item.glosaAmount = item.unitValue * item.glosaQuantity
  item.marked = 'manual'
}

function toggleAll(value) {
  items.value.forEach(item => {
    item.glosaQuantity = value ? item.quantity : 0
    item.glosaAmount = value ? item.unitValue * item.quantity : 0
    item.marked = value ? 'all' : ''
  })
}

function selectRow(item) {
  service.value = item.service
  code.value = item.code
  detail.value = item.name
  quantity.value = item.quantity
  glosaQuantity.value = item.glosaQuantity || 1
}

function addAdditionalConcept() {
  if (!additionalConcept.value || otherConcepts.value.includes(additionalConcept.value)) return
  otherConcepts.value.push(additionalConcept.value)
  additionalConcept.value = ''
}

function removeAdditionalConcept(conceptName) {
  otherConcepts.value = otherConcepts.value.filter(item => item !== conceptName)
}

function save() {
  emit('saved', 'Glosa inicial guardada como borrador')
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
    <v-card class="dialog-card initial-glosa-dialog">
      <v-card-title class="dialog-header text-white d-flex justify-space-between align-center">
        <div class="d-flex align-center ga-2">
          <v-avatar color="rgba(255,255,255,.14)" rounded="sm" size="30"><span class="mono text-caption">GI</span></v-avatar>
          <div>
            <div class="dialog-title">Registro de glosa inicial</div>
            <div class="dialog-subtitle">Captura del hallazgo y valor a glosar</div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" aria-label="Cerrar" @click="emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text class="dialog-body">
        <!-- Seccion 1: identificacion, fechas y concepto de la glosa. -->
        <v-card class="dialog-section capture-section" rounded="lg">
          <div class="dialog-section-title"><span>1</span> Seleccione el tipo de glosa <b>*</b></div>
          <v-row class="form-grid" align="end">
            <v-col cols="12" md="3"><v-select v-model="type" label="Tipo de glosa *" placeholder="Seleccione el tipo de glosa..." :items="Object.keys(conceptsByType)" /></v-col>
            <v-col cols="12" md="3"><v-text-field label="N.º de comunicado de glosa" placeholder="COM-2026-0345" /></v-col>
            <v-col cols="12" sm="6" md="2"><v-text-field label="Fecha de glosa *" type="date" model-value="2026-09-08" /></v-col>
            <v-col cols="12" sm="6" md="2"><v-text-field label="Fecha de digitación *" type="date" model-value="2026-09-08" /></v-col>
            <v-col cols="12" md="2"><v-text-field label="Hora de digitación *" type="time" model-value="10:27" /></v-col>
            <v-col cols="12"><v-select v-model="concept" label="Concepto de glosa *" placeholder="Seleccione primero el tipo de glosa..." :items="concepts" :disabled="!type" /></v-col>
          </v-row>
          <v-checkbox v-model="showOtherConcepts" label="Otros conceptos de glosas" hide-details density="compact" class="mt-1" />

          <div v-if="showOtherConcepts" class="additional-concepts-panel">
            <div class="additional-panel-title">Agregar otros conceptos de glosa</div>
            <v-row class="form-grid" align="end">
              <v-col cols="12" md="6"><v-select v-model="additionalType" label="Tipo de glosa adicional" :items="additionalTypes" /></v-col>
              <v-col cols="12" md="6"><v-select v-model="additionalConcept" label="Concepto adicional" placeholder="Seleccione un concepto..." :items="availableAdditionalConcepts" /></v-col>
              <v-col cols="12"><v-text-field v-model="additionalSearch" label="Buscar concepto" placeholder="Código o descripción del concepto" clearable /></v-col>
              <v-col cols="12"><div class="additional-options"><v-btn v-for="item in availableAdditionalConcepts" :key="item" size="small" variant="outlined" @click="additionalConcept = item; addAdditionalConcept()">{{ item }}</v-btn></div></v-col>
            </v-row>
            <div class="selected-additional-concepts">
              <v-chip v-for="item in otherConcepts" :key="item" closable color="primary" variant="tonal" @click:close="removeAdditionalConcept(item)">{{ item }}</v-chip>
            </div>
          </div>
        </v-card>

        <!-- Seccion 2: filtros de servicio y tabla completa de items. -->
        <v-card class="dialog-section capture-section" rounded="lg">
          <div class="dialog-section-heading d-flex justify-space-between align-center">
            <div class="dialog-section-title"><span>2</span> Filtrar y agregar ítems</div>
            <v-checkbox v-model="allItems" label="Glosar todos los ítems de la cuenta" hide-details density="compact" @update:model-value="toggleAll" />
          </div>
          <v-row class="form-grid" align="end">
            <v-col cols="12" sm="6" md="2"><v-select v-model="service" label="Tipo de servicio *" placeholder="Seleccione..." :items="services" /></v-col>
            <v-col cols="12" sm="6" md="2"><v-select v-model="code" label="Código *" placeholder="Digite o seleccione un código" :items="codes" clearable /></v-col>
            <v-col cols="12" md="6"><v-select v-model="detail" label="Detalle *" placeholder="Seleccione primero el tipo y código..." :items="details" /></v-col>
            <v-col cols="6" sm="3" md="2"><v-text-field v-model.number="quantity" label="Cantidad" type="number" min="1" /></v-col>
            <v-col cols="6" sm="3" md="2"><v-text-field v-model.number="glosaQuantity" label="Cantidad glosada *" type="number" min="1" /></v-col>
            <v-col cols="6" sm="3" md="2"><v-text-field label="Valor a glosar" :model-value="filteredAmount" readonly /></v-col>
            <v-col cols="12" md="6"><v-select v-model="auditor" label="Auditor interno" placeholder="Seleccione auditor interno..." :items="['Auditor interno 1', 'Auditor interno 2']" /></v-col>
            <v-col cols="6" sm="3" md="2"><v-btn block color="primary" class="add-button" @click="addItem">+ Agregar</v-btn></v-col>
          </v-row>

          <div class="capture-table-wrap">
            <v-table density="comfortable" class="compact-table capture-table">
              <thead><tr><th>Código</th><th>Cantidad</th><th>Cantidad glosada</th><th>Vr. unitario</th><th>Saldo</th><th>Descripción</th><th>Vr. glosado</th><th>CentroCost</th><th>Nombre CCos</th></tr></thead>
              <tbody>
                <tr v-if="!items.length"><td colspan="9" class="text-center text-caption empty-row">No hay registros asociados a la factura.</td></tr>
                <tr v-for="item in items" :key="item.code" :class="{ 'manual-row': item.marked === 'manual' }" tabindex="0" @click="selectRow(item)">
                  <td class="mono">{{ item.code }}</td><td class="mono text-right">{{ item.quantity }}</td><td class="mono text-right">{{ item.glosaQuantity }}</td><td class="mono text-right">$ {{ item.unitValue.toLocaleString('es-CO') }}</td><td class="mono text-right">$ {{ (item.quantity * item.unitValue).toLocaleString('es-CO') }}</td><td>{{ item.name }}</td><td class="mono text-right">$ {{ item.glosaAmount.toLocaleString('es-CO') }}</td><td>{{ item.center }}</td><td>{{ item.centerName }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>
          <div class="table-total">Total glosado: <strong class="mono">$ {{ total.toLocaleString('es-CO') }}</strong></div>
        </v-card>

        <!-- Seccion 3: observacion, factura y responsables de auditoria. -->
        <v-card class="dialog-section capture-section" rounded="lg">
          <div class="dialog-section-heading d-flex justify-space-between align-center">
            <div class="dialog-section-title"><span>3</span> Datos de la glosa</div>
            <strong class="mono invoice-label">{{ invoice }}</strong>
          </div>
          <v-textarea v-model="observation" label="Observaciones" placeholder="Describa el hallazgo, soporte y fundamento de la glosa..." rows="3" class="observation-field" />
        
        </v-card>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancelar</v-btn>
        <v-btn color="primary" @click="save">Guardar glosa inicial</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.initial-glosa-dialog {
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
  color: #cbdbe4;
  font-size: 10px;
  margin-top: 2px;
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
  color: white;
  background: #284b63;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
}

.dialog-section-title b {
  color: #a34943;
}

.dialog-section-heading {
  min-height: 28px;
  margin-bottom: 4px;
}

.additional-concepts-panel {
  margin-top: 8px;
  padding: 10px 0 0;
  border-top: 1px solid #9bb0bb;
}

.additional-panel-title {
  margin-bottom: 4px;
  color: #284b63;
  font-size: 12px;
  font-weight: 700;
}

.additional-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-additional-concepts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 28px;
  margin-top: 4px;
}

.form-grid {
  margin: 0 -6px;
}

.form-grid > .v-col {
  padding: 4px;
}

.observation-field {
  margin-bottom: 4px;
}

.invoice-label {
  color: #355363;
  font-size: 12px;
}

.add-button {
  height: 40px !important;
  white-space: nowrap;
}

.capture-table-wrap {
  overflow-x: auto;
  border: 1px solid #8da6b3;
  border-radius: 6px;
}

.capture-table {
  min-width: 1050px;
  background: #fff;
}

.capture-table th {
  height: 32px !important;
  padding: 0 8px !important;
  background: #c9dbe4 !important;
  border-bottom: 2px solid #7f9aa8 !important;
  color: #173342 !important;
  font-size: 11px !important;
  white-space: nowrap;
}

.capture-table td {
  height: 36px;
  padding: 5px 8px !important;
  border-bottom: 1px solid #c1cfd5;
  white-space: nowrap;
}

.capture-table tbody tr:nth-child(even) {
  background: #f3f7f8;
}

.capture-table tbody tr.manual-row {
  background: #d9eaf4;
  box-shadow: inset 4px 0 #284b63;
}

.capture-table tbody tr {
  cursor: pointer;
}

.capture-table tbody tr:hover {
  background: #e4f0f6;
}

.empty-row {
  height: 48px;
  color: #647983;
}

.table-total {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  color: #355363;
  font-size: 12px;
}

.dialog-actions {
  min-height: 52px;
  justify-content: flex-end;
  padding: 8px 16px;
  border-top: 1px solid #9bb0bb;
  background: #ffffff;
}

@media (max-width: 960px) {
  .dialog-body {
    padding: 10px 12px;
  }
}
</style>
