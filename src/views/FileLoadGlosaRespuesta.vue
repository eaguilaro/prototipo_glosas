<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

const inputFile = ref(null)
const fileInput = ref(null)
const responseRows = ref([])
const fileName = ref('')
const loading = ref(false)
const message = ref('')
const errorMessage = ref('')
const auditor = ref('')

const validating = ref(false)
const validationRun = ref(false)
const rowValidations = ref([]) // paralelo a responseRows: [{ errors: [] }]
const uploading = ref(false)
const uploaded = ref(false)

// --- Flujo 1: generar plano base a partir de una lista de glosas a responder ---
const glosaListInputFile = ref(null)
const glosaListInput = ref(null)
const glosaItems = ref([]) // [{ idglosa, iditem }]
const glosaListFileName = ref('')
const loadingGlosaList = ref(false)
const glosaListMessage = ref('')
const glosaListError = ref('')

const columns = ['idglosa', 'iditem', 'Cod. Respuesta', 'Vr Aceptado', 'Vr Rechazado', 'Aud Interno', 'Aud Externo', 'Observacion']
const currencyColumns = ['Vr Aceptado', 'Vr Rechazado']

const sampleRows = [
  { idglosa: '5001', iditem: '1', 'Cod. Respuesta': 'AC', 'Vr Aceptado': 8000, 'Vr Rechazado': 0, 'Aud Interno': 'Auditor interno 1', 'Aud Externo': 'Auditor externo 1', Observacion: 'Soporte completo' },
  { idglosa: '5001', iditem: '2', 'Cod. Respuesta': 'RC', 'Vr Aceptado': 0, 'Vr Rechazado': 12000, 'Aud Interno': 'Auditor interno 1', 'Aud Externo': 'Auditor externo 1', Observacion: 'No aplica' },
  { idglosa: '5002', iditem: '1', 'Cod. Respuesta': 'PA', 'Vr Aceptado': 4650, 'Vr Rechazado': 2596, 'Aud Interno': 'Auditor interno 2', 'Aud Externo': 'Auditor externo 2', Observacion: 'Aceptación parcial' }
]

function openFilePicker() {
  fileInput.value?.$el?.querySelector('input')?.click()
}

// Normaliza encabezados: quita tildes, puntuación (puntos, guiones) y espacios extra,
// para que "Cod. Respuesta", "cod respuesta", "COD-RESPUESTA", etc. calcen entre sí.
function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
}

function findValue(row, names) {
  const entry = Object.entries(row).find(([key]) => names.some(name => normalize(key).includes(normalize(name))))
  return entry ? entry[1] : ''
}

function resetValidationState() {
  validationRun.value = false
  rowValidations.value = []
  uploaded.value = false
}

async function readResponseFile(event) {
  const file = event?.target?.files?.[0] || event?.[0]
  if (!file) return
  loading.value = true
  errorMessage.value = ''
  message.value = ''
  fileName.value = file.name
  resetValidationState()

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
    const mapped = rows
      .map(row => ({
        idglosa: findValue(row, ['id glosa', 'idglosa']),
        iditem: findValue(row, ['id item', 'iditem', 'item']),
        'Cod. Respuesta': findValue(row, ['cod respuesta', 'codigo respuesta']),
        'Vr Aceptado': Number(findValue(row, ['vr aceptado', 'valor aceptado'])) || 0,
        'Vr Rechazado': Number(findValue(row, ['vr rechazado', 'valor rechazado'])) || 0,
        'Aud Interno': findValue(row, ['aud interno', 'auditor interno']),
        'Aud Externo': findValue(row, ['aud externo', 'auditor externo']),
        Observacion: findValue(row, ['observacion', 'observación'])
      }))
      .filter(row => row.idglosa)

    if (!mapped.length) throw new Error('No se encontró una columna de idglosa con datos.')
    responseRows.value = mapped
    message.value = `${mapped.length} registro(s) cargado(s) desde ${file.name}. Ejecute las validaciones para continuar.`
  } catch (error) {
    responseRows.value = []
    errorMessage.value = error.message || 'No fue posible leer el archivo.'
  } finally {
    loading.value = false
  }
}

function useSample() {
  responseRows.value = [...sampleRows]
  fileName.value = 'ejemplo-plano-respuesta-glosas.xlsx'
  message.value = 'Se cargó un ejemplo de tres registros (dos glosas). Ejecute las validaciones para continuar.'
  errorMessage.value = ''
  resetValidationState()
}

function openGlosaListPicker() {
  glosaListInput.value?.$el?.querySelector('input')?.click()
}

