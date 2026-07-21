/* ============================================================================
   LÓGICA DE LA PÁGINA: registro.html
   ========================================================================= */

document.getElementById('form-registro').addEventListener('submit', async (evento) => {
  evento.preventDefault()

  const nombre = document.getElementById('nombre').value.trim()
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  const passwordConfirmar = document.getElementById('password-confirmar').value
  const botonRegistro = document.getElementById('btn-registro')
  const alertaError = document.getElementById('alerta-error')
  const alertaExito = document.getElementById('alerta-exito')

  alertaError.classList.add('d-none')
  alertaExito.classList.add('d-none')

  if (password !== passwordConfirmar) {
    alertaError.textContent = 'Las contraseñas no coinciden.'
    alertaError.classList.remove('d-none')
    return
  }

  botonRegistro.disabled = true
  botonRegistro.textContent = 'Creando cuenta...'

  const { error } = await registrarUsuario(email, password, nombre)

  if (error) {
    alertaError.textContent = traducirErrorAuth(error.message)
    alertaError.classList.remove('d-none')
    botonRegistro.disabled = false
    botonRegistro.textContent = 'Crear cuenta'
    return
  }

  alertaExito.textContent = '¡Cuenta creada! Redirigiendo a la biblioteca...'
  alertaExito.classList.remove('d-none')

  setTimeout(() => {
    window.location.href = 'biblioteca.html'
  }, 1500)
})
