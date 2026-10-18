<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

const inputFile = ref(null)
const fileInput = ref(null)
const invoiceRows = ref([])
const fileName = ref('')
const loading = ref(false)
const message = ref('')
const errorMessage = ref('')
const auditor = ref('') // faltaba declararlo: el v-select ya lo usaba con v-model

const validating = ref(false)
const validationRun = ref(false)
const rowValidations = ref([]) // paralelo a invoiceRows: [{ errors: [] }]
const uploading = ref(false)
const uploaded = ref(false)

// --- Flujo 1: generar plano base a partir de una lista de facturas ---
const invoiceListInputFile = ref(null)
const invoiceListInput = ref(null)
const invoiceNumbers = ref([])
const invoiceListFileName = ref('')
const loadingInvoiceList = ref(false)
const invoiceListMessage = ref('')
const invoiceListError = ref('')

const columns = ['No Factura', 'Cod. Glosa', 'Fecha glosa', 'Vr. Glosa', 'Observacion', 'Vr. Procedimiento', 'Cod. Procedimiento', 'Cantidad']
const currencyColumns = ['Vr. Glosa', 'Vr. Procedimiento']

const sampleRows = [
  { 'No Factura': 'FE-2026-004581', 'Cod. Glosa': '208', 'Fecha glosa': '21/09/2026', 'Vr. Glosa': 0, Observacion: '', 'Vr. Procedimiento': 20000, 'Cod. Procedimiento': '902101', Cantidad: 1 },
  { 'No Factura': 'FE-2026-004581', 'Cod. Glosa': '102', 'Fecha glosa': '21/09/2026', 'Vr. Glosa': 8000, Observacion: 'Pendiente soporte', 'Vr. Procedimiento': 20000, 'Cod. Procedimiento': '902103', Cantidad: 1 },
  { 'No Factura': 'FE-2026-004599', 'Cod. Glosa': '104', 'Fecha glosa': '22/09/2026', 'Vr. Glosa': 4650, Observacion: '', 'Vr. Procedimiento': 4650, 'Cod. Procedimiento': '10J12', Cantidad: 2 }
]

// Catálogo simulado de procedimientos por factura, solo para este prototipo.
// En el sistema real esto se reemplaza por la consulta al backend que trae los procedimientos
// realmente facturados para cada número de factura.
const mockProcedureCatalog = [
  { procedureCode: '902101', glosaCode: '102', value: 20000 },
  { procedureCode: '902102', glosaCode: '102', value: 10000 },
  { procedureCode: '902103', glosaCode: '102', value: 8000 },
  { procedureCode: '501020', glosaCode: '103', value: 12000 },
  { procedureCode: '501021', glosaCode: '103', value: 18000 },
  { procedureCode: '10J12', glosaCode: '104', value: 4650 },
  { procedureCode: '10J15', glosaCode: '104', value: 7246 }
]

function openFilePicker() {
  fileInput.value?.$el?.querySelector('input')?.click()
}

// Normaliza encabezados: quita tildes, puntuación (puntos, guiones) y espacios extra.
// Antes solo quitaba tildes, así que un encabezado como "Cod. Glosa" nunca calzaba con "cod glosa".
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

async function readInvoiceFile(event) {
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
        'No Factura': findValue(row, ['no factura', 'numero factura', 'nro factura', 'factura']),
        'Cod. Glosa': findValue(row, ['cod glosa', 'codigo glosa']),
        'Fecha glosa': findValue(row, ['fecha glosa']),
        'Vr. Glosa': Number(findValue(row, ['vr glosa', 'valor glosa'])) || 0,
        Observacion: findValue(row, ['observacion', 'observación']),
        'Vr. Procedimiento': Number(findValue(row, ['vr procedimiento', 'valor procedimiento'])) || 0,
        'Cod. Procedimiento': findValue(row, ['cod procedimiento', 'codigo procedimiento']),
        Cantidad: Number(findValue(row, ['cantidad', 'cant'])) || 0
      }))
      .filter(row => row['No Factura'])

    if (!mapped.length) throw new Error('No se encontró una columna de número de factura con datos.')
    invoiceRows.value = mapped
    message.value = `${mapped.length} registro(s) cargado(s) desde ${file.name}. Ejecute las validaciones para continuar.`
  } catch (error) {
    invoiceRows.value = []
    errorMessage.value = error.message || 'No fue posible leer el archivo.'
  } finally {
    loading.value = false
  }
}

