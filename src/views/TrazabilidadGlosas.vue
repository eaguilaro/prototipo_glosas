<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as XLSX from 'xlsx'

const emit = defineEmits(['salir'])

// ============================================================
// TRAZABILIDAD DE GLOSAS - PROTOTIPO
// Simulación local para reemplazar posteriormente por servicios/API
// ============================================================

// --- Encabezado / contexto ---
const tipoOperacion = ref('asignar') // 'asignar' | 'recibir'
const estadoActual = ref('GLOSA RECIBIDA')
const usuarios = ['EDINSON OSPINA AGUILAR', 'AURA YANETH MURCIA GARCIA', 'DIANA MARCELA JIMENEZ DELGADO', 'CARLOS MÉNDEZ']
const usuarioActual = ref(usuarios[0])

// --- Filtros ---
const grupo = ref(0)
const instituciones = ['FUNDACION HOSPITAL SAN PEDRO', 'FUNDACION SAN JOSE DE BUGA']
const institucion = ref(instituciones[0])
const convenios = ['NUEVA EPS - CONTRIBUTIVO', 'SALUD TOTAL EPS', 'SURA EPS', 'COOMEVA EPS']
const convenio = ref('')
const noComunicado = ref('')

const tiposGlosa = ['Facturación', 'Autorizaciones', 'Soportes', 'Pertinencia', 'Cobertura', 'Seguimiento acuerdos', 'Devoluciones']
const tipoGlosaFiltro = ref(null)
const tiposAtencion = ['Urgencias', 'Hospitalización', 'Cirugía', 'Ambulatoria']
const tipoAtencionFiltro = ref(null)

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
const fechaInicial = ref(todayISO())
const fechaFinal = ref(todayISO())

const buscando = ref(false)
const message = ref('')
const errorMessage = ref('')

// ============================================================
// SIMULACIÓN DE GLOSAS
// ============================================================

const glosasPendientes = [
  { factura: 'FES433864', codigo: 'SO0801', nombre: 'Existe ausencia total, parcial o inconsistencia en los soportes de cobro que evidencien la atención.', fecha: '22/09/2026', valor: 34485, tipoGlosa: 'Soportes', tipoAtencion: 'Ambulatoria', aceptado: 0, rechazado: 0, valorNuevoHallazgo: 0 },
  { factura: 'FES433871', codigo: 'FA0102', nombre: 'Tarifa facturada superior a la pactada en el contrato vigente.', fecha: '20/09/2026', valor: 58200, tipoGlosa: 'Facturación', tipoAtencion: 'Hospitalización', aceptado: 0, rechazado: 0, valorNuevoHallazgo: 0 },
  { factura: 'FES433902', codigo: 'PE0305', nombre: 'Servicio no pertinente para el diagnóstico registrado.', fecha: '18/09/2026', valor: 21000, tipoGlosa: 'Pertinencia', tipoAtencion: 'Urgencias', aceptado: 21000, rechazado: 0, valorNuevoHallazgo: 0 },
  { factura: 'FES433915', codigo: 'AU0110', nombre: 'Servicio prestado sin autorización previa.', fecha: '17/09/2026', valor: 46700, tipoGlosa: 'Autorizaciones', tipoAtencion: 'Cirugía', aceptado: 0, rechazado: 0, valorNuevoHallazgo: 0 },
  { factura: 'FES433920', codigo: 'DV0201', nombre: 'Paciente no corresponde a la entidad responsable del pago.', fecha: '15/09/2026', valor: 12750, tipoGlosa: 'Devoluciones', tipoAtencion: 'Ambulatoria', aceptado: 0, rechazado: 12750, valorNuevoHallazgo: 0 }
]

const rows = ref([])

