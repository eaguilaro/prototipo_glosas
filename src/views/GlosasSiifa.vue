<!--
  GlosasSiifaERP.vue  (v2)
  Bandeja de glosas que las ERP formularon a tu IPS en SIIFA (Módulo 3).
  Vue 3 (Composition API) + JavaScript. Sin dependencias externas.

  Principio: consultar NO es lo mismo que hacer parte de tu proceso.
    1) Consultas a SIIFA (GET)            -> "Solo consulta"
    2) La pasas a tu producto (DGLOSA)    -> "En mi producto"
    3) Registras tu respuesta en el producto y la envías a SIIFA (PUT)

  Con USE_MOCK = true funciona con datos de prueba.
  Props: baseUrl, token, nitIps (SIIFA) · apiProducto (tu backend Oracle) · esAdmin (administra la ayuda)
-->
<template>
  <section class="gs">
    <header class="gs-head">
      <div>
        <h2>Glosas de las ERP en SIIFA</h2>
        <p class="muted">Consulta lo que las ERP te glosaron, pásalo a tu producto y responde desde aquí.</p>
      </div>
      <div class="fila-btn">
        <button class="btn" @click="abrirWiki()">Ayuda</button>
        <button class="btn primary" :disabled="cargando" @click="cargar(1)">
          {{ cargando ? 'Consultando…' : 'Actualizar desde SIIFA' }}
        </button>
      </div>
    </header>

    <p class="aviso-flujo">
      Lo que ves aquí es una <strong>consulta a SIIFA</strong>. Una glosa solo hace parte de tu proceso cuando la pasas a tu producto.
      <button class="link" @click="abrirWiki('consulta-vs-producto')">Ver cómo funciona</button>
    </p>

    <nav class="tabs" role="tablist">
      <button v-for="t in tabs" :key="t.id" role="tab" class="tab" :class="{ on: filtros.estado === t.id }"
        :aria-selected="filtros.estado === t.id" @click="filtros.estado = t.id">
        {{ t.label }} <span class="count">{{ conteo[t.id] }}</span>
      </button>
    </nav>

    <form class="filtros" @submit.prevent="cargar(1)">
      <label>Factura<input v-model.trim="filtros.numeroFactura" placeholder="Ej. FE-10234" /></label>
      <label>NIT de la ERP<input v-model.trim="filtros.nitErp" placeholder="Sin dígito de verificación" /></label>
      <label>Reportada desde<input type="date" v-model="filtros.desde" /></label>
      <label>Reportada hasta<input type="date" v-model="filtros.hasta" /></label>
      <label>En mi producto
        <select v-model="filtros.vinculo">
          <option value="">Todas</option>
          <option value="consulta">Solo consulta</option>
          <option value="posible">Posible duplicado</option>
          <option value="producto">En mi producto</option>
        </select>
      </label>
      <div class="fila-btn">
        <button class="btn primary" type="submit">Buscar</button>
        <button class="btn ghost" type="button" @click="limpiar">Limpiar</button>
      </div>
    </form>

    <div v-if="seleccion.size" class="bulk" role="status">
      <strong>{{ seleccion.size }}</strong> seleccionadas
      <button class="btn primary" :disabled="!selConsulta.length" @click="confirmarImportar(selConsulta)">
        Pasar {{ selConsulta.length }} a mi producto
      </button>
      <button class="btn primary" :disabled="!selListas.length" @click="confirmarEnvioMasivo">
        Enviar {{ selListas.length }} respuestas a SIIFA
      </button>
      <button class="btn ghost" @click="seleccion.clear()">Quitar selección</button>
      <span v-if="selPosibles" class="muted">Los posibles duplicados se resuelven uno a uno, abriendo su detalle.</span>
    </div>

    <p v-if="error" class="alert err" role="alert">{{ error }}</p>

    <div class="tabla-wrap">
      <table class="tabla">
        <thead>
          <tr>
            <th class="chk"><input type="checkbox" :checked="todasSel" @change="toggleTodas" aria-label="Seleccionar todas" /></th>
            <th>Factura</th><th>ERP</th><th>Código</th><th class="num">Valor glosado</th>
            <th>Reportada</th><th>Estado en SIIFA</th><th>Plazo</th><th>En mi producto</th><th>Mi respuesta</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando"><td colspan="11" class="vacio">Consultando SIIFA…</td></tr>
          <tr v-else-if="!filas.length">
            <td colspan="11" class="vacio">No hay glosas con estos filtros. Prueba otra pestaña o amplía el rango de fechas.</td>
          </tr>
          <tr v-for="g in filas" :key="g.id" :class="{ sel: detalle?.id === g.id }">
            <td class="chk"><input type="checkbox" :checked="seleccion.has(g.id)" @change="toggle(g.id)" :aria-label="'Seleccionar glosa ' + g.id" /></td>
            <td><strong>{{ g.numeroFactura }}</strong></td>
            <td>{{ g.erp.nombre }}<div class="muted sm">{{ g.erp.nit }}</div></td>
            <td>{{ g.codigo }}<div class="muted sm clip" :title="g.descCodigo">{{ g.descCodigo }}</div></td>
            <td class="num">{{ moneda(g.valor) }}</td>
            <td>{{ fecha(g.fechaReporte) }}</td>
            <td><span class="pill" :class="estadoDe(g).clase">{{ estadoDe(g).label }}</span></td>
            <td><span v-if="plazoDe(g)" class="plazo" :class="plazoDe(g).clase">{{ plazoDe(g).texto }}</span><span v-else class="muted">—</span></td>
            <td><span class="pill" :class="'v-' + g.local.estado">{{ vinculoLabel[g.local.estado] }}</span></td>
            <td><span v-if="pendienteEnvio(g)" class="pill s-accion">Lista para enviar</span><span v-else class="muted">—</span></td>
            <td class="acc">
              <button v-if="g.local.estado === 'consulta'" class="btn sm-btn" @click="confirmarImportar([g])">Pasar a mi producto</button>
              <button class="btn sm-btn" @click="abrirDetalle(g)">Ver</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="pag">
      <span class="muted">{{ pag.totalRegistros }} glosas · página {{ pag.paginaActual }} de {{ pag.totalPaginas || 1 }}</span>
      <div class="fila-btn">
        <button class="btn ghost" :disabled="pag.paginaActual <= 1" @click="cargar(pag.paginaActual - 1)">Anterior</button>
        <button class="btn ghost" :disabled="pag.paginaActual >= pag.totalPaginas" @click="cargar(pag.paginaActual + 1)">Siguiente</button>
      </div>
    </footer>

    <!-- Todo lo flotante va en <body>: así ningún contenedor padre lo recorta -->
    <Teleport to="body">
      <div class="gs-overlay">

        <!-- Panel de detalle -->
        <template v-if="detalle">
          <div class="scrim" @click="cerrarDetalle"></div>
          <aside class="drawer" role="dialog" aria-modal="true" aria-label="Detalle de glosa">
            <div class="drawer-head">
              <div>
                <h3>Glosa {{ detalle.id }} · Factura {{ detalle.numeroFactura }}</h3>
                <p class="muted">{{ detalle.erp.nombre }} · NIT {{ detalle.erp.nit }}</p>
              </div>
              <button ref="btnCerrar" class="x" @click="cerrarDetalle" aria-label="Cerrar panel" title="Cerrar (Esc)">✕</button>
            </div>

            <div class="drawer-body">
              <!-- Estado frente a tu producto -->
              <div class="caja" :class="'v-' + detalle.local.estado">
                <template v-if="detalle.local.estado === 'producto'">
                  <strong>En tu producto.</strong> IDGLOSA {{ detalle.local.idGlosa }}<span v-if="detalle.local.idItem"> · ítem {{ detalle.local.idItem }}</span>.
                </template>
                <template v-else-if="detalle.local.estado === 'posible'">
                  <strong>Posible duplicado.</strong> Se parece a tu glosa IDGLOSA {{ detalle.local.idGlosa }}. Confirma si es la misma para no duplicarla.
                  <div class="fila-btn">
                    <button class="btn primary" :disabled="enviando" @click="vincularMisma(detalle)">Es la misma, vincular</button>
                    <button class="btn" @click="confirmarImportar([detalle])">Es distinta, pasar como nueva</button>
                  </div>
                </template>
                <template v-else>
                  <strong>Solo consulta.</strong> La ERP la reportó en SIIFA, pero todavía no hace parte de tu proceso. No podrás responderla hasta pasarla a tu producto.
                  <div class="fila-btn"><button class="btn primary" @click="confirmarImportar([detalle])">Pasar a mi producto</button></div>
                </template>
              </div>

              <dl class="datos">
                <div><dt>Código</dt><dd>{{ detalle.codigo }} · {{ detalle.descCodigo }}</dd></div>
                <div><dt>Ítem afectado</dt><dd>{{ detalle.item ? detalle.item.tipo + ' ' + detalle.item.id : 'Toda la factura' }}</dd></div>
                <div><dt>Valor glosado</dt><dd>{{ moneda(detalle.valor) }}</dd></div>
                <div><dt>Formulada</dt><dd>{{ fecha(detalle.fechaFormulacion) }}</dd></div>
                <div><dt>Observación de la ERP</dt><dd>{{ detalle.obs || '—' }}</dd></div>
              </dl>

              <h4>Recorrido en SIIFA</h4>
              <ol class="linea">
                <li v-for="p in pasos(detalle)" :key="p.titulo" :class="p.estado">
                  <div class="linea-t">{{ p.titulo }} <span class="muted sm">{{ p.quien }}</span></div>
                  <div v-if="p.dato" class="linea-d">
                    <strong>{{ p.dato.codigo }}</strong> {{ p.dato.desc }}
                    <div>{{ p.dato.obs }}</div>
                    <div class="muted sm">{{ fecha(p.dato.fecha) }}</div>
                  </div>
                  <div v-else-if="p.estado === 'actual'" class="muted sm">Pendiente de tu parte</div>
                </li>
              </ol>

              <!-- Respuestas hechas sobre tu producto -->
              <template v-if="enProducto(detalle)">
                <h4>Respuestas en mi producto</h4>
                <p v-if="!misRespuestas.length" class="muted">Aún no has registrado respuestas para esta glosa en tu producto.</p>
                <div v-for="m in misRespuestas" :key="m.clave" class="resp">
                  <div class="resp-t">
                    {{ m.titulo }}
                    <span class="pill" :class="m.r.enviada ? 's-cerrada' : 's-accion'">{{ m.r.enviada ? 'Enviada a SIIFA' : 'Pendiente de envío' }}</span>
                  </div>
                  <div><strong>{{ m.r.codigo }}</strong> {{ m.r.desc }}</div>
                  <div>{{ m.r.obs }}</div>
                  <div class="muted sm">{{ fecha(m.r.fecha) }} · {{ m.r.usuario }}</div>
                  <div v-if="!m.r.enviada && m.clave === accion(detalle) && !editando" class="fila-btn">
                    <button class="btn primary" :disabled="enviando" @click="confirmarEnvio(m.clave)">Enviar a SIIFA</button>
                    <button class="btn" @click="modificar(m)">Modificar antes de enviar</button>
                  </div>
                </div>
                <p v-if="detalle.respuesta && !detalle.miProducto?.respuesta" class="alert warn">
                  SIIFA ya tiene una respuesta a esta glosa que no está en tu producto. Revisa que no se haya enviado desde otro sistema.
                </p>
              </template>

              <!-- Redactar -->
              <section v-if="accion(detalle)" class="form">
                <template v-if="!enProducto(detalle)">
                  <h4>{{ accion(detalle) === 'respuesta' ? 'Responder glosa' : 'Responder reiteración' }}</h4>
                  <p class="alert warn">Bloqueado: pasa la glosa a tu producto para poder responderla.</p>
                </template>
                <form v-else-if="!pendienteEnvio(detalle) || editando" @submit.prevent="guardar(true)">
                  <h4>{{ accion(detalle) === 'respuesta' ? 'Responder glosa' : 'Responder reiteración (subsanación)' }}</h4>
                  <label>Tipo de respuesta
                    <select v-model="form.codigo" required>
                      <option value="" disabled>Selecciona…</option>
                      <option v-for="c in catalogos[accion(detalle)]" :key="c.id" :value="c.id">{{ c.id }} · {{ c.descripcion }}</option>
                    </select>
                  </label>
                  <label>Fecha<input type="date" v-model="form.fecha" :max="hoy" required /></label>
                  <label>Justificación
                    <textarea v-model.trim="form.obs" rows="4" maxlength="1000" required placeholder="Acepta o justifica por qué no se acepta"></textarea>
                    <span class="muted sm">{{ form.obs.length }}/1000</span>
                  </label>
                  <div class="fila-btn">
                    <button type="button" class="btn" :disabled="enviando || !formListo" @click="guardar(false)">Guardar en mi producto</button>
                    <button class="btn primary" :disabled="enviando || !formListo">Guardar y enviar a SIIFA</button>
                    <button v-if="editando" type="button" class="btn ghost" @click="editando = false">Cancelar</button>
                  </div>
                </form>
              </section>
              <p v-else-if="detalle.decision" class="alert ok">La ERP registró su decisión final. No hay más acciones de tu parte.</p>
              <p v-else class="muted">Esperando la siguiente actuación de la ERP.</p>
            </div>
          </aside>
        </template>

        <!-- Confirmación -->
        <div v-if="modal" class="modal-bg" @click.self="modal = null">
          <div class="modal" role="alertdialog" aria-modal="true">
            <h3>{{ modal.titulo }}</h3>
            <p>{{ modal.texto }}</p>
            <p v-if="modal.nota" class="muted sm">{{ modal.nota }}</p>
            <div class="fila-btn fin">
              <button class="btn ghost" @click="modal = null">Cancelar</button>
              <button class="btn primary" :disabled="enviando" @click="modal.ok()">{{ enviando ? 'Procesando…' : modal.boton }}</button>
            </div>
          </div>
        </div>

        <!-- Ayuda (wiki) -->
        <div v-if="wikiAbierta" class="modal-bg" @click.self="cerrarWiki">
          <div class="wiki" role="dialog" aria-modal="true" aria-label="Ayuda">
            <div class="wiki-head">
              <h3>Ayuda · Glosas en SIIFA</h3>
              <div class="fila-btn">
                <button v-if="esAdmin" class="btn" :class="{ primary: modoAdmin }" @click="alternarAdmin">
                  {{ modoAdmin ? 'Salir de administración' : 'Administrar ayuda' }}
                </button>
                <button class="x" @click="cerrarWiki" aria-label="Cerrar ayuda" title="Cerrar (Esc)">✕</button>
              </div>
            </div>
            <div class="wiki-cuerpo">
              <nav class="wiki-nav" aria-label="Secciones">
                <div v-for="(a, i) in articulos" :key="a.id" class="wiki-item">
                  <button :class="{ on: wikiSel === a.id && !edit }" @click="wikiSel = a.id; edit = null">{{ a.titulo }}</button>
                  <span v-if="modoAdmin" class="mover">
                    <button :disabled="i === 0" @click="mover(i, -1)" aria-label="Subir">↑</button>
                    <button :disabled="i === articulos.length - 1" @click="mover(i, 1)" aria-label="Bajar">↓</button>
                  </span>
                </div>
                <button v-if="modoAdmin" class="btn sm-btn nueva" @click="nuevoArticulo">+ Nueva sección</button>
              </nav>

              <article class="wiki-art">
                <form v-if="edit" @submit.prevent="guardarArticulo" class="form">
                  <label>Título<input v-model.trim="edit.titulo" required maxlength="80" /></label>
                  <label>Contenido
                    <textarea v-model="edit.contenido" rows="12" required></textarea>
                    <span class="muted sm">Formato: línea en blanco = párrafo · "## " = subtítulo · "- " = viñeta · **texto** = negrita</span>
                  </label>
                  <details><summary>Vista previa</summary><div class="md" v-html="md(edit.contenido)"></div></details>
                  <div class="fila-btn">
                    <button class="btn primary">Guardar sección</button>
                    <button type="button" class="btn ghost" @click="edit = null">Cancelar</button>
                  </div>
                </form>
                <template v-else-if="articuloActual">
                  <div class="wiki-art-head">
                    <h3>{{ articuloActual.titulo }}</h3>
                    <div v-if="modoAdmin" class="fila-btn">
                      <button class="btn sm-btn" @click="edit = { ...articuloActual }">Editar</button>
                      <button class="btn sm-btn" @click="eliminarArticulo(articuloActual)">Eliminar</button>
                    </div>
                  </div>
                  <div class="md" v-html="md(articuloActual.contenido)"></div>
                </template>
                <p v-else class="muted">No hay secciones de ayuda todavía.</p>
              </article>
            </div>
          </div>
        </div>

        <div v-if="aviso" class="toast" :class="aviso.tipo" role="status">{{ aviso.texto }}</div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  baseUrl: { type: String, default: 'https://siifa.sispropreprod.gov.co/siifafac' },
  token: { type: String, default: '' },        // JWT Bearer de SIIFA
  nitIps: { type: String, default: '' },       // NIT de tu IPS (emisor)
  apiProducto: { type: String, default: '/api' }, // tu backend Oracle (DGLOSA / DGLOSASITEMS)
  esAdmin: { type: Boolean, default: false },  // habilita "Administrar ayuda"
})
const emit = defineEmits(['importada', 'vinculada', 'respondida'])

