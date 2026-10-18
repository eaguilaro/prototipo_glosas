<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ modelValue: Boolean, invoice: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'saved'])

const analysisOptions = [
  { value: 'tarifas', code: 'TR', label: 'Tarifas', description: 'Valores y tarifas pactadas' },
  { value: 'soportes', code: 'SP', label: 'Soportes', description: 'Documentos y requisitos' }
]
const analysisType = ref('tarifas')
const loading = ref(false)
const analyzed = ref(false)

const resultados = {
  tarifas: {
    title: 'Posibles diferencias tarifarias',
    confianza: 82,
    text: 'Se detectaron 2 conceptos que conviene comparar con la tarifa pactada del convenio.',
    items: ['Consulta médica domiciliaria · revisar tarifa vigente', 'Insumo quirúrgico · validar cantidad facturada'],
    accion: 'Solicitar ajuste de tarifa'
  },
  soportes: {
    title: 'Soportes posiblemente incompletos',
    confianza: 92,
    text: 'Se encontraron 3 ítems que podrían requerir orden médica, autorización o evidencia de prestación.',
    items: ['SOP001 · Orden de servicio sin firma', 'SOP002 · Autorización no adjunta', 'SOP003 · Evidencia de atención domiciliaria pendiente'],
    accion: 'Solicitar documentos faltantes'
  }
}
const result = computed(() => resultados[analysisType.value])

const botonLabel = computed(() => {
  const opcion = analysisOptions.find(o => o.value === analysisType.value)
  return `Analizar glosas por ${opcion.label.toLowerCase()}`
})

function confianzaColor(valor) {
  if (valor >= 80) return 'success'
  if (valor >= 50) return 'warning'
  return 'error'
}
const confianzaColorClass = computed(() => confianzaColor(result.value.confianza))

function analyze() {
  loading.value = true
  analyzed.value = false
  window.setTimeout(() => { loading.value = false; analyzed.value = true }, 550)
}