function consultar() {
  buscando.value = true
  message.value = ''
  errorMessage.value = ''

  setTimeout(() => {
    // Prototipo: no filtra realmente por institución/convenio/fecha, solo simula la consulta.
    rows.value = glosasPendientes.map((item, index) => ({
      ...item,
      key: `${item.factura}-${index}`,
      estado: estadoActual.value,
      observaciones: [],
      selected: false
    }))
    buscando.value = false
    message.value = `${rows.value.length} glosa(s) encontrada(s).`
  }, 300)
}
consultar()

const facturaBuscar = ref('')
const soloNoAceptadas = ref(false)
const ordenarPorGlosa = ref(true)
const filaActiva = ref(null)

const visibleRows = computed(() => {
  let lista = rows.value

  if (tipoGlosaFiltro.value) lista = lista.filter(r => r.tipoGlosa === tipoGlosaFiltro.value)
  if (tipoAtencionFiltro.value) lista = lista.filter(r => r.tipoAtencion === tipoAtencionFiltro.value)
  if (soloNoAceptadas.value) lista = lista.filter(r => r.aceptado === 0)

  const filtro = facturaBuscar.value.trim().toLowerCase()
  if (filtro) lista = lista.filter(r => r.factura.toLowerCase().includes(filtro))

  const ordenada = [...lista]
  ordenada.sort((a, b) => (ordenarPorGlosa.value ? a.codigo.localeCompare(b.codigo) : a.factura.localeCompare(b.factura)))
  return ordenada
})

const seleccionadas = computed(() => rows.value.filter(r => r.selected))
const todasMarcadas = computed({
  get: () => visibleRows.value.length > 0 && visibleRows.value.every(r => r.selected),
  set: value => visibleRows.value.forEach(r => (r.selected = value))
})

