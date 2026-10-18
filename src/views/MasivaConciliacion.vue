<script setup>
import { ref, computed, watch } from 'vue'
import * as XLSX from 'xlsx'

const emit = defineEmits(['salir'])

// ============================================================
// CONCILIACIÓN ADMINISTRATIVA - PROTOTIPO
// Simulación local para reemplazar posteriormente por servicios/API
// ============================================================

// --- Filtros ---
const sedes = ['FUNDACION HOSPITAL SAN PEDRO', 'FUNDACION SAN JOSE DE BUGA']
const sede = ref(sedes[0])

const tipoEntidad = ref('convenio') // 'convenio' | 'institucion'
const empresasConvenio = ['ACCIDENTES PERSONALES (PÓLIZAS EDUCATIVA GENERACIÓN POSITIVA)', 'SALUD TOTAL EPS', 'SURA EPS']
const instituciones = ['NUEVA EPS - CONTRIBUTIVO', 'COOMEVA EPS', 'COMPENSAR EPS']
// La lista de "Empresa" depende del tipo de entidad marcado.
const empresaOpciones = computed(() => (tipoEntidad.value === 'institucion' ? instituciones : empresasConvenio))
const empresa = ref(empresaOpciones.value[0])
watch(tipoEntidad, () => { empresa.value = empresaOpciones.value[0] || '' })

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
const fechaInicial = ref(todayISO())
const fechaFinal = ref(todayISO())

const buscando = ref(false)
const message = ref('')
const errorMessage = ref('')

// ============================================================
// SIMULACIÓN DE FACTURAS PENDIENTES DE CONCILIACIÓN
// ============================================================

const facturasPendientes = [
  { factura: 'FA103641', fecha: '03/07/2025', codGlosa: '821', vrFactura: 420000, vrIniGlosa: 185000 },
  { factura: 'FA103642', fecha: '05/07/2025', codGlosa: '834', vrFactura: 560000, vrIniGlosa: 312000 },
  { factura: 'FA103643', fecha: '08/07/2025', codGlosa: '849', vrFactura: 300000, vrIniGlosa: 169600 },
  { factura: 'FA103644', fecha: '12/07/2025', codGlosa: '834', vrFactura: 480000, vrIniGlosa: 225000 },
  { factura: 'FA103645', fecha: '15/07/2025', codGlosa: '105', vrFactura: 210000, vrIniGlosa: 98000 }
]

function filaVacia(item) {
  return { ...item, key: item.factura, vrAceptado: 0, vrRechazado: 0, vrTotal: 0, estado: 'Pendiente', selected: false }
}

const rows = ref([])

function buscarFacturas() {
  buscando.value = true
  message.value = ''
  errorMessage.value = ''

  setTimeout(() => {
    // Prototipo: no filtra realmente por sede/empresa/fecha, solo simula la consulta.
    rows.value = facturasPendientes.map(filaVacia)
    buscando.value = false
    message.value = `${rows.value.length} factura(s) pendiente(s) de conciliación encontrada(s).`
  }, 300)
}

// --- Búsqueda puntual dentro de la tabla ya cargada ---
const facturaBuscar = ref('')
const visibleRows = computed(() => {
  const filtro = facturaBuscar.value.trim().toLowerCase()
  if (!filtro) return rows.value
  return rows.value.filter(row => row.factura.toLowerCase().includes(filtro))
})

function buscarFacturaPuntual() {
  if (facturaBuscar.value && !visibleRows.value.length) {
    errorMessage.value = `No se encontró la factura "${facturaBuscar.value}" en el listado cargado.`
  } else {
    errorMessage.value = ''
  }
}

// ============================================================
// MARCAR / TRAMITAR FACTURAS (doble click o "Seleccionar todos")
// ============================================================

const tipoMarca = ref('aceptaTodo') // 'aceptaTodo' | 'rechazaTodo' | 'valorFijo'
const valorFijo = ref(0)