function close() {
  emit('update:modelValue', false)
}
function enviarRevision() {
  emit('saved', 'Análisis enviado a revisión del auditor')
  close()
}
function guardarBorrador() {
  emit('saved', 'Análisis guardado como borrador')
  close()
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="900" scrollable class="ai-dialog" @update:model-value="emit('update:modelValue', $event)">
    <v-card class="dialog-card">
      <v-card-title class="ai-header text-white d-flex align-center justify-space-between px-4 py-3">
        <div class="d-flex align-center ga-3">
          <div class="ai-icon-badge"><v-icon icon="mdi-creation" size="18" /></div>
          <div>
            <div class="text-h6 font-weight-bold">Asistente de glosas</div>
            <div class="text-body-2 ai-header-subtitle">Propuesta de apoyo inteligente</div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" aria-label="Cerrar asistente" @click="close" />
      </v-card-title>

      <v-card-text class="pa-4">
        <v-alert type="success" variant="tonal" density="compact" :icon="false" class="mb-4">
          <strong class="mr-1">DEMO</strong>Las recomendaciones requieren revisión del auditor.
        </v-alert>

        <v-row>
          <v-col cols="12" md="5">
            <div class="eyebrow mb-2">¿Qué deseas analizar?</div>
            <div class="analysis-options">
              <button
                v-for="option in analysisOptions"
                :key="option.value"
                type="button"
                class="analysis-option"
                :class="{ 'analysis-option--active': analysisType === option.value }"
                @click="analysisType = option.value"
              >
                <span class="analysis-option-badge">{{ option.code }}</span>
                <span class="analysis-option-text">
                  <span class="analysis-option-label">{{ option.label }}</span>
                  <span class="analysis-option-desc">{{ option.description }}</span>
                </span>
              </button>
            </div>

            <v-card variant="outlined" class="pa-3 mt-3 dialog-section">
              <div class="d-flex justify-space-between align-center">
                <div class="eyebrow">Cuenta analizada</div>
                <span class="text-success text-caption font-weight-medium">Lista para revisar</span>
              </div>
              <div class="mono text-h6 mt-2">{{ invoice }}</div>
              <div class="text-body-2 text-medium-emphasis mt-1">5 conceptos · 12 ítems · $ 200.000 glosados</div>
            </v-card>

            <v-btn block size="large" color="primary" class="mt-4" :loading="loading" prepend-icon="mdi-creation" @click="analyze">
              {{ botonLabel }}
            </v-btn>
          </v-col>

          <v-col cols="12" md="7">
            <v-card min-height="240" variant="tonal" color="blue-grey-lighten-5" class="pa-4 dialog-section ai-result-panel">
              <template v-if="!analyzed && !loading">
                <div class="h-100 d-flex flex-column align-center justify-center text-center text-blue-grey-darken-2">
                  <v-icon icon="mdi-chart-search" size="56" class="mb-3" />
                  <div class="text-h6">Lista para revisar</div>
                  <p class="text-body-2">Selecciona un tipo de análisis y ejecuta la revisión de la cuenta.</p>
                </div>
              </template>

              <template v-else-if="loading">
                <div class="h-100 d-flex flex-column align-center justify-center">
                  <v-progress-circular indeterminate color="primary" size="48" />
                  <div class="mt-4 text-body-1">Analizando conceptos...</div>
                </div>
              </template>

              <template v-else>
                <div class="d-flex align-start ga-3">
                  <div class="ai-result-icon"><v-icon icon="mdi-alert-decagram-outline" size="18" /></div>
                  <div>
                    <div class="text-h6 font-weight-bold">{{ result.title }}</div>
                    <div class="mt-1">
                      <span class="text-medium-emphasis text-body-2">Confianza orientativa</span>
                      <span class="font-weight-bold ml-1" :class="`text-${confianzaColorClass}`">{{ result.confianza }}%</span>
                    </div>
                  </div>
                </div>
                <p class="text-body-1 mt-4">{{ result.text }}</p>
                <div class="ai-result-items">
                  <div v-for="item in result.items" :key="item" class="ai-result-item">{{ item }}</div>
                </div>
                <v-btn variant="outlined" color="primary" append-icon="mdi-chevron-down" class="mt-4">
                  {{ result.accion }}
                </v-btn>
              </template>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="px-4 py-3">
        <v-spacer />
        <v-btn variant="outlined" :disabled="!analyzed" @click="enviarRevision">Enviar a revisión</v-btn>
        <v-btn variant="outlined" :disabled="!analyzed" @click="guardarBorrador">Guardar borrador</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.eyebrow { color: #526873; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

.ai-header { background: linear-gradient(135deg, #0f3d38, #17594c); }
.ai-header-subtitle { color: rgba(255, 255, 255, 0.78); }
.ai-icon-badge {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  flex-shrink: 0;
}

.analysis-options { display: flex; gap: 10px; }
.analysis-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #d3dde1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.analysis-option:hover { border-color: #9bb0bb; }
.analysis-option--active { border-color: #2f7d5f; background: #eef7f2; }
.analysis-option-badge {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #526873;
  background: #eef3f5;
}
.analysis-option--active .analysis-option-badge { color: #fff; background: #2f7d5f; }
.analysis-option-text { display: flex; flex-direction: column; }
.analysis-option-label { font-weight: 600; color: #1b3446; font-size: 13.5px; }
.analysis-option-desc { font-size: 11.5px; color: #7f939c; }

.dialog-section { border-color: #d3dde1 !important; }

.ai-result-panel { color: #1d2933; }
.ai-result-panel .text-h6 { color: #1b3446; font-weight: 700; }
.ai-result-panel .text-body-1 { color: #354b57; }

.ai-result-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #7a2e2e;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-result-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #e7f1ec;
}
.ai-result-item { position: relative; padding-left: 14px; font-size: 13.5px; color: #33454f; }
.ai-result-item::before { content: '–'; position: absolute; left: 0; color: #7f939c; }
</style>