function activarFila(row) {
  filaActiva.value = row
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

// ============================================================
// ACCIONES DE LOTE
// ============================================================

const pasarA = ref('GLOSA ASIGNADA')
const responsable = ref('')

function grabar() {
  if (!seleccionadas.value.length) {
    errorMessage.value = 'Seleccione al menos una glosa para grabar el cambio de estado.'
    return
  }
  if (!responsable.value) {
    errorMessage.value = 'Seleccione un responsable antes de grabar.'
    return
  }
  // TODO: reemplazar por la llamada real al servicio que registra el paso de trazabilidad.
  seleccionadas.value.forEach(row => { row.estado = pasarA.value })
  message.value = `${seleccionadas.value.length} glosa(s) pasada(s) a "${pasarA.value}" y asignada(s) a ${responsable.value}.`
  errorMessage.value = ''
}

function imprimir() {
  if (!rows.value.length) return
  window.print()
}

function exportar() {
  if (!visibleRows.value.length) return
  const sheet = XLSX.utils.json_to_sheet(
    visibleRows.value.map(r => ({
      Factura: r.factura,
      Codigo: r.codigo,
      Nombre: r.nombre,
      Fecha: r.fecha,
      Valor: r.valor,
      'Tipo glosa': r.tipoGlosa,
      'Tipo atención': r.tipoAtencion,
      Estado: r.estado,
      Observaciones: r.observaciones.length
    }))
  )
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Trazabilidad')
  XLSX.writeFile(workbook, 'trazabilidad_glosas.xlsx')
}

const snackbar = ref(false)
const snackbarText = ref('')
function avisoBackend(texto) {
  snackbarText.value = texto || 'Función disponible al conectar con el backend.'
  snackbar.value = true
}

function salir() {
  // La navegación real (por ejemplo router.push a home) se resuelve en el componente padre.
  emit('salir')
}

// ============================================================
// F3 - AGREGAR OBSERVACIÓN
// ============================================================

const dialogObservacion = ref(false)
const nuevaObservacion = ref('')

function abrirObservacion() {
  if (!filaActiva.value) {
    errorMessage.value = 'Seleccione (haga click en) una factura de la tabla para agregar una observación.'
    return
  }
  nuevaObservacion.value = ''
  dialogObservacion.value = true
}

function guardarObservacion() {
  if (!nuevaObservacion.value.trim()) return
  filaActiva.value.observaciones.push({
    fecha: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
    usuario: usuarioActual.value,
    observacion: nuevaObservacion.value.trim()
  })
  dialogObservacion.value = false
  message.value = `Observación agregada a la factura ${filaActiva.value.factura}.`
}

// ============================================================
// F5 - CONSULTAR DETALLE
// ============================================================

const dialogDetalle = ref(false)
const tabsDetalle = ref('observaciones')

function abrirDetalle() {
  if (!filaActiva.value) {
    errorMessage.value = 'Seleccione (haga click en) una factura de la tabla para consultar su detalle.'
    return
  }
  tabsDetalle.value = 'observaciones'
  dialogDetalle.value = true
}

const pendienteTramite = computed(() => {
  if (!filaActiva.value) return 0
  return filaActiva.value.valor - filaActiva.value.aceptado - filaActiva.value.rechazado
})

// ============================================================
// ATAJOS DE TECLADO (F3 / F5 / F8)
// ============================================================

function onKeydown(event) {
  if (event.key === 'F3') {
    event.preventDefault()
    abrirObservacion()
  } else if (event.key === 'F5') {
    event.preventDefault()
    abrirDetalle()
  } else if (event.key === 'F8') {
    event.preventDefault()
    soloNoAceptadas.value = !soloNoAceptadas.value
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// ============================================================
// AYUDA
// ============================================================

const dialogAyuda = ref(false)
const ayudas = ref([
  { titulo: 'Asignar / Recibir', texto: 'Define si esta sesión trabaja sobre glosas que usted asigna a otro responsable, o glosas que usted recibe de otro usuario.' },
  { titulo: 'Filtros y Consultar', texto: 'Ajuste institución, convenio, tipo de glosa, tipo de atención y rango de fechas, luego use "Consultar" para cargar el listado.' },
  { titulo: 'F3 - Agregar observación', texto: 'Con una factura seleccionada (click sobre la fila), abre una ventana para registrar una nueva observación de trazabilidad.' },
  { titulo: 'F5 - Consultar detalle', texto: 'Con una factura seleccionada, muestra el detalle completo de la glosa junto con sus observaciones, glosas y trazabilidad.' },
  { titulo: 'F8 - Glosas no aceptadas', texto: 'Alterna el filtro para mostrar únicamente las glosas cuyo valor aceptado es cero.' },
  { titulo: 'Marcar Todas / Seleccionadas', texto: 'El check de cada fila y "Marcar Todas" definen el lote de facturas que se verá afectado por "Grabar".' },
  { titulo: 'Pasar a / Responsable / Grabar', texto: 'Define el nuevo estado y el responsable, y "Grabar" aplica el cambio a todas las facturas seleccionadas.' },
  { titulo: 'Exportar', texto: 'Descarga en Excel el listado actualmente visible en la tabla, respetando los filtros aplicados.' }
])
function abrirAyuda() {
  dialogAyuda.value = true
}
</script>

<template>
  <div class="file-load-page">
    <div class="view-heading">
      <div>
        <div class="eyebrow">Gestión de conciliación</div>
        <h1>Trazabilidad de glosas</h1>
        <p>Asigne o reciba glosas, consulte su detalle y registre las observaciones del proceso.</p>
      </div>
      <v-btn class="help-button" icon="mdi-help-circle-outline" variant="tonal" size="small" title="Ayuda" @click="abrirAyuda" />
    </div>

    <v-card class="file-panel surface-border">
      <v-card-text>
        <!-- ================= ENCABEZADO / FILTROS ================= -->
        <div class="filtros-panel">
          <v-row align="center">
            <v-col cols="12" md="8">
              <v-radio-group v-model="tipoOperacion" inline density="compact" hide-details>
                <v-radio label="Asignar" value="asignar" />
                <v-radio label="Recibir" value="recibir" />
              </v-radio-group>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field :model-value="estadoActual" label="Estado" density="compact" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="usuarioActual" label="Usuario" density="compact" readonly />
            </v-col>
          </v-row>

          <v-row align="center">
            <v-col cols="6" md="2">
              <v-text-field v-model.number="grupo" type="number" label="Grupo" density="compact" />
            </v-col>
            <v-col cols="6" md="4">
              <v-select v-model="institucion" label="Institución" :items="instituciones" density="compact" />
            </v-col>
            <v-col cols="12" md="6" class="convenio-col">
              <v-select v-model="convenio" label="Convenio" :items="convenios" density="compact" />
              <v-btn icon="mdi-magnify" color="primary" size="small" variant="tonal" title="Buscar convenio" @click="avisoBackend('Búsqueda avanzada de convenios disponible al conectar con el backend.')" />
            </v-col>
          </v-row>

          <v-row align="end">
            <v-col cols="12" md="3">
              <v-text-field v-model="noComunicado" label="No. de Comunicado" density="compact" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="tipoGlosaFiltro" label="Tipo glosa" :items="tiposGlosa" density="compact" clearable />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="tipoAtencionFiltro" label="Tipo de atención" :items="tiposAtencion" density="compact" clearable />
            </v-col>
            <v-col cols="6" md="1">
              <v-text-field v-model="fechaInicial" type="date" label="Inicial" density="compact" />
            </v-col>
            <v-col cols="6" md="1">
              <v-text-field v-model="fechaFinal" type="date" label="Final" density="compact" />
            </v-col>
            <v-col cols="12" md="1" class="action-group">
              <v-btn icon="mdi-magnify" color="primary" :loading="buscando" title="Consultar" @click="consultar" />
            </v-col>
          </v-row>
        </div>

        <!-- ================= BARRA DE TABLA ================= -->
        <div class="table-toolbar">
          <v-checkbox v-model="todasMarcadas" label="Marcar Todas" density="compact" hide-details />
          <v-text-field v-model="facturaBuscar" label="No. Factura" density="compact" hide-details class="table-toolbar-search" />
          <v-checkbox v-model="soloNoAceptadas" density="compact" hide-details class="no-aceptadas-toggle">
            <template #label><span class="no-aceptadas-label">Glosas no aceptadas (F8)</span></template>
          </v-checkbox>
          <v-spacer />
          <v-btn variant="outlined" prepend-icon="mdi-file-excel-outline" :disabled="!visibleRows.length" @click="exportar">Exportar</v-btn>
        </div>

        <v-alert v-if="message" type="success" variant="tonal" density="compact" class="mt-2">{{ message }}</v-alert>
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-2">{{ errorMessage }}</v-alert>

        <!-- ================= TABLA ================= -->
        <div class="table-wrap mt-3">
          <v-table density="compact" class="compact-table file-table">
            <thead>
              <tr>
                <th class="check-column"></th>
                <th>Factura</th>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Valor</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!visibleRows.length">
                <td colspan="7" class="empty-state">Use "Consultar" para cargar las glosas del filtro seleccionado.</td>
              </tr>
              <tr
                v-for="row in visibleRows"
                v-else
                :key="row.key"
                :class="{ 'row-active': filaActiva?.key === row.key, 'row-selected': row.selected }"
                @click="activarFila(row)"
              >
                <td class="check-column"><v-checkbox-btn v-model="row.selected" density="compact" @click.stop /></td>
                <td>{{ row.factura }}</td>
                <td class="mono">{{ row.codigo }}</td>
                <td class="nombre-cell">{{ row.nombre }}</td>
                <td>{{ row.fecha }}</td>
                <td class="mono">{{ formatCurrency(row.valor) }}</td>
                <td>{{ row.observaciones.length ? `${row.observaciones.length} registrada(s)` : '—' }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- ================= ACCESOS RÁPIDOS Y CONTADORES ================= -->
        <div class="shortcuts-row mt-3">
          <div class="shortcuts-hints">
            <span class="shortcut-hint" @click="abrirObservacion">F3 - Agregar observaciones</span>
            <span class="shortcut-hint" @click="abrirDetalle">F5 - Consultar detalle de la Factura</span>
          </div>
          <div class="totals-group">
            <div class="total-box">
              <span class="total-label">Glosas</span>
              <span class="total-value">{{ visibleRows.length }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">Seleccionadas</span>
              <span class="total-value">{{ seleccionadas.length }}</span>
            </div>
          </div>
        </div>

        <!-- ================= PASO DE ESTADO ================= -->
        <v-row class="mt-2" align="end">
          <v-col cols="12" md="6">
            <v-text-field v-model="pasarA" label="Pasar a" density="compact" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="responsable" label="Responsable" :items="usuarios" density="compact" />
          </v-col>
        </v-row>

        <!-- ================= ACCIONES ================= -->
        <div class="bottom-actions">
          <v-btn color="primary" prepend-icon="mdi-content-save-outline" @click="grabar">Grabar</v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-printer-outline" :disabled="!rows.length" @click="imprimir">Imprimir</v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-account-group-outline" @click="avisoBackend('La gestión de grupos estará disponible al conectar con el backend.')">Grupos</v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-magnify" :loading="buscando" @click="consultar">Consultar</v-btn>
          <v-btn color="error" variant="outlined" prepend-icon="mdi-exit-to-app" @click="salir">Salir</v-btn>
          <v-checkbox v-model="ordenarPorGlosa" label="Ordenar por glosa" density="compact" hide-details class="ml-2" />
        </div>
      </v-card-text>
    </v-card>

    <!-- ================= F3: AGREGAR OBSERVACIÓN ================= -->
    <v-dialog v-model="dialogObservacion" max-width="520">
      <v-card v-if="filaActiva">
        <v-card-title class="dialog-title">Agregar observación</v-card-title>
        <v-card-text>
          <div class="observacion-meta">
            <div class="observacion-meta-item">
              <span class="observacion-meta-label">Código</span>
              <span class="observacion-meta-value mono">{{ filaActiva.codigo }}</span>
            </div>
            <div class="observacion-meta-item">
              <span class="observacion-meta-label">No. Factura</span>
              <span class="observacion-meta-value">{{ filaActiva.factura }}</span>
            </div>
          </div>
          <div class="observacion-descripcion mt-2">{{ filaActiva.nombre }}</div>
          <v-textarea v-model="nuevaObservacion" label="Observación" rows="4" class="mt-3" autofocus />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogObservacion = false">Cancelar</v-btn>
          <v-btn color="primary" :disabled="!nuevaObservacion.trim()" @click="guardarObservacion">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ================= F5: CONSULTAR DETALLE ================= -->
    <v-dialog v-model="dialogDetalle" max-width="800" scrollable>
      <v-card v-if="filaActiva">
        <v-card-title class="dialog-title">Consultar detalle de la glosa</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field :model-value="filaActiva.factura" label="No. Factura" density="compact" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="filaActiva.codigo" label="Codigo" density="compact" readonly />
            </v-col>
          </v-row>
          <v-textarea :model-value="filaActiva.nombre" label="Concepto" density="compact" readonly rows="2" auto-grow />

          <div class="detalle-stats mt-2">
            <div class="detalle-stat">
              <span class="detalle-stat-label">Fecha Glosa</span>
              <span class="detalle-stat-value">{{ filaActiva.fecha }}</span>
            </div>
            <div class="detalle-stat">
              <span class="detalle-stat-label">Valor Glosas</span>
              <span class="detalle-stat-value mono">{{ formatCurrency(filaActiva.valor) }}</span>
            </div>
            <div class="detalle-stat">
              <span class="detalle-stat-label">Valor Nuevo Hallazgo</span>
              <span class="detalle-stat-value mono">{{ formatCurrency(filaActiva.valorNuevoHallazgo) }}</span>
            </div>
            <div class="detalle-stat">
              <span class="detalle-stat-label">Aceptado</span>
              <span class="detalle-stat-value mono text-success">{{ formatCurrency(filaActiva.aceptado) }}</span>
            </div>
            <div class="detalle-stat">
              <span class="detalle-stat-label">Rechazado</span>
              <span class="detalle-stat-value mono text-error">{{ formatCurrency(filaActiva.rechazado) }}</span>
            </div>
            <div class="detalle-stat">
              <span class="detalle-stat-label">Pendiente Trámite</span>
              <span class="detalle-stat-value mono">{{ formatCurrency(pendienteTramite) }}</span>
            </div>
          </div>

          <v-row class="mt-2">
            <v-col cols="12" md="6">
              <v-text-field :model-value="filaActiva.estado" label="Estado" density="compact" readonly class="estado-field" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="usuarioActual" label="Usuario" density="compact" readonly />
            </v-col>
          </v-row>

          <v-tabs v-model="tabsDetalle" class="mt-3" density="compact">
            <v-tab value="observaciones">Observaciones</v-tab>
            <v-tab value="glosas">Glosas</v-tab>
            <v-tab value="trazabilidad">Trazabilidad</v-tab>
          </v-tabs>
          <v-divider />

          <v-window v-model="tabsDetalle" class="mt-2">
            <v-window-item value="observaciones">
              <div class="table-wrap">
                <v-table density="compact" class="compact-table">
                  <thead><tr><th>Campo 1</th><th>Campo 2</th><th>Campo 3</th></tr></thead>
                  <tbody>
                    <tr v-if="!filaActiva.observaciones.length"><td colspan="3" class="empty-state">Sin registros.</td></tr>
                    <tr v-for="(obs, index) in filaActiva.observaciones" v-else :key="index">
                      <td>{{ obs.fecha }}</td>
                      <td>{{ obs.usuario }}</td>
                      <td>{{ obs.observacion }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </div>
            </v-window-item>

            <v-window-item value="glosas">
              <div class="table-wrap">
                <v-table density="compact" class="compact-table">
                  <thead><tr><th>Campo 1</th><th>Campo 2</th><th>Campo 3</th></tr></thead>
                  <tbody><tr><td colspan="3" class="empty-state">Sin registros.</td></tr></tbody>
                </v-table>
              </div>
            </v-window-item>

            <v-window-item value="trazabilidad">
              <div class="table-wrap">
                <v-table density="compact" class="compact-table">
                  <thead><tr><th>Campo 1</th><th>Campo 2</th><th>Campo 3</th></tr></thead>
                  <tbody><tr><td colspan="3" class="empty-state">Sin registros.</td></tr></tbody>
                </v-table>
              </div>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="error" variant="outlined" prepend-icon="mdi-exit-to-app" @click="dialogDetalle = false">Salir</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ================= AYUDA ================= -->
    <v-dialog v-model="dialogAyuda" max-width="680">
      <v-card>
        <v-card-title class="dialog-title">Ayuda - Trazabilidad de glosas</v-card-title>
        <v-card-text>
          <div v-for="(ayuda, index) in ayudas" :key="index" class="help-item">
            <div class="help-title">{{ ayuda.titulo }}</div>
            <div class="help-text">{{ ayuda.texto }}</div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogAyuda = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" color="primary" location="bottom" timeout="3000">{{ snackbarText }}</v-snackbar>
  </div>
</template>

<style scoped>
/* ============================================================
   ESTRUCTURA GENERAL
   ============================================================ */
.file-load-page { padding: 18px 22px 32px; }

.view-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 16px; }
.eyebrow { color: #526873; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
h1 { margin: 3px 0 5px; color: #1b3446; font-size: 24px; }
.view-heading p { margin: 0; color: #526873; font-size: 14px; }
.help-button { flex-shrink: 0; }

.file-panel { background: #fff; }

/* ============================================================
   PANEL DE FILTROS
   ============================================================ */
.filtros-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #9bb0bb;
  border-radius: 6px;
  background: #f5f8f9;
}
.convenio-col { display: flex; align-items: center; gap: 8px; }
.convenio-col .v-select { flex: 1; }

/* ============================================================
   BARRA DE TABLA
   ============================================================ */
.table-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 8px; }
.table-toolbar-search { max-width: 200px; }
.no-aceptadas-toggle { flex-shrink: 0; }
.no-aceptadas-label { color: #8a6d1a; font-weight: 600; font-size: 13px; background: #fff6d8; padding: 2px 8px; border-radius: 4px; }

/* ============================================================
   BOTONES
   ============================================================ */
.action-group { display: flex; align-items: center; }
.bottom-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 16px; }

/* ============================================================
   TABLA
   ============================================================ */
.table-wrap { overflow-x: auto; border: 1px solid #8da6b3; border-radius: 6px; }
.file-table { min-width: 900px; }
.file-table th { background: #c9dbe4 !important; border-bottom: 2px solid #7f9aa8 !important; }
.file-table td, .file-table th { padding: 8px 10px !important; white-space: nowrap; }
.nombre-cell { white-space: normal; min-width: 260px; }
.check-column { width: 42px; min-width: 42px; }
.empty-state { height: 80px; color: #647983; text-align: center; }
.row-selected { background: #fff6dc; }
.row-active { outline: 2px solid #3d6a86; outline-offset: -2px; }
.mono { font-variant-numeric: tabular-nums; }

/* ============================================================
   ACCESOS RÁPIDOS Y TOTALES
   ============================================================ */
.shortcuts-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; }
.shortcuts-hints { display: flex; flex-direction: column; gap: 4px; }
.shortcut-hint { color: #b3261e; font-size: 12.5px; font-weight: 600; cursor: pointer; width: fit-content; }
.shortcut-hint:hover { text-decoration: underline; }

.totals-group { display: flex; gap: 14px; }
.total-box { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 110px; padding: 8px 18px; border: 1px solid #9bb0bb; border-radius: 8px; background: #eef3f5; }
.total-label { font-size: 12px; color: #526873; }
.total-value { font-size: 18px; font-weight: 700; color: #1b3446; font-variant-numeric: tabular-nums; }

/* ============================================================
   MODALES
   ============================================================ */
.dialog-title { color: #1b3446; font-weight: 600; border-bottom: 1px solid #d3dde1; }

.observacion-meta { display: flex; gap: 20px; }
.observacion-meta-item { display: flex; flex-direction: column; gap: 2px; }
.observacion-meta-label { font-size: 11px; color: #7f939c; text-transform: uppercase; letter-spacing: 0.4px; }
.observacion-meta-value { font-size: 14px; color: #1b3446; font-weight: 600; }
.observacion-descripcion { font-size: 13px; color: #526873; line-height: 1.5; }

.detalle-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
.detalle-stat { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border: 1px solid #d3dde1; border-radius: 6px; background: #f5f8f9; }
.detalle-stat-label { font-size: 11px; color: #7f939c; text-transform: uppercase; letter-spacing: 0.3px; }
.detalle-stat-value { font-size: 13.5px; color: #1b3446; font-weight: 600; }
.estado-field :deep(input) { font-weight: 700; }

.help-item { padding: 12px 0; border-bottom: 1px solid #d3dde1; }
.help-item:last-child { border-bottom: none; }
.help-title { margin-bottom: 4px; color: #1b3446; font-weight: 600; }
.help-text { color: #526873; font-size: 13px; line-height: 1.5; }

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 700px) {
  .file-load-page { padding: 12px; }
  .view-heading { flex-direction: column; }
  h1 { font-size: 20px; }
  .table-toolbar-search { max-width: 100%; }
}
</style>