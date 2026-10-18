<script setup>
import { ref, computed } from 'vue'

// ============================================================
// ACTA DE CONCILIACIÓN - PROTOTIPO
// Simulación local para reemplazar posteriormente por servicios/API
// ============================================================

// --- Filtros ---
const sede = ref('FUNDACION SAN JOSE DE BUGA')
const sedes = ['FUNDACION SAN JOSE DE BUGA', 'FUNDACION SAN JOSE DE TULUÁ']

const empresa = ref('NUEVA EPS - CONTRIBUTIVO')
const empresas = ['NUEVA EPS - CONTRIBUTIVO', 'SALUD TOTAL EPS', 'SURA EPS']

const tipoEntidad = ref('convenio')

const auditorInterno = ref('DIANA MARCELA JIMENEZ DELGADO')
const auditoresInternos = ['DIANA MARCELA JIMENEZ DELGADO', 'Auditor interno 2', 'Auditor interno 3']

// --- Fechas ---
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
const fechaInicial = ref(todayISO())
const fechaFinal = ref(todayISO())

// --- Acta ---
const actaNumero = ref('3')
const actaSeleccionada = ref('3')
const fechaActa = ref('2025-07-02')
const estadoActa = ref('Abierta')

// --- Mensajes ---
const buscando = ref(false)
const message = ref('')
const errorMessage = ref('')

// ============================================================
// SIMULACIÓN DE INFORMACIÓN
// ============================================================

// Facturas que NO pertenecen a ninguna acta. Estas son las que retorna
// el botón "Buscar" por rango de fechas.
const facturasDisponibles = [
  { factura: 'FA103641', fecha: '03/07/2025', codGlosa: '821', valorInicial: 185000, valorAceptado: 85000, valorRechazado: 100000, valorTotalAceptado: 85000, valorTotalRechazado: 100000, estado: 'PENDIENTE' },
  { factura: 'FA103642', fecha: '05/07/2025', codGlosa: '834', valorInicial: 312000, valorAceptado: 0, valorRechazado: 312000, valorTotalAceptado: 0, valorTotalRechazado: 312000, estado: 'PENDIENTE' },
  { factura: 'FA103643', fecha: '08/07/2025', codGlosa: '849', valorInicial: 169600, valorAceptado: 169600, valorRechazado: 0, valorTotalAceptado: 169600, valorTotalRechazado: 0, estado: 'PENDIENTE' },
  { factura: 'FA103644', fecha: '12/07/2025', codGlosa: '834', valorInicial: 225000, valorAceptado: 125000, valorRechazado: 100000, valorTotalAceptado: 125000, valorTotalRechazado: 100000, estado: 'PENDIENTE' }
]

// Actas existentes. Cada acta contiene las facturas actualmente asociadas.
const actasMock = {
  '1': {
    numero: '1',
    fecha: '2025-06-18',
    estado: 'CERRADA',
    facturas: [
      { factura: 'FA100241', fecha: '01/06/2025', codGlosa: '849', valorInicial: 169600, valorAceptado: 169600, valorRechazado: 0, valorTotalAceptado: 169600, valorTotalRechazado: 0, estado: 'CERRADA' },
      { factura: 'FA100355', fecha: '04/06/2025', codGlosa: '834', valorInicial: 312000, valorAceptado: 0, valorRechazado: 312000, valorTotalAceptado: 0, valorTotalRechazado: 312000, estado: 'CERRADA' }
    ]
  },
  '2': {
    numero: '2',
    fecha: '2025-06-25',
    estado: 'CERRADA',
    facturas: [
      { factura: 'FA101120', fecha: '18/06/2025', codGlosa: '821', valorInicial: 48500, valorAceptado: 48500, valorRechazado: 0, valorTotalAceptado: 48500, valorTotalRechazado: 0, estado: 'CERRADA' }
    ]
  },
  '3': {
    numero: '3',
    fecha: '2025-07-02',
    estado: 'ABIERTA',
    facturas: [
      { factura: 'FA100268', fecha: '01/05/2021', codGlosa: '849', valorInicial: 16960, valorAceptado: 16960, valorRechazado: 0, valorTotalAceptado: 16960, valorTotalRechazado: 0, estado: 'CERRADA' },
      { factura: 'FA103640', fecha: '18/05/2021', codGlosa: '834', valorInicial: 31200, valorAceptado: 0, valorRechazado: 31200, valorTotalAceptado: 0, valorTotalRechazado: 31200, estado: 'CERRADA' }
    ]
  },
  '4': { numero: '4', fecha: '2025-07-15', estado: 'ABIERTA', facturas: [] }
}