function useSample() {
  invoiceRows.value = [...sampleRows]
  fileName.value = 'ejemplo-plano-glosas.xlsx'
  message.value = 'Se cargó un ejemplo de tres registros (dos facturas). Ejecute las validaciones para continuar.'
  errorMessage.value = ''
  resetValidationState()
}

function openInvoiceListPicker() {
  invoiceListInput.value?.$el?.querySelector('input')?.click()
}

async function readInvoiceListFile(event) {
  const file = event?.target?.files?.[0] || event?.[0]
  if (!file) return
  loadingInvoiceList.value = true
  invoiceListError.value = ''
  invoiceListMessage.value = ''
  invoiceListFileName.value = file.name

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
    const numbers = rows
      .map(row => findValue(row, ['no factura', 'numero factura', 'nro factura', 'factura']))
      .map(value => String(value).trim())
      .filter(Boolean)

    if (!numbers.length) throw new Error('No se encontró una columna de número de factura con datos.')
    invoiceNumbers.value = [...new Set(numbers)]
    invoiceListMessage.value = `${invoiceNumbers.value.length} factura(s) cargada(s) desde ${file.name}. Ya puede descargar el plano base.`
  } catch (error) {
    invoiceNumbers.value = []
    invoiceListError.value = error.message || 'No fue posible leer el archivo.'
  } finally {
    loadingInvoiceList.value = false
  }
}

function hashInvoiceNumber(invoiceNumber) {
  let hash = 0
  for (let i = 0; i < invoiceNumber.length; i += 1) hash = (hash * 31 + invoiceNumber.charCodeAt(i)) | 0
  return Math.abs(hash)
}

