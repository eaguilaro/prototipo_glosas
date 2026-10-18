<script setup>
import { computed, ref } from 'vue'
const concepts = [
  { code: '102', name: 'Consultas, interconsultas y atenciones domiciliarias', total: '$ 38.000', accepted: '$ 38.000', rejected: '$ 0', pending: '$ 0', date: '04/09/2026' ,items: [{ code: '902101', name: 'Consulta médica domiciliaria', value: '$ 20.000' }, { code: '902102', name: 'Interconsulta domiciliaria', value: '$ 10.000' }, { code: '902103', name: 'Atención domiciliaria de seguimiento', value: '$ 8.000' }] },
  { code: '103', name: 'Traslado asistencial no cubierto por el plan', total: '$ 30.000', accepted: '$ 0', rejected: '$ 30.000', pending: '$ 0', date: '05/09/2026' ,items: [{ code: '501020', name: 'Traslado asistencial básico', value: '$ 12.000' }, { code: '501021', name: 'Traslado asistencial medicalizado', value: '$ 18.000' }] },
  { code: '104', name: 'Insumo no incluido en el paquete contratado', total: '$ 15.573', accepted: '$ 0', rejected: '$ 0', pending: '$ 15.573', date: '06/09/2026' ,items: [{ code: '10J12', name: 'Venda algodón estéril 6 x 5YD uni', value: '$ 4.650' }, { code: '10J15', name: 'Venda elástica estéril 6 x 5YD', value: '$ 7.246' }] },
  { code: '105', name: 'Servicio no pertinente para la atención', total: '$ 22.000', accepted: '$ 10.000', rejected: '$ 12.000', pending: '$ 0', date: '07/09/2026' ,items: [{ code: '890201', name: 'Valoración no relacionada con el diagnóstico', value: '$ 12.000' }, { code: '890202', name: 'Control médico relacionado con el diagnóstico', value: '$ 10.000' }] },
  { code: '106', name: 'Soporte administrativo incompleto', total: '$ 9.800', accepted: '$ 0', rejected: '$ 0', pending: '$ 9.800', date: '04/09/2026' ,  items: [{ code: 'SOP001', name: 'Orden de servicio sin firma', value: '$ 4.800' }, { code: 'SOP002', name: 'Autorización no adjunta', value: '$ 5.000' }] }
]
const selectedCode = ref('102')
const selected = computed(() => concepts.find(item => item.code === selectedCode.value) || concepts[0])
defineExpose({ concepts, selected })
</script>
<template>
  <!-- Bloque 3: lista de conceptos y detalle de consulta del concepto activo. -->
  <v-card class="surface-border concept-workspace" rounded="lg">
    <v-card-title class="concept-header d-flex align-center ga-2 text-body-2 section-title">
        <v-avatar color="#1b3446" size="26" class="mr-2">
                <span class="text-white text-caption font-weight-bold">3</span>
        </v-avatar>    
      <span>Detalle por concepto aplicado</span>
      <v-spacer />
      <span class="text-caption text-blue-grey-darken-2 font-weight-regular">Seleccione un concepto para consultar su tratamiento</span>
    </v-card-title>

    <v-divider />

    <v-card-text class="concept-body">
      <v-row class="concept-layout">
        <!-- Lista lateral: el fondo azul claro identifica la zona de navegacion. -->
        <v-col cols="12" md="3" class="concept-list-column">
          <v-list class="concept-list pa-0" rounded="lg" lines="three">
            <v-list-subheader class="concept-list-heading text-uppercase text-caption">Conceptos aplicados · {{ concepts.length }}</v-list-subheader>
            <v-list-item
              v-for="concept in concepts"
              :key="concept.code"
              :active="selectedCode === concept.code"
              class="concept-list-item"
              color="primary"
              @click="selectedCode = concept.code"
            >
              <template #title><span class="mono text-caption">Concepto {{ concept.code }}</span></template>
              <template #subtitle>
                <span class="font-weight-medium">{{ concept.name }}</span><br>
                {{ concept.items.length }} ítems <span class="float-right mono">{{ concept.total }}</span>
              </template>
            </v-list-item>
          </v-list>
        </v-col>

        <!-- Area principal: encabezado, resumen, datos asociados y tabla informativa. -->
        <v-col cols="12" md="9" class="concept-detail-column">
          <div class="concept-detail-heading d-flex justify-space-between align-start ga-3">
            <div>
              <h3 class="text-subtitle-1 section-title">{{ selected.name }}</h3>
              <p class="text-caption text-blue-grey-darken-2">Detalle de aplicación y respuesta para este concepto</p>
            </div>
            <div class="concept-header-chips">
              <v-chip size="small" color="primary" variant="tonal" class="mono">Fecha de registro: {{ selected.date }}</v-chip>
              <v-chip size="small" color="primary" variant="tonal" class="mono">Código {{ selected.code }}</v-chip>
            </div>
          </div>

          <v-row class="detail-summary-cards align-stretch">
            <v-col v-for="item in [['Valor glosado', selected.total, 'error'], ['Valor aceptado', selected.accepted, 'success'], ['Valor rechazado', selected.rejected, 'error'], ['Vr Pendiente', selected.pending, ''] ]" :key="item[0]" cols="12" sm="6" md="2">
              <v-card class="detail-metric-card pa-3" :class="`metric-${item[2] || 'neutral'}`">
                <div class="eyebrow">{{ item[0] }}</div>
                <div class="mono text-body-1 mt-2">{{ item[1] }}</div>
              </v-card>
            </v-col>

            <v-col cols="12" sm="6" md="2">
              <v-card class="detail-info-card pa-3">
                <div class="eyebrow">Oficio Respuesta</div>
                <strong class="mono">COM-2026-0345</strong>
                <!-- <div class="text-caption text-blue-grey-darken-2">Fecha de registro: 04/09/2026</div> -->
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="2">
              <v-card class="detail-info-card pa-3">
                <div class="eyebrow">Estado</div>
                <strong>Aceptado</strong>
                <div class="text-caption text-blue-grey-darken-2">{{ selected.items.length }} ítems asociados</div>
              </v-card>
            </v-col>
          </v-row>

          <div class="table-heading d-flex justify-space-between align-center">
            <span>Ítems asociados al concepto</span>
            <!-- <span class="text-caption">{{ selected.items.length }} registros</span> -->
            <v-accion-buttons class="d-flex ga-2">
            <v-btn sty  color="primary" size="small" variant="flat" @click="$emit('open', 'glosa-conciliacion')">Otros Conceptos</v-btn>
            <v-btn color="primary" size="small" variant="flat" @click="$emit('open', 'glosa-conciliacion')">No Acuerdo</v-btn>
            </v-accion-buttons> 
          </div>
          <v-table density="compact" class="compact-table concept-table">
            <thead><tr><th>Código</th><th>Descripción</th><th>Vr. glosado</th><th>Res. aceptación</th><th>Res. rechazo</th><th>Vr. aceptado</th><th>Vr. rechazado</th></tr></thead>
            <tbody>
              <tr v-for="row in selected.items" :key="row.code">
                <td class="mono font-weight-medium">{{ row.code }}</td>
                <td>{{ row.name }}</td>
                <td class="mono text-right">{{ row.value }}</td>
                <td class="mono text-right">{{ row.value }}</td>
                <td class="mono text-right">$ 0</td>
                <td class="mono text-right">{{ row.value }}</td>
                <td class="mono text-right">$ 0</td>
              </tr>
            </tbody>
          </v-table>

          <v-card class="observation-card mt-4 pa-3">
            <div class="eyebrow mb-2">Observación de la respuesta conciliatoria</div>
            <div class="observation-text">Concepto aceptado por el prestador. Se registra en el comunicado de respuesta inicial.
              Concepto aceptado por el prestador. Se registra en el comunicado de respuesta inicial.
              Concepto aceptado por el prestador. Se registra en el comunicado de respuesta inicial.
              Concepto aceptado por el prestador. Se registra en el comunicado de respuesta inicial.
              Concepto aceptado por el prestador. Se registra en el comunicado de respuesta inicial.
              Concepto aceptado por el prestador. Se registra en el comunicado de respuesta inicial.
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.concept-workspace {
  overflow: hidden;
  background: #ffffff;
}

