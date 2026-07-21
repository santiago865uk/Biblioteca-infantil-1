/* ============================================================================
   LÓGICA DE LA PÁGINA: perfil.html
   ========================================================================= */

/**
 * Actualiza los datos editables del perfil del usuario actual.
 */
async function actualizarPerfil(usuarioId, cambios) {
  const { error } = await cliente
    .from('profiles')
    .update(cambios)
    .eq('id', usuarioId)
  return { error }
}

const COLORES_TARJETA = ['#00D9C0', '#FF4D6D', '#FFD23F', '#7C3AED']

function crearTarjetaHistorial(registro, indice) {
  const libro = registro.books
  const portada = libro.portada_url || 'images/portada-default.svg'
  const colorBorde = COLORES_TARJETA[indice % COLORES_TARJETA.length]

  return `
    <div class="col-sm-6 col-md-4">
      <a href="libro.html?id=${libro.id}" class="text-decoration-none text-dark">
        <div class="card tarjeta-libro h-100" style="--color-tarjeta:${colorBorde};">
          <img src="${portada}" class="portada-libro" style="height: 160px;" alt="Portada de ${libro.titulo}"
               onerror="this.src='images/portada-default.svg'">
          <div class="card-body">
            <h3 class="h6 mb-1">${libro.titulo}</h3>
            <p class="text-muted small mb-2">${libro.autor}</p>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar" style="width: ${registro.porcentaje_completado}%"></div>
            </div>
            <p class="small text-muted mt-1 mb-0">
              ${registro.completado ? '<i class="bi bi-check-circle-fill text-success"></i> Completado' : `${registro.porcentaje_completado}% leído`}
            </p>
          </div>
        </div>
      </a>
    </div>
  `
}

document.addEventListener('DOMContentLoaded', async () => {
  const perfil = await obtenerPerfilActual()
  if (!perfil) return

  // --- Rellenar formulario con datos actuales ---
  document.getElementById('nombre-completo').value = perfil.nombre_completo || ''
  document.getElementById('nombre-usuario').value = perfil.nombre_usuario || ''
  document.getElementById('email').value = perfil.email || ''
  document.getElementById('fecha-nacimiento').value = perfil.fecha_nacimiento || ''

  document.getElementById('form-perfil').addEventListener('submit', async (evento) => {
    evento.preventDefault()

    const cambios = {
      nombre_completo: document.getElementById('nombre-completo').value.trim(),
      nombre_usuario: document.getElementById('nombre-usuario').value.trim() || null,
      fecha_nacimiento: document.getElementById('fecha-nacimiento').value || null,
    }

    const { error } = await actualizarPerfil(perfil.id, cambios)
    const alertaExito = document.getElementById('alerta-exito')

    if (error) {
      alertaExito.classList.remove('alert-success')
      alertaExito.classList.add('alert-danger')
      alertaExito.textContent = 'No se pudo guardar: ' + error.message
    } else {
      alertaExito.classList.remove('alert-danger')
      alertaExito.classList.add('alert-success')
      alertaExito.innerHTML = '<i class="bi bi-check-circle-fill"></i> Perfil actualizado correctamente.'
    }
    alertaExito.classList.remove('d-none')
  })

  // --- Historial de lectura ---
  const spinner = document.getElementById('spinner-carga')
  const contenedor = document.getElementById('contenedor-historial')
  const mensajeSinHistorial = document.getElementById('mensaje-sin-historial')

  const historial = await obtenerHistorialLectura(perfil.id)
  spinner.classList.add('d-none')

  if (historial.length === 0) {
    mensajeSinHistorial.classList.remove('d-none')
    return
  }

  contenedor.innerHTML = historial.map(crearTarjetaHistorial).join('')
})