const USE_MOCK = true
const hoy = new Date().toISOString().slice(0, 10)
const espera = (ms = 350) => new Promise(r => setTimeout(r, ms))
const iso = d => (d ? new Date(d).toISOString() : undefined)

/* ═════════ Datos de prueba (persisten mientras la página esté abierta) ═════════ */
const mockCatalogos = {
  respuesta: [{ id: 'RS01', descripcion: 'Glosa no aceptada' }, { id: 'RS02', descripcion: 'Glosa aceptada' }, { id: 'RS03', descripcion: 'Glosa parcialmente aceptada' }],
  subsanacion: [{ id: 'SB01', descripcion: 'Subsanada' }, { id: 'SB02', descripcion: 'No subsanable' }],
}
const descDe = (clave, id) => mockCatalogos[clave].find(c => c.id === id)?.descripcion || ''
let mockDB = [
  { id: 9001, numeroFactura: 'FE-10234', erp: { nit: '800123456', nombre: 'EPS Sanitas' }, valor: 1250000, codigo: 'FA0101', descCodigo: 'Estancia: diferencia en tarifa pactada', obs: 'Tarifa facturada supera el contrato.', item: { tipo: 'Procedimiento', id: 3021 }, fechaFormulacion: '2026-09-28', fechaReporte: '2026-09-29', respuesta: null, reiteracion: null, subsanacion: null, decision: null, local: { estado: 'posible', idGlosa: 4412, idItem: 3 }, miProducto: null },
  { id: 9002, numeroFactura: 'FE-10240', erp: { nit: '900654321', nombre: 'Nueva EPS' }, valor: 380000, codigo: 'SO0301', descCodigo: 'Soporte: falta autorización', obs: 'No se adjunta autorización.', item: { tipo: 'Medicamento', id: 812 }, fechaFormulacion: '2026-09-10', fechaReporte: '2026-09-10', respuesta: { codigo: 'RS01', desc: 'Glosa no aceptada', obs: 'Se anexa autorización 7788.', fecha: '2026-09-14' }, reiteracion: { codigo: 'FA0101', desc: 'Se mantiene la glosa', obs: 'La autorización no cubre el servicio.', fecha: '2026-09-28' }, subsanacion: null, decision: null, local: { estado: 'producto', idGlosa: 4390, idItem: 1 },
    miProducto: { respuesta: { codigo: 'RS01', desc: 'Glosa no aceptada', obs: 'Se anexa autorización 7788.', fecha: '2026-09-14', usuario: 'M. Rojas', enviada: true }, subsanacion: { codigo: 'SB01', desc: 'Subsanada', obs: 'Se corrige y se adjunta autorización ampliada.', fecha: '2026-09-30', usuario: 'M. Rojas', enviada: false } } },
  { id: 9003, numeroFactura: 'FE-10188', erp: { nit: '800123456', nombre: 'EPS Sanitas' }, valor: 90000, codigo: 'TA0201', descCodigo: 'Tarifa: medicamento', obs: '', item: { tipo: 'Medicamento', id: 455 }, fechaFormulacion: '2026-08-20', fechaReporte: '2026-08-21', respuesta: { codigo: 'RS02', desc: 'Glosa aceptada', obs: 'Se acepta el ajuste.', fecha: '2026-08-25' }, reiteracion: null, subsanacion: null, decision: { codigo: 'DF01', desc: 'Glosa levantada parcialmente', obs: '', fecha: '2026-09-02' }, local: { estado: 'consulta' }, miProducto: null },
  { id: 9004, numeroFactura: 'FE-10251', erp: { nit: '900654321', nombre: 'Nueva EPS' }, valor: 2100000, codigo: 'PE0101', descCodigo: 'Pertinencia: procedimiento no justificado', obs: 'Falta historia clínica.', item: { tipo: 'Procedimiento', id: 3188 }, fechaFormulacion: '2026-09-29', fechaReporte: '2026-09-30', respuesta: null, reiteracion: null, subsanacion: null, decision: null, local: { estado: 'consulta' }, miProducto: null },
  { id: 9005, numeroFactura: 'FE-10255', erp: { nit: '800123456', nombre: 'EPS Sanitas' }, valor: 640000, codigo: 'AU0101', descCodigo: 'Autorización: servicio no autorizado', obs: 'Sin número de autorización.', item: { tipo: 'Consulta', id: 77 }, fechaFormulacion: '2026-09-25', fechaReporte: '2026-09-26', respuesta: null, reiteracion: null, subsanacion: null, decision: null, local: { estado: 'producto', idGlosa: 4501, idItem: 1 },
    miProducto: { respuesta: { codigo: 'RS01', desc: 'Glosa no aceptada', obs: 'La autorización 55231 fue emitida el 24/09.', fecha: '2026-10-01', usuario: 'M. Rojas', enviada: false }, subsanacion: null } },
]
const mockSet = (id, fn) => { const g = mockDB.find(x => x.id === id); if (g) fn(g) }

