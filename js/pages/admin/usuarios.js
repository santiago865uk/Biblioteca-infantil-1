/* ============================================================================
   LÓGICA DE LA PÁGINA: admin/usuarios.html
   ========================================================================= */

let perfilAdminActual = null

function formatearFecha(fechaIso) {
  const fecha = new Date(fechaIso)
  return fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function renderizarTablaUsuarios(usuarios) {
  const tabla = document.getElementById('tabla-usuarios')

  tabla.innerHTML = usuarios
    .map((usuario) => {
      const esUnoMismo = usuario.id === perfilAdminActual.id
      return `
        <tr>
          <td>${usuario.nombre_completo || '—'}</td>
          <td>${usuario.email}</td>
          <td>
            <span class="badge ${usuario.rol === 'admin' ? 'bg-primary' : 'bg-secondary'}">
              ${usuario.rol}
            </span>
          </td>
          <td>${formatearFecha(usuario.creado_en)}</td>
          <td class="text-end">
            ${
              esUnoMismo
                ? '<span class="text-muted small">Esta es tu cuenta</span>'
                : `
                  <button class="btn btn-sm btn-outline-primary" data-cambiar-rol="${usuario.id}" data-rol-actual="${usuario.rol}">
                    Hacer ${usuario.rol === 'admin' ? 'usuario' : 'admin'}
                  </button>
                  <button class="btn btn-sm btn-outline-danger" data-eliminar="${usuario.id}" data-nombre="${usuario.nombre_completo || usuario.email}">
                    Eliminar
                  </button>
                `
            }
          </td>
        </tr>
      `
    })
    .join('')

  tabla.querySelectorAll('[data-cambiar-rol]').forEach((boton) => {
    boton.addEventListener('click', () => alternarRolUsuario(boton.dataset.cambiarRol, boton.dataset.rolActual))
  })

  tabla.querySelectorAll('[data-eliminar]').forEach((boton) => {
    boton.addEventListener('click', () => confirmarEliminarUsuario(boton.dataset.eliminar, boton.dataset.nombre))
  })
}

async function recargarUsuarios() {
  document.getElementById('spinner-carga').classList.remove('d-none')
  const usuarios = await obtenerTodosLosUsuarios()
  document.getElementById('spinner-carga').classList.add('d-none')
  renderizarTablaUsuarios(usuarios)
}

async function alternarRolUsuario(usuarioId, rolActual) {
  const nuevoRol = rolActual === 'admin' ? 'usuario' : 'admin'
  const confirmado = await confirmarConModal(
    `¿Cambiar el rol de este usuario a "${nuevoRol}"?`,
    'Cambiar rol de usuario'
  )
  if (!confirmado) return

  const { error } = await cambiarRolUsuario(usuarioId, nuevoRol)
  mostrarAlertaResultado(error ? 'danger' : 'success', error ? error.message : 'Rol actualizado correctamente.')
  await recargarUsuarios()
}

async function confirmarEliminarUsuario(usuarioId, nombre) {
  const confirmado = await confirmarConModal(
    `¿Eliminar el perfil de "${nombre}"? Esto no elimina su cuenta de inicio de sesión, solo sus datos de perfil.`,
    'Eliminar usuario'
  )
  if (!confirmado) return

  const { error } = await eliminarPerfilUsuario(usuarioId)
  mostrarAlertaResultado(error ? 'danger' : 'success', error ? error.message : 'Perfil eliminado.')
  await recargarUsuarios()
}

function mostrarAlertaResultado(tipo, mensaje) {
  const alerta = document.getElementById('alerta-resultado')
  alerta.className = `alert alert-${tipo}`
  alerta.textContent = mensaje
  alerta.classList.remove('d-none')
  setTimeout(() => alerta.classList.add('d-none'), 4000)
}

document.addEventListener('DOMContentLoaded', async () => {
  perfilAdminActual = await obtenerPerfilActual()
  await recargarUsuarios()
})
