/* ============================================================================
   FONDO DE BLOBS ANIMADOS
   ============================================================================
   Inserta el contenedor de "blobs" (manchas de color flotantes) al inicio
   del <body>, detrás de todo el contenido. Se llama una vez por página.
   ========================================================================= */

function insertarFondoBlobs() {
  const contenedor = document.createElement('div')
  contenedor.id = 'fondo-blobs'
  contenedor.innerHTML = `
    <div class="blob" style="width:320px;height:320px;background:#FFD23F;top:-100px;right:-100px;"></div>
    <div class="blob" style="width:380px;height:380px;background:#FF4D6D;bottom:-120px;left:-120px;animation-delay:-4s;"></div>
    <div class="blob" style="width:220px;height:220px;background:#00D9C0;top:45%;right:6%;animation-delay:-7s;"></div>
  `
  document.body.insertBefore(contenedor, document.body.firstChild)
}

insertarFondoBlobs()

/* ============================================================================
   ANIMACIÓN DE APARICIÓN AL HACER SCROLL
   ============================================================================
   Cualquier elemento con la clase .reveal se anima al entrar en pantalla.
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const elementos = document.querySelectorAll('.reveal')
  if (elementos.length === 0) return

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visible')
          observador.unobserve(entrada.target)
        }
      })
    },
    { threshold: 0.15 }
  )

  elementos.forEach((el) => observador.observe(el))
})
