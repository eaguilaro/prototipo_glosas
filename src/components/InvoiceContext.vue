<script setup>
import { ref } from 'vue'
const invoice = ref('FE-2026-004581')
const selectedInvoice = ref(invoice.value)
const emit = defineEmits(['loaded'])
function load() { if (!invoice.value.trim()) return; selectedInvoice.value = invoice.value.trim(); emit('loaded', selectedInvoice.value) }
function clear() { invoice.value = ''; selectedInvoice.value = 'Sin factura cargada' }
const metrics = [
  ['Vr. factura', '$ 1.248.900'], ['Vr. copago', '$ 48.900'], ['Saldo factura', '$ 1.200.000'], ['Vr. glosado', '$ 24.000'], ['Indicador', '2%']
]
</script>
<template>
  <!-- Bloque 1: identificacion de la factura y resumen financiero. -->
  <v-card class="surface-border invoice-context-card" rounded="lg">
    <v-card-text class="pa-0">
      <v-row no-gutters>
          <v-col cols="12" md="4" lg="3" class="pa-4 border-e invoice-search-cell">
             
          <div class="eyebrow"> <v-avatar color="#1b3446" size="26" class="mr-2">
                <span class="text-white text-caption font-weight-bold">1</span>
              </v-avatar>Cargar factura</div>
          <div class="d-flex ga-2 mt-2">
            <v-text-field v-model="invoice" aria-label="Número de factura" placeholder="N.º factura" hide-details @keyup.enter="load" />
            <v-btn color="primary" height="40" @click="load">Consultar</v-btn>
            <v-btn icon="mdi-close" variant="text" height="40" aria-label="Limpiar factura" @click="clear" />
          </div>
          <div class="mono text-primary-darken-2 text-subtitle-1 mt-2">{{ selectedInvoice }}</div>
          <div class="text-caption text-blue-grey-darken-2 mt-1">Convenio Asegurador: CAPITAL SALUD ENTIDAD PROMOTORA DE SALUD DEL REGIMEN SUBSIDIADO</div>
        </v-col>      
         <v-col
        v-for="([label, value], index) in metrics"
        :key="label"
        cols="6"
        :lg="[2, 2, 2, 2, 1][index]"
        class="pa-4 border-e invoice-metric-cell"
        >
            <div class="eyebrow">{{ label }}</div>
          <div :class="['metric-value mt-3', { alert: index === 3, success: index === 4 }]">{{ value }}</div>
        </v-col>
      </v-row>
      <!-- Datos administrativos de la cuenta. -->
      <v-divider />
      <div class="d-flex flex-wrap ga-5 px-4 py-3 text-caption text-blue-grey-darken-2 bg-blue-grey-lighten-5 invoice-meta-row ">
        <span><b>Admisión:</b> 1-345678</span><span><b>Fecha facturación:</b> 04/09/2026 · 10:27</span><span><b>Fecha radicación:</b> 04/09/2026</span><span><b>Cuenta:</b> 987789</span>
        <v-chip size="small" color="error" variant="tonal"><v-icon start icon="mdi-circle" size="8" /> Estado glosa: Abierta</v-chip>
      </div>
      <!-- Totales de glosas y conceptos de la cuenta. -->
      <v-divider />
      <v-row no-gutters class="px-4 py-3 bg-grey-lighten-5 invoice-totals-row">
        <v-col v-for="item in [['Valor en glosas','$ 200.000'],['Glosas aceptadas','$ 24.000'],['Glosas rechazadas','$ 176.000'],['Vr. nuevo hallazgo','0'],['Pendiente trámite','$ 0'],['Conceptos','5']]" :key="item[0]" cols="6" sm="4" lg="2"><div class="eyebrow">{{ item[0] }}</div><div class="mono text-body-2 mt-1">{{ item[1] }}</div></v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<style scoped>
/* Divisiones internas del resumen: ajustar aqui color y grosor sin afectar otros componentes. */
.invoice-context-card :deep(.invoice-search-cell),
.invoice-context-card :deep(.invoice-metric-cell) {
  border-color: #9aadb7 !important;
  border-width: 0 1px 0 0 !important;
  border-style: solid !important;
}

.invoice-context-card :deep(.invoice-meta-row) {
  border-top: 1px solid #9aadb7;
  border-bottom: 1px solid #9aadb7;
}

.invoice-context-card :deep(.invoice-totals-row) {
  border-top: 0px solid #b3c1c8;
}

@media (max-width: 600px) {
  .invoice-context-card :deep(.invoice-search-cell),
  .invoice-context-card :deep(.invoice-metric-cell) {
    border-right: 0 !important;
    border-bottom: 1px solid #9aadb7 !important;
  }
}
</style>
