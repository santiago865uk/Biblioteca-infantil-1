/* ============================================================================
   FUNCIONES DE ACCESO A DATOS (LIBROS, CATEGORÍAS, FAVORITOS, HISTORIAL)
   ============================================================================
   Requiere que supabase-config.js se cargue antes (variable global `cliente`).
   ========================================================================= */

/**
 * Obtiene todas las categorías, ordenadas alfabéticamente.
 */
async function obtenerCategorias() {
  const { data, error } = await cliente
    .from('categories')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error al obtener categorías:', error.message)
    return []
  }
  return data
}

/**
 * Obtiene libros publicados, con filtros opcionales de búsqueda, categoría
 * y edad recomendada. Incluye el nombre/color de la categoría asociada.
 */
async function obtenerLibros({ busqueda = '', categoriaId = '', edad = '' } = {}) {
  let consulta = cliente
    .from('books')
    .select('*, categories(id, nombre, color, icono)')
    .eq('publicado', true)
    .order('creado_en', { ascending: false })

  if (categoriaId) {
    consulta = consulta.eq('categoria_id', categoriaId)
  }
  if (edad) {
    consulta = consulta.eq('edad_recomendada', edad)
  }
  if (busqueda) {
    // Busca coincidencias parciales en título O autor (insensible a mayúsculas)
    consulta = consulta.or(`titulo.ilike.%${busqueda}%,autor.ilike.%${busqueda}%`)
  }

  const { data, error } = await consulta

  if (error) {
    console.error('Error al obtener libros:', error.message)
    return []
  }
  return data
}

/**
 * Obtiene los libros marcados como destacados.
 */
async function obtenerLibrosDestacados() {
  const { data, error } = await cliente
    .from('books')
    .select('*, categories(id, nombre, color, icono)')
    .eq('publicado', true)
    .eq('destacado', true)
    .limit(6)

  if (error) {
    console.error('Error al obtener destacados:', error.message)
    return []
  }
  return data
}

/**
 * Obtiene el detalle completo de un libro por su id.
 */
async function obtenerLibroPorId(libroId) {
  const { data, error } = await cliente
    .from('books')
    .select('*, categories(id, nombre, color, icono)')
    .eq('id', libroId)
    .single()

  if (error) {
    console.error('Error al obtener el libro:', error.message)
    return null
  }
  return data
}

/**
 * Verifica si un libro está en los favoritos del usuario actual.
 */
async function esFavorito(usuarioId, libroId) {
  const { data, error } = await cliente
    .from('favorites')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('libro_id', libroId)
    .maybeSingle()

  if (error) {
    console.error('Error al verificar favorito:', error.message)
    return false
  }
  return !!data
}

/**
 * Agrega un libro a favoritos.
 */
async function agregarFavorito(usuarioId, libroId) {
  const { error } = await cliente
    .from('favorites')
    .insert({ usuario_id: usuarioId, libro_id: libroId })
  return { error }
}

/**
 * Quita un libro de favoritos.
 */
async function quitarFavorito(usuarioId, libroId) {
  const { error } = await cliente
    .from('favorites')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('libro_id', libroId)
  return { error }
}

/**
 * Obtiene la lista de libros favoritos del usuario, con el detalle del libro.
 */
async function obtenerFavoritosUsuario(usuarioId) {
  const { data, error } = await cliente
    .from('favorites')
    .select('id, creado_en, books(*, categories(id, nombre, color, icono))')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false })

  if (error) {
    console.error('Error al obtener favoritos:', error.message)
    return []
  }
  return data
}

/**
 * Obtiene (o null) el registro de progreso de lectura de un usuario/libro.
 */
async function obtenerProgresoLectura(usuarioId, libroId) {
  const { data, error } = await cliente
    .from('reading_history')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('libro_id', libroId)
    .maybeSingle()

  if (error) {
    console.error('Error al obtener progreso de lectura:', error.message)
    return null
  }
  return data
}

/**
 * Crea o actualiza el progreso de lectura ("upsert"): guarda la última
 * página visitada y el porcentaje completado.
 */
async function guardarProgresoLectura(usuarioId, libroId, ultimaPagina, porcentajeCompletado, completado = false) {
  const { error } = await cliente
    .from('reading_history')
    .upsert(
      {
        usuario_id: usuarioId,
        libro_id: libroId,
        ultima_pagina: ultimaPagina,
        porcentaje_completado: porcentajeCompletado,
        completado,
      },
      { onConflict: 'usuario_id,libro_id' }
    )
  return { error }
}

/**
 * Obtiene el historial de lectura del usuario, ordenado por más reciente.
 */
async function obtenerHistorialLectura(usuarioId) {
  const { data, error } = await cliente
    .from('reading_history')
    .select('*, books(*, categories(id, nombre, color, icono))')
    .eq('usuario_id', usuarioId)
    .order('ultima_lectura', { ascending: false })

  if (error) {
    console.error('Error al obtener historial:', error.message)
    return []
  }
  return data
}

/**
 * Obtiene los marcadores de un usuario para un libro específico.
 */
async function obtenerMarcadores(usuarioId, libroId) {
  const { data, error } = await cliente
    .from('bookmarks')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('libro_id', libroId)
    .order('pagina', { ascending: true })

  if (error) {
    console.error('Error al obtener marcadores:', error.message)
    return []
  }
  return data
}

/**
 * Crea un nuevo marcador de página.
 */
async function crearMarcador(usuarioId, libroId, pagina, nota = '') {
  const { error } = await cliente
    .from('bookmarks')
    .insert({ usuario_id: usuarioId, libro_id: libroId, pagina, nota })
  return { error }
}

/**
 * Elimina un marcador por su id.
 */
async function eliminarMarcador(marcadorId) {
  const { error } = await cliente
    .from('bookmarks')
    .delete()
    .eq('id', marcadorId)
  return { error }
}

/**
 * Devuelve una etiqueta legible para el rango de edad almacenado en la BD.
 */
function etiquetaEdad(rangoEdad) {
  const etiquetas = {
    '3-5': '3 a 5 años',
    '6-8': '6 a 8 años',
    '9-12': '9 a 12 años',
    '13+': '13 años o más',
  }
  return etiquetas[rangoEdad] || rangoEdad
}
