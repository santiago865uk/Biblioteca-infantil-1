/* ============================================================================
   LÓGICA DE LA PÁGINA: admin/libros.html
   ========================================================================= */

let modalLibro = null
let categoriasDisponibles = []

/**
 * Pinta la tabla de libros.
 */
function renderizarTablaLibros(libros) {
  const tabla = document.getElementById('tabla-libros')

  if (libros.length === 0) {
    tabla.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay libros registrados.</td></tr>`
    return
  }

  tabla.innerHTML = libros
    .map(
      (libro) => `
      <tr>
        <td>
          <img src="${libro.portada_url || '../images/portada-default.svg'}"
               alt="" style="width:40px;height:55px;object-fit:cover;border-radius:4px;"
               onerror="this.src='../images/portada-default.svg'">
        </td>
        <td>${libro.titulo}</td>
        <td>${libro.autor}</td>
        <td>${libro.categories?.nombre || '—'}</td>
        <td>${etiquetaEdad(libro.edad_recomendada)}</td>
        <td>${libro.publicado ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-x-circle-fill text-danger"></i>'}</td>
        <td>${libro.destacado ? '<i class="bi bi-star-fill" style="color:#FFD23F;"></i>' : '—'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-editar="${libro.id}">Editar</button>
          <button class="btn btn-sm btn-outline-danger" data-eliminar="${libro.id}" data-titulo="${libro.titulo}">Eliminar</button>
        </td>
      </tr>
    `
    )
    .join('')

  // Eventos de editar
  tabla.querySelectorAll('[data-editar]').forEach((boton) => {
    boton.addEventListener('click', () => abrirModalEdicion(boton.dataset.editar, libros))
  })

  // Eventos de eliminar
  tabla.querySelectorAll('[data-eliminar]').forEach((boton) => {
    boton.addEventListener('click', () => confirmarEliminarLibro(boton.dataset.eliminar, boton.dataset.titulo))
  })
}

/**
 * Carga la lista de libros desde Supabase y la pinta.
 */
async function recargarTablaLibros() {
  document.getElementById('spinner-carga').classList.remove('d-none')
  const libros = await obtenerTodosLosLibrosAdmin()
  document.getElementById('spinner-carga').classList.add('d-none')
  renderizarTablaLibros(libros)
  return libros
}

/**
 * Llena el select de categorías del formulario.
 */
async function cargarSelectCategorias() {
  categoriasDisponibles = await obtenerCategorias()
  const select = document.getElementById('campo-categoria')
  select.innerHTML = '<option value="">Sin categoría</option>' +
    categoriasDisponibles.map((cat) => `<option value="${cat.id}">${cat.nombre}</option>`).join('')
}

/**
 * Limpia el formulario del modal para crear un libro nuevo.
 */
function limpiarFormularioLibro() {
  document.getElementById('form-libro').reset()
  document.getElementById('libro-id').value = ''
  document.getElementById('campo-portada-url').value = ''
  document.getElementById('campo-pdf-url').value = ''
  document.getElementById('titulo-modal-libro').textContent = 'Agregar libro'
  document.getElementById('alerta-error-modal').classList.add('d-none')
}

/**
 * Abre el modal en modo edición, rellenando los campos con los datos
 * actuales del libro seleccionado.
 */
function abrirModalEdicion(libroId, libros) {
  const libro = libros.find((l) => l.id === libroId)
  if (!libro) return

  limpiarFormularioLibro()
  document.getElementById('titulo-modal-libro').textContent = 'Editar libro'
  document.getElementById('libro-id').value = libro.id
  document.getElementById('campo-titulo').value = libro.titulo
  document.getElementById('campo-autor').value = libro.autor
  document.getElementById('campo-categoria').value = libro.categoria_id || ''
  document.getElementById('campo-edad').value = libro.edad_recomendada
  document.getElementById('campo-descripcion').value = libro.descripcion || ''
  document.getElementById('campo-fuente').value = libro.fuente_dominio_publico || ''
  document.getElementById('campo-anio').value = libro.anio_publicacion_original || ''
  document.getElementById('campo-portada-url').value = libro.portada_url || ''
  document.getElementById('campo-pdf-url').value = libro.archivo_pdf_url || ''
  document.getElementById('campo-publicado').checked = libro.publicado
  document.getElementById('campo-destacado').checked = libro.destacado

  modalLibro.show()
}

/**
 * Pide confirmación y elimina un libro.
 */
async function confirmarEliminarLibro(libroId, titulo) {
  const confirmado = await confirmarConModal(
    `¿Seguro que quieres eliminar "${titulo}"? Esta acción no se puede deshacer.`,
    'Eliminar libro'
  )
  if (!confirmado) return

  const { error } = await eliminarLibro(libroId)
  mostrarAlertaResultado(error ? 'danger' : 'success', error ? error.message : 'Libro eliminado correctamente.')
  await recargarTablaLibros()
}

function mostrarAlertaResultado(tipo, mensaje) {
  const alerta = document.getElementById('alerta-resultado')
  alerta.className = `alert alert-${tipo}`
  alerta.textContent = mensaje
  alerta.classList.remove('d-none')
  setTimeout(() => alerta.classList.add('d-none'), 4000)
}

document.addEventListener('DOMContentLoaded', async () => {
  modalLibro = new bootstrap.Modal(document.getElementById('modal-libro'))

  document.getElementById('btn-nuevo-libro').addEventListener('click', limpiarFormularioLibro)

  await cargarSelectCategorias()
  await recargarTablaLibros()

  document.getElementById('form-libro').addEventListener('submit', async (evento) => {
    evento.preventDefault()

    const botonGuardar = document.getElementById('btn-guardar-libro')
    const alertaErrorModal = document.getElementById('alerta-error-modal')
    alertaErrorModal.classList.add('d-none')

    const libroId = document.getElementById('libro-id').value
    let portadaUrl = document.getElementById('campo-portada-url').value
    let pdfUrl = document.getElementById('campo-pdf-url').value

    const archivoPortada = document.getElementById('campo-archivo-portada').files[0]
    const archivoPdf = document.getElementById('campo-archivo-pdf').files[0]

    // Validación: si es un libro nuevo, el PDF es obligatorio
    if (!libroId && !archivoPdf) {
      alertaErrorModal.textContent = 'Debes subir un archivo PDF para crear el libro.'
      alertaErrorModal.classList.remove('d-none')
      return
    }

    botonGuardar.disabled = true
    botonGuardar.textContent = 'Guardando...'

    // Sube la portada nueva, si se seleccionó una
    if (archivoPortada) {
      const resultado = await subirArchivo('portadas', archivoPortada)
      if (resultado.error) {
        alertaErrorModal.textContent = 'Error al subir la portada: ' + resultado.error.message
        alertaErrorModal.classList.remove('d-none')
        botonGuardar.disabled = false
        botonGuardar.textContent = 'Guardar'
        return
      }
      portadaUrl = resultado.url
    }

    // Sube el PDF nuevo, si se seleccionó uno
    if (archivoPdf) {
      const resultado = await subirArchivo('libros-pdf', archivoPdf)
      if (resultado.error) {
        alertaErrorModal.textContent = 'Error al subir el PDF: ' + resultado.error.message
        alertaErrorModal.classList.remove('d-none')
        botonGuardar.disabled = false
        botonGuardar.textContent = 'Guardar'
        return
      }
      pdfUrl = resultado.url
    }

    const datosLibro = {
      titulo: document.getElementById('campo-titulo').value.trim(),
      autor: document.getElementById('campo-autor').value.trim(),
      categoria_id: document.getElementById('campo-categoria').value || null,
      edad_recomendada: document.getElementById('campo-edad').value,
      descripcion: document.getElementById('campo-descripcion').value.trim() || null,
      fuente_dominio_publico: document.getElementById('campo-fuente').value.trim() || null,
      anio_publicacion_original: parseInt(document.getElementById('campo-anio').value, 10) || null,
      portada_url: portadaUrl || null,
      archivo_pdf_url: pdfUrl,
      publicado: document.getElementById('campo-publicado').checked,
      destacado: document.getElementById('campo-destacado').checked,
    }

    const { error } = libroId
      ? await actualizarLibro(libroId, datosLibro)
      : await crearLibro(datosLibro)

    botonGuardar.disabled = false
    botonGuardar.textContent = 'Guardar'

    if (error) {
      alertaErrorModal.textContent = 'Error al guardar: ' + error.message
      alertaErrorModal.classList.remove('d-none')
      return
    }

    modalLibro.hide()
    mostrarAlertaResultado('success', libroId ? 'Libro actualizado correctamente.' : 'Libro creado correctamente.')
    await recargarTablaLibros()
  })
})