/* ═════════ SIIFA (GET / PUT) ═════════ */
const hito = (cod, desc, obs, fecha) => (cod ? { codigo: cod, desc, obs, fecha } : null)
const itemDe = r => [['idConsulta', 'Consulta'], ['idHospitalizacion', 'Hospitalización'], ['idMedicamento', 'Medicamento'], ['idOtroServicio', 'Otro servicio'],
  ['idProcedimiento', 'Procedimiento'], ['idRecienNacido', 'Recién nacido'], ['idUrgencia', 'Urgencia']].map(([k, tipo]) => r[k] ? { tipo, id: r[k] } : null).find(Boolean) || null

// GET /api/SeguimientoFactura/List -> modelo de pantalla
const desdeLista = r => ({
  id: r.idSeguimientoFactura, numeroFactura: r.factura?.numeroFactura,
  erp: { nit: r.factura?.adquiriente?.nitAdquiriente, nombre: r.factura?.adquiriente?.razonSocial },
  valor: r.valor, codigo: r.idSeguimientoTipoCodigo, descCodigo: r.descripcionSeguimientoTipoCodigo, obs: r.observacion, item: itemDe(r),
  fechaFormulacion: r.fechaFormulacion, fechaReporte: r.fechaReporte,
  respuesta: hito(r.idSeguimientoTipoCodigoRespuesta, r.descripcionSeguimientoTipoCodigoRespuesta, r.observacionRespuesta, r.fechaRespuesta),
  reiteracion: hito(r.idSeguimientoTipoCodigoReiteracion, r.descripcionSeguimientoTipoCodigoReiteracion, r.observacionReiteracion, r.fechaFormulacionReiteracion),
  subsanacion: hito(r.idSeguimientoTipoCodigoReiteracionRespuesta, r.descripcionSeguimientoTipoCodigoReiteracionRespuesta, r.observacionReiteracionRespuesta, r.fechaFormulacionReiteracionRespuesta),
  decision: hito(r.idSeguimientoTipoCodigoGlosaDecisionFinal, r.descripcionSeguimientoTipoCodigoGlosaDecisionFinal, r.observacionDecisionFinal, r.fechaFormulacionDecisionFinal),
  local: { estado: 'consulta' }, miProducto: null, // TODO: tu backend cruza con DGLOSA/DGLOSASITEMS y completa estos dos campos
})

