<script setup>
defineProps({ modelValue: { type: Boolean, default: true } })
const emit = defineEmits(['update:modelValue', 'navigate'])
const items = [
  { label: 'Gestion de cuentas', icon: 'mdi-home-outline', action: 'home' },
  { label: 'Planos Glosa Inicial' ,icon: 'mdi-file-plus-outline', action: 'file-load' },
  { label: 'Planos Respuesta', icon: 'mdi-reply-outline', action: 'file-respuesta' },
  { label: 'Planos Conciliacion', icon: 'mdi-reply-outline', action: 'file-conciliacion' },
  { label: 'Oficios de Respuesta ', icon: 'mdi-email-outline', action: 'glosas-comunicados' },  
  { label: 'Actas de conciliación', icon: 'mdi-file-sign', action: 'actas-glosas'  },
  { label: 'Conciliacion Masiva', icon: 'mdi-file-multiple-outline', action: 'conciliacion-administrativa' },  
  { label: 'Trazabilidad', icon: 'mdi-book-open-page-variant',  action: 'trazabilidad-glosas' }, 
  { label: 'Integracion SIIFA', icon: 'mdi-book-open-page-variant',  action: 'integracion-siifa' }, 
  { label: 'Dashboard', icon: 'mdi-finance', action: 'dashboard-glosas' },
  { label: 'Wiki de validaciones', icon: 'mdi-book-open-page-variant', action: 'wiki' }, 
]
function select(item) { emit('navigate', item); }
</script>

<template>
  <v-navigation-drawer
    :model-value="modelValue"
    class="desktop-sidebar"
    color="#1b3446"
    width="252"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="d-flex align-center justify-space-between px-4 py-4 border-b" style="border-color: rgba(255,255,255,.12) !important">
      <div class="d-flex align-center ga-2 text-white text-caption font-weight-bold">
        <v-avatar color="rgba(255,255,255,.14)" rounded="sm" size="30"><span class="mono text-caption">GM</span></v-avatar>
        Gestión de glosas
      </div>
      <v-btn icon="mdi-chevron-left" variant="text" color="white" size="small" aria-label="Ocultar menú" @click="emit('update:modelValue', false)" />
    </div>
    <v-list bg-color="transparent" class="px-2 py-3" nav density="compact">
      <v-list-item v-for="item in items" :key="item.label" :title="item.label" :prepend-icon="item.icon" rounded="sm" class="text-blue-grey-lighten-4 mb-1" @click="select(item)" />
    </v-list>
    <template #append>
      <div class="d-flex align-center ga-2 px-4 py-4 text-blue-grey-lighten-3 text-caption border-t" style="border-color: rgba(255,255,255,.1) !important">
        <v-icon icon="mdi-circle" size="8" color="success" /> Sesión activa
      </div>
    </template>
  </v-navigation-drawer>
  <v-btn v-if="!modelValue" class="position-fixed" style="left: 10px; top: 82px; z-index: 10" icon="mdi-chevron-right" color="primary" size="small" aria-label="Mostrar menú" @click="emit('update:modelValue', true)" />
</template>
