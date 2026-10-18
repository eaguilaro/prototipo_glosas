<script setup>
import { ref } from 'vue'

const rules = ref([
  { code: 'VAL-001', title: 'Columna No Factura obligatoria', severity: 'Bloqueante', guidance: 'El archivo de consulta debe tener una columna con el número de factura.' },
  { code: 'VAL-002', title: 'Factura no encontrada', severity: 'Bloqueante', guidance: 'Verifique que la factura exista y esté habilitada para generación de plano.' },
  { code: 'VAL-003', title: 'Valor glosado mayor al facturado', severity: 'Advertencia', guidance: 'La cantidad glosada no puede producir un valor superior al valor de la línea.' }
])
const newRule = ref({ code: '', title: '', severity: 'Advertencia', guidance: '' })
const saved = ref(false)

function addRule() {
  if (!newRule.value.code || !newRule.value.title || !newRule.value.guidance) return
  rules.value.push({ ...newRule.value })
  newRule.value = { code: '', title: '', severity: 'Advertencia', guidance: '' }
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 2200)
}
</script>

<template>
  <div class="wiki-page">
    <div class="view-heading">
      <div><div class="eyebrow">Base de conocimiento</div><h1>Wiki de validaciones de carga</h1><p>Documenta errores, reglas y soluciones para que el proceso sea fácil de mantener.</p></div>
      <v-btn variant="outlined" color="primary" prepend-icon="mdi-arrow-left" to="/">Volver al resumen</v-btn>
    </div>

    <v-row>
      <v-col cols="12" md="7">
        <v-card class="wiki-panel surface-border">
          <v-card-title class="panel-title">Reglas y errores registrados</v-card-title>
         <v-card-text>
  <v-expansion-panels variant="accordion">
    <v-expansion-panel
      v-for="rule in rules"
      :key="rule.code"
    >
      <v-expansion-panel-title>
        <div class="rule-title">
          <span class="mono rule-code">
            {{ rule.code }}
          </span>

          <strong class="rule-name">
            {{ rule.title }}
          </strong>

          <div class="rule-severity">
            <v-chip
              size="small"
              :color="rule.severity === 'Bloqueante' ? 'error' : 'warning'"
              variant="tonal"
            >
              {{ rule.severity }}
            </v-chip>
          </div>
        </div>
      </v-expansion-panel-title>

      <v-expansion-panel-text>
        {{ rule.guidance }}
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card class="wiki-panel surface-border">
          <v-card-title class="panel-title">Crear validación</v-card-title>
          <v-card-text>
             <v-row class="rule-form" dense>
              <v-col cols="12" sm="4" md="3">
            <v-text-field v-model="newRule.code" label="Código" placeholder="VAL-004" />
            </v-col>
            <v-col cols="12" sm="8" md="9">
            <v-text-field v-model="newRule.title" label="Nombre del error" placeholder="Descripción corta" />
            </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-select v-model="newRule.severity" label="Tipo" :items="['Bloqueante', 'Advertencia', 'Informativa']" />
           </v-col>
             <v-col cols="12">
            <v-textarea v-model="newRule.guidance" label="Cómo resolverlo" rows="4" placeholder="Explica qué debe revisar el usuario..." />
             </v-col>
            <v-btn block color="primary" prepend-icon="mdi-content-save-outline" @click="addRule">Guardar regla</v-btn>
            <v-alert v-if="saved" type="success" variant="tonal" density="compact" class="mt-3">Regla agregada a la wiki local.</v-alert>
           </v-row>
          </v-card-text>
         
        </v-card>
      </v-col>
    </v-row>

    <v-card class="wiki-panel surface-border mt-4">
      <v-card-title class="panel-title">Flujo recomendado</v-card-title>
      <v-card-text class="workflow"><div v-for="(step, index) in ['Preparar Excel con No Factura', 'Cargar y validar registros', 'Revisar errores bloqueantes', 'Descargar plano de glosas']" :key="step" class="workflow-step"><span>{{ index + 1 }}</span>{{ step }}</div></v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.wiki-page { padding: 18px 22px 32px; }
.view-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 16px; }
h1 { margin: 3px 0 5px; color: #1b3446; font-size: 24px; }
.view-heading p { margin: 0; color: #526873; font-size: 14px; }
.wiki-panel { background: #fff; }
.panel-title { min-height: 46px; padding: 10px 16px; color: #1b3446; font-size: 16px !important; }
.rule-code { min-width: 72px; margin-right: 14px; color: #284b63; }
.workflow { display: flex; flex-wrap: wrap; gap: 10px; }
.workflow-step { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #9bb0bb; border-radius: 5px; color: #284b63; background: #eef3f5; font-size: 13px; }
.workflow-step span { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; color: #fff; background: #284b63; font-size: 11px; }
@media (max-width: 700px) { .wiki-page { padding: 12px; } .view-heading { flex-direction: column; } h1 { font-size: 20px; } }
.rule-title {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) 120px;
  align-items: center;
  width: 100%;
  gap: 12px;
}

.rule-code {
  font-size: 12px;
  color: #526873;
}

.rule-name {
  min-width: 0;
  color: #1b3446;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rule-severity {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
</style>
