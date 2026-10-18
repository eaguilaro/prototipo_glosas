<script setup>
defineEmits(["open"]);

const groups = [
  {
    title: "Gestión de glosas",
    actions: [
      ["GI", "Glosa inicial", "initial"],
      ["RG", "Respuesta", "response"],
      ["TC", "Conciliación", "conciliation"],
      ["DV", "Devolución", "initial"],
      ["→", "Redireccionar", "notice"],
      ["→", "Gestion Integral", "glosa-conciliacion"],
    ],
  },
  {
    title: "Carga de glosa por planos",
    actions: [
      ["GI", "Glosas iniciales", "file-load"],
      ["RG", "Respuestas", "file-respuesta"],
      ["TC", "Conciliaciones", "file-conciliacion"],
      // ["GI", "Nuevos hallazgos", "notice"],      
    ],
  },
  {
    title: "Consultas y salida",
    actions: [
      ["IN", "Imprimir notas", "notice"],
      ["RD", "Detalle de glosas", "notice"],
      ["→", "Listado de glosas", "notice"],
    ],
  },
];
</script>
<template>
  <!-- Bloque 2: accesos agrupados por tipo de tramite. -->
  <v-card class="surface-border" rounded="lg">
    <v-card-text class="pa-4">
      <div
        class="d-flex flex-wrap justify-space-between align-center ga-3 mb-3"
      >
        <div class="section-title text-body-2">
            <v-avatar color="#1b3446" size="26" class="mr-2">
                <span class="text-white text-caption font-weight-bold">2</span>
              </v-avatar>
          Procesos de Auditoría y Cuentas Médicas
        </div>

        <div class="text-caption text-blue-grey-darken-2">
          Accesos rápidos para la gestión de la cuenta
        </div>
      </div>

      <v-row class="menu-groups">
        <v-col
          v-for="(group, index) in groups"
          :key="group.title"
          cols="12"
          md="4"
          class="group-column"
          :class="[`group-${index + 1}`, { 'border-s': index > 0 }]"
        >
          <div class="eyebrow mb-3">
            {{ group.title }}
          </div>

          <div class="action-grid">
            <v-btn
              v-for="action in group.actions"
              :key="action[1]"
              class="action-button"
              rounded="sm"
              :color="action[2] === 'initial' ? 'primary' : undefined"
              :variant="action[2] === 'initial' ? 'flat' : 'outlined'"
              size="small"
              @click="$emit('open', action[2])"
            >
              <span class="mono action-code">
                {{ action[0] }}
              </span>

              <span class="action-label">
                {{ action[1] }}
              </span>
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.menu-groups {
  margin-top: 0;
  border-top: 1px solid #b1c0c8;
  border-bottom: 1px solid #b1c0c8;
}

.group-column {
  min-width: 0;
  padding: 16px !important;
  position: relative;
}

.border-s {
  border-left: 0;
}

/* Separador interno: no depende del borde exterior del v-col de Vuetify. */
.border-s::before {
  background: linear-gradient(
    to bottom,
    transparent,
    #7f949f 10%,
    #7f949f 90%,
    transparent
  );
  box-shadow: 1px 0 0 rgba(255, 255, 255, 0.9);
  content: "";
  left: 0;
  position: absolute;
  top: 10px;
  bottom: 10px;
  width: 2px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.group-1 .action-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.action-button {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  justify-content: flex-start;
  text-transform: none;
  letter-spacing: 0.2px;
  border: 1px solid #7f949f !important;
  border-radius: 6px !important;
  box-shadow: 0 1px 2px rgba(27, 52, 70, 0.08);
  transition: border-color 0.15s ease, background-color 0.15s ease,
    box-shadow 0.15s ease, transform 0.15s ease;
}

.action-button:hover {
  border-color: #284b63 !important;
  box-shadow: 0 3px 8px rgba(27, 52, 70, 0.16);
  transform: translateY(-1px);
}

.action-button:focus-visible {
  outline: 3px solid rgba(40, 75, 99, 0.24);
  outline-offset: 2px;
}

.action-code {
  min-width: 28px;
  margin-right: 6px;
  text-align: center;
}

.action-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 960px) {
  .border-s {
    border-left: 0;
    border-top: 1px solid #9aadb7;
  }

  .border-s::before {
    display: none;
  }

  .group-1 .action-grid,
  .action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .group-column {
    padding: 14px 0 !important;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