async function readGlosaListFile(event) {
  const file = event?.target?.files?.[0] || event?.[0]
  if (!file) return
  loadingGlosaList.value = true
  glosaListError.value = ''
  glosaListMessage.value = ''
  glosaListFileName.value = file.name

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
    const items = rows
      .map(row => ({
        idglosa: String(findValue(row, ['id glosa', 'idglosa'])).trim(),
        iditem: String(findValue(row, ['id item', 'iditem', 'item'])).trim()
      }))
      .filter(item => item.idglosa)

    if (!items.length) throw new Error('No se encontró una columna de idglosa con datos.')

    const seen = new Set()
    glosaItems.value = items.filter(item => {
      const key = `${item.idglosa}-${item.iditem}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    glosaListMessage.value = `${glosaItems.value.length} glosa(s)/ítem(s) cargado(s) desde ${file.name}. Ya puede descargar el plano base.`
  } catch (error) {
    glosaItems.value = []
    glosaListError.value = error.message || 'No fue posible leer el archivo.'
  } finally {
    loadingGlosaList.value = false
  }
}

// Toma solo las llaves (idglosa/iditem) de la lista cargada y deja el resto del plano en blanco:
// la respuesta (Cod. Respuesta, valores, auditores, observación) la diligencia auditoría a mano.
function generateBaseRows(items) {
  return items.map(item => ({
    idglosa: item.idglosa,
    iditem: item.iditem,
    'Cod. Respuesta': '',
    'Vr Aceptado': '',
    'Vr Rechazado': '',
    'Aud Interno': '',
    'Aud Externo': '',
    Observacion: ''
  }))
}

function downloadBasePlan() {
  if (!glosaItems.value.length) return
  const rows = generateBaseRows(glosaItems.value)
  const sheet = XLSX.utils.json_to_sheet(rows, { header: columns })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Plano base')
  XLSX.writeFile(workbook, 'plano_respuesta_glosas_base.xlsx')
  glosaListMessage.value = 'Plano base descargado. Complete la respuesta de cada ítem y cárguelo en el paso 2.'
}

function downloadTemplate() {
  const sheet = XLSX.utils.json_to_sheet([sampleRows[0]], { header: columns })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Plano respuesta glosas')
  XLSX.writeFile(workbook, 'plantilla_plano_respuesta_glosas.xlsx')
}

// --- Resumen de carga ---
const totalRecords = computed(() => responseRows.value.length)
const totalGlosas = computed(() => new Set(responseRows.value.map(row => row.idglosa)).size)
const totalAccepted = computed(() => responseRows.value.reduce((sum, row) => sum + (Number(row['Vr Aceptado']) || 0), 0))
const totalRejected = computed(() => responseRows.value.reduce((sum, row) => sum + (Number(row['Vr Rechazado']) || 0), 0))

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function displayValue(column, value) {
  if (currencyColumns.includes(column)) return formatCurrency(value)
  return value
}

// --- Validaciones ---
// Base de ejemplo: reemplaza/ajusta estas reglas según lo definido en la Wiki de validaciones.
function validateRow(row) {
  const errors = []
  if (!row.idglosa) errors.push('Falta el idglosa.')
  if (!row.iditem) errors.push('Falta el iditem.')
  if (!row['Cod. Respuesta']) errors.push('Falta el código de respuesta.')
  if (row['Vr Aceptado'] < 0) errors.push('El valor aceptado no puede ser negativo.')
  if (row['Vr Rechazado'] < 0) errors.push('El valor rechazado no puede ser negativo.')
  if (!row['Vr Aceptado'] && !row['Vr Rechazado']) errors.push('Debe registrar un valor aceptado o rechazado mayor a cero.')
  if (!row['Aud Interno']) errors.push('Falta el auditor interno.')
  if (!row['Aud Externo']) errors.push('Falta el auditor externo.')
  return errors
}

const fileIsValid = computed(
  () => validationRun.value && rowValidations.value.length > 0 && rowValidations.value.every(item => item.errors.length === 0)
)

const validationLabel = computed(() => {
  if (!validationRun.value) return null
  return fileIsValid.value ? 'Archivo validado' : 'Archivo con errores, favor corregir'
})

function runValidations() {
  if (!responseRows.value.length) return
  validating.value = true
  errorMessage.value = ''

  rowValidations.value = responseRows.value.map(row => ({ errors: validateRow(row) }))
  validationRun.value = true
  uploaded.value = false

  const sheetRows = responseRows.value.map((row, index) => ({
    ...row,
    Estado: rowValidations.value[index].errors.length ? 'Con errores' : 'Ok',
    'Detalle validación': rowValidations.value[index].errors.join(' | ')
  }))
  const sheet = XLSX.utils.json_to_sheet(sheetRows, { header: [...columns, 'Estado', 'Detalle validación'] })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Validación respuesta')
  XLSX.writeFile(workbook, 'plano_respuesta_glosas_validado.xlsx')

  message.value = fileIsValid.value
    ? 'Validación completada sin errores. Se descargó el archivo de validación y ya puede subir la información.'
    : 'Validación completada. Se descargó el archivo con el detalle de errores; corríjalos y vuelva a validar.'
  validating.value = false
}

function uploadInformation() {
  if (!fileIsValid.value) return
  uploading.value = true
  errorMessage.value = ''
  // TODO: reemplazar por la llamada real al servicio/endpoint que sube la respuesta de las glosas.
  setTimeout(() => {
    uploading.value = false
    uploaded.value = true
    message.value = 'Información subida correctamente.'
  }, 600)
}
</script>

<template>
  <div class="file-load-page">
    <div class="view-heading">
      <div>
        <div class="eyebrow">Carga de archivos por plano</div>
        <h1>Cargar y generar plano de respuesta a glosas</h1>
        <p>
          Genere el plano base a partir de una lista de glosas, complete la respuesta de auditoría, valide la
          estructura y suba la información cuando el archivo esté correcto.
        </p>
      </div>
      <v-btn variant="outlined" color="primary" prepend-icon="mdi-book-open-page-variant" to="/wiki-validaciones">
        Wiki de validaciones
      </v-btn>
    </div>

    <v-card class="file-panel surface-border">
      <v-card-title class="panel-title">1 · Generar plano base desde lista de glosas</v-card-title>
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="7">
            <v-file-input
              ref="glosaListInput"
              v-model="glosaListInputFile"
              label="Lista de glosas (columnas idglosa / iditem)"
              accept=".xlsx,.xls"
              prepend-icon="mdi-file-excel-outline"
              show-size
              @change="readGlosaListFile"
            />
          </v-col>
          <v-col cols="12" md="5" class="action-group">
            <v-btn
              color="primary"
              variant="outlined"
              :loading="loadingGlosaList"
              prepend-icon="mdi-upload"
              @click="openGlosaListPicker"
            >
              Cargar lista de glosas
            </v-btn>
            <v-btn
              color="primary"
              :disabled="!glosaItems.length"
              prepend-icon="mdi-file-export-outline"
              @click="downloadBasePlan"
            >
              Descargar plano base
            </v-btn>
          </v-col>
        </v-row>

        <div class="file-help">
          Suba el listado de glosas a responder (<strong>idglosa</strong> e <strong>iditem</strong>). El sistema arma
          el plano dejando <strong>Cod. Respuesta</strong>, <strong>Vr Aceptado</strong>, <strong>Vr Rechazado</strong>,
          <strong>Aud Interno</strong>, <strong>Aud Externo</strong> y <strong>Observacion</strong> listos para que
          auditoría los diligencie manualmente.
        </div>

        <v-alert v-if="glosaListMessage" type="success" variant="tonal" density="compact" class="mt-3">
          {{ glosaListMessage }}
        </v-alert>
        <v-alert v-if="glosaListError" type="error" variant="tonal" density="compact" class="mt-3">
          {{ glosaListError }}
        </v-alert>
        <div v-if="glosaItems.length" class="text-caption mt-2">{{ glosaItems.length }} glosa(s)/ítem(s) cargado(s)</div>
      </v-card-text>
    </v-card>

    <v-card class="file-panel surface-border mt-4">
      <v-card-title class="panel-title">2 · Cargar plano diligenciado</v-card-title>
      <v-card-text>
        <v-row class="form-grid" align="end">
          <v-col cols="12" md="6">
            <v-select
              v-model="auditor"
              label="Auditor interno"
              placeholder="Seleccione auditor interno..."
              :items="['Auditor interno 1', 'Auditor interno 2']"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              label="Auditor externo"
              placeholder="Seleccione auditor externo..."
              :items="['Auditor externo 1', 'Auditor externo 2']"
            />
          </v-col>
        </v-row>

        <v-row align="center">
          <v-col cols="12" md="7">
            <v-file-input
              ref="fileInput"
              v-model="inputFile"
              label="Archivo Excel con la respuesta de las glosas"
              accept=".xlsx,.xls"
              prepend-icon="mdi-file-excel-outline"
              show-size
              @change="readResponseFile"
            />
          </v-col>
          <v-col cols="12" md="5" class="action-group">
            <v-btn color="primary" :loading="loading" prepend-icon="mdi-upload" @click="openFilePicker">
              Cargar archivo
            </v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-download-outline" @click="downloadTemplate">
              Descargar plantilla
            </v-btn>
            <v-btn variant="text" @click="useSample">Ver ejemplo</v-btn>
          </v-col>
        </v-row>

        <div class="file-help">
          El archivo de respuesta debe contener una columna llamada <strong>idglosa</strong>. También se acepta
          <strong>id glosa</strong>.
        </div>

        <v-alert v-if="message" type="success" variant="tonal" density="compact" class="mt-3">{{ message }}</v-alert>
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-3">{{ errorMessage }}</v-alert>

        <v-row v-if="responseRows.length" class="summary-row mt-2">
          <v-col cols="12" sm="6" md="3">
            <div class="summary-card">
              <span class="summary-label">Registros cargados</span>
              <span class="summary-value">{{ totalRecords }}</span>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="summary-card">
              <span class="summary-label">Glosas</span>
              <span class="summary-value">{{ totalGlosas }}</span>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="summary-card">
              <span class="summary-label">Valor total aceptado</span>
              <span class="summary-value">{{ formatCurrency(totalAccepted) }}</span>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="summary-card">
              <span class="summary-label">Valor total rechazado</span>
              <span class="summary-value">{{ formatCurrency(totalRejected) }}</span>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="file-panel surface-border mt-4">
      <v-card-title class="panel-title d-flex align-center">
        3 · Validación del plano
        <v-spacer />
        <v-chip v-if="validationLabel" :color="fileIsValid ? 'success' : 'error'" variant="flat" size="small">
          {{ validationLabel }}
        </v-chip>
        <span class="text-caption ml-3">{{ responseRows.length }} registro(s)</span>
      </v-card-title>
      <v-card-text>
        <div class="table-wrap">
          <v-table density="compact" class="compact-table file-table">
            <thead>
              <tr>
                <th v-for="column in columns" :key="column">{{ column }}</th>
                <th v-if="validationRun">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!responseRows.length">
                <td :colspan="columns.length + (validationRun ? 1 : 0)" class="empty-state">
                  Cargue un archivo de respuesta de glosas o use el ejemplo para comenzar.
                </td>
              </tr>
              <tr v-for="(row, index) in responseRows" v-else :key="`${row.idglosa}-${row.iditem}-${index}`">
                <td v-for="column in columns" :key="column">{{ displayValue(column, row[column]) }}</td>
                <td v-if="validationRun">
                  <v-tooltip v-if="rowValidations[index]?.errors.length" location="top">
                    <template #activator="{ props }">
                      <v-chip v-bind="props" color="error" size="small" variant="flat">Error</v-chip>
                    </template>
                    <div>
                      <div v-for="(err, errIndex) in rowValidations[index].errors" :key="errIndex">{{ err }}</div>
                    </div>
                  </v-tooltip>
                  <v-chip v-else color="success" size="small" variant="flat">Ok</v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <div class="d-flex justify-end flex-wrap ga-2 mt-4">
          <v-btn
            color="primary"
            variant="outlined"
            :disabled="!responseRows.length"
            :loading="validating"
            prepend-icon="mdi-check-decagram-outline"
            @click="runValidations"
          >
            Ejecutar validaciones
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!fileIsValid || uploaded"
            :loading="uploading"
            prepend-icon="mdi-cloud-upload-outline"
            @click="uploadInformation"
          >
            {{ uploaded ? 'Información subida' : 'Subir información' }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="file-panel surface-border mt-4">
      <v-card-title class="panel-title">4 · Columnas del plano</v-card-title>
      <v-card-text class="column-guide">
        <span v-for="column in columns" :key="column" class="column-tag">{{ column }}</span>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.file-load-page { padding: 18px 22px 32px; }
.view-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 16px; }
h1 { margin: 3px 0 5px; color: #1b3446; font-size: 24px; }
.view-heading p { margin: 0; color: #526873; font-size: 14px; }
.file-panel { background: #fff; }
.panel-title { min-height: 46px; padding: 10px 16px; color: #1b3446; font-size: 16px !important; }
.file-help { color: #526873; font-size: 12px; }
.action-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.summary-card { display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; border: 1px solid #9bb0bb; border-radius: 6px; background: #eef3f5; }
.summary-label { font-size: 12px; color: #526873; }
.summary-value { font-size: 18px; font-weight: 600; color: #1b3446; }
.table-wrap { overflow-x: auto; border: 1px solid #8da6b3; border-radius: 6px; }
.file-table { min-width: 950px; }
.file-table th { background: #c9dbe4 !important; border-bottom: 2px solid #7f9aa8 !important; }
.file-table td, .file-table th { padding: 8px 10px !important; white-space: nowrap; }
.empty-state { height: 80px; color: #647983; text-align: center; }
.column-guide { display: flex; flex-wrap: wrap; gap: 8px; }
.column-tag { padding: 5px 9px; border: 1px solid #9bb0bb; border-radius: 4px; color: #284b63; background: #eef3f5; font-size: 12px; }
@media (max-width: 700px) { .file-load-page { padding: 12px; } .view-heading { flex-direction: column; } h1 { font-size: 20px; } }
</style>