.concept-header {
  min-height: 56px;
  padding: 14px 20px;
}

.concept-body {
  padding: 14px 20px 20px;
  background: #f4f7f8;
}

.concept-layout {
  margin: 0;
}

.concept-list-column {
  padding: 0 20px 0 0 !important;
}

.concept-list {
  overflow: hidden;
  border: 1px solid #86a0ae;
  background: #eaf0f3;
}

.concept-list-heading {
  min-height: 34px;
  color: #23465c;
  background: #dbe6eb;
  border-bottom: 1px solid #9bb0bb;
  font-weight: 700;
}

.concept-list-item {
  min-height: 92px;
  border-bottom: 1px solid #9bb0bb;
  color: #173342;
}

.concept-list-item:last-child {
  border-bottom: 0;
}

.concept-list-item.v-list-item--active {
  background: #c6d9e3;
  box-shadow: inset 3px 0 #284b63;
}

.concept-detail-column {
  min-width: 0;
  padding: 0 !important;
}

.concept-detail-heading {
  padding: 2px 0 10px;
  border-bottom: 1px solid #9bb0bb;
}

.concept-detail-heading h3,
.concept-detail-heading p {
  margin: 0;
}

.concept-header-chips {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.detail-summary-cards {
  margin: 0 -5px;
}

.detail-summary-cards > .v-col {
  padding: 10px 5px 0;
  display: flex;
}

.detail-metric-card,
.detail-info-card,
.observation-card {
  border: 1px solid #8da6b3 !important;
  border-radius: 6px !important;
  box-shadow: none !important;
}

.detail-metric-card,
.detail-info-card {
  width: 100%;
  height: 100%;
}

.detail-metric-card {
  min-height: 76px;
  background: #ffffff;
}

.metric-error .mono {
  color: #9a443e;
}

.metric-success .mono {
  color: #287052;
}

.detail-info-card {
  min-height: 76px;
  background: #eef3f5;
}

.detail-info-card strong {
  display: block;
  margin: 4px 0 2px;
  color: #173342;
  white-space: nowrap;
}

.table-heading {
  margin-top: 12px;
  color: #355363;
  font-size: 14px;
}

.concept-table {
  margin-top: 6px;
  overflow: hidden;
  border: 1px solid #8da6b3;
  border-radius: 6px;
  background: #ffffff;
}

.concept-table th {
  height: 34px !important;
  background: #dbe6eb !important;
  border-bottom: 2px solid #86a0ae !important;
  color: #173342 !important;
}

.concept-table td {
  height: 44px;
  border-bottom: 1px solid #c1cfd5;
  white-space: nowrap;
}

.concept-table tbody tr:last-child td {
  border-bottom: 0;
}

.text-right {
  text-align: right;
}

.observation-card {
  background: #ffffff;
  border-left: 4px solid #284b63 !important;
}

.observation-text {
  padding: 9px 10px;
  border: 1px solid #a9bac3;
  border-radius: 5px;
  color: #23465c;
  background: #f8fafb;
  line-height: 1.4;
}

@media (max-width: 960px) {
  .concept-list-column {
    padding: 0 0 14px !important;
  }

  .concept-list-item {
    min-height: 78px;
  }
}

@media (max-width: 600px) {
  .concept-header {
    align-items: flex-start !important;
    flex-wrap: wrap;
    padding: 12px;
  }

  .concept-header .text-caption {
    width: 100%;
    margin-left: 36px;
  }

  .concept-header-chips {
    width: 100%;
    margin-left: 36px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .concept-body {
    padding: 12px;
  }

  .concept-table {
    overflow-x: auto;
  }

}
</style>
