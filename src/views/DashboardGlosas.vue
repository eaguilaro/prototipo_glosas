<script setup>
import { ref, computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  CanvasRenderer
])

// ============================================================
// DASHBOARD GERENCIAL DE GLOSAS
// Los datos son simulados. Reemplazar generarDatos() por API.
// ============================================================

// -------------------------
// Filtros
// -------------------------
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function monthsAgoISO(months) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

const fechaInicial = ref(monthsAgoISO(6))
const fechaFinal = ref(todayISO())
const empresaFiltro = ref('Todas las empresas')
const tipoGlosaFiltro = ref('Todos')
const origenFiltro = ref('Todos')
const servicioFiltro = ref('Todos')
const cargando = ref(false)
const ultimaActualizacion = ref('')

const metaPctGlosa = 3
const alertaPctGlosa = 5

const empresasCatalogo = [
  'Todas las empresas',
  'NUEVA EPS - CONTRIBUTIVO',
  'SALUD TOTAL EPS',
  'SURA EPS',
  'COOMEVA EPS',
  'COMPENSAR EPS'
]

const tiposCatalogo = [
  'Todos',
  'Tarifas',
  'Facturación',
  'Pertinencia',
  'Autorizaciones',
  'Soportes',
  'Devoluciones'
]

const origenesCatalogo = ['Todos', 'Interno', 'Externo']

const serviciosCatalogo = [
  'Todos',
  'Urgencias',
  'Hospitalización',
  'Consulta externa',
  'Cirugía',
  'Imagenología',
  'Laboratorio',
  'UCI',
  'Medicamentos'
]

const serviciosDatos = serviciosCatalogo.slice(1)

const responsablesInternos = [
  'Auditoría interna',
  'Facturación',
  'Admisiones',
  'Enfermería',
  'Autorizaciones',
  'Cuentas médicas'
]

const responsablesExternos = [
  'Auditoría EPS',
  'Prestador externo',
  'Entidad contratante',
  'Interventoría'
]

const medicos = [
  'Dr. Carlos Rodríguez',
  'Dra. Diana Martínez',
  'Dr. Andrés Gómez',
  'Dra. Laura Pérez',
  'Dr. Juan Herrera',
  'Dra. Natalia Torres',
  'Dr. Felipe Castro',
  'Dra. Carolina Ruiz',
  'Dr. Miguel Sánchez',
  'Dra. Paula Gómez'
]

const conceptos = [
  { codigo: '849', descripcion: 'Servicio no justificado', tipo: 'Pertinencia', peso: 18 },
  { codigo: '522', descripcion: 'Estancia prolongada injustificada', tipo: 'Pertinencia', peso: 10 },
  { codigo: '834', descripcion: 'Tarifas no pactadas', tipo: 'Tarifas', peso: 17 },
  { codigo: '208', descripcion: 'Valor superior al pactado', tipo: 'Tarifas', peso: 9 },
  { codigo: '310', descripcion: 'Error en código CUPS', tipo: 'Facturación', peso: 12 },
  { codigo: '845', descripcion: 'Doble cobro de insumo', tipo: 'Facturación', peso: 7 },
  { codigo: '102', descripcion: 'Servicio no autorizado', tipo: 'Autorizaciones', peso: 11 },
  { codigo: '630', descripcion: 'Vigencia de autorización', tipo: 'Autorizaciones', peso: 5 },
  { codigo: '821', descripcion: 'Documentación incompleta', tipo: 'Soportes', peso: 10 },
  { codigo: '415', descripcion: 'Historia clínica ilegible', tipo: 'Soportes', peso: 5 },
  { codigo: '105', descripcion: 'Factura duplicada', tipo: 'Devoluciones', peso: 4 },
  { codigo: '711', descripcion: 'Paciente no corresponde', tipo: 'Devoluciones', peso: 2 }
]

// -------------------------
// Utilidades de datos
// -------------------------
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function mulberry32(seed) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function mesesUltimos(n) {
  const hoy = new Date()
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1)
    return `${meses[d.getMonth()]} ${d.getFullYear()}`
  })
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  })
}