// Aplica la marca vigente (Acepta todo / Rechaza todo / Valor fijo) a una factura.
function aplicarMarca(row) {
  if (tipoMarca.value === 'aceptaTodo') {
    row.vrAceptado = row.vrIniGlosa
    row.vrRechazado = 0
  } else if (tipoMarca.value === 'rechazaTodo') {
    row.vrAceptado = 0
    row.vrRechazado = row.vrIniGlosa
  } else {
    const fijo = Math.min(Number(valorFijo.value) || 0, row.vrIniGlosa)
    row.vrAceptado = fijo
    row.vrRechazado = row.vrIniGlosa - fijo
  }
  row.vrTotal = row.vrAceptado + row.vrRechazado
  row.estado = 'Tramitada'
  row.selected = true
}

function revertirMarca(row) {
  row.vrAceptado = 0
  row.vrRechazado = 0
  row.vrTotal = 0
  row.estado = 'Pendiente'
  row.selected = false
}

// Doble click sobre una fila: aplica o retira la marca vigente.
function onRowDblClick(row) {
  if (row.estado === 'Tramitada') revertirMarca(row)
  else aplicarMarca(row)
}

const todosSeleccionados = computed({
  get: () => rows.value.length > 0 && rows.value.every(row => row.selected),
  set: value => rows.value.forEach(row => (value ? aplicarMarca(row) : revertirMarca(row)))
})

// ============================================================
// TOTALES
// ============================================================

const vrFacturadoTotal = computed(() => rows.value.reduce((sum, row) => sum + Number(row.vrFactura || 0), 0))
const gInicialTotal = computed(() => rows.value.reduce((sum, row) => sum + Number(row.vrIniGlosa || 0), 0))
const rAceptadaTotal = computed(() => rows.value.reduce((sum, row) => sum + Number(row.vrAceptado || 0), 0))
const rRechazadaTotal = computed(() => rows.value.reduce((sum, row) => sum + Number(row.vrRechazado || 0), 0))
const totalFacturas = computed(() => rows.value.filter(row => row.selected).length)

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

function formatearFecha(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

// ============================================================
// CONCEPTO (Código / Detalle / descripción)
// ============================================================

const conceptos = [
  { codigo: '102', detalle: 'Consultas, interconsultas y atenciones domiciliarias', descripcion: 'Aplica cuando la glosa se genera por servicios de consulta o interconsulta realizados en el domicilio del paciente.' },
  { codigo: '103', detalle: 'Traslado asistencial no cubierto por el plan', descripcion: 'Glosas relacionadas con traslados asistenciales que no están cubiertos por el plan de beneficios contratado.' },
  { codigo: '104', detalle: 'Insumo no incluido en el paquete contratado', descripcion: 'Insumos médico-quirúrgicos facturados por fuera del paquete o la tarifa plena pactada.' },
  { codigo: '105', detalle: 'Servicio no pertinente para la atención', descripcion: 'Servicios o procedimientos que, según la auditoría, no son pertinentes para el diagnóstico registrado.' }
]
const conceptoCodigo = ref(null)
const conceptoActual = computed(() => conceptos.find(c => c.codigo === conceptoCodigo.value) || null)

const resolucion = ref('3047')
const observaciones = ref('')

// --- Auditores ---
const auditoresInternos = ['DIANA MARCELA JIMENEZ DELGADO', 'Auditor interno 2', 'Auditor interno 3']
const auditorInterno = ref(auditoresInternos[0])
const auditoresExternos = ['Auditor externo 1', 'Auditor externo 2']
const auditorExterno = ref(auditoresExternos[0])

// --- Responsable: interno (usuarios/áreas) o externo (empresas) ---
const tipoResponsable = ref('externo') // 'interno' | 'externo'
const usuariosInternos = ['DIANA MARCELA JIMENEZ DELGADO', 'Auditor interno 2', 'Auditor interno 3']
const areasInternas = ['Área - Auditoría Médica', 'Área - Facturación', 'Área - Cartera']
const responsablesInternos = computed(() => [...usuariosInternos, ...areasInternas])
const responsablesExternos = ['SALUD TOTAL EPS', 'SURA EPS', 'NUEVA EPS - CONTRIBUTIVO']
const responsableOpciones = computed(() => (tipoResponsable.value === 'interno' ? responsablesInternos.value : responsablesExternos))
const responsable = ref('')
watch(tipoResponsable, () => { responsable.value = '' })

// ============================================================
// GRABAR / SUBIR ARCHIVO / SALIR
// ============================================================

function grabarRegistro() {
  if (!totalFacturas.value) {
    errorMessage.value = 'Marque o tramite al menos una factura antes de grabar.'
    return
  }
  // TODO: reemplazar por la llamada real al servicio que persiste el registro.
  message.value = `Registro grabado correctamente. ${totalFacturas.value} factura(s) tramitada(s).`
  errorMessage.value = ''
}

const subirArchivoInput = ref(null)
function abrirSelectorArchivo() {
  subirArchivoInput.value?.click()
}

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
}
function findValue(row, names) {
  const entry = Object.entries(row).find(([key]) => names.some(name => normalizeHeader(key).includes(normalizeHeader(name))))
  return entry ? entry[1] : ''
}