function formatDateDDMMYYYY(date) {
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Simula, para cada factura, la consulta al backend que traería sus procedimientos reales.
// El usuario solo debe completar 'Vr. Glosa' y 'Cantidad'; el resto queda pre-diligenciado.
function generateBaseRows(numbers) {
  const today = formatDateDDMMYYYY(new Date())
  return numbers.flatMap(invoiceNumber => {
    const seed = hashInvoiceNumber(invoiceNumber)
    const itemCount = (seed % 2) + 1
    return Array.from({ length: itemCount }, (_, offset) => {
      const procedure = mockProcedureCatalog[(seed + offset) % mockProcedureCatalog.length]
      return {
        'No Factura': invoiceNumber,
        'Cod. Glosa': procedure.glosaCode,
        'Fecha glosa': today,
        'Vr. Glosa': '',
        Observacion: '',
        'Vr. Procedimiento': procedure.value,
        'Cod. Procedimiento': procedure.procedureCode,
        Cantidad: ''
      }
    })
  })
}

function downloadBasePlan() {
  if (!invoiceNumbers.value.length) return
  const rows = generateBaseRows(invoiceNumbers.value)
  const sheet = XLSX.utils.json_to_sheet(rows, { header: columns })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Plano base')
  XLSX.writeFile(workbook, 'plano_glosas_base.xlsx')
  invoiceListMessage.value = 'Plano base descargado. Complete "Vr. Glosa" y "Cantidad" y cárguelo en el paso 2.'
}

function downloadTemplate() {
  const sheet = XLSX.utils.json_to_sheet([sampleRows[0]], { header: columns })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Plano de glosas')
  XLSX.writeFile(workbook, 'plantilla_plano_glosas.xlsx')
}

// --- Resumen de carga ---
const totalRecords = computed(() => invoiceRows.value.length)
const totalInvoices = computed(() => new Set(invoiceRows.value.map(row => row['No Factura'])).size)
const totalGlosaValue = computed(() => invoiceRows.value.reduce((sum, row) => sum + (Number(row['Vr. Glosa']) || 0), 0))

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function displayValue(column, value) {
  if (currencyColumns.includes(column)) return formatCurrency(value)
  if (column === 'Fecha glosa' && value instanceof Date) return value.toLocaleDateString('es-CO')
  return value
}

// --- Validaciones ---
// Base de ejemplo: reemplaza/ajusta estas reglas según lo definido en la Wiki de validaciones.
function validateRow(row) {
  const errors = []
  if (!row['No Factura']) errors.push('Falta el número de factura.')
  if (!row['Cod. Glosa']) errors.push('Falta el código de glosa.')
  if (!row['Fecha glosa']) errors.push('Falta la fecha de la glosa.')
  if (row['Vr. Glosa'] < 0) errors.push('El valor de la glosa no puede ser negativo.')
  if (!row['Vr. Procedimiento'] || row['Vr. Procedimiento'] <= 0) errors.push('Falta el valor del procedimiento.')
  if (!row['Cod. Procedimiento']) errors.push('Falta el código de procedimiento.')
  if (!row['Cantidad'] || row['Cantidad'] <= 0) errors.push('La cantidad debe ser mayor a cero.')
  if (row['Vr. Glosa'] > row['Vr. Procedimiento']) errors.push('El valor de la glosa no puede superar el valor del procedimiento.')
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
  if (!invoiceRows.value.length) return
  validating.value = true
  errorMessage.value = ''

  rowValidations.value = invoiceRows.value.map(row => ({ errors: validateRow(row) }))
  validationRun.value = true
  uploaded.value = false

  const sheetRows = invoiceRows.value.map((row, index) => ({
    ...row,
    Estado: rowValidations.value[index].errors.length ? 'Con errores' : 'Ok',
    'Detalle validación': rowValidations.value[index].errors.join(' | ')
  }))
  const sheet = XLSX.utils.json_to_sheet(sheetRows, { header: [...columns, 'Estado', 'Detalle validación'] })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Validación glosas')
  XLSX.writeFile(workbook, 'plano_glosas_validado.xlsx')

  message.value = fileIsValid.value
    ? 'Validación completada sin errores. Se descargó el archivo de validación y ya puede subir la información.'
    : 'Validación completada. Se descargó el archivo con el detalle de errores; corríjalos y vuelva a validar.'
  validating.value = false
}

function uploadInformation() {
  if (!fileIsValid.value) return
  uploading.value = true
  errorMessage.value = ''
  // TODO: reemplazar por la llamada real al servicio/endpoint que sube la información.
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
        <h1>Cargar y generar plano de glosas iniciales</h1>
        <p>
          Genere el plano base a partir de una lista de facturas, complete los valores glosados, valide la
          estructura y suba la información cuando el archivo esté correcto.
        </p>
      </div>
      <v-btn variant="outlined" color="primary" prepend-icon="mdi-book-open-page-variant" to="/wiki-validaciones">
        Wiki de validaciones
      </v-btn>
    </div>

    <v-card class="file-panel surface-border">
      <v-card-title class="panel-title">1 · Generar plano base desde lista de facturas</v-card-title>
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="7">
            <v-file-input
              ref="invoiceListInput"
              v-model="invoiceListInputFile"
              label="Lista de facturas (solo columna No Factura)"
              accept=".xlsx,.xls"
              prepend-icon="mdi-file-excel-outline"
              show-size
              @change="readInvoiceListFile"
            />
          </v-col>
          <v-col cols="12" md="5" class="action-group">
            <v-btn
              color="primary"
              variant="outlined"
              :loading="loadingInvoiceList"
              prepend-icon="mdi-upload"
              @click="openInvoiceListPicker"
            >
              Cargar lista de facturas
            </v-btn>
            <v-btn
              color="primary"
              :disabled="!invoiceNumbers.length"
              prepend-icon="mdi-file-export-outline"
              @click="downloadBasePlan"
            >
              Descargar plano base
            </v-btn>
          </v-col>
        </v-row>

        <div class="file-help">
          Suba solo el listado de números de factura a glosar. El sistema arma el plano con sus procedimientos y deja
          <strong>cantidad, Vr. Glosa, fecha y observacion </strong>  listos para diligenciar manualmente; el resto de las
          columnas queda pre-generado a partir de la factura.         
        </div>

        <v-alert v-if="invoiceListMessage" type="success" variant="tonal" density="compact" class="mt-3">
          {{ invoiceListMessage }}
        </v-alert>
        <v-alert v-if="invoiceListError" type="error" variant="tonal" density="compact" class="mt-3">
          {{ invoiceListError }}
        </v-alert>
        <div v-if="invoiceNumbers.length" class="text-caption mt-2">{{ invoiceNumbers.length }} factura(s) cargada(s)</div>
      </v-card-text>
    </v-card>

    <v-card class="file-panel surface-border mt-4">
      <v-card-title class="panel-title">2 · Cargar plano diligenciado</v-card-title>
      <v-card-text>
        <v-row class="form-grid" align="end">
          <v-col cols="12" md="4">
            <v-select
              v-model="auditor"
              label="Auditor interno"
              placeholder="Seleccione auditor interno..."
              :items="['Auditor interno 1', 'Auditor interno 2']"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              label="Auditor externo"
              placeholder="Seleccione auditor externo..."
              :items="['Auditor externo 1', 'Auditor externo 2']"
            />
          </v-col>
           <v-col cols="12" md="4">           
            <v-radio-group v-model="glosaType" inline hide-details class="responsible-type">
              <v-radio label="Glosa Inicial" value="internal" />
              <v-radio label="Glosa Nuevo Hallazgo" value="external" />
            </v-radio-group>
            </v-col>
        </v-row>

        <v-row align="center">
          <v-col cols="12" md="7">
            <v-file-input
              ref="fileInput"
              v-model="inputFile"
              label="Archivo Excel con números de factura"
              accept=".xlsx,.xls"
              prepend-icon="mdi-file-excel-outline"
              show-size
              @change="readInvoiceFile"
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
          El archivo debe cumplir con la estructura de la tabla, para mayor detalle descargue la plantilla de ejemplo.
        </div>

        <v-alert v-if="message" type="success" variant="tonal" density="compact" class="mt-3">{{ message }}</v-alert>
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-3">{{ errorMessage }}</v-alert>

        <v-row v-if="invoiceRows.length" class="summary-row mt-2">
          <v-col cols="12" sm="4">
            <div class="summary-card">
              <span class="summary-label">Registros cargados</span>
              <span class="summary-value">{{ totalRecords }}</span>
            </div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="summary-card">
              <span class="summary-label">Facturas</span>
              <span class="summary-value">{{ totalInvoices }}</span>
            </div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="summary-card">
              <span class="summary-label">Valor total glosas</span>
              <span class="summary-value">{{ formatCurrency(totalGlosaValue) }}</span>
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
        <span class="text-caption ml-3">{{ invoiceRows.length }} registro(s)</span>
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
              <tr v-if="!invoiceRows.length">
                <td :colspan="columns.length + (validationRun ? 1 : 0)" class="empty-state">
                  Cargue un archivo de facturas o use el ejemplo para comenzar.
                </td>
              </tr>
              <tr v-for="(row, index) in invoiceRows" v-else :key="`${row['No Factura']}-${index}`">
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
            :disabled="!invoiceRows.length"
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
.prototype-note { display: block; margin-top: 4px; font-style: italic; color: #7f9aa8; }
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