const actas = ref({ ...actasMock })

// Opciones del v-select de actas.
const actasDisponibles = computed(() =>
  Object.values(actas.value).map(acta => ({ title: `Acta ${acta.numero}`, value: acta.numero }))
)

const rows = ref([])

// ============================================================
// MODAL BUSCAR ACTA
// ============================================================

const dialogBuscarActa = ref(false)
const numeroActaBusqueda = ref('')
const resultadosActa = ref([])

function abrirBusquedaActa() {
  numeroActaBusqueda.value = ''
  resultadosActa.value = Object.values(actas.value)
  dialogBuscarActa.value = true
}

function buscarActaPorNumero() {
  const numero = numeroActaBusqueda.value.trim()
  if (!numero) {
    resultadosActa.value = Object.values(actas.value)
    return
  }

  resultadosActa.value = Object.values(actas.value).filter(acta => acta.numero.includes(numero))
  errorMessage.value = resultadosActa.value.length ? '' : `No se encontró un acta con el número ${numero}.`
}

function seleccionarActa(acta) {
  actaNumero.value = acta.numero
  actaSeleccionada.value = acta.numero
  cargarActa(acta.numero)
  dialogBuscarActa.value = false
}

function cargarActa(numero) {
  if (!numero) {
    rows.value = []
    return
  }

  const acta = actas.value[numero]
  if (!acta) {
    rows.value = []
    errorMessage.value = `El acta ${numero} no existe.`
    return
  }

  actaNumero.value = acta.numero
  fechaActa.value = acta.fecha
  estadoActa.value = acta.estado
  rows.value = acta.facturas.map((row, index) => ({ ...row, key: `${row.factura}-${index}`, selected: false }))

  message.value = `Acta ${numero} cargada. ${rows.value.length} factura(s) asociada(s).`
  errorMessage.value = ''
}

// ============================================================
// BUSCAR FACTURAS NO ASOCIADAS A ACTA
// ============================================================

function buscarFacturas() {
  buscando.value = true
  message.value = ''
  errorMessage.value = ''

  setTimeout(() => {
    // En el prototipo se simula que estas facturas no están asociadas a ninguna acta.
    rows.value = facturasDisponibles.map((item, index) => ({ ...item, key: `disponible-${item.factura}-${index}`, selected: false }))
    buscando.value = false
    message.value = `${rows.value.length} factura(s) encontrada(s) sin acta asociada entre ${formatearFecha(fechaInicial.value)} y ${formatearFecha(fechaFinal.value)}.`
  }, 350)
}

// ============================================================
// SELECCIÓN
// ============================================================

const todosSeleccionados = computed({
  get: () => rows.value.length > 0 && rows.value.every(row => row.selected),
  set: value => rows.value.forEach(row => { row.selected = value })
})

const selectedRows = computed(() => rows.value.filter(row => row.selected))

// ============================================================
// ACTA
// ============================================================

function generarActa() {
  const numero = actaNumero.value.trim()
  if (!numero) {
    errorMessage.value = 'Ingrese el número del acta.'
    return
  }
  if (!/^\d{1,5}$/.test(numero)) {
    errorMessage.value = 'El número de acta debe contener máximo 5 dígitos.'
    return
  }
  if (actas.value[numero]) {
    errorMessage.value = `El acta ${numero} ya existe.`
    return
  }

  actas.value[numero] = { numero, fecha: fechaActa.value, estado: 'ABIERTA', facturas: [] }
  actaSeleccionada.value = numero
  estadoActa.value = 'ABIERTA'
  rows.value = []
  message.value = `Acta ${numero} generada correctamente.`
  errorMessage.value = ''
}

function abrirActa() {
  if (!actaSeleccionada.value) {
    errorMessage.value = 'Seleccione un acta para abrir.'
    return
  }
  cargarActa(actaSeleccionada.value)
}