// Permite cargar desde Excel las marcas (Vr. Aceptado / Vr. Rechazado) de facturas ya listadas en la tabla.
async function subirArchivo(event) {
  const file = event?.target?.files?.[0]
  if (!file) return

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })

    let actualizadas = 0
    data.forEach(item => {
      const numeroFactura = String(findValue(item, ['no factura', 'numero factura', 'factura'])).trim()
      const row = rows.value.find(r => r.factura === numeroFactura)
      if (!row) return

      row.vrAceptado = Number(findValue(item, ['vr aceptado', 'valor aceptado'])) || 0
      row.vrRechazado = Number(findValue(item, ['vr rechazado', 'valor rechazado'])) || 0
      row.vrTotal = row.vrAceptado + row.vrRechazado
      row.estado = 'Tramitada'
      row.selected = true
      actualizadas += 1
    })

    message.value = `Archivo cargado: ${actualizadas} factura(s) actualizada(s) con su marca.`
    errorMessage.value = actualizadas ? '' : 'El archivo no contenía facturas coincidentes con las cargadas en la tabla.'
  } catch (error) {
    errorMessage.value = error.message || 'No fue posible leer el archivo.'
  } finally {
    event.target.value = ''
  }
}

function salir() {
  // La navegación real (por ejemplo router.push a home) se resuelve en el componente padre.
  emit('salir')
}

// ============================================================
// IMPRESIÓN
// ============================================================

function imprimir() {
  if (!rows.value.length) return
  window.print()
}

// ============================================================
// AYUDA
// ============================================================

const dialogAyuda = ref(false)
const ayudas = ref([
  { titulo: 'Filtros de búsqueda', texto: 'Seleccione sede, empresa (según convenio o institución) y el rango de fechas, luego use "Buscar" para cargar las facturas pendientes de conciliación.' },
  { titulo: 'Buscar una factura puntual', texto: 'Escriba el número de factura en el campo junto al aviso rojo para filtrar el listado ya cargado.' },
  { titulo: 'Marcar', texto: 'Elija "Acepta Todo", "Rechaza Todo" o "Ingrese el valor fijo" (indicando el monto) antes de tramitar una factura; esa es la marca que se aplicará.' },
  { titulo: 'Doble click sobre una factura', texto: 'Aplica la marca vigente a esa factura (o la revierte si ya estaba tramitada) y la suma al total de facturas tramitadas.' },
  { titulo: 'Seleccionar todos', texto: 'Aplica la marca vigente a todas las facturas cargadas; al desmarcar, revierte todas al estado pendiente.' },
  { titulo: 'Código y Detalle', texto: 'Al elegir un concepto en "Detalle" se completa automáticamente su código y se muestra la descripción del concepto.' },
  { titulo: 'Responsable', texto: 'Si la responsabilidad es Interna, se listan usuarios y áreas internas; si es Externa, se listan las empresas.' },
  { titulo: 'Grabar, Subir Archivo y Salir', texto: 'Grabar guarda el registro con las facturas tramitadas. Subir Archivo permite cargar desde Excel las marcas de Vr. Aceptado/Vr. Rechazado por número de factura. Salir cierra el proceso.' }
])
function abrirAyuda() {
  dialogAyuda.value = true
}
</script>