async function http(base, path, { method = 'GET', body, query, auth = true } = {}) {
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null)) : ''
  const res = await fetch(base + path + qs, {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + props.token } : {}) },
  })
  if (!res.ok) {
    const p = await res.json().catch(() => ({}))
    throw new Error(p.detail || p.title || `El servidor respondió ${res.status}`)
  }
  return res.json().catch(() => ({}))
}
const siifa = (path, o) => http(props.baseUrl, path, o)

const siifaApi = {
  async listar(f, pagina) {
    if (USE_MOCK) { await espera(); const r = JSON.parse(JSON.stringify(mockDB)); return { resultado: r, paginaActual: 1, totalPaginas: 1, totalRegistros: r.length } }
    const r = await siifa('/api/SeguimientoFactura/List', { query: {
      NitEmisor: props.nitIps, NitAdquiriente: f.nitErp, NumeroFactura: f.numeroFactura,
      TipoSeguimiento: 'GLOSA', // TODO: confirmar el valor exacto en preproducción
      FechaCreacionInicio: iso(f.desde), FechaCreacionFinal: iso(f.hasta), NumeroPagina: pagina, RegistrosPorPagina: 20 } })
    return { ...r, resultado: (r.resultado || []).map(desdeLista) }
  },
  async catalogos() {
    if (USE_MOCK) return mockCatalogos
    // TODO: confirmar nombres de grupo con GET /api/SeguimientoTipoCodigo/ByGrupo
    const [a, b] = await Promise.all(['RESPUESTA_GLOSA', 'RESPUESTA_GLOSA'].map(Grupo => siifa('/api/SeguimientoTipoCodigo/ByGrupo', { query: { Grupo } })))
    const m = l => l.map(c => ({ id: c.idSeguimientoTipoCodigo, descripcion: c.descripcion }))
    return { respuesta: m(a), subsanacion: m(b) }
  },
  // Nota: en SIIFA estos envíos son PUT (el Swagger no tiene POST para responder)
  async responder(p) {
    if (USE_MOCK) { await espera(); return mockSet(p.id, g => (g.respuesta = { codigo: p.codigo, desc: descDe('respuesta', p.codigo), obs: p.obs, fecha: p.fecha })) }
    return siifa('/api/SeguimientoFacturaGlosa/Respuesta', { method: 'PUT', body: { idSeguimientoFacturaGlosa: p.id,
      idSeguimientoTipoCodigoRespuesta: p.codigo, observacionRespuesta: p.obs, fechaRespuesta: iso(p.fecha) } })
  },
  async responderMasivo(lista) {
    if (USE_MOCK) { await espera(); return lista.forEach(p => mockSet(p.id, g => (g.respuesta = { codigo: p.codigo, desc: descDe('respuesta', p.codigo), obs: p.obs, fecha: p.fecha }))) }
    return siifa('/api/SeguimientoFacturaGlosa/Respuesta/Masivo', { method: 'PUT', body: { listaRespuestas: lista.map(p => ({
      idSeguimientoFacturaGlosa: p.id, idSeguimientoTipoCodigoRespuesta: p.codigo, observacionRespuesta: p.obs, fechaRespuesta: iso(p.fecha) })) } })
  },
  async subsanar(p) {
    if (USE_MOCK) { await espera(); return mockSet(p.id, g => (g.subsanacion = { codigo: p.codigo, desc: descDe('subsanacion', p.codigo), obs: p.obs, fecha: p.fecha })) }
    return siifa('/api/SeguimientoFacturaGlosa/ReiteracionRespuesta', { method: 'PUT', body: { idSeguimientoFacturaGlosa: p.id,
      idSeguimientoTipoCodigoGlosaReiteracionRespuesta: p.codigo, observacionReiteracionRespuesta: p.obs, fechaFormulacionGlosaReiteracionRespuesta: iso(p.fecha) } })
  },
}

/* ═════════ Tu producto (backend Oracle: DGLOSA / DGLOSASITEMS) ═════════ */
const prod = (path, o) => http(props.apiProducto, path, { ...o, auth: false }) // TODO: ajusta a tu autenticación