function cerrarActa() {
  const numero = actaNumero.value
  if (!numero || !actas.value[numero]) {
    errorMessage.value = 'Seleccione un acta válida.'
    return
  }
  if (!actas.value[numero].facturas.length) {
    errorMessage.value = 'No se puede cerrar un acta sin facturas asociadas.'
    return
  }

  actas.value[numero].estado = 'CERRADA'
  estadoActa.value = 'CERRADA'
  rows.value.forEach(row => { row.estado = 'CERRADA' })
  message.value = `Acta ${numero} cerrada correctamente.`
  errorMessage.value = ''
}

// ============================================================
// AGREGAR / QUITAR FACTURAS
// ============================================================

function agregarSeleccionadas() {
  const numero = actaNumero.value
  if (!numero || !actas.value[numero]) {
    errorMessage.value = 'Seleccione o genere un acta antes de agregar facturas.'
    return
  }
  if (actas.value[numero].estado === 'CERRADA') {
    errorMessage.value = 'El acta está cerrada y no permite agregar facturas.'
    return
  }
  if (!selectedRows.value.length) {
    errorMessage.value = 'Seleccione al menos una factura para agregar al acta.'
    return
  }

  const seleccionadas = selectedRows.value.map(row => ({
    factura: row.factura,
    fecha: row.fecha,
    codGlosa: row.codGlosa,
    valorInicial: row.valorInicial,
    valorAceptado: row.valorAceptado,
    valorRechazado: row.valorRechazado,
    valorTotalAceptado: row.valorTotalAceptado,
    valorTotalRechazado: row.valorTotalRechazado,
    estado: 'ABIERTA'
  }))

  const existentes = new Set(actas.value[numero].facturas.map(row => row.factura))
  const nuevas = seleccionadas.filter(row => !existentes.has(row.factura))
  actas.value[numero].facturas.push(...nuevas)

  // Después de agregar, se muestra el contenido del acta.
  cargarActa(numero)
  message.value = nuevas.length > 0 ? `${nuevas.length} factura(s) agregada(s) al acta ${numero}.` : 'Las facturas seleccionadas ya pertenecen al acta.'
  errorMessage.value = ''
}

function quitarSeleccionadas() {
  const numero = actaNumero.value
  if (!numero || !actas.value[numero]) {
    errorMessage.value = 'Seleccione un acta válida.'
    return
  }
  if (actas.value[numero].estado === 'CERRADA') {
    errorMessage.value = 'El acta está cerrada y no permite retirar facturas.'
    return
  }
  if (!selectedRows.value.length) {
    errorMessage.value = 'Seleccione al menos una factura para quitar.'
    return
  }

  const facturasQuitar = new Set(selectedRows.value.map(row => row.factura))
  const cantidadAntes = actas.value[numero].facturas.length
  actas.value[numero].facturas = actas.value[numero].facturas.filter(row => !facturasQuitar.has(row.factura))
  const cantidadRetirada = cantidadAntes - actas.value[numero].facturas.length

  cargarActa(numero)
  message.value = `${cantidadRetirada} factura(s) retirada(s) del acta ${numero}.`
  errorMessage.value = ''
}

// ============================================================
// TOTALES
// ============================================================

const totalInicial = computed(() => rows.value.reduce((sum, row) => sum + Number(row.valorInicial || 0), 0))
const totalAceptado = computed(() => rows.value.reduce((sum, row) => sum + Number(row.valorAceptado || 0), 0))
const totalRechazado = computed(() => rows.value.reduce((sum, row) => sum + Number(row.valorRechazado || 0), 0))
const totalAceptadoFinal = computed(() => rows.value.reduce((sum, row) => sum + Number(row.valorTotalAceptado || 0), 0))
const totalRechazadoFinal = computed(() => rows.value.reduce((sum, row) => sum + Number(row.valorTotalRechazado || 0), 0))

// ============================================================
// AYUDA
// ============================================================

const dialogAyuda = ref(false)
const ayudas = ref([
  { titulo: 'Seleccionar un acta', texto: 'El listado de actas permite seleccionar un acta existente. Al seleccionar un acta, la tabla muestra las facturas que actualmente están asociadas a ella.' },
  { titulo: 'Buscar facturas', texto: 'La opción Buscar consulta las facturas que no se encuentran asociadas a ninguna acta, utilizando la sede, empresa, auditor y rango de fechas seleccionados.' },
  { titulo: 'Agregar facturas', texto: 'Permite asociar al acta seleccionada las facturas marcadas en la tabla.' },
  { titulo: 'Quitar facturas', texto: 'Permite retirar del acta seleccionada las facturas marcadas en la tabla. Esta acción está disponible mientras el acta permanezca abierta.' },
  { titulo: 'Generar acta', texto: 'Crea un nuevo número de acta en estado abierta. El número de acta admite máximo cinco dígitos.' },
  { titulo: 'Cerrar acta', texto: 'Cierra el acta seleccionada e impide agregar o retirar facturas.' }
])

function abrirAyuda() {
  dialogAyuda.value = true
}

// ============================================================
// UTILIDADES
// ============================================================

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function formatearFecha(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function imprimir() {
  if (!rows.value.length) return
  window.print()
}
</script>

<template>
  <div class="file-load-page">
    <div class="view-heading">
      <div>
        <div class="eyebrow">Gestión de conciliación</div>
        <h1>Generación de actas de conciliación por rangos de fecha</h1>
        <p>Consulte las facturas disponibles, asígnelas a un acta de conciliación y gestione su estado.</p>
      </div>
      <v-btn class="help-button" icon="mdi-help-circle-outline" variant="tonal" size="small" title="Ayuda" @click="abrirAyuda" />
    </div>

    <v-card class="file-panel surface-border">
      <v-card-text>
        <v-row class="main-row">
          <!-- ================= FILTROS ================= -->
          <v-col cols="12" md="7">
            <div class="filtros-panel">
              <div class="marcar-title">Filtros de búsqueda</div>

              <v-row align="center">
                <v-col cols="12" md="7">
                  <v-select v-model="sede" label="Sede" :items="sedes" density="compact" />
                </v-col>
                <v-col cols="12" md="5">
                  <v-radio-group v-model="tipoEntidad" inline density="compact" hide-details>
                    <v-radio label="Convenio" value="convenio" />
                    <v-radio label="Institución" value="institucion" />
                  </v-radio-group>
                </v-col>
              </v-row>

              <v-select v-model="empresa" label="Empresa" :items="empresas" density="compact" />
              <v-select v-model="auditorInterno" label="Auditor interno" :items="auditoresInternos" density="compact" />

              <!-- ACTA -->
              <v-row align="center">
                <v-col cols="12" md="8">
                  <v-select
                    v-model="actaSeleccionada"
                    label="No. de acta"
                    :items="actasDisponibles"
                    item-title="title"
                    item-value="value"
                    density="compact"
                    @update:model-value="cargarActa"
                  />
                </v-col>
                <v-col cols="12" md="4" class="acta-search-col">
                  <v-btn icon="mdi-magnify" color="primary" size="small" variant="tonal" title="Buscar acta por número" @click="abrirBusquedaActa" />
                </v-col>
              </v-row>

              <!-- RANGO DE FECHAS -->
              <v-row align="end">
                <v-col cols="6" md="3">
                  <v-text-field v-model="fechaInicial" type="date" label="Fecha inicial" density="compact" />
                </v-col>
                <v-col cols="6" md="3">
                  <v-text-field v-model="fechaFinal" type="date" label="Fecha final" density="compact" />
                </v-col>
                <v-col cols="12" md="6" class="action-group">
                  <v-btn color="primary" :loading="buscando" prepend-icon="mdi-magnify" @click="buscarFacturas">Buscar</v-btn>
                  <v-btn variant="outlined" prepend-icon="mdi-printer-outline" :disabled="!rows.length" @click="imprimir">Imprimir</v-btn>
                </v-col>
              </v-row>

              <!-- BOTONES DE GESTIÓN -->
              <div class="action-group management-actions">
                <v-btn size="small" color="success" variant="tonal" prepend-icon="mdi-plus" @click="agregarSeleccionadas">Agregar</v-btn>
                <v-btn size="small" color="error" variant="tonal" prepend-icon="mdi-minus" @click="quitarSeleccionadas">Quitar</v-btn>
              </div>
            </div>
          </v-col>

          <!-- ============== DATOS DEL ACTA ============== -->
          <v-col cols="12" md="5">
            <div class="marcar-panel">
              <div class="marcar-title">Acta de conciliación</div>

              <v-row>
                <v-col cols="6">
                  <v-text-field v-model="actaNumero" label="Número" density="compact" maxlength="5" inputmode="numeric" />
                </v-col>
                <v-col cols="6">
                  <v-text-field v-model="fechaActa" type="date" label="Fecha" density="compact" />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="6">
                  <v-text-field :model-value="estadoActa" label="Estado" density="compact" readonly />
                </v-col>
                <v-col cols="6">
                  <v-text-field :model-value="rows.length" label="Facturas" density="compact" readonly />
                </v-col>
              </v-row>

              <div class="action-group">
                <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-file-plus-outline" @click="generarActa">Generar</v-btn>
                <v-btn size="small" color="primary" variant="outlined" prepend-icon="mdi-folder-open-outline" @click="abrirActa">Abrir</v-btn>
                <v-btn size="small" color="error" variant="flat" prepend-icon="mdi-lock-outline" @click="cerrarActa">Cerrar</v-btn>
              </div>

              <div class="acta-info">
                <div class="acta-info-row">
                  <span>Acta seleccionada</span>
                  <strong>{{ actaSeleccionada || 'Sin seleccionar' }}</strong>
                </div>
                <div class="acta-info-row">
                  <span>Estado actual</span>
                  <strong>{{ estadoActa }}</strong>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-alert v-if="message" type="success" variant="tonal" density="compact" class="mt-2">{{ message }}</v-alert>
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-2">{{ errorMessage }}</v-alert>

        <div class="table-wrap mt-3">
          <v-table density="compact" class="compact-table file-table">
            <thead>
              <tr>
                <th class="check-column"><v-checkbox-btn v-model="todosSeleccionados" density="compact" /></th>
                <th>No. Factura</th>
                <th>Fecha</th>
                <th>Cod. Glosa</th>
                <th>Vr. Ini. Glosa</th>
                <th>Vr. R. Acepta</th>
                <th>Vr. R. Rechaza</th>
                <th>Vr. T. Acepta</th>
                <th>Vr. T. Rechaza</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!rows.length">
                <td colspan="10" class="empty-state">
                  Seleccione un acta para consultar sus facturas o utilice "Buscar" para consultar facturas que aún no se encuentran asociadas a un acta.
                </td>
              </tr>
              <tr v-for="row in rows" v-else :key="row.key" :class="{ 'row-selected': row.selected }">
                <td><v-checkbox-btn v-model="row.selected" density="compact" /></td>
                <td>{{ row.factura }}</td>
                <td>{{ row.fecha }}</td>
                <td>{{ row.codGlosa }}</td>
                <td class="mono">{{ formatCurrency(row.valorInicial) }}</td>
                <td class="mono">{{ formatCurrency(row.valorAceptado) }}</td>
                <td class="mono">{{ formatCurrency(row.valorRechazado) }}</td>
                <td class="mono">{{ formatCurrency(row.valorTotalAceptado) }}</td>
                <td class="mono">{{ formatCurrency(row.valorTotalRechazado) }}</td>
                <td>
                  <v-chip size="small" variant="flat" :color="row.estado === 'CERRADA' ? 'success' : undefined">{{ row.estado }}</v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <div class="bottom-bar mt-3">
          <div class="d-flex align-center ga-2">
            <v-checkbox v-model="todosSeleccionados" density="compact" hide-details />
            <span class="text-body-2">Todos</span>
            <span class="text-caption text-medium-emphasis">{{ rows.length }} factura(s)</span>
          </div>
          <div class="totals-group">
            <div class="total-box">
              <span class="total-label">G. Inicial</span>
              <span class="total-value">{{ formatCurrency(totalInicial) }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">R. Aceptada</span>
              <span class="total-value">{{ formatCurrency(totalAceptado) }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">R. Rechazada</span>
              <span class="total-value">{{ formatCurrency(totalRechazado) }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">Vr. T. Aceptado</span>
              <span class="total-value">{{ formatCurrency(totalAceptadoFinal) }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">Vr. T. Rechazado</span>
              <span class="total-value">{{ formatCurrency(totalRechazadoFinal) }}</span>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- MODAL BUSCAR ACTA -->
    <v-dialog v-model="dialogBuscarActa" max-width="600">
      <v-card>
        <v-card-title class="dialog-title">Buscar acta</v-card-title>
        <v-card-text>
          <div class="dialog-help">Ingrese el número de acta o consulte el listado de actas existentes.</div>
          <div class="dialog-search">
            <v-text-field v-model="numeroActaBusqueda" label="Número de acta" density="compact" maxlength="5" inputmode="numeric" @keyup.enter="buscarActaPorNumero" />
            <v-btn color="primary" prepend-icon="mdi-magnify" @click="buscarActaPorNumero">Buscar</v-btn>
          </div>

          <div class="table-wrap mt-3">
            <v-table density="compact" class="compact-table">
              <thead>
                <tr>
                  <th>Acta</th>
                  <th>Fecha</th>
                  <th>Facturas</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!resultadosActa.length">
                  <td colspan="5" class="empty-state">No existen actas que coincidan con la búsqueda.</td>
                </tr>
                <tr v-for="acta in resultadosActa" v-else :key="acta.numero">
                  <td>{{ acta.numero }}</td>
                  <td>{{ formatearFecha(acta.fecha) }}</td>
                  <td>{{ acta.facturas.length }}</td>
                  <td><v-chip size="small" variant="flat" :color="acta.estado === 'CERRADA' ? 'success' : undefined">{{ acta.estado }}</v-chip></td>
                  <td><v-btn size="small" variant="tonal" @click="seleccionarActa(acta)">Seleccionar</v-btn></td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogBuscarActa = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- MODAL AYUDA -->
    <v-dialog v-model="dialogAyuda" max-width="680">
      <v-card>
        <v-card-title class="dialog-title">Ayuda - Acta de conciliación</v-card-title>
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
.main-row { align-items: stretch; }

/* ============================================================
   PANELES (filtros / acta): misma estructura en columna con
   espaciado uniforme via flex + gap, en vez de márgenes sueltos.
   ============================================================ */
.marcar-panel,
.filtros-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 14px 16px;
  border: 1px solid #9bb0bb;
  border-radius: 6px;
  background: #f5f8f9;
}

.marcar-title { font-weight: 600; color: #1b3446; }

.acta-search-col { display: flex; align-items: center; }

/* ============================================================
   BOTONES
   ============================================================ */
.action-group { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.management-actions { padding-top: 12px; border-top: 1px solid #c7d3d8; }

/* ============================================================
   DATOS DEL ACTA
   ============================================================ */
.acta-info { padding-top: 8px; border-top: 1px solid #c7d3d8; }
.acta-info-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 4px 0; color: #526873; font-size: 13px; }
.acta-info-row strong { color: #1b3446; }

/* ============================================================
   TABLA
   ============================================================ */
.table-wrap { overflow-x: auto; border: 1px solid #8da6b3; border-radius: 6px; }
.file-table { min-width: 1050px; }
.file-table th { background: #c9dbe4 !important; border-bottom: 2px solid #7f9aa8 !important; }
.file-table td, .file-table th { padding: 8px 10px !important; white-space: nowrap; }
.check-column { width: 42px; min-width: 42px; }
.empty-state { height: 80px; color: #647983; text-align: center; }
.row-selected { background: #fff6dc; }
.mono { font-variant-numeric: tabular-nums; }

/* ============================================================
   BARRA INFERIOR Y TOTALES
   ============================================================ */
.bottom-bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
.totals-group { display: flex; flex-wrap: wrap; gap: 14px; }
.total-box { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 155px; padding: 8px 22px; border: 1px solid #9bb0bb; border-radius: 8px; background: #eef3f5; }
.total-label { font-size: 13px; color: #526873; }
.total-value { font-size: 18px; font-weight: 700; color: #1b3446; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* ============================================================
   MODALES
   ============================================================ */
.dialog-title { color: #1b3446; font-weight: 600; border-bottom: 1px solid #d3dde1; }
.dialog-help { margin-bottom: 14px; color: #526873; font-size: 13px; }
.dialog-search { display: flex; align-items: center; gap: 10px; }
.dialog-search .v-text-field { flex: 1; margin-bottom: 0; }
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
  .dialog-search { flex-direction: column; align-items: stretch; }
  .total-box { min-width: 140px; }
}
</style>