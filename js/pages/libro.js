/* ============================================================================
   LÓGICA DE LA PÁGINA: libro.html
   ========================================================================= */

// PDF.js se carga como módulo ES vía js/vendor/pdfjs/puente-pdfjs.js, que
// expone la librería en window.pdfjsLib y configura su worker. Como esa
// carga es asíncrona, esperamos el evento "pdfjs-listo" antes de usarla
// (o seguimos de inmediato si por algún motivo ya estaba lista).
const pdfjsListo = window.pdfjsLib
  ? Promise.resolve()
  : new Promise((resolve) => window.addEventListener('pdfjs-listo', resolve, { once: true }))

let perfilUsuarioActual = null
let libroActual = null
let documentoPdf = null
let paginaActual = 1
let escalaActual = 1.2
let esFavoritoActual = false

/**
 * Extrae un color dominante aproximado de una imagen, muestreando sus
 * píxeles con un <canvas> oculto. Funciona con imágenes de Supabase
 * Storage (mismo origen o con CORS habilitado por defecto en buckets
 * públicos); si la imagen falla por CORS o no carga, se usa un color de
 * respaldo para no romper la página.
 *
 * Devuelve una promesa que resuelve con un string "rgb(r, g, b)".
 */
function extraerColorDominante(urlImagen) {
  return new Promise((resolve) => {
    const COLOR_RESPALDO = 'rgb(124, 58, 237)' // violeta, igual a --violeta

    if (!urlImagen) {
      resolve(COLOR_RESPALDO)
      return
    }

    const imagen = new Image()
    imagen.crossOrigin = 'anonymous'

    imagen.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        // Reducimos la imagen a una miniatura pequeña: es más rápido de
        // procesar y el promedio de color sale igual de representativo.
        const ANCHO_MUESTRA = 40
        const alto = Math.max(1, Math.round((imagen.height / imagen.width) * ANCHO_MUESTRA) || ANCHO_MUESTRA)
        canvas.width = ANCHO_MUESTRA
        canvas.height = alto

        const contexto = canvas.getContext('2d')
        contexto.drawImage(imagen, 0, 0, ANCHO_MUESTRA, alto)

        const { data } = contexto.getImageData(0, 0, ANCHO_MUESTRA, alto)

        let totalR = 0
        let totalG = 0
        let totalB = 0
        let pixeles = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          // Descarta píxeles casi blancos o casi negros (suelen ser
          // bordes/fondos de portada, no el color "de identidad" del libro)
          const brillo = (r + g + b) / 3
          if (brillo < 18 || brillo > 240) continue

          totalR += r
          totalG += g
          totalB += b
          pixeles++
        }

        if (pixeles === 0) {
          resolve(COLOR_RESPALDO)
          return
        }

        const promedioR = Math.round(totalR / pixeles)
        const promedioG = Math.round(totalG / pixeles)
        const promedioB = Math.round(totalB / pixeles)
        resolve(`rgb(${promedioR}, ${promedioG}, ${promedioB})`)
      } catch (error) {
        // getImageData puede lanzar un error de seguridad si la imagen es
        // de otro origen sin CORS habilitado. En ese caso, usamos el color
        // de respaldo en vez de romper la carga de la página.
        console.warn('No se pudo extraer el color de la portada:', error.message)
        resolve(COLOR_RESPALDO)
      }
    }

    imagen.onerror = () => resolve(COLOR_RESPALDO)
    imagen.src = urlImagen
  })
}

/**
 * Aplica el color extraído al fondo dinámico de la página, vía variable CSS.
 */
function aplicarColorDeFondo(colorRgb) {
  document.getElementById('fondo-color-libro').style.setProperty('--color-libro', colorRgb)
}

/**
 * Obtiene el id del libro desde el parámetro ?id= de la URL.
 */
function obtenerIdLibroDeUrl() {
  const parametros = new URLSearchParams(window.location.search)
  return parametros.get('id')
}

/**
 * Pinta la información básica del libro en la columna izquierda.
 */
