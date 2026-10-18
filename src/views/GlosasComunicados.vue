<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

// --- Filtros de búsqueda ---
const sede = ref('FUNDACION SAN JOSE DE BUGA')
const sedes = ['FUNDACION SAN JOSE DE BUGA', 'FUNDACION SAN JOSE DE TULUÁ']
const empresa = ref('ACCIDENTES PERSONALES (PÓLIZAS EDUCATIVA GENERACIÓN POSITIVA)')
const empresas = ['ACCIDENTES PERSONALES (PÓLIZAS EDUCATIVA GENERACIÓN POSITIVA)', 'SALUD TOTAL EPS', 'SURA EPS']
const tipoEntidad = ref('convenio') // 'convenio' | 'institucion'
const auditorInterno = ref('DIANA MARCELA JIMENEZ DELGADO')
const auditoresInternos = ['DIANA MARCELA JIMENEZ DELGADO', 'Auditor interno 2']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
const fechaInicial = ref(todayISO())
const fechaFinal = ref(todayISO())
const verEnArchivo = ref(false)
const facturaFiltro = ref('')

const buscando = ref(false)
const message = ref('')
const errorMessage = ref('')

// --- Resultado de la búsqueda (grilla) ---
const rows = ref([]) // { key, factura, idglosa, iditem, codGlosa, concepto, gInicial, rAceptada, rRechazada, comunicado, fechaComunicado, estado, selected }

// Catálogo simulado de glosas pendientes de comunicar, solo para este prototipo.
// En el sistema real esto se reemplaza por la consulta al backend según sede, empresa,
// auditor y rango de fechas seleccionados.
const mockPool = [
  { factura: 'FE-2026-004581', idglosa: '5001', iditem: '1', codGlosa: '102', concepto: 'Consultas, interconsultas y atenciones domiciliarias', gInicial: 20000, rAceptada: 0, rRechazada: 0 },
  { factura: 'FE-2026-004581', idglosa: '5001', iditem: '2', codGlosa: '102', concepto: 'Consultas, interconsultas y atenciones domiciliarias', gInicial: 8000, rAceptada: 0, rRechazada: 0 },
  { factura: 'FE-2026-004599', idglosa: '5002', iditem: '1', codGlosa: '104', concepto: 'Insumo no incluido en el paquete contratado', gInicial: 4650, rAceptada: 0, rRechazada: 0 },
  { factura: 'FE-2026-004602', idglosa: '5003', iditem: '1', codGlosa: '103', concepto: 'Traslado asistencial no cubierto por el plan', gInicial: 30000, rAceptada: 0, rRechazada: 0 },
  { factura: 'FE-2026-004602', idglosa: '5003', iditem: '2', codGlosa: '105', concepto: 'Servicio no pertinente para la atención', gInicial: 22000, rAceptada: 0, rRechazada: 0 }
]

function buscar() {
  buscando.value = true
  errorMessage.value = ''
  message.value = ''
  // Prototipo: no filtra realmente por sede/empresa/auditor/fecha, solo simula la consulta.
  rows.value = mockPool.map((item, index) => ({
    key: `${item.idglosa}-${item.iditem}`,
    ...item,
    comunicado: '',
    fechaComunicado: '',
    estado: 'Pendiente',
    selected: false
  }))
  buscando.value = false
  message.value = `${rows.value.length} ítem(s) encontrado(s).`

  if (verEnArchivo.value) descargarResultados()
}

function descargarResultados() {
  if (!rows.value.length) return
  const sheet = XLSX.utils.json_to_sheet(
    rows.value.map(row => ({
      Factura: row.factura,
      IdGlosa: row.idglosa,
      IdItem: row.iditem,
      'Cod. Glosa': row.codGlosa,
      Concepto: row.concepto,
      'G. Inicial': row.gInicial,
      'R. Aceptada': row.rAceptada,
      'R. Rechazada': row.rRechazada,
      Estado: row.estado
    }))
  )
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Glosas pendientes')
  XLSX.writeFile(workbook, 'glosas_pendientes_comunicar.xlsx')
}

function imprimir() {
  if (!rows.value.length) return
  window.print()
}