const productoApi = {
  // Crea el concepto en DGLOSA y el ítem en DGLOSASITEMS, y guarda el id de SIIFA para evitar duplicados
  async importar(g) {
    if (USE_MOCK) { await espera(200); return mockSet(g.id, x => { x.local = { estado: 'producto', idGlosa: 5000 + x.id, idItem: 1 }; x.miProducto = { respuesta: null, subsanacion: null } }) }
    return prod('/glosas-siifa/importar', { method: 'POST', body: { idSeguimientoFacturaGlosa: g.id } })
  },
  async vincular(g) {
    if (USE_MOCK) { await espera(200); return mockSet(g.id, x => { x.local.estado = 'producto'; x.miProducto = { respuesta: null, subsanacion: null } }) }
    return prod('/glosas-siifa/vincular', { method: 'POST', body: { idSeguimientoFacturaGlosa: g.id, idGlosa: g.local.idGlosa } })
  },
  async guardarRespuesta(g, clave, r) {
    if (USE_MOCK) { await espera(200); return mockSet(g.id, x => { x.miProducto = x.miProducto || {}; x.miProducto[clave] = { ...r, desc: descDe(clave, r.codigo), usuario: 'Tú', enviada: false } }) }
    return prod(`/glosas/${g.local.idGlosa}/respuestas/${clave}`, { method: 'PUT', body: r })
  },
  async marcarEnviada(g, clave) {
    if (USE_MOCK) return mockSet(g.id, x => { x.miProducto[clave].enviada = true })
    return prod(`/glosas/${g.local.idGlosa}/respuestas/${clave}/enviada`, { method: 'POST' })
  },
}

/* ═════════ Ayuda (wiki) ═════════ */
const WIKI_KEY = 'wiki:glosas-siifa'
const wikiSemilla = [
  { id: 'para-que-sirve', titulo: 'Para qué sirve esta pantalla', contenido: 'Aquí ves las glosas que las **ERP** (EPS y otros pagadores) registraron en SIIFA sobre tus facturas, y desde aquí envías tus respuestas.\n\nTu IPS solo responde. La ERP formula la glosa, decide sobre tu respuesta y registra la decisión final.' },
  { id: 'consulta-vs-producto', titulo: 'Consultar no es lo mismo que pasar a tu producto', contenido: 'Cuando actualizas, la pantalla **consulta** SIIFA. Verlas no las convierte en parte de tu proceso.\n\n## Tres situaciones\n- **Solo consulta:** existe en SIIFA, no en tu producto. No puedes responderla.\n- **Posible duplicado:** se parece a una glosa que ya tienes. Confirma si es la misma o es distinta.\n- **En mi producto:** ya está en tus glosas y puedes responderla.\n\n## Pasar a mi producto\nCrea el concepto en tus glosas y el ítem afectado, y guarda el identificador de SIIFA para que no se registre dos veces.' },
  { id: 'responder', titulo: 'Cómo responder una glosa', contenido: '- Abre la glosa con **Ver** y revisa el recorrido.\n- Escribe la respuesta y elige **Guardar en mi producto** o **Guardar y enviar a SIIFA**.\n- Si la guardas sin enviar, queda como **Pendiente de envío**. Luego usa **Enviar a SIIFA**, o **Modificar antes de enviar** para corregirla.\n\nSi la glosa ya fue reiterada por la ERP, la respuesta que registras es la **subsanación**.\n\nLa API de SIIFA no ofrece una opción para corregir una respuesta ya enviada. Revísala bien antes de confirmar.' },
  { id: 'plazos', titulo: 'Plazos', contenido: '- **Responder una glosa:** 15 días hábiles desde que la recibes.\n- **Subsanar una glosa reiterada:** 7 días hábiles.\n\nLa pantalla cuenta días de lunes a viernes y **no descuenta festivos**, así que el plazo real puede ser un día menor al que ves.' },
  { id: 'errores', titulo: 'Si algo falla', contenido: '- **Sesión vencida (401):** el token de SIIFA expiró. Vuelve a iniciar sesión.\n- **Sin permiso (403):** tu usuario no tiene el rol para esa acción en SIIFA.\n- **No encontrada (404):** la glosa ya no existe en SIIFA. Actualiza la lista.\n- **Error del servidor (500):** intenta de nuevo y, si persiste, escribe a la mesa de ayuda de SIIFA.' },
]
const wikiApi = {
  async cargar() { // TODO: reemplaza por tu endpoint si la ayuda se guarda en Oracle
    try { const t = localStorage.getItem(WIKI_KEY); if (t) return JSON.parse(t) } catch { /* sin acceso */ }
    return wikiSemilla
  },
  async guardar(lista) {
    try { localStorage.setItem(WIKI_KEY, JSON.stringify(lista)) } catch { throw new Error('No se pudo guardar la ayuda.') }
  },
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const negrita = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
function md(texto = '') { // Mini formato seguro: escapa todo el HTML antes de formatear
  return texto.split(/\n{2,}/).map(bloque => {
    const ls = bloque.split('\n')
    if (ls.every(l => l.startsWith('- '))) return '<ul>' + ls.map(l => `<li>${negrita(l.slice(2))}</li>`).join('') + '</ul>'
    return ls.map(l => (l.startsWith('## ') ? `<h5>${negrita(l.slice(3))}</h5>` : `<p>${negrita(l)}</p>`)).join('')
  }).join('')
}

/* ═════════ Estado de la pantalla ═════════ */
const tabs = [
  { id: 'todas', label: 'Todas' }, { id: 'pendiente', label: 'Por responder' }, { id: 'por_subsanar', label: 'Por subsanar' },
  { id: 'listas', label: 'Listas para enviar' }, { id: 'en_espera', label: 'Esperando a la ERP' }, { id: 'cerrada', label: 'Cerradas' },
]
const vinculoLabel = { consulta: 'Solo consulta', posible: 'Posible duplicado', producto: 'En mi producto' }

const filtros = reactive({ estado: 'pendiente', numeroFactura: '', nitErp: '', desde: '', hasta: '', vinculo: '' })
const datos = ref([])
const pag = reactive({ paginaActual: 1, totalPaginas: 1, totalRegistros: 0 })
const catalogos = reactive({ respuesta: [], subsanacion: [] })
const cargando = ref(false)
const enviando = ref(false)
const error = ref('')
const detalle = ref(null)
const editando = ref(false)
const modal = ref(null)
const aviso = ref(null)
const btnCerrar = ref(null)
const seleccion = reactive(new Set())
const form = reactive({ codigo: '', fecha: hoy, obs: '' })

const wikiAbierta = ref(false)
const articulos = ref([])
const wikiSel = ref('')
const modoAdmin = ref(false)
const edit = ref(null)

/* ═════════ Reglas ═════════ */
const enProducto = g => g.local.estado === 'producto'
function estadoDe(g) {
  if (g.decision) return { id: 'cerrada', label: 'Decisión final', clase: 's-cerrada' }
  if (g.subsanacion) return { id: 'en_espera', label: 'Subsanada', clase: 's-espera' }
  if (g.reiteracion) return { id: 'por_subsanar', label: 'Reiterada por la ERP', clase: 's-accion' }
  if (g.respuesta) return { id: 'en_espera', label: 'Respondida', clase: 's-espera' }
  return { id: 'pendiente', label: 'Sin responder', clase: 's-accion' }
}
const accion = g => (g.decision || g.subsanacion ? null : g.reiteracion ? 'subsanacion' : g.respuesta ? null : 'respuesta')
const pendienteEnvio = g => {
  const a = accion(g); const r = a && enProducto(g) ? g.miProducto?.[a] : null
  return r && !r.enviada ? { clave: a, r } : null
}

// Días hábiles lun–vie, sin festivos (ver Ayuda > Plazos)
function sumarHabiles(desde, n) {
  const d = new Date(desde); let c = 0
  while (c < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) c++ }
  return d
}
function habilesHasta(limite) {
  const a = new Date(); a.setHours(0, 0, 0, 0); const b = new Date(limite); b.setHours(0, 0, 0, 0)
  const s = b >= a ? 1 : -1; const d = new Date(s > 0 ? a : b); const fin = s > 0 ? b : a; let n = 0
  while (d < fin) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++ }
  return n * s
}
function plazoDe(g) {
  const a = accion(g); if (!a) return null
  const r = habilesHasta(a === 'respuesta' ? sumarHabiles(g.fechaReporte, 15) : sumarHabiles(g.reiteracion.fecha, 7))
  if (r < 0) return { texto: `Vencida hace ${-r} d. háb.`, clase: 'p-venc' }
  if (r <= 3) return { texto: `Vence en ${r} d. háb.`, clase: 'p-urg' }
  return { texto: `${r} d. háb.`, clase: 'p-ok' }
}
function pasos(g) {
  const a = accion(g)
  return [
    { titulo: 'Glosa formulada', quien: 'ERP', dato: { codigo: g.codigo, desc: g.descCodigo, obs: g.obs, fecha: g.fechaFormulacion } },
    { titulo: 'Respuesta a la glosa', quien: 'IPS', dato: g.respuesta, actual: a === 'respuesta' },
    { titulo: 'Decisión inicial de la ERP', quien: 'ERP', dato: g.reiteracion },
    { titulo: 'Respuesta a la glosa no levantada', quien: 'IPS', dato: g.subsanacion, actual: a === 'subsanacion' },
    { titulo: 'Decisión final de la ERP', quien: 'ERP', dato: g.decision },
  ].map(p => ({ ...p, estado: p.dato ? 'hecho' : p.actual ? 'actual' : 'futuro' }))
}

