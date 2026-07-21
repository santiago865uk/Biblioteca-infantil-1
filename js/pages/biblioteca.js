/* ============================================================================
   LÓGICA DE LA PÁGINA: biblioteca.html
   ========================================================================= */

let perfilUsuarioActual = null

/**
 * Colores de borde que se van alternando entre tarjetas, para que la
 * biblioteca se vea variada (igual que en una plataforma de streaming).
 */
const COLORES_TARJETA = ['#00D9C0', '#FF4D6D', '#FFD23F', '#7C3AED']

/**
 * Genera el HTML de una tarjeta de libro (Bootstrap card).
 * El color de borde se asigna explícitamente según la posición del libro
 * en la lista (no con CSS nth-of-type, que no funciona aquí porque cada
 * tarjeta está envuelta en su propia columna .col-... individual).
 */
function crearTarjetaLibro(libro, indice) {
  const portada = libro.portada_url || 'images/portada-default.svg'
  const colorCategoria = libro.categories?.color || '#6366f1'
  const nombreCategoria = libro.categories?.nombre || 'Sin categoría'
  const colorBorde = COLORES_TARJETA[indice % COLORES_TARJETA.length]

  return `
    <div class="col-sm-6 col-md-4 col-lg-3">
      <a href="libro.html?id=${libro.id}" class="text-decoration-none text-dark">
        <div class="card tarjeta-libro h-100" style="--color-tarjeta:${colorBorde};">
          <img src="${portada}" class="portada-libro" alt="Portada de ${libro.titulo}"
               onerror="this.src='images/portada-default.svg'">
          <div class="card-body">
            <span class="badge badge-edad mb-2" style="background-color:${colorCategoria}">
              ${nombreCategoria}
            </span>
            <h3 class="h6 mb-1">${libro.titulo}</h3>
            <p class="text-muted small mb-1">${libro.autor}</p>
            <p class="text-muted small mb-0">${etiquetaEdad(libro.edad_recomendada)}</p>
          </div>
        </div>
      </a>
    </div>
  `
}

/**
 * Pinta una lista de libros dentro de un contenedor dado.
 */
function renderizarLibros(contenedorId, libros) {
  const contenedor = document.getElementById(contenedorId)
  contenedor.innerHTML = libros.map(crearTarjetaLibro).join('')
}

/**
 * Carga las categorías en el select de filtros.
 */
async function cargarFiltroCategoria() {
  const categorias = await obtenerCategorias()
  const select = document.getElementById('filtro-categoria')

  categorias.forEach((categoria) => {
    const opcion = document.createElement('option')
    opcion.value = categoria.id
    opcion.textContent = categoria.nombre
    select.appendChild(opcion)
  })
}

/**
 * Carga y muestra los libros destacados (solo si hay alguno, sin filtros).
 */
async function cargarDestacados() {
  const destacados = await obtenerLibrosDestacados()
  if (destacados.length === 0) return

  renderizarLibros('contenedor-destacados', destacados)
  document.getElementById('seccion-destacados').classList.remove('d-none')
}

/**
 * Lee los filtros actuales del formulario y recarga el catálogo.
 */
async function aplicarFiltros() {
  const spinner = document.getElementById('spinner-carga')
  const contenedor = document.getElementById('contenedor-libros')
  const mensajeSinResultados = document.getElementById('mensaje-sin-resultados')

  spinner.classList.remove('d-none')
  contenedor.innerHTML = ''
  mensajeSinResultados.classList.add('d-none')

  const filtros = {
    busqueda: document.getElementById('filtro-busqueda').value.trim(),
    categoriaId: document.getElementById('filtro-categoria').value,
    edad: document.getElementById('filtro-edad').value,
  }

  const libros = await obtenerLibros(filtros)

  spinner.classList.add('d-none')

  if (libros.length === 0) {
    mensajeSinResultados.classList.remove('d-none')
    return
  }

  renderizarLibros('contenedor-libros', libros)
}

/**
 * Debounce simple para no disparar una consulta en cada tecla escrita.
 */
function debounce(fn, esperaMs) {
  let temporizador
  return (...args) => {
    clearTimeout(temporizador)
    temporizador = setTimeout(() => fn(...args), esperaMs)
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  perfilUsuarioActual = await obtenerPerfilActual()

  await cargarFiltroCategoria()
  await cargarDestacados()
  await aplicarFiltros()

  document.getElementById('filtro-busqueda').addEventListener('input', debounce(aplicarFiltros, 400))
  document.getElementById('filtro-categoria').addEventListener('change', aplicarFiltros)
  document.getElementById('filtro-edad').addEventListener('change', aplicarFiltros)

  document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
    document.getElementById('filtro-busqueda').value = ''
    document.getElementById('filtro-categoria').value = ''
    document.getElementById('filtro-edad').value = ''
    aplicarFiltros()
  })
})