function formatCompact(value) {
  const n = Number(value || 0)
  if (Math.abs(n) >= 1000000000) {
    return `$${(n / 1000000000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} B`
  }
  if (Math.abs(n) >= 1000000) {
    return `$${(n / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  }
  return formatCurrency(n)
}

function formatPct(value) {
  return `${Number(value || 0).toFixed(1)}%`
}

// -------------------------
// Estado del dashboard
// -------------------------
const kpis = ref({
  facturado: 0,
  glosado: 0,
  pctGlosa: 0,
  aceptado: 0,
  recuperacion: 0,
  facturasGlosadas: 0
})

const servicios = ref([])
const responsables = ref([])
const medicosPertinencia = ref([])
const conceptosFiltrados = ref([])
const tipos = ref([])
const empresas = ref([])
const tendencia = ref([])

// -------------------------
// Generación simulada
// -------------------------
function generarDatos() {
  cargando.value = true

  const seed = hashString(
    `${fechaInicial.value}|${fechaFinal.value}|${empresaFiltro.value}|${tipoGlosaFiltro.value}|${origenFiltro.value}|${servicioFiltro.value}`
  )
  const rand = mulberry32(seed)

  const facturado = 950000000 + rand() * 650000000
  const pctGlosa = 2.1 + rand() * 4.7
  const glosado = facturado * pctGlosa / 100
  const recuperacion = 48 + rand() * 31
  const aceptado = glosado * recuperacion / 100

  kpis.value = {
    facturado,
    glosado,
    pctGlosa,
    aceptado,
    recuperacion,
    facturasGlosadas: Math.round(850 + rand() * 1100)
  }

  const serviceWeights = [19, 17, 15, 13, 12, 10, 8, 6]
  servicios.value = serviciosDatos
    .map((servicio, i) => ({
      nombre: servicio,
      valor: glosado * (serviceWeights[i] / serviceWeights.reduce((a, b) => a + b, 0)) * (0.82 + rand() * 0.36)
    }))
    .sort((a, b) => b.valor - a.valor)

  const allResponsible = [
    ...responsablesInternos.map(nombre => ({ nombre, origen: 'Interno' })),
    ...responsablesExternos.map(nombre => ({ nombre, origen: 'Externo' }))
  ]

  responsables.value = allResponsible
    .map(item => ({
      ...item,
      valor: glosado * (0.04 + rand() * 0.13),
      cantidad: Math.round(35 + rand() * 190)
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8)

  const pertinenciaBase = tipoGlosaFiltro.value === 'Todos' || tipoGlosaFiltro.value === 'Pertinencia'
  medicosPertinencia.value = medicos
    .map(nombre => ({
      nombre,
      valor: pertinenciaBase
        ? glosado * (0.018 + rand() * 0.045)
        : glosado * (0.004 + rand() * 0.014),
      cantidad: Math.round(10 + rand() * 80)
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8)

  const conceptosBase = conceptos
    .filter(c => tipoGlosaFiltro.value === 'Todos' || c.tipo === tipoGlosaFiltro.value)

  const pesoTotal = conceptosBase.reduce((sum, c) => sum + c.peso, 0) || 1

  conceptosFiltrados.value = conceptosBase
    .map(c => ({
      ...c,
      valor: glosado * (c.peso / pesoTotal) * (0.82 + rand() * 0.36),
      cantidad: Math.round(25 + rand() * 160)
    }))
    .sort((a, b) => b.valor - a.valor)

  tipos.value = tiposCatalogo.slice(1).map(tipo => ({
    tipo,
    valor: glosado * (0.08 + rand() * 0.10)
  }))

  empresas.value = empresasCatalogo.slice(1).map(empresa => ({
    empresa,
    valor: glosado * (0.08 + rand() * 0.11)
  })).sort((a, b) => b.valor - a.valor)

  const meses = mesesUltimos(7)
  tendencia.value = meses.map((mes, i) => ({
    mes,
    pct: Math.max(1.2, pctGlosa + (rand() - 0.5) * 2.6 + (i === meses.length - 1 ? 0.2 : 0))
  }))

  ultimaActualizacion.value = new Date().toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  window.setTimeout(() => {
    cargando.value = false
  }, 250)
}

generarDatos()

// -------------------------
// Indicadores gerenciales
// -------------------------
const cumplimientoMeta = computed(() => {
  if (!kpis.value.pctGlosa) return 0
  return Math.min(100, (metaPctGlosa / kpis.value.pctGlosa) * 100)
})

const brechaMeta = computed(() => kpis.value.pctGlosa - metaPctGlosa)

const estadoMeta = computed(() => {
  if (kpis.value.pctGlosa <= metaPctGlosa) {
    return { label: 'Dentro de meta', color: 'success', icon: 'mdi-check-circle-outline' }
  }
  if (kpis.value.pctGlosa < alertaPctGlosa) {
    return { label: 'Sobre la meta', color: 'warning', icon: 'mdi-alert-circle-outline' }
  }
  return { label: 'Fuera del límite', color: 'error', icon: 'mdi-alert-octagon-outline' }
})

const origenResumen = computed(() => {
  const interno = responsables.value
    .filter(r => r.origen === 'Interno')
    .reduce((s, r) => s + r.valor, 0)

  const externo = responsables.value
    .filter(r => r.origen === 'Externo')
    .reduce((s, r) => s + r.valor, 0)

  const total = interno + externo || 1

  return [
    { name: 'Interno', value: interno, pct: interno / total * 100 },
    { name: 'Externo', value: externo, pct: externo / total * 100 }
  ]
})

// ============================================================
// Configuración ECharts
// ============================================================
const chartBase = {
  animationDuration: 500,
  textStyle: {
    fontFamily: 'Arial, Helvetica, sans-serif'
  }
}

const tendenciaOption = computed(() => ({
  ...chartBase,
  tooltip: {
    trigger: 'axis',
    valueFormatter: value => `${Number(value).toFixed(1)}%`
  },
  grid: { left: 45, right: 22, top: 24, bottom: 38 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: tendencia.value.map(x => x.mes),
    axisLine: { lineStyle: { color: '#cbd6db' } },
    axisLabel: { color: '#62747d', fontSize: 11 }
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 8,
    interval: 2,
    axisLabel: {
      color: '#62747d',
      fontSize: 11,
      formatter: value => `${value}%`
    },
    splitLine: { lineStyle: { color: '#edf1f3' } }
  },
  series: [{
    name: '% Glosa',
    type: 'line',
    smooth: true,
    data: tendencia.value.map(x => Number(x.pct.toFixed(2))),
    symbol: 'circle',
    symbolSize: 7,
    lineStyle: { width: 3, color: '#1b3446' },
    itemStyle: { color: '#1b3446' },
    areaStyle: { color: 'rgba(61,106,134,0.10)' },
    markLine: {
      symbol: 'none',
      data: [
        {
          yAxis: metaPctGlosa,
          name: 'Meta 3%',
          lineStyle: { color: '#2f7d5f', type: 'dashed', width: 2 },
          label: { formatter: 'Meta 3%', color: '#2f7d5f' }
        },
        {
          yAxis: alertaPctGlosa,
          name: 'Límite 5%',
          lineStyle: { color: '#b3261e', type: 'dashed', width: 2 },
          label: { formatter: 'Límite 5%', color: '#b3261e' }
        }
      ]
    }
  }]
}))

const serviciosOption = computed(() => ({
  ...chartBase,
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: params => {
      const p = params[0]
      return `<b>${p.name}</b><br/>Valor glosado: ${formatCurrency(p.value)}`
    }
  },
  grid: { left: 120, right: 35, top: 12, bottom: 28 },
  xAxis: {
    type: 'value',
    axisLabel: { color: '#62747d', fontSize: 10, formatter: value => formatCompact(value) },
    splitLine: { lineStyle: { color: '#edf1f3' } }
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: servicios.value.map(x => x.nombre),
    axisLabel: { color: '#334d5c', fontSize: 11 }
  },
  series: [{
    type: 'bar',
    barWidth: 18,
    data: servicios.value.map(x => Math.round(x.valor)),
    itemStyle: {
      color: '#3d6a86',
      borderRadius: [0, 4, 4, 0]
    },
    label: {
      show: true,
      position: 'right',
      color: '#1b3446',
      fontSize: 10,
      formatter: params => formatCompact(params.value)
    }
  }]
}))

const responsablesOption = computed(() => ({
  ...chartBase,
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: params => {
      const p = params[0]
      const item = responsables.value[p.dataIndex]
      return `<b>${item.nombre}</b><br/>Origen: ${item.origen}<br/>Valor glosado: ${formatCurrency(p.value)}<br/>Casos: ${item.cantidad}`
    }
  },
  grid: { left: 130, right: 35, top: 12, bottom: 28 },
  xAxis: {
    type: 'value',
    axisLabel: { color: '#62747d', fontSize: 10, formatter: value => formatCompact(value) },
    splitLine: { lineStyle: { color: '#edf1f3' } }
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: responsables.value.map(x => x.nombre),
    axisLabel: { color: '#334d5c', fontSize: 10 }
  },
  series: [{
    type: 'bar',
    barWidth: 16,
    data: responsables.value.map(x => ({
      value: Math.round(x.valor),
      itemStyle: { color: x.origen === 'Interno' ? '#3d6a86' : '#c98a1d' }
    })),
    label: {
      show: true,
      position: 'right',
      color: '#1b3446',
      fontSize: 10,
      formatter: params => formatCompact(params.value)
    }
  }]
}))

const medicosOption = computed(() => ({
  ...chartBase,
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: params => {
      const p = params[0]
      const item = medicosPertinencia.value[p.dataIndex]
      return `<b>${item.nombre}</b><br/>Valor glosado por pertinencia: ${formatCurrency(p.value)}<br/>Casos: ${item.cantidad}`
    }
  },
  grid: { left: 145, right: 35, top: 12, bottom: 28 },
  xAxis: {
    type: 'value',
    axisLabel: { color: '#62747d', fontSize: 10, formatter: value => formatCompact(value) },
    splitLine: { lineStyle: { color: '#edf1f3' } }
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: medicosPertinencia.value.map(x => x.nombre),
    axisLabel: { color: '#334d5c', fontSize: 10 }
  },
  series: [{
    type: 'bar',
    barWidth: 16,
    data: medicosPertinencia.value.map(x => Math.round(x.valor)),
    itemStyle: { color: '#6b8e9f', borderRadius: [0, 4, 4, 0] },
    label: {
      show: true,
      position: 'right',
      color: '#1b3446',
      fontSize: 10,
      formatter: params => formatCompact(params.value)
    }
  }]
}))

const conceptosOption = computed(() => ({
  ...chartBase,
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: params => {
      const p = params[0]
      const item = conceptosFiltrados.value[p.dataIndex]
      return `<b>${item.codigo} - ${item.descripcion}</b><br/>Valor glosado: ${formatCurrency(p.value)}<br/>Casos: ${item.cantidad}`
    }
  },
  grid: { left: 42, right: 35, top: 20, bottom: 55 },
  xAxis: {
    type: 'category',
    data: conceptosFiltrados.value.map(x => x.codigo),
    axisLabel: { color: '#334d5c', fontSize: 10, interval: 0 }
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#62747d', fontSize: 10, formatter: value => formatCompact(value) },
    splitLine: { lineStyle: { color: '#edf1f3' } }
  },
  series: [{
    type: 'bar',
    barMaxWidth: 28,
    data: conceptosFiltrados.value.map(x => Math.round(x.valor)),
    itemStyle: { color: '#1b3446', borderRadius: [4, 4, 0, 0] },
    label: {
      show: true,
      position: 'top',
      color: '#1b3446',
      fontSize: 9,
      formatter: params => formatCompact(params.value)
    }
  }]
}))

const origenOption = computed(() => ({
  ...chartBase,
  tooltip: {
    trigger: 'item',
    formatter: params => `<b>${params.name}</b><br/>${formatCompact(params.value)} (${params.percent.toFixed(1)}%)`
  },
  legend: {
    bottom: 2,
    left: 'center',
    textStyle: { color: '#526873', fontSize: 11 }
  },
  series: [{
    type: 'pie',
    radius: ['52%', '76%'],
    center: ['50%', '45%'],
    avoidLabelOverlap: true,
    itemStyle: { borderColor: '#fff', borderWidth: 3 },
    label: {
      show: true,
      formatter: '{b}\\n{d}%',
      color: '#334d5c',
      fontSize: 11
    },
    data: origenResumen.value.map(x => ({
      name: x.name,
      value: Math.round(x.value),
      itemStyle: { color: x.name === 'Interno' ? '#3d6a86' : '#c98a1d' }
    }))
  }]
}))

const tiposOption = computed(() => ({
  ...chartBase,
  tooltip: {
    trigger: 'item',
    formatter: params => `<b>${params.name}</b><br/>${formatCompact(params.value)} (${params.percent.toFixed(1)}%)`
  },
  legend: {
    orient: 'vertical',
    right: 5,
    top: 'middle',
    textStyle: { color: '#526873', fontSize: 10 }
  },
  series: [{
    type: 'pie',
    radius: ['50%', '73%'],
    center: ['35%', '50%'],
    label: { show: false },
    data: tipos.value.map((x, i) => ({
      name: x.tipo,
      value: Math.round(x.valor),
      itemStyle: {
        color: ['#1b3446', '#3d6a86', '#6b8e9f', '#c98a1d', '#8a9aa3', '#b3261e'][i]
      }
    }))
  }]
}))

const empresaOption = computed(() => ({
  ...chartBase,
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: params => {
      const p = params[0]
      return `<b>${p.name}</b><br/>Valor glosado: ${formatCurrency(p.value)}`
    }
  },
  grid: { left: 145, right: 35, top: 12, bottom: 28 },
  xAxis: {
    type: 'value',
    axisLabel: { color: '#62747d', fontSize: 10, formatter: value => formatCompact(value) },
    splitLine: { lineStyle: { color: '#edf1f3' } }
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: empresas.value.map(x => x.empresa),
    axisLabel: { color: '#334d5c', fontSize: 9 }
  },
  series: [{
    type: 'bar',
    barWidth: 17,
    data: empresas.value.map(x => Math.round(x.valor)),
    itemStyle: { color: '#526873', borderRadius: [0, 4, 4, 0] },
    label: {
      show: true,
      position: 'right',
      color: '#1b3446',
      fontSize: 9,
      formatter: params => formatCompact(params.value)
    }
  }]
}))

// -------------------------
// Ayuda
// -------------------------
const dialogAyuda = ref(false)

const ayudas = [
  {
    titulo: 'Meta de % de glosa',
    texto: 'La meta mostrada en este tablero es 3%. El límite de alerta es 5%. Ambos valores deben quedar parametrizables cuando el indicador se conecte con la configuración real.'
  },
  {
    titulo: 'Servicios con mayor valor glosado',
    texto: 'Agrupa el valor glosado por servicio asistencial para identificar dónde se concentra el impacto económico de las glosas.'
  },
  {
    titulo: 'Responsables internos y externos',
    texto: 'Permite identificar el responsable asociado al origen de la glosa y diferenciar si corresponde a un proceso interno o externo.'
  },
  {
    titulo: 'Médicos - pertinencia',
    texto: 'Muestra los profesionales asociados a glosas cuyo tipo es Pertinencia. La vista permite identificar concentración por profesional y cantidad de casos.'
  },
  {
    titulo: 'Conceptos por tipo',
    texto: 'Seleccione un tipo de glosa para visualizar exclusivamente los conceptos asociados y su valor glosado.'
  }
]
</script>

<template>
  <div class="dashboard-page">
    <!-- ENCABEZADO -->
    <div class="dashboard-header">
      <div>
        <div class="eyebrow">Gestión de glosas · Vista gerencial</div>
        <h1>Dashboard gerencial de glosas</h1>
        <p>Seguimiento ejecutivo del comportamiento, concentración y origen de las glosas.</p>
      </div>

      <div class="header-actions">
        <div v-if="ultimaActualizacion" class="update-info">
          <v-icon icon="mdi-clock-outline" size="15" />
          Actualizado {{ ultimaActualizacion }}
        </div>
        <v-btn
          icon="mdi-help-circle-outline"
          variant="tonal"
          size="small"
          title="Ayuda"
          @click="dialogAyuda = true"
        />
      </div>
    </div>

    <!-- FILTROS -->
    <section class="filter-panel">
      <div class="section-label">
        <v-icon icon="mdi-filter-variant" size="17" />
        Filtros de consulta
      </div>

      <v-row dense align="end">
        <v-col cols="12" sm="6" md="2">
          <v-text-field v-model="fechaInicial" type="date" label="Fecha inicial" density="compact" hide-details />
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-text-field v-model="fechaFinal" type="date" label="Fecha final" density="compact" hide-details />
        </v-col>

        <v-col cols="12" sm="6" md="2.5">
          <v-select v-model="empresaFiltro" label="Empresa / EPS" :items="empresasCatalogo" density="compact" hide-details />
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-select v-model="tipoGlosaFiltro" label="Tipo de glosa" :items="tiposCatalogo" density="compact" hide-details />
        </v-col>

        <v-col cols="12" sm="6" md="1.5">
          <v-select v-model="origenFiltro" label="Origen" :items="origenesCatalogo" density="compact" hide-details />
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-select v-model="servicioFiltro" label="Servicio" :items="serviciosCatalogo" density="compact" hide-details />
        </v-col>
      </v-row>

      <div class="filter-footer">
        <span>Los filtros aplican al conjunto de indicadores y gráficos.</span>
        <v-btn
          color="primary"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="cargando"
          @click="generarDatos"
        >
          Actualizar tablero
        </v-btn>
      </div>
    </section>

    <!-- BLOQUE META -->
    <section class="executive-status">
      <div class="status-main">
        <div class="status-title">
          <span>Indicador principal</span>
          <v-chip :color="estadoMeta.color" size="small" variant="flat">
            <v-icon start :icon="estadoMeta.icon" size="15" />
            {{ estadoMeta.label }}
          </v-chip>
        </div>

        <div class="status-content">
          <div class="main-indicator">
            <span class="main-indicator-value">{{ formatPct(kpis.pctGlosa) }}</span>
            <span class="main-indicator-label">% de glosa</span>
          </div>

          <div class="target-block">
            <div class="target-line">
              <span>Meta</span>
              <strong>≤ {{ metaPctGlosa }}%</strong>
            </div>
            <v-progress-linear
              :model-value="cumplimientoMeta"
              :color="estadoMeta.color"
              height="8"
              rounded
            />
            <div class="target-line target-line--secondary">
              <span>Brecha frente a meta</span>
              <strong :class="brechaMeta > 0 ? 'text-error' : 'text-success'">
                {{ brechaMeta > 0 ? '+' : '' }}{{ brechaMeta.toFixed(1) }} pp
              </strong>
            </div>
          </div>

          <div class="limit-block">
            <span>Límite de alerta</span>
            <strong>{{ alertaPctGlosa }}%</strong>
            <small>Referencia para seguimiento</small>
          </div>
        </div>
      </div>

      <div class="status-note">
        <v-icon icon="mdi-bullseye-arrow" size="19" />
        <div>
          <strong>Lectura gerencial</strong>
          <span>La meta y su brecha quedan visibles antes de entrar al detalle analítico.</span>
        </div>
      </div>
    </section>

    <!-- KPIs -->
    <section class="kpi-grid">
      <article class="kpi-card">
        <div class="kpi-icon"><v-icon icon="mdi-cash-multiple" /></div>
        <div>
          <span class="kpi-label">Valor facturado</span>
          <strong>{{ formatCompact(kpis.facturado) }}</strong>
          <small>{{ formatCurrency(kpis.facturado) }}</small>
        </div>
      </article>

      <article class="kpi-card">
        <div class="kpi-icon kpi-icon--warning"><v-icon icon="mdi-file-alert-outline" /></div>
        <div>
          <span class="kpi-label">Valor glosado</span>
          <strong>{{ formatCompact(kpis.glosado) }}</strong>
          <small>{{ formatPct(kpis.pctGlosa) }} del facturado</small>
        </div>
      </article>

      <article class="kpi-card">
        <div class="kpi-icon kpi-icon--success"><v-icon icon="mdi-cash-check" /></div>
        <div>
          <span class="kpi-label">Valor aceptado</span>
          <strong>{{ formatCompact(kpis.aceptado) }}</strong>
          <small>{{ formatPct(kpis.recuperacion) }} de recuperación</small>
        </div>
      </article>

      <article class="kpi-card">
        <div class="kpi-icon"><v-icon icon="mdi-file-document-multiple-outline" /></div>
        <div>
          <span class="kpi-label">Facturas con glosa</span>
          <strong>{{ kpis.facturasGlosadas.toLocaleString('es-CO') }}</strong>
          <small>En el período consultado</small>
        </div>
      </article>
    </section>

    <!-- FILA PRINCIPAL -->
    <section class="chart-grid chart-grid--top">
      <article class="chart-card chart-card--large">
        <div class="card-header">
          <div>
            <div class="card-kicker">Tendencia y meta</div>
            <h2>Comportamiento mensual del % de glosa</h2>
          </div>
          <div class="legend-inline">
            <span><i class="legend-dot legend-dot--actual" /> Resultado</span>
            <span><i class="legend-line legend-line--meta" /> Meta 3%</span>
            <span><i class="legend-line legend-line--limit" /> Límite 5%</span>
          </div>
        </div>
        <VChart class="chart chart--trend" :option="tendenciaOption" autoresize />
      </article>

      <article class="chart-card">
        <div class="card-header">
          <div>
            <div class="card-kicker">Composición</div>
            <h2>Glosas por tipo</h2>
          </div>
        </div>
        <VChart class="chart chart--donut" :option="tiposOption" autoresize />
      </article>
    </section>

    <!-- ANALISIS OPERATIVO -->
    <section class="section-heading">
      <div>
        <div class="section-label">Análisis de concentración</div>
        <h2>¿Dónde se están generando las glosas?</h2>
      </div>
    </section>

    <section class="chart-grid chart-grid--two">
      <article class="chart-card">
        <div class="card-header">
          <div>
            <div class="card-kicker">Servicios asistenciales</div>
            <h2>Servicios que generan mayor valor glosado</h2>
          </div>
        </div>
        <VChart class="chart chart--bar" :option="serviciosOption" autoresize />
      </article>

      <article class="chart-card">
        <div class="card-header">
          <div>
            <div class="card-kicker">Origen</div>
            <h2>Responsables internos vs. externos</h2>
          </div>
        </div>
        <VChart class="chart chart--donut-small" :option="origenOption" autoresize />
      </article>

      <article class="chart-card chart-card--full">
        <div class="card-header">
          <div>
            <div class="card-kicker">Responsables</div>
            <h2>Responsables con mayor valor de glosas</h2>
          </div>
          <div class="mini-legend">
            <span><i class="legend-dot legend-dot--internal" /> Interno</span>
            <span><i class="legend-dot legend-dot--external" /> Externo</span>
          </div>
        </div>
        <VChart class="chart chart--responsibles" :option="responsablesOption" autoresize />
      </article>
    </section>

    <!-- PERTINENCIA + CONCEPTOS -->
    <section class="section-heading">
      <div>
        <div class="section-label">Análisis específico</div>
        <h2>Pertinencia y conceptos de glosa</h2>
      </div>
    </section>

    <section class="chart-grid chart-grid--two">
      <article class="chart-card">
        <div class="card-header">
          <div>
            <div class="card-kicker">Pertinencia</div>
            <h2>Profesionales con mayor valor glosado</h2>
            <p>Vista específica de glosas asociadas a pertinencia.</p>
          </div>
        </div>
        <VChart class="chart chart--medicos" :option="medicosOption" autoresize />
      </article>

      <article class="chart-card">
        <div class="card-header">
          <div>
            <div class="card-kicker">Detalle por concepto</div>
            <h2>Conceptos de glosa</h2>
          </div>
          <v-select
            v-model="tipoGlosaFiltro"
            :items="tiposCatalogo"
            label="Tipo"
            density="compact"
            hide-details
            variant="outlined"
            class="concept-filter"
          />
        </div>

        <div class="concept-caption">
          <span v-if="tipoGlosaFiltro === 'Todos'">Todos los tipos</span>
          <span v-else>Mostrando conceptos de <strong>{{ tipoGlosaFiltro }}</strong></span>
        </div>

        <VChart class="chart chart--concepts" :option="conceptosOption" autoresize />
      </article>
    </section>

    <!-- EMPRESAS -->
    <section class="chart-grid chart-grid--single">
      <article class="chart-card">
        <div class="card-header">
          <div>
            <div class="card-kicker">Entidad responsable de pago</div>
            <h2>Valor glosado por empresa / EPS</h2>
          </div>
        </div>
        <VChart class="chart chart--company" :option="empresaOption" autoresize />
      </article>
    </section>

    <!-- AYUDA -->
    <v-dialog v-model="dialogAyuda" max-width="720">
      <v-card>
        <v-card-title class="dialog-title">
          Ayuda · Dashboard gerencial
        </v-card-title>
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
.dashboard-page {
  padding: 20px 24px 42px;
  color: #1b3446;
  background: #f7f9fa;
  min-height: 100%;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 18px;
}

.eyebrow,
.card-kicker,
.section-label {
  color: #607782;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .7px;
  text-transform: uppercase;
}

.dashboard-header h1 {
  margin: 3px 0 5px;
  color: #142f40;
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -.3px;
}

.dashboard-header p {
  margin: 0;
  color: #657a84;
  font-size: 13px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.update-info {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #71848d;
  font-size: 11px;
  white-space: nowrap;
}

.filter-panel {
  padding: 14px 16px 12px;
  margin-bottom: 16px;
  border: 1px solid #d7e0e4;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(27, 52, 70, .04);
}

.filter-panel .section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.filter-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  color: #7a8b93;
  font-size: 11px;
}

.executive-status {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 14px;
  margin-bottom: 16px;
}

.status-main,
.status-note {
  border: 1px solid #d3dee3;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(27, 52, 70, .05);
}

.status-main {
  padding: 17px 20px;
}

.status-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #526873;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .4px;
}

.status-content {
  display: grid;
  grid-template-columns: 190px 1fr 170px;
  align-items: center;
  gap: 25px;
}

.main-indicator {
  display: flex;
  flex-direction: column;
}

.main-indicator-value {
  color: #142f40;
  font-size: 38px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: -1px;
}

.main-indicator-label {
  margin-top: 5px;
  color: #71838b;
  font-size: 12px;
}

.target-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.target-line {
  display: flex;
  justify-content: space-between;
  color: #526873;
  font-size: 12px;
}

.target-line strong {
  color: #1b3446;
}

.target-line--secondary {
  margin-top: 2px;
  color: #7b8c94;
  font-size: 11px;
}

.limit-block {
  padding-left: 20px;
  border-left: 1px solid #e0e7ea;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.limit-block span {
  color: #71838b;
  font-size: 11px;
}

.limit-block strong {
  color: #b3261e;
  font-size: 23px;
}

.limit-block small {
  color: #8a999f;
  font-size: 10px;
}

.status-note {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  color: #526873;
}

.status-note .v-icon {
  color: #3d6a86;
}

.status-note div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-note strong {
  color: #1b3446;
  font-size: 12px;
}

.status-note span {
  color: #71838b;
  font-size: 11px;
  line-height: 1.45;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.kpi-card {
  min-height: 96px;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 15px 17px;
  border: 1px solid #d8e1e5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(27, 52, 70, .04);
}

.kpi-card>div:last-child {
  min-width: 0;
}

.kpi-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: #eaf1f4;
  color: #315b73;
}

.kpi-icon--warning {
  background: #f8f0df;
  color: #a56d0e;
}

.kpi-icon--success {
  background: #e5f1eb;
  color: #2f7d5f;
}

.kpi-label {
  display: block;
  margin-bottom: 3px;
  color: #71838b;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .45px;
}

.kpi-card strong {
  display: block;
  color: #1b3446;
  font-size: 22px;
  line-height: 1.15;
}

.kpi-card small {
  color: #89979d;
  font-size: 10px;
}

.chart-grid {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
}

.chart-grid--top {
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
}

.chart-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chart-grid--single {
  grid-template-columns: 1fr;
}

.chart-card {
  min-width: 0;
  padding: 16px 18px 14px;
  border: 1px solid #d8e1e5;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(27, 52, 70, .045);
}

.chart-card--full {
  grid-column: 1 / -1;
}

.card-header {
  min-height: 39px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.card-header h2 {
  margin: 2px 0 0;
  color: #1b3446;
  font-size: 14px;
  font-weight: 700;
}

.card-header p {
  margin: 4px 0 0;
  color: #819097;
  font-size: 10px;
}

.legend-inline,
.mini-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  color: #71838b;
  font-size: 10px;
  white-space: nowrap;
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 4px;
  border-radius: 50%;
  vertical-align: 1px;
}

.legend-dot--actual,
.legend-dot--internal {
  background: #3d6a86;
}

.legend-dot--external {
  background: #c98a1d;
}

.legend-line {
  display: inline-block;
  width: 17px;
  margin-right: 4px;
  border-top: 2px dashed;
  vertical-align: 3px;
}

.legend-line--meta {
  border-color: #2f7d5f;
}

.legend-line--limit {
  border-color: #b3261e;
}

.chart {
  width: 100%;
}

.chart--trend {
  height: 270px;
}

.chart--donut {
  height: 270px;
}

.chart--bar,
.chart--medicos {
  height: 340px;
}

.chart--donut-small {
  height: 340px;
}

.chart--responsibles {
  height: 330px;
}

.chart--concepts {
  height: 315px;
}

.chart--company {
  height: 300px;
}

.concept-filter {
  width: 155px;
  flex-shrink: 0;
}

.concept-caption {
  margin: -2px 0 0;
  color: #84939a;
  font-size: 10px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 24px 0 10px;
}

.section-heading h2 {
  margin: 3px 0 0;
  color: #1b3446;
  font-size: 17px;
  font-weight: 700;
}

.dialog-title {
  color: #1b3446;
  font-weight: 700;
  border-bottom: 1px solid #d8e1e5;
}

.help-item {
  padding: 13px 0;
  border-bottom: 1px solid #e0e7ea;
}

.help-item:last-child {
  border-bottom: none;
}

.help-title {
  margin-bottom: 4px;
  color: #1b3446;
  font-size: 13px;
  font-weight: 700;
}

.help-text {
  color: #657982;
  font-size: 12px;
  line-height: 1.5;
}

.text-success {
  color: #2f7d5f !important;
}

.text-error {
  color: #b3261e !important;
}

@media (max-width: 1100px) {
  .executive-status {
    grid-template-columns: 1fr;
  }

  .status-note {
    min-height: auto;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-grid--top,
  .chart-grid--two {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .dashboard-page {
    padding: 12px;
  }

  .dashboard-header {
    flex-direction: column;
  }

  .status-content {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .limit-block {
    padding: 10px 0 0;
    border-left: none;
    border-top: 1px solid #e0e7ea;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .filter-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .card-header {
    flex-direction: column;
  }

  .legend-inline,
  .mini-legend {
    justify-content: flex-start;
  }

  .concept-filter {
    width: 100%;
  }
}
</style>