/* ═════════ Derivados ═════════ */
const filas = computed(() => datos.value.filter(g =>
  (filtros.estado === 'todas' || (filtros.estado === 'listas' ? !!pendienteEnvio(g) : estadoDe(g).id === filtros.estado)) &&
  (!filtros.vinculo || g.local.estado === filtros.vinculo)))
const conteo = computed(() => {
  const c = { todas: datos.value.length, pendiente: 0, por_subsanar: 0, listas: 0, en_espera: 0, cerrada: 0 }
  datos.value.forEach(g => { c[estadoDe(g).id]++; if (pendienteEnvio(g)) c.listas++ })
  return c
})
const seleccionadas = computed(() => datos.value.filter(g => seleccion.has(g.id)))
const selConsulta = computed(() => seleccionadas.value.filter(g => g.local.estado === 'consulta'))
const selListas = computed(() => seleccionadas.value.filter(g => pendienteEnvio(g)))
const selPosibles = computed(() => seleccionadas.value.some(g => g.local.estado === 'posible'))
const todasSel = computed(() => filas.value.length > 0 && filas.value.every(g => seleccion.has(g.id)))
const formListo = computed(() => form.codigo && form.fecha && form.obs)
const misRespuestas = computed(() => {
  const m = detalle.value?.miProducto || {}
  return [['respuesta', 'Respuesta a la glosa'], ['subsanacion', 'Respuesta a la reiteración']].filter(([k]) => m[k]).map(([clave, titulo]) => ({ clave, titulo, r: m[clave] }))
})
const articuloActual = computed(() => articulos.value.find(a => a.id === wikiSel.value) || articulos.value[0])

/* ═════════ Interacciones ═════════ */
function notificar(texto, tipo = 'ok') { aviso.value = { texto, tipo }; setTimeout(() => (aviso.value = null), 4000) }
async function cargar(pagina = 1) {
  cargando.value = true; error.value = ''
  try {
    const r = await siifaApi.listar(filtros, pagina)
    datos.value = r.resultado
    Object.assign(pag, { paginaActual: r.paginaActual, totalPaginas: r.totalPaginas, totalRegistros: r.totalRegistros })
    seleccion.clear()
    if (detalle.value) detalle.value = datos.value.find(g => g.id === detalle.value.id) || null
  } catch (e) {
    error.value = `No se pudo consultar SIIFA: ${e.message}. Revisa tu conexión o que el token no haya vencido.`
  } finally { cargando.value = false }
}
function limpiar() { Object.assign(filtros, { estado: 'todas', numeroFactura: '', nitErp: '', desde: '', hasta: '', vinculo: '' }); cargar(1) }
const toggle = id => (seleccion.has(id) ? seleccion.delete(id) : seleccion.add(id))
const toggleTodas = () => (todasSel.value ? seleccion.clear() : filas.value.forEach(g => seleccion.add(g.id)))

function abrirDetalle(g) {
  detalle.value = g; editando.value = false
  Object.assign(form, { codigo: '', fecha: hoy, obs: '' })
  nextTick(() => btnCerrar.value?.focus())
}
function cerrarDetalle() { detalle.value = null; editando.value = false }

// Una acción que escribe en SIIFA o en tu producto, con manejo común de errores
async function ejecutar(fn, okTexto, errPrefijo) {
  enviando.value = true
  try { await fn(); modal.value = null; notificar(okTexto); await cargar(pag.paginaActual) }
  catch (e) { modal.value = null; notificar(`${errPrefijo}: ${e.message}`, 'err') }
  finally { enviando.value = false }
}

function confirmarImportar(lista) {
  const n = lista.length; const g = lista[0]
  modal.value = {
    titulo: n === 1 ? 'Pasar la glosa a tu producto' : `Pasar ${n} glosas a tu producto`,
    texto: n === 1
      ? `Se creará 1 concepto en DGLOSA (${g.codigo}, ${moneda(g.valor)}) y su ítem en DGLOSASITEMS (${g.item ? g.item.tipo + ' ' + g.item.id : 'toda la factura'}).`
      : `Se crearán ${n} conceptos en DGLOSA y sus ítems en DGLOSASITEMS.`,
    nota: 'Se guarda el identificador de SIIFA para que no se registren dos veces.', boton: 'Pasar a mi producto',
    ok: () => ejecutar(async () => { for (const x of lista) { await productoApi.importar(x); emit('importada', x) } }, n === 1 ? 'Glosa en tu producto.' : `${n} glosas en tu producto.`, 'No se pasó a tu producto'),
  }
}
const vincularMisma = g => ejecutar(async () => { await productoApi.vincular(g); emit('vinculada', g) }, 'Glosa vinculada con la tuya.', 'No se pudo vincular')

async function guardar(enviarDespues) {
  const g = detalle.value; const clave = accion(g)
  enviando.value = true
  try {
    await productoApi.guardarRespuesta(g, clave, { codigo: form.codigo, fecha: form.fecha, obs: form.obs })
    editando.value = false
    await cargar(pag.paginaActual)
    if (enviarDespues) confirmarEnvio(clave); else notificar('Respuesta guardada en tu producto. Queda pendiente de envío.')
  } catch (e) { notificar(`No se guardó: ${e.message}`, 'err') }
  finally { enviando.value = false }
}
function modificar(m) { Object.assign(form, { codigo: m.r.codigo, fecha: m.r.fecha, obs: m.r.obs }); editando.value = true }

