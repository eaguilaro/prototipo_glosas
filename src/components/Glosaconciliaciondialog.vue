<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  invoice: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'saved'])

/* ───── Glosa (misma captura de GlosaDialog) ───── */
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

/* ───── Conciliación (misma captura de ResponseDialog, modo conciliación) ───── */
const decision = ref('') // accept-all | reject-all | partial
const conciliationObservation = ref('')
const internalAuditor = ref('')
const externalAuditor = ref('')
const responsibleType = ref('internal')
const internalResponsible = ref('')
const externalResponsible = ref('')

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

const base = (service, code, name, quantity, unitValue, center, centerName) =>
  ({ service, code, name, quantity, unitValue, center, centerName, glosaQuantity: 0, glosaAmount: 0, accepted: 0, marked: '' })

const items = ref([
  base('Medicamentos', '20B02', 'JERINGA 3P X 5ML C/A 21G X 1 1/2 (LUER LOCK) UNI', 1, 985, '28011', 'MEDICAMENTOS'),
  base('Medicamentos', '20C00', 'CATETER PERIFERICO VIALON DE SEGURIDAD 18G X 1 1/4 (1.16) UNI', 1, 7039, '28011', 'MEDICAMENTOS'),
  base('Medicamentos', '20E02', 'EXTENSION ANESTESIA ADULTO UND', 1, 6757, '28011', 'MEDICAMENTOS'),
  base('Medicamentos', '20E03', 'EQUIPO MACROGOTEO 10GOT/CC CON AGUJA 21G 1 1/2 UNI', 2, 3643, '28011', 'MEDICAMENTOS'),
  base('Medicamentos', '20E18', 'JERINGAS PRELLENADAS CON SOLUCION SALINA POSIFLUSH', 1, 1813, '28011', 'MEDICAMENTOS'),
  base('Medicamentos', '20G10', 'ADAPTADOR DE SEGURIDAD LIBRE DE AGUJA Q-SYTE REF 385100', 2, 6155, '28011', 'MEDICAMENTOS'),
  base('Medicamentos', '20Y05', 'LLAVE 3 VIAS DE 1 RAMPA 2LL-1LS UND', 1, 6053, '28011', 'MEDICAMENTOS'),
  base('Urgencias', '865101', 'SUTURA DE HERIDA UNICA, EN AREA GENERAL - POR MEDICO GENERAL', 1, 17990, '21043', 'URGENCIAS CRITICOS - PROCEDIMIENTOS'),
  base('Radiologia', '879420', 'TOMOGRAFIA COMPUTADA DE ABDOMEN Y PELVIS', 1, 584580, '25011', 'IMAGENOLOGIA')
])

const money = value => `$ ${Number(value || 0).toLocaleString('es-CO')}`

const services = computed(() => [...new Set(items.value.map(item => item.service))])
const concepts = computed(() => conceptsByType[type.value] || [])
const additionalTypes = computed(() => Object.keys(additionalConceptsByType))
const availableAdditionalConcepts = computed(() => (additionalConceptsByType[additionalType.value] || []).filter(item => item.toLowerCase().includes(additionalSearch.value.toLowerCase())))
const codes = computed(() => items.value.filter(item => !service.value || item.service === service.value).map(item => item.code))
const details = computed(() => items.value.filter(item => (!service.value || item.service === service.value) && (!code.value || item.code === code.value)).map(item => item.name))
const filteredItem = computed(() => items.value.find(item => item.service === service.value && item.code === code.value && item.name === detail.value))
const filteredAmount = computed(() => filteredItem.value ? money(filteredItem.value.unitValue * Math.min(Math.max(Number(glosaQuantity.value) || 1, 1), filteredItem.value.quantity)) : '$ 0')

// Solo los ítems glosados pasan a la conciliación.
const glosedItems = computed(() => items.value.filter(item => item.glosaAmount > 0))
const totalGlosado = computed(() => glosedItems.value.reduce((sum, item) => sum + item.glosaAmount, 0))
const totalAceptado = computed(() => glosedItems.value.reduce((sum, item) => sum + item.accepted, 0))
const totalRechazado = computed(() => totalGlosado.value - totalAceptado.value)

const missing = computed(() => {
  const list = []
  if (!type.value) list.push('tipo de glosa')
  if (!concept.value) list.push('concepto de glosa')
  if (!glosedItems.value.length) list.push('al menos un ítem glosado')
  if (glosedItems.value.length && !decision.value) list.push('resultado de la conciliación')
  return list
})

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