function renderizarInfoLibro(libro) {
  document.getElementById('img-portada').src = libro.portada_url || 'images/portada-default.svg'
  document.getElementById('titulo-libro').textContent = libro.titulo
  document.getElementById('autor-libro').textContent = `por ${libro.autor}`
  document.getElementById('descripcion-libro').textContent = libro.descripcion || libro.sinopsis || ''
  document.getElementById('edad-libro').textContent = `Edad recomendada: ${etiquetaEdad(libro.edad_recomendada)}`

  const badge = document.getElementById('badge-categoria')
  badge.textContent = libro.categories?.nombre || 'Sin categoría'
  badge.style.backgroundColor = libro.categories?.color || '#6366f1'
  badge.classList.add('text-white')
}

/**
 * Carga el documento PDF con PDF.js y renderiza la primera página
 * (o la última página leída, si el usuario ya tenía progreso).
 */
async function cargarDocumentoPdf(urlPdf, paginaInicial) {
  documentoPdf = await pdfjsLib.getDocument(urlPdf).promise
  document.getElementById('texto-total-paginas').textContent = documentoPdf.numPages

  paginaActual = Math.min(Math.max(paginaInicial, 1), documentoPdf.numPages)
  await renderizarPaginaPdf(paginaActual)
}

/**
 * Dibuja una página específica del PDF en el <canvas>.
 */
async function renderizarPaginaPdf(numeroPagina) {
  const pagina = await documentoPdf.getPage(numeroPagina)
  const viewport = pagina.getViewport({ scale: escalaActual })

  const canvas = document.getElementById('canvas-pdf')
  const contexto = canvas.getContext('2d')
  canvas.width = viewport.width
  canvas.height = viewport.height

  await pagina.render({ canvasContext: contexto, viewport }).promise

  document.getElementById('texto-pagina-actual').textContent = numeroPagina
  paginaActual = numeroPagina

  // Guarda el progreso de lectura cada vez que cambia de página
  if (perfilUsuarioActual) {
    const porcentaje = Math.round((numeroPagina / documentoPdf.numPages) * 100)
    const completado = numeroPagina === documentoPdf.numPages
    await guardarProgresoLectura(perfilUsuarioActual.id, libroActual.id, numeroPagina, porcentaje, completado)
    actualizarBarraProgreso(porcentaje)
  }
}

function actualizarBarraProgreso(porcentaje) {
  document.getElementById('seccion-progreso').classList.remove('d-none')
  document.getElementById('texto-progreso').textContent = `${porcentaje}%`
  document.getElementById('barra-progreso').style.width = `${porcentaje}%`
}

/**
 * Actualiza el botón de favorito según el estado actual.
 */
function actualizarBotonFavorito() {
  const boton = document.getElementById('btn-favorito')
  const icono = document.getElementById('icono-favorito')
  const texto = document.getElementById('texto-favorito')

  icono.className = esFavoritoActual ? 'bi bi-heart-fill' : 'bi bi-heart'
  texto.textContent = esFavoritoActual ? 'En tus favoritos' : 'Agregar a favoritos'
  boton.classList.toggle('btn-primary', esFavoritoActual)
  boton.classList.toggle('btn-outline-primary', !esFavoritoActual)
}

/**
 * Pinta la lista de marcadores guardados.
 */
function renderizarMarcadores(marcadores) {
  const lista = document.getElementById('lista-marcadores')

  if (marcadores.length === 0) {
    lista.innerHTML = '<li class="list-group-item text-muted">Aún no tienes marcadores.</li>'
    return
  }

  lista.innerHTML = marcadores
    .map(
      (marcador) => `
      <li class="list-group-item d-flex justify-content-between align-items-center px-0">
        <span class="cursor-pointer" data-pagina="${marcador.pagina}">
          <i class="bi bi-bookmark-fill"></i> Página ${marcador.pagina}
        </span>
        <button class="btn btn-sm btn-link text-danger p-0" data-eliminar="${marcador.id}">
          Quitar
        </button>
      </li>
    `
    )
    .join('')

  // Ir a la página al hacer clic en el marcador
  lista.querySelectorAll('[data-pagina]').forEach((elemento) => {
    elemento.addEventListener('click', () => {
      renderizarPaginaPdf(parseInt(elemento.dataset.pagina, 10))
    })
  })

  // Eliminar marcador
  lista.querySelectorAll('[data-eliminar]').forEach((boton) => {
    boton.addEventListener('click', async () => {
      await eliminarMarcador(boton.dataset.eliminar)
      const marcadoresActualizados = await obtenerMarcadores(perfilUsuarioActual.id, libroActual.id)
      renderizarMarcadores(marcadoresActualizados)
    })
  })
}