async function enviarUna(g, clave) {
  const r = g.miProducto[clave]
  const p = { id: g.id, codigo: r.codigo, obs: r.obs, fecha: r.fecha }
  await (clave === 'respuesta' ? siifaApi.responder(p) : siifaApi.subsanar(p))
  await productoApi.marcarEnviada(g, clave).catch(() => notificar('Se envió a SIIFA, pero no se pudo marcar como enviada en tu producto. Avisa a soporte.', 'err'))
  emit('respondida', { glosa: g, tipo: clave, ...p })
}
function confirmarEnvio(clave) {
  const g = detalle.value
  modal.value = {
    titulo: `Enviar ${clave === 'respuesta' ? 'la respuesta' : 'la subsanación'} a SIIFA`,
    texto: `Se enviará a ${g.erp.nombre} para la factura ${g.numeroFactura} (${moneda(g.valor)}).`,
    nota: 'La API de SIIFA no ofrece una opción para corregir una respuesta ya enviada.', boton: 'Enviar a SIIFA',
    ok: () => ejecutar(() => enviarUna(g, clave), 'Enviada a SIIFA.', 'No se envió'),
  }
}
function confirmarEnvioMasivo() {
  const lista = selListas.value; const n = lista.length
  modal.value = {
    titulo: `Enviar ${n} respuestas a SIIFA`, texto: 'Cada glosa se envía con la respuesta que registraste en tu producto.',
    nota: 'La API de SIIFA no ofrece una opción para corregir una respuesta ya enviada.', boton: `Enviar ${n}`,
    ok: () => ejecutar(async () => {
      const resp = lista.filter(g => accion(g) === 'respuesta')
      if (resp.length) {
        await siifaApi.responderMasivo(resp.map(g => ({ id: g.id, ...g.miProducto.respuesta })))
        for (const g of resp) { await productoApi.marcarEnviada(g, 'respuesta'); emit('respondida', { glosa: g, tipo: 'respuesta' }) }
      }
      for (const g of lista.filter(g => accion(g) === 'subsanacion')) await enviarUna(g, 'subsanacion') // no hay endpoint masivo de subsanación
    }, `${n} respuestas enviadas a SIIFA.`, 'No se envió el bloque'),
  }
}

/* Ayuda */
async function abrirWiki(id) {
  if (!articulos.value.length) articulos.value = await wikiApi.cargar()
  wikiSel.value = id || articulos.value[0]?.id || ''
  edit.value = null; wikiAbierta.value = true
}
function cerrarWiki() { wikiAbierta.value = false; edit.value = null; modoAdmin.value = false }
const alternarAdmin = () => { modoAdmin.value = !modoAdmin.value; edit.value = null }
async function persistirWiki(texto) {
  try { await wikiApi.guardar(articulos.value); notificar(texto) } catch (e) { notificar(e.message, 'err') }
}
const nuevoArticulo = () => (edit.value = { id: 'sec-' + Date.now(), titulo: '', contenido: '', nuevo: true })
async function guardarArticulo() {
  const { nuevo, ...a } = edit.value
  articulos.value = nuevo ? [...articulos.value, a] : articulos.value.map(x => (x.id === a.id ? a : x))
  wikiSel.value = a.id; edit.value = null
  await persistirWiki('Sección guardada.')
}
function eliminarArticulo(a) {
  modal.value = {
    titulo: 'Eliminar sección', texto: `Se eliminará "${a.titulo}" de la ayuda.`, boton: 'Eliminar',
    ok: async () => { articulos.value = articulos.value.filter(x => x.id !== a.id); wikiSel.value = articulos.value[0]?.id || ''; modal.value = null; await persistirWiki('Sección eliminada.') },
  }
}
async function mover(i, d) {
  const l = [...articulos.value]; [l[i], l[i + d]] = [l[i + d], l[i]]; articulos.value = l
  await persistirWiki('Orden actualizado.')
}

/* Teclado: Esc cierra lo de más arriba */
function onKey(e) {
  if (e.key !== 'Escape') return
  if (modal.value) modal.value = null
  else if (wikiAbierta.value) edit.value ? (edit.value = null) : cerrarWiki()
  else if (detalle.value) cerrarDetalle()
}