/* Mantiene la conciliación coherente cuando cambian los ítems glosados. */
function syncConciliation() {
  glosedItems.value.forEach(item => {
    if (decision.value === 'accept-all') item.accepted = item.glosaAmount
    else if (decision.value === 'reject-all') item.accepted = 0
    else item.accepted = Math.min(item.accepted, item.glosaAmount)
  })
  items.value.filter(item => item.glosaAmount === 0).forEach(item => { item.accepted = 0 })
  if (decision.value === 'partial') refreshDecision()
  if (!glosedItems.value.length) decision.value = ''
}

function refreshDecision() {
  const list = glosedItems.value
  if (!list.length) { decision.value = ''; return }
  if (list.every(item => item.accepted === item.glosaAmount)) decision.value = 'accept-all'
  else if (list.every(item => item.accepted === 0)) decision.value = 'reject-all'
  else decision.value = 'partial'
}

function applyDecision(value) {
  if (value === 'partial') return
  decision.value = value
  syncConciliation()
}

function onAcceptedInput(item, value) {
  item.accepted = Math.min(Math.max(Number(value) || 0, 0), item.glosaAmount)
  refreshDecision()
}

function onRejectedInput(item, value) {
  const rejected = Math.min(Math.max(Number(value) || 0, 0), item.glosaAmount)
  item.accepted = item.glosaAmount - rejected
  refreshDecision()
}

function addItem() {
  if (!filteredItem.value) return
  const item = filteredItem.value
  item.glosaQuantity = Math.min(Math.max(Number(glosaQuantity.value) || 1, 1), item.quantity)
  item.glosaAmount = item.unitValue * item.glosaQuantity
  item.marked = 'manual'
  syncConciliation()
}

function removeItem(item) {
  item.glosaQuantity = 0
  item.glosaAmount = 0
  item.marked = ''
  allItems.value = false
  syncConciliation()
}