const visibleRows = computed(() => {
  const filtro = facturaFiltro.value.trim().toLowerCase()
  if (!filtro) return rows.value
  return rows.value.filter(row => row.factura.toLowerCase().includes(filtro))
})

const selectedRows = computed(() => visibleRows.value.filter(row => row.selected))
const todosSeleccionados = computed({
  get: () => visibleRows.value.length > 0 && visibleRows.value.every(row => row.selected),
  set: value => visibleRows.value.forEach(row => { row.selected = value })
})

const gInicialTotal = computed(() => rows.value.reduce((sum, row) => sum + (Number(row.gInicial) || 0), 0))
const rAceptadaTotal = computed(() => rows.value.reduce((sum, row) => sum + (Number(row.rAceptada) || 0), 0))
const rRechazadaTotal = computed(() => rows.value.reduce((sum, row) => sum + (Number(row.rRechazada) || 0), 0))

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

// --- Panel "Marcar": asigna/retira ítems seleccionados a un comunicado ---
const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
function formatDateSlash(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${meses[date.getMonth()]}/${date.getFullYear()}`
}

const fechaComunicadoActual = ref(formatDateSlash(new Date()))
function generarNumeroComunicado() {
  return `COM-${Math.floor(1000 + Math.random() * 9000)}`
}
const comunicadoNumero = ref(generarNumeroComunicado())

// Comunicados ya cerrados, disponibles para consultar (No.Comunicado + histórico de sus ítems).
const historialComunicados = ref({})
const comunicadosDisponibles = computed(() => Object.keys(historialComunicados.value))
const comunicadoConsulta = ref(null)

function marcarSeleccionados() {
  if (!selectedRows.value.length) return
  selectedRows.value.forEach(row => { row.marcado = true })
  message.value = `${selectedRows.value.length} ítem(s) marcado(s).`
}

function agregarSeleccionados() {
  if (!selectedRows.value.length) {
    errorMessage.value = 'Seleccione al menos un ítem para agregar al comunicado.'
    return
  }
  if (!comunicadoNumero.value) comunicadoNumero.value = generarNumeroComunicado()

  selectedRows.value.forEach(row => {
    row.comunicado = comunicadoNumero.value
    row.fechaComunicado = fechaComunicadoActual.value
    row.estado = 'Comunicado'
    row.selected = false
    row.marcado = false
  })
  errorMessage.value = ''
  message.value = `${selectedRows.value.length} ítem(s) agregado(s) al comunicado ${comunicadoNumero.value}.`
}

function quitarSeleccionados() {
  const asignados = visibleRows.value.filter(row => row.selected && row.comunicado)
  if (!asignados.length) {
    errorMessage.value = 'Seleccione ítems ya asignados a un comunicado para quitarlos.'
    return
  }
  asignados.forEach(row => {
    row.comunicado = ''
    row.fechaComunicado = ''
    row.estado = 'Pendiente'
    row.marcado = false
  })
  errorMessage.value = ''
  message.value = `${asignados.length} ítem(s) retirado(s) del comunicado.`
}

function cerrarComunicado() {
  const items = rows.value.filter(row => row.comunicado === comunicadoNumero.value)
  if (!items.length) {
    errorMessage.value = 'El comunicado actual no tiene ítems agregados.'
    return
  }
  items.forEach(row => { row.estado = 'Cerrado' })
  historialComunicados.value[comunicadoNumero.value] = items.map(row => ({ ...row }))
  message.value = `Comunicado ${comunicadoNumero.value} cerrado con ${items.length} ítem(s).`
  errorMessage.value = ''
  comunicadoNumero.value = generarNumeroComunicado()
  fechaComunicadoActual.value = formatDateSlash(new Date())
}

function consultarComunicado() {
  if (!comunicadoConsulta.value) return
  const historico = historialComunicados.value[comunicadoConsulta.value] || []
  rows.value = historico.map(row => ({ ...row, selected: false }))
  message.value = `Mostrando ${historico.length} ítem(s) del comunicado ${comunicadoConsulta.value}.`
}

function refrescarComunicados() {
  comunicadoConsulta.value = null
  message.value = 'Listado de comunicados actualizado.'
}
</script>

<template>
  <div class="file-load-page">
    <div class="view-heading">
      <div>
        <div class="eyebrow">Gestión de comunicados</div>
        <h1>Generación de comunicados de respuesta de glosas por rango de fecha</h1>
        <p>Busque las glosas pendientes, márquelas y asígnelas a un comunicado para notificar la respuesta.</p>
      </div>
    </div>

    <v-card class="file-panel surface-border">
      <v-card-text>
        <v-row class="mb-3">
          <v-col cols="12" md="7">
            <div class="filtros-panel">
              <div class="marcar-title">Filtros de búsqueda</div>
              <v-row class="filtros-row">
                <v-col cols="12" md="6">
                  <v-select v-model="sede" label="Sede" :items="sedes" density="compact" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-radio-group v-model="tipoEntidad" inline density="compact" hide-details class="mt-1">
                    <v-radio label="Convenio" value="convenio" />
                    <v-radio label="Institución" value="institucion" />
                  </v-radio-group>
                </v-col>
              </v-row>
              <v-select v-model="empresa" label="Empresa" :items="empresas" density="compact" class="mb-3" />
              <v-select v-model="auditorInterno" label="Auditor interno" :items="auditoresInternos" density="compact" class="mb-3" />

              <v-row align="end" class="mt-1">
                <v-col cols="6" md="3">
                  <v-text-field v-model="fechaInicial" type="date" label="Fecha inicial" density="compact" />
                </v-col>
                <v-col cols="6" md="3">
                  <v-text-field v-model="fechaFinal" type="date" label="Fecha final" density="compact" />
                </v-col>
                <v-col cols="12" md="6" class="action-group">
                  <v-btn color="primary" :loading="buscando" prepend-icon="mdi-magnify" @click="buscar">Buscar</v-btn>
                  <v-btn variant="outlined" prepend-icon="mdi-printer-outline" :disabled="!rows.length" @click="imprimir">
                    Imprimir
                  </v-btn>
                  <v-checkbox v-model="verEnArchivo" label="Ver en archivo" density="compact" hide-details />
                </v-col>
              </v-row>
            </div>
          </v-col>

          <v-col cols="12" md="5">
            <div class="marcar-panel">
              <div class="marcar-title">Marcar</div>
              <v-row>
                <v-col cols="7">
                  <v-text-field v-model="comunicadoNumero" label="No. Comunicado" density="compact" />
                </v-col>
                <v-col cols="5">
                  <v-text-field :model-value="fechaComunicadoActual" label="Fecha" density="compact" readonly />
                </v-col>
              </v-row>
              <div class="action-group mb-3 mt-3">
                <v-btn size="small" variant="tonal" prepend-icon="mdi-tag-outline" @click="marcarSeleccionados">
                  Marcar
                </v-btn>
                <v-btn size="small" color="success" variant="tonal" prepend-icon="mdi-plus" @click="agregarSeleccionados">
                  Agregar
                </v-btn>
                <v-btn size="small" color="error" variant="tonal" prepend-icon="mdi-minus" @click="quitarSeleccionados">
                  Quitar
                </v-btn>
                <v-btn size="small" color="error" variant="flat" prepend-icon="mdi-lock-outline" @click="cerrarComunicado">
                  Cerrar
                </v-btn>
              </div>

              <v-row align="center" no-gutters>
                <v-col cols="9">
                  <v-select
                    v-model="comunicadoConsulta"
                    label="No. Comunicado"
                    :items="comunicadosDisponibles"
                    density="compact"
                    clearable
                  />
                </v-col>
                <v-col cols="3" class="d-flex justify-end ga-1">
                  <v-btn icon="mdi-magnify" size="small" variant="tonal" @click="consultarComunicado" />
                  <v-btn icon="mdi-refresh" size="small" variant="tonal" @click="refrescarComunicados" />
                </v-col>
              </v-row>

              <v-text-field v-model="facturaFiltro" label="Factura" density="compact" class="mt-2" clearable />
            </div>
          </v-col>
        </v-row>

        <v-alert v-if="message" type="success" variant="tonal" density="compact" class="mt-2">{{ message }}</v-alert>
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-2">{{ errorMessage }}</v-alert>

        <div class="table-wrap mt-3">
          <v-table density="compact" class="compact-table file-table">
            <thead>
              <tr>
                <th></th>
                <th>Factura</th>
                <th>IdGlosa</th>
                <th>IdItem</th>
                <th>Cod. Glosa</th>
                <th>Concepto</th>
                <th>G. Inicial</th>
                <th>R. Aceptada</th>
                <th>R. Rechazada</th>
                <th>No. Comunicado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!visibleRows.length">
                <td colspan="11" class="empty-state">Use "Buscar" para cargar las glosas pendientes de comunicar.</td>
              </tr>
              <tr v-for="row in visibleRows" v-else :key="row.key" :class="{ 'row-marcada': row.marcado }">
                <td><v-checkbox-btn v-model="row.selected" /></td>
                <td>{{ row.factura }}</td>
                <td>{{ row.idglosa }}</td>
                <td>{{ row.iditem }}</td>
                <td>{{ row.codGlosa }}</td>
                <td>{{ row.concepto }}</td>
                <td class="mono">{{ formatCurrency(row.gInicial) }}</td>
                <td class="mono">{{ formatCurrency(row.rAceptada) }}</td>
                <td class="mono">{{ formatCurrency(row.rRechazada) }}</td>
                <td>{{ row.comunicado }}</td>
                <td>
                  <v-chip
                    size="small"
                    variant="flat"
                    :color="row.estado === 'Cerrado' ? 'success' : row.estado === 'Comunicado' ? 'warning' : undefined"
                  >
                    {{ row.estado }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <div class="bottom-bar mt-3">
          <div class="d-flex align-center ga-2">
            <v-checkbox v-model="todosSeleccionados" density="compact" hide-details />
            <span class="text-body-2">Todos</span>
            <span class="text-caption text-medium-emphasis">{{ visibleRows.length }} ítem(s)</span>
          </div>
          <div class="totals-group">
            <div class="total-box">
              <span class="total-label">G. Inicial</span>
              <span class="total-value">{{ formatCurrency(gInicialTotal) }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">R. Aceptada</span>
              <span class="total-value">{{ formatCurrency(rAceptadaTotal) }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">R. Rechazada</span>
              <span class="total-value">{{ formatCurrency(rRechazadaTotal) }}</span>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.filtros-row {margin-left: -8px; margin-right: -8px; }
.file-load-page { padding: 18px 22px 32px; }
.view-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 16px; }
h1 { margin: 3px 0 5px; color: #1b3446; font-size: 24px; }
.view-heading p { margin: 0; color: #526873; font-size: 14px; }
.file-panel { background: #fff; }
.action-group { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.marcar-panel, .filtros-panel { border: 1px solid #9bb0bb; border-radius: 6px; padding: 14px 16px; background: #f5f8f9; height: 100%; }
.filtros-panel :deep(.v-input) { margin-bottom: 10px; }
.filtros-panel :deep(.v-row) { margin-bottom: 4px; }
.total-box { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 30px; border: 1px solid #9bb0bb; border-radius: 8px; background: #eef3f5; min-width: 180px; }
.total-label { font-size: 13px; color: #526873; }
.total-value { font-size: 20px; font-weight: 700; color: #1b3446; font-variant-numeric: tabular-nums; white-space: nowrap; }
.marcar-title { font-weight: 600; color: #1b3446; margin-bottom: 8px; }
.table-wrap { overflow-x: auto; border: 1px solid #8da6b3; border-radius: 6px; }
.file-table { min-width: 950px; }
.file-table th { background: #c9dbe4 !important; border-bottom: 2px solid #7f9aa8 !important; }
.file-table td, .file-table th { padding: 8px 10px !important; white-space: nowrap; }
.empty-state { height: 80px; color: #647983; text-align: center; }
.row-marcada { background: #fff6dc; }
.mono { font-variant-numeric: tabular-nums; }
.bottom-bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
.totals-group { display: flex; gap: 14px; flex-wrap: wrap; }
@media (max-width: 700px) { .file-load-page { padding: 12px; } .view-heading { flex-direction: column; } h1 { font-size: 20px; } }
</style>