const moneda = v => (v == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v))
const fecha = d => (d ? new Date(d + (String(d).length === 10 ? 'T00:00' : '')).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

watch(() => filtros.estado, () => seleccion.clear())
onMounted(async () => {
  document.addEventListener('keydown', onKey)
  Object.assign(catalogos, await siifaApi.catalogos().catch(() => ({ respuesta: [], subsanacion: [] })))
  cargar(1)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.gs, .gs-overlay { --ink:#1d2b2a; --muted:#66757a; --line:#dde4e3; --bg:#f6f8f8; --card:#fff; --brand:#0f766e; --brand-d:#0b5c56;
  --warn:#b45309; --warn-bg:#fef3c7; --bad:#b91c1c; --bad-bg:#fee2e2; --ok:#166534; --ok-bg:#dcfce7; --info:#1e40af; --info-bg:#dbeafe;
  font-family:'Segoe UI', system-ui, sans-serif; color:var(--ink); font-size:14px; }
.gs { background:var(--bg); padding:20px; }
.gs *, .gs-overlay * { box-sizing:border-box; }
.gs-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:12px; }
h2 { margin:0 0 2px; font-size:20px; } h3 { margin:0; font-size:16px; } h4 { margin:6px 0 0; font-size:14px; } h5 { margin:12px 0 2px; font-size:14px; }
.muted { color:var(--muted); } .sm { font-size:12px; }
.clip { max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.btn { border:1px solid var(--line); background:var(--card); color:var(--ink); padding:7px 14px; border-radius:6px; cursor:pointer; font:inherit; }
.btn:hover:not(:disabled) { border-color:var(--brand); }
.btn.primary { background:var(--brand); border-color:var(--brand); color:#fff; }
.btn.primary:hover:not(:disabled) { background:var(--brand-d); }
.btn.ghost { background:transparent; } .btn:disabled { opacity:.5; cursor:not-allowed; }
.btn:focus-visible, .x:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, .link:focus-visible, .wiki-nav button:focus-visible { outline:2px solid var(--brand); outline-offset:1px; }
.sm-btn { padding:4px 10px; font-size:13px; }
.link { background:none; border:0; color:var(--brand); text-decoration:underline; cursor:pointer; font:inherit; padding:0; margin-left:6px; }
.x { border:1px solid var(--line); background:var(--card); width:34px; height:34px; border-radius:6px; cursor:pointer; font-size:16px; line-height:1; flex:none; }
.x:hover { background:#f1f5f5; }

.aviso-flujo { background:var(--info-bg); border:1px solid #bfd3f8; color:#1e3a8a; padding:9px 14px; border-radius:8px; margin:0 0 14px; }
.tabs { display:flex; gap:4px; border-bottom:1px solid var(--line); margin-bottom:14px; flex-wrap:wrap; }
.tab { border:0; background:none; padding:9px 14px; cursor:pointer; font:inherit; color:var(--muted); border-bottom:3px solid transparent; margin-bottom:-1px; }
.tab.on { color:var(--ink); border-bottom-color:var(--brand); font-weight:600; }
.count { background:var(--line); border-radius:10px; padding:1px 8px; font-size:12px; margin-left:4px; }
.tab.on .count { background:var(--brand); color:#fff; }

.filtros { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px,1fr)); gap:12px; background:var(--card); border:1px solid var(--line); border-radius:8px; padding:14px; margin-bottom:14px; align-items:end; }
label { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--muted); }
input, select, textarea { font:inherit; color:var(--ink); padding:7px 9px; border:1px solid var(--line); border-radius:6px; background:#fff; width:100%; }
.fila-btn { display:flex; gap:8px; flex-wrap:wrap; margin-top:2px; } .fila-btn.fin { justify-content:flex-end; margin-top:8px; }

.bulk { display:flex; align-items:center; gap:10px; background:var(--info-bg); border:1px solid #bfd3f8; padding:10px 14px; border-radius:8px; margin-bottom:12px; flex-wrap:wrap; }
.alert { padding:10px 14px; border-radius:8px; margin:0 0 12px; }
.alert.err { background:var(--bad-bg); color:var(--bad); } .alert.ok { background:var(--ok-bg); color:var(--ok); } .alert.warn { background:var(--warn-bg); color:var(--warn); }

.tabla-wrap { overflow-x:auto; background:var(--card); border:1px solid var(--line); border-radius:8px; }
.tabla { width:100%; border-collapse:collapse; min-width:1120px; }
.tabla th { text-align:left; font-size:12px; color:var(--muted); font-weight:600; padding:10px 12px; border-bottom:1px solid var(--line); background:#fbfcfc; white-space:nowrap; }
.tabla td { padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
.tabla tr.sel td { background:#f0faf8; } .tabla tbody tr:hover td { background:#f7fbfa; }
.num { text-align:right; font-variant-numeric:tabular-nums; } .chk { width:36px; } .chk input { width:auto; }
.acc { text-align:right; white-space:nowrap; } .acc .btn + .btn { margin-left:6px; }
.vacio { text-align:center; color:var(--muted); padding:36px !important; }

.pill { display:inline-block; padding:2px 10px; border-radius:12px; font-size:12px; white-space:nowrap; }
.s-accion { background:var(--warn-bg); color:var(--warn); } .s-espera { background:var(--info-bg); color:var(--info); } .s-cerrada { background:#e5e7eb; color:#374151; }
.v-consulta { background:#e5e7eb; color:#374151; } .v-posible { background:var(--warn-bg); color:var(--warn); } .v-producto { background:var(--ok-bg); color:var(--ok); }
.plazo { font-size:12px; font-weight:600; } .p-ok { color:var(--ok); } .p-urg { color:var(--warn); } .p-venc { color:var(--bad); }
.pag { display:flex; justify-content:space-between; align-items:center; margin-top:12px; }

/* Flotantes (en <body>) */
.gs-overlay { display:contents; }
.scrim { position:fixed; inset:0; background:rgba(15,23,22,.35); z-index:40; }
.drawer { position:fixed; top:0; right:0; width:min(500px,100%); height:100%; background:var(--card); box-shadow:-8px 0 24px rgba(0,0,0,.12); z-index:41; display:flex; flex-direction:column; animation:entra .18s ease-out; }
@keyframes entra { from { transform:translateX(24px); opacity:.4; } }
.drawer-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:16px 20px; border-bottom:1px solid var(--line); background:var(--card); }
.drawer-head p { margin:2px 0 0; }
.drawer-body { padding:16px 20px 28px; overflow-y:auto; display:flex; flex-direction:column; gap:14px; }
.caja { padding:12px; border-radius:8px; border:1px solid var(--line); }
.caja.v-producto { background:var(--ok-bg); border-color:#a7e3b8; color:var(--ink); } .caja.v-posible { background:var(--warn-bg); border-color:#f3d98c; color:var(--ink); } .caja.v-consulta { background:#f3f4f6; color:var(--ink); }
.datos { margin:0; display:grid; gap:8px; } .datos div { display:grid; grid-template-columns:140px 1fr; gap:8px; } dt { color:var(--muted); } dd { margin:0; }
.linea { list-style:none; margin:4px 0 0; padding:0 0 0 18px; border-left:2px solid var(--line); display:flex; flex-direction:column; gap:14px; }
.linea li { position:relative; }
.linea li::before { content:''; position:absolute; left:-25px; top:3px; width:12px; height:12px; border-radius:50%; background:#fff; border:2px solid var(--line); }
.linea li.hecho::before { background:var(--brand); border-color:var(--brand); } .linea li.actual::before { border-color:var(--warn); background:var(--warn-bg); } .linea li.futuro { opacity:.5; }
.linea-t { font-weight:600; } .linea-d { margin-top:2px; }
.resp { border:1px solid var(--line); border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:3px; }
.resp-t { display:flex; justify-content:space-between; align-items:center; gap:8px; font-weight:600; }
.form { display:flex; flex-direction:column; gap:10px; border-top:1px solid var(--line); padding-top:14px; }
.form form { display:flex; flex-direction:column; gap:10px; }

.modal-bg { position:fixed; inset:0; background:rgba(15,23,22,.45); display:grid; place-items:center; z-index:60; padding:16px; }
.modal { background:var(--card); border-radius:10px; padding:20px; width:min(460px,100%); display:flex; flex-direction:column; gap:10px; } .modal p { margin:0; }
.toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); padding:10px 18px; border-radius:8px; z-index:80; color:#fff; background:var(--ok); max-width:90vw; }
.toast.err { background:var(--bad); }

.wiki { background:var(--card); border-radius:10px; width:min(860px,100%); height:min(620px,92vh); display:flex; flex-direction:column; overflow:hidden; }
.wiki-head { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid var(--line); gap:12px; }
.wiki-head .fila-btn { margin:0; align-items:center; }
.wiki-cuerpo { display:grid; grid-template-columns:240px 1fr; min-height:0; flex:1; }
.wiki-nav { border-right:1px solid var(--line); padding:10px; overflow-y:auto; display:flex; flex-direction:column; gap:2px; background:#fbfcfc; }
.wiki-item { display:flex; align-items:center; gap:2px; }
.wiki-item > button { flex:1; text-align:left; border:0; background:none; padding:8px 10px; border-radius:6px; cursor:pointer; font:inherit; color:var(--ink); }
.wiki-item > button:hover { background:#eef4f3; } .wiki-item > button.on { background:var(--ok-bg); font-weight:600; }
.mover { display:flex; } .mover button { border:0; background:none; cursor:pointer; color:var(--muted); padding:4px 5px; } .mover button:disabled { opacity:.3; cursor:default; }
.nueva { margin-top:8px; }
.wiki-art { padding:18px 22px; overflow-y:auto; }
.wiki-art-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px; }
.md :deep(h5) { margin:12px 0 4px; font-size:14px; }
.md :deep(p) { margin:0 0 10px; line-height:1.55; } .md :deep(ul) { margin:0 0 10px; padding-left:20px; line-height:1.55; } .md :deep(li) { margin-bottom:4px; }
details { border:1px solid var(--line); border-radius:6px; padding:8px 10px; } summary { cursor:pointer; color:var(--muted); }

@media (max-width:700px) {
  .gs { padding:12px; } .gs-head { flex-direction:column; } .datos div { grid-template-columns:1fr; gap:0; }
  .wiki-cuerpo { grid-template-columns:1fr; grid-template-rows:auto 1fr; } .wiki-nav { border-right:0; border-bottom:1px solid var(--line); max-height:170px; }
}
@media (prefers-reduced-motion:reduce) { .drawer { animation:none; } }
</style>