function toggleAll(value) {
  items.value.forEach(item => {
    item.glosaQuantity = value ? item.quantity : 0
    item.glosaAmount = value ? item.unitValue * item.quantity : 0
    item.marked = value ? 'all' : ''
  })
  syncConciliation()
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
  if (missing.value.length) return
  emit('saved', 'Glosa y conciliación guardadas como borrador')
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
    <v-card class="dialog-card glosa-conciliation-dialog">
      <v-card-title class="dialog-header text-white d-flex justify-space-between align-center">
        <div class="d-flex align-center ga-2">
          <v-avatar color="rgba(255,255,255,.14)" rounded="sm" size="30">
            <v-icon icon="mdi-scale-balance" size="18" />
          </v-avatar>
          <div>
            <div class="dialog-title">Registro de glosa con conciliación</div>
            <div class="dialog-subtitle">Captura del hallazgo y resultado de la conciliación en un solo paso</div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" aria-label="Cerrar" @click="emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text class="dialog-body">
        <!-- Seccion 1: tipo, fechas y concepto de la glosa. -->
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

        <!-- Una sola tabla concentra el detalle de la glosa y los valores conciliados. -->
        <v-card class="dialog-section capture-section" rounded="lg">
          <div class="dialog-section-heading d-flex justify-space-between align-center">
            <div class="dialog-section-title"><span>2</span> Filtrar y agregar ítems</div>
            <div class="table-actions">
              <v-checkbox v-model="allItems" label="Glosar todos los ítems" hide-details density="compact" @update:model-value="toggleAll" />
              <v-btn size="small" variant="tonal" color="success" :disabled="!glosedItems.length" @click="applyDecision('accept-all')">Aceptar todo</v-btn>
              <v-btn size="small" variant="tonal" color="error" :disabled="!glosedItems.length" @click="applyDecision('reject-all')">Rechazar todo</v-btn>
            </div>
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
              <thead><tr><th>Código</th><th>Cantidad</th><th>Cantidad glosada</th><th>Vr. unitario</th><th>Saldo</th><th>Descripción</th><th>Vr. glosado</th><th class="amount-column">Vr. aceptado</th><th class="amount-column">Vr. rechazado</th><th>CentroCost</th><th>Nombre CCos</th><th></th></tr></thead>
              <tbody>
                <tr v-if="!items.length"><td colspan="12" class="text-center text-caption empty-row">No hay registros asociados a la factura.</td></tr>
                <tr v-for="item in items" :key="item.code" :class="{ 'manual-row': item.marked === 'manual' }" tabindex="0" @click="selectRow(item)">
                  <td class="mono">{{ item.code }}</td>
                  <td class="mono text-right">{{ item.quantity }}</td>
                  <td class="mono text-right">{{ item.glosaQuantity }}</td>
                  <td class="mono text-right">{{ money(item.unitValue) }}</td>
                  <td class="mono text-right">{{ money(item.quantity * item.unitValue) }}</td>
                  <td>{{ item.name }}</td>
                  <td class="mono text-right">{{ money(item.glosaAmount) }}</td>
                  <td class="amount-column"><v-text-field :model-value="item.accepted" type="number" min="0" :max="item.glosaAmount" prefix="$" hide-details density="compact" aria-label="Valor aceptado" :disabled="!item.glosaAmount" @click.stop @update:model-value="onAcceptedInput(item, $event)" /></td>
                  <td class="amount-column"><v-text-field :model-value="item.glosaAmount - item.accepted" type="number" min="0" :max="item.glosaAmount" prefix="$" hide-details density="compact" aria-label="Valor rechazado" :disabled="!item.glosaAmount" @click.stop @update:model-value="onRejectedInput(item, $event)" /></td>
                  <td>{{ item.center }}</td>
                  <td>{{ item.centerName }}</td>
                  <td class="text-right"><v-btn v-if="item.glosaAmount" icon="mdi-close" size="x-small" variant="text" aria-label="Quitar ítem de la glosa" @click.stop="removeItem(item)" /></td>
                </tr>
              </tbody>
            </v-table>
          </div>
          <div class="conciliation-totals unified-table-totals">
            <span>{{ glosedItems.length }} {{ glosedItems.length === 1 ? 'ítem glosado' : 'ítems glosados' }}</span>
            <span>Glosado: <strong class="mono">{{ money(totalGlosado) }}</strong></span>
            <span>Aceptado: <strong class="mono">{{ money(totalAceptado) }}</strong></span>
            <span>Rechazado: <strong class="mono">{{ money(totalRechazado) }}</strong></span>
          </div>
        </v-card>

        <!-- Seccion 4: observaciones y responsables. -->
        <v-card class="dialog-section capture-section" rounded="lg">
          <div class="dialog-section-heading d-flex justify-space-between align-center">
            <div class="dialog-section-title"><span>3</span> Observaciones y responsables</div>
            <strong class="mono invoice-label">{{ invoice }}</strong>
          </div>
          <v-row class="form-grid" align="start">
            <v-col cols="12" md="6"><v-textarea v-model="observation" label="Observaciones de la glosa" placeholder="Describa el hallazgo, soporte y fundamento de la glosa..." rows="3" /></v-col>
            <v-col cols="12" md="6"><v-textarea v-model="conciliationObservation" label="Observaciones de la conciliación" placeholder="Describa los acuerdos y el fundamento de los valores conciliados..." rows="3" /></v-col>
            <v-col cols="12" md="6"><v-select v-model="internalAuditor" label="Auditor interno" placeholder="Seleccione auditor interno..." :items="['Pedro Páramo · Laboratorio', 'María Rodríguez · Auditoría médica', 'Carlos Méndez · Cuentas médicas']" /></v-col>
            <v-col cols="12" md="6"><v-select v-model="externalAuditor" label="Auditor externo" placeholder="Seleccione auditor externo..." :items="['Clínica Vida Integral S.A.S.', 'Hospital Universitario San Gabriel']" /></v-col>
          </v-row>

          <div class="responsible-panel">
            <div class="dialog-section-title">Responsable de la conciliación</div>
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
        <span v-if="missing.length" class="missing-hint">Falta: {{ missing.join(', ') }}</span>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancelar</v-btn>
        <v-btn color="primary" :disabled="missing.length > 0" @click="save">Guardar glosa y conciliación</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.glosa-conciliation-dialog {
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

.invoice-label {
  color: #355363;
  font-size: 12px;
}

.add-button {
  height: 40px !important;
  white-space: nowrap;
}

.capture-table-wrap {
  overflow: hidden;
  border: 1px solid #8da6b3;
  border-radius: 6px;
}

.capture-table {
  min-width: 1450px;
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

.capture-table th.amount-column,
.capture-table td.amount-column {
  width: 180px;
  min-width: 180px;
}

.capture-table td.amount-column :deep(.v-field) {
  width: 100%;
  min-width: 160px;
}

.table-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.unified-table-totals {
  justify-content: flex-end;
}

.text-right {
  text-align: right;
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

.conciliation-totals {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 18px;
  padding-top: 8px;
  color: #355363;
  font-size: 12px;
}

.responsible-panel {
  margin-top: 8px;
  padding: 12px;
  border: 1px solid #9bb0bb;
  background: #e8f0f3;
}

.responsible-type {
  margin: 0 0 8px;
}

.dialog-actions {
  min-height: 52px;
  padding: 8px 16px;
  border-top: 1px solid #9bb0bb;
  background: #ffffff;
}

.missing-hint {
  color: #a34943;
  font-size: 12px;
}

@media (max-width: 960px) {
  .dialog-body {
    padding: 10px 12px;
  }
}
</style>