<template>
  <div class="file-load-page">
    <div class="view-heading no-print">
      <div>
        <div class="eyebrow">Gestión de conciliación</div>
        <h1>Registro de glosas para conciliación administrativa</h1>
        <p>Cargue las facturas pendientes de conciliación por rango de fechas, márquelas y registre el resultado.</p>
      </div>
      <v-btn class="help-button" icon="mdi-help-circle-outline" variant="tonal" size="small" title="Ayuda" @click="abrirAyuda" />
    </div>

    <!-- Encabezado exclusivo de impresión: logo, empresa, rango de fechas, auditores y ficha de calidad -->
    <div class="print-header print-only">
      <table class="print-header-table">
        <tbody>
          <tr>
            <td class="print-logo">🏥</td>
            <td class="print-title">SISTEMA DE GESTIÓN DE GLOSAS<br /><small>Conciliación administrativa</small></td>
          </tr>
          <tr><td>Empresa</td><td>{{ empresa }} ({{ sede }})</td></tr>
          <tr><td>Rango de fechas</td><td>{{ formatearFecha(fechaInicial) }} - {{ formatearFecha(fechaFinal) }}</td></tr>
          <tr><td>Auditor interno / externo</td><td>{{ auditorInterno }} / {{ auditorExterno }}</td></tr>
          <tr><td>Documento controlado</td><td>FR-GC-015 · Versión 3 · Uso interno</td></tr>
        </tbody>
      </table>
    </div>

    <v-card class="file-panel surface-border">
      <v-card-text>
        <!-- ================= FILTROS ================= -->
        <div class="filtros-panel no-print">
          <div class="marcar-title">Filtros de búsqueda</div>
          <v-row align="center">
            <v-col cols="12" md="4">
              <v-select v-model="sede" label="Sede" :items="sedes" density="compact" />
            </v-col>
            <v-col cols="12" md="4">
              <v-select v-model="empresa" label="Empresa" :items="empresaOpciones" density="compact" />
            </v-col>
            <v-col cols="12" md="4">
              <v-radio-group v-model="tipoEntidad" inline density="compact" hide-details>
                <v-radio label="Convenio" value="convenio" />
                <v-radio label="Institución" value="institucion" />
              </v-radio-group>
            </v-col>
          </v-row>
          <v-row align="end">
            <v-col cols="6" md="3">
              <v-text-field v-model="fechaInicial" type="date" label="Fecha inicial" density="compact" />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field v-model="fechaFinal" type="date" label="Fecha final" density="compact" />
            </v-col>
            <v-col cols="12" md="6" class="action-group">
              <v-btn color="primary" :loading="buscando" prepend-icon="mdi-magnify" @click="buscarFacturas">Buscar</v-btn>
            </v-col>
          </v-row>
        </div>

        <!-- ================= BARRA DE TABLA ================= -->
        <div class="table-toolbar no-print">
          <span class="table-toolbar-hint">Doble click - Seleccionar facturas a tramitar</span>
          <v-text-field v-model="facturaBuscar" label="Buscar No. Factura" density="compact" hide-details class="table-toolbar-search" @keyup.enter="buscarFacturaPuntual" />
          <v-btn variant="outlined" prepend-icon="mdi-magnify" @click="buscarFacturaPuntual">Buscar</v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-printer-outline" :disabled="!rows.length" @click="imprimir">Imprimir</v-btn>
          <v-checkbox v-model="todosSeleccionados" label="Seleccionar todos" density="compact" hide-details />
        </div>

        <v-alert v-if="message" type="success" variant="tonal" density="compact" class="mt-2 no-print">{{ message }}</v-alert>
        <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mt-2 no-print">{{ errorMessage }}</v-alert>

        <!-- ================= TABLA ================= -->
        <div class="table-wrap mt-3">
          <v-table density="compact" class="compact-table file-table">
            <thead>
              <tr>
                <th class="check-column no-print"></th>
                <th>No. Factura</th>
                <th>Cod. Glosa</th>
                <th>Fecha</th>
                <th>Vr. Ini. Glosa</th>
                <th>Vr. R. Aceptado</th>
                <th>Vr. R. Rechazado</th>
                <th>Estado</th>
                <th class="col-total">Vr. Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!visibleRows.length">
                <td colspan="9" class="empty-state">Use "Buscar" para cargar las facturas pendientes de conciliación.</td>
              </tr>
              <tr v-for="row in visibleRows" v-else :key="row.key" :class="{ 'row-selected': row.selected }" @dblclick="onRowDblClick(row)">
                <td class="check-column no-print"><v-checkbox-btn v-model="row.selected" density="compact" @click="aplicarMarca(row)" /></td>
                <td>{{ row.factura }}</td>
                <td>{{ row.codGlosa }}</td>
                <td>{{ row.fecha }}</td>
                <td class="mono">{{ formatCurrency(row.vrIniGlosa) }}</td>
                <td class="mono">{{ formatCurrency(row.vrAceptado) }}</td>
                <td class="mono">{{ formatCurrency(row.vrRechazado) }}</td>
                <td>
                  <v-chip size="small" variant="flat" :color="row.estado === 'Tramitada' ? 'success' : undefined">{{ row.estado }}</v-chip>
                </td>
                <td class="mono col-total">{{ formatCurrency(row.vrTotal) }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- ================= TOTALES + MARCAR ================= -->
        <div class="totals-marcar-row mt-3">
          <div class="totals-group">
            <div class="total-box">
              <span class="total-label">Vr. Facturado</span>
              <span class="total-value">{{ formatCurrency(vrFacturadoTotal) }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">G. Inicial</span>
              <span class="total-value">{{ formatCurrency(gInicialTotal) }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">R. Aceptadas</span>
              <span class="total-value">{{ formatCurrency(rAceptadaTotal) }}</span>
            </div>
            <div class="total-box">
              <span class="total-label">R. Rechazadas</span>
              <span class="total-value">{{ formatCurrency(rRechazadaTotal) }}</span>
            </div>
          </div>

          <div class="marcar-inline no-print">
            <span class="marcar-title">Marcar:</span>
            <v-radio-group v-model="tipoMarca" inline density="compact" hide-details>
              <v-radio label="Acepta Todo" value="aceptaTodo" />
              <v-radio label="Rechaza Todo" value="rechazaTodo" />
              <v-radio label="Ingrese el valor fijo" value="valorFijo" />
            </v-radio-group>
            <v-text-field v-model="valorFijo" type="number" prefix="$" density="compact" hide-details class="valor-fijo-field" :disabled="tipoMarca !== 'valorFijo'" />
          </div>
        </div>

        <!-- ================= CONCEPTO ================= -->
        <div class="concepto-row no-print">
          <v-text-field :model-value="conceptoActual?.codigo" label="Código" density="compact" readonly class="concepto-codigo" />
          <v-select v-model="conceptoCodigo" label="Detalle" :items="conceptos" item-title="detalle" item-value="codigo" density="compact" class="concepto-detalle" />
          <v-radio-group v-model="resolucion" inline density="compact" hide-details>
            <template #label><span class="mr-2">Resolución:</span></template>
            <v-radio label="3047" value="3047" />
            <v-radio label="2284" value="2284" />
          </v-radio-group>
          <v-text-field :model-value="totalFacturas" label="Total Facturas" density="compact" readonly class="total-facturas-field" />
        </div>

        <div class="concepto-descripcion no-print">
          {{ conceptoActual?.descripcion || 'Seleccione un concepto en "Detalle" para ver aquí su descripción.' }}
        </div>

        <v-textarea v-model="observaciones" label="Observaciones" density="compact" rows="3" class="mt-3 no-print" />

        <!-- ================= AUDITORES Y RESPONSABLE ================= -->
        <v-row class="no-print">
          <v-col cols="12" md="6">
            <v-select v-model="auditorInterno" label="Auditor Interno" :items="auditoresInternos" density="compact" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="auditorExterno" label="Auditor Externo" :items="auditoresExternos" density="compact" />
          </v-col>
        </v-row>

        <div class="responsable-row no-print">
          <span class="marcar-title">Responsable</span>
          <v-radio-group v-model="tipoResponsable" inline density="compact" hide-details>
            <v-radio label="Interno" value="interno" />
            <v-radio label="Externo" value="externo" />
          </v-radio-group>
          <v-select v-model="responsable" :items="responsableOpciones" density="compact" hide-details class="responsable-select" />
        </div>

        <!-- ================= ACCIONES ================= -->
        <div class="bottom-actions no-print">
          <v-btn color="primary" prepend-icon="mdi-content-save-outline" @click="grabarRegistro">Grabar</v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-upload" @click="abrirSelectorArchivo">Subir Archivo</v-btn>
          <input ref="subirArchivoInput" type="file" accept=".xlsx,.xls" class="hidden-input" @change="subirArchivo" />
          <v-btn color="error" variant="outlined" prepend-icon="mdi-exit-to-app" @click="salir">Salir</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- MODAL AYUDA -->
    <v-dialog v-model="dialogAyuda" max-width="680">
      <v-card>
        <v-card-title class="dialog-title">Ayuda - Conciliación administrativa</v-card-title>
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

/* ============================================================
   PANEL DE FILTROS
   ============================================================ */
.filtros-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #9bb0bb;
  border-radius: 6px;
  background: #f5f8f9;
}
.marcar-title { font-weight: 600; color: #1b3446; }

/* ============================================================
   BARRA SUPERIOR DE LA TABLA
   ============================================================ */
.table-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 8px; }
.table-toolbar-hint { color: #c62828; font-weight: 600; font-size: 13px; }
.table-toolbar-search { max-width: 220px; }

/* ============================================================
   BOTONES
   ============================================================ */
.action-group { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.bottom-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
.hidden-input { display: none; }

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
/* La última columna (Vr. Total) se resalta: en el diseño original quedaba oculta por el scroll horizontal. */
.col-total { background: #dcebf1 !important; font-weight: 700; }

/* ============================================================
   TOTALES Y MARCAR
   ============================================================ */
.totals-marcar-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; }
.totals-group { display: flex; flex-wrap: wrap; gap: 14px; }
.total-box { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 140px; padding: 8px 20px; border: 1px solid #9bb0bb; border-radius: 8px; background: #eef3f5; }
.total-label { font-size: 13px; color: #526873; }
.total-value { font-size: 18px; font-weight: 700; color: #1b3446; font-variant-numeric: tabular-nums; white-space: nowrap; }

.marcar-inline { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #9bb0bb; border-radius: 6px; background: #f5f8f9; }
.valor-fijo-field { max-width: 130px; }

/* ============================================================
   CONCEPTO
   ============================================================ */
.concepto-row { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 14px; }
.concepto-codigo { max-width: 130px; }
.concepto-detalle { flex: 1; min-width: 240px; }
.total-facturas-field { max-width: 150px; }
.concepto-descripcion { min-height: 70px; padding: 10px 14px; border: 1px solid #9bb0bb; border-radius: 6px; background: #dcebf1; color: #1b3446; font-size: 13px; line-height: 1.5; }

/* ============================================================
   RESPONSABLE
   ============================================================ */
.responsable-row { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 10px; }
.responsable-select { flex: 1; min-width: 220px; }

/* ============================================================
   MODAL AYUDA
   ============================================================ */
.dialog-title { color: #1b3446; font-weight: 600; border-bottom: 1px solid #d3dde1; }
.help-item { padding: 12px 0; border-bottom: 1px solid #d3dde1; }
.help-item:last-child { border-bottom: none; }
.help-title { margin-bottom: 4px; color: #1b3446; font-weight: 600; }
.help-text { color: #526873; font-size: 13px; line-height: 1.5; }

/* ============================================================
   IMPRESIÓN
   ============================================================ */
.print-header { display: none; }
.print-header-table { border-collapse: collapse; width: 100%; font-size: 13px; }
.print-header-table td { padding: 3px 6px; border: 1px solid #999; }
.print-logo { width: 48px; font-size: 28px; text-align: center; }
.print-title { font-weight: 700; color: #1b3446; }

@media print {
  .no-print { display: none !important; }
  .print-header { display: block; margin-bottom: 14px; }
  .file-load-page { padding: 0; }
  .file-panel { box-shadow: none !important; }
}

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 700px) {
  .file-load-page { padding: 12px; }
  .view-heading { flex-direction: column; }
  h1 { font-size: 20px; }
  .table-toolbar-search { max-width: 100%; }
  .total-box { min-width: 120px; }
}
</style>