document.addEventListener('DOMContentLoaded', async () => {
  // Espera a que el módulo de PDF.js termine de cargarse antes de continuar,
  // ya que el resto de esta función depende de window.pdfjsLib.
  await pdfjsListo

  const idLibro = obtenerIdLibroDeUrl()
  const spinner = document.getElementById('spinner-carga')
  const contenido = document.getElementById('contenido-libro')
  const mensajeError = document.getElementById('mensaje-error')

  if (!idLibro) {
    spinner.classList.add('d-none')
    mensajeError.classList.remove('d-none')
    return
  }

  perfilUsuarioActual = await obtenerPerfilActual()
  libroActual = await obtenerLibroPorId(idLibro)

  if (!libroActual) {
    spinner.classList.add('d-none')
    mensajeError.classList.remove('d-none')
    return
  }

  renderizarInfoLibro(libroActual)

  // Tiñe el fondo de la página con el color dominante de la portada del
  // libro (efecto "plataforma de streaming"). No bloquea el resto de la
  // carga: se aplica en cuanto esté listo, en paralelo.
  extraerColorDominante(libroActual.portada_url).then(aplicarColorDeFondo)

  // Progreso de lectura: continuar desde la última página visitada
  let paginaInicial = 1
  if (perfilUsuarioActual) {
    const progreso = await obtenerProgresoLectura(perfilUsuarioActual.id, libroActual.id)
    if (progreso) {
      paginaInicial = progreso.ultima_pagina
      actualizarBarraProgreso(progreso.porcentaje_completado)
    }

    esFavoritoActual = await esFavorito(perfilUsuarioActual.id, libroActual.id)
    actualizarBotonFavorito()

    const marcadores = await obtenerMarcadores(perfilUsuarioActual.id, libroActual.id)
    renderizarMarcadores(marcadores)
  }

  await cargarDocumentoPdf(libroActual.archivo_pdf_url, paginaInicial)

  spinner.classList.add('d-none')
  contenido.classList.remove('d-none')

  // --- Eventos de navegación de páginas ---
  document.getElementById('btn-pagina-anterior').addEventListener('click', () => {
    if (paginaActual > 1) renderizarPaginaPdf(paginaActual - 1)
  })
  document.getElementById('btn-pagina-siguiente').addEventListener('click', () => {
    if (paginaActual < documentoPdf.numPages) renderizarPaginaPdf(paginaActual + 1)
  })

  // --- Eventos de zoom ---
  document.getElementById('btn-zoom-mas').addEventListener('click', () => {
    escalaActual = Math.min(escalaActual + 0.2, 3)
    renderizarPaginaPdf(paginaActual)
  })
  document.getElementById('btn-zoom-menos').addEventListener('click', () => {
    escalaActual = Math.max(escalaActual - 0.2, 0.6)
    renderizarPaginaPdf(paginaActual)
  })

  // --- Evento de favorito ---
  document.getElementById('btn-favorito').addEventListener('click', async () => {
    if (!perfilUsuarioActual) return

    if (esFavoritoActual) {
      await quitarFavorito(perfilUsuarioActual.id, libroActual.id)
    } else {
      await agregarFavorito(perfilUsuarioActual.id, libroActual.id)
    }
    esFavoritoActual = !esFavoritoActual
    actualizarBotonFavorito()
  })

  // --- Evento de agregar marcador ---
  document.getElementById('btn-agregar-marcador').addEventListener('click', async () => {
    if (!perfilUsuarioActual) return

    const inputPagina = document.getElementById('input-pagina-marcador')
    const pagina = parseInt(inputPagina.value, 10) || paginaActual

    await crearMarcador(perfilUsuarioActual.id, libroActual.id, pagina)
    inputPagina.value = ''

    const marcadores = await obtenerMarcadores(perfilUsuarioActual.id, libroActual.id)
    renderizarMarcadores(marcadores)
  })
})
