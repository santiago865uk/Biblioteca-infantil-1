/* ============================================================================
   LÓGICA DE LA PÁGINA: actualizar-password.html
   ========================================================================= */

document.getElementById('form-actualizar').addEventListener('submit', async (evento) => {
  evento.preventDefault()

  const password = document.getElementById('password').value
  const passwordConfirmar = document.getElementById('password-confirmar').value
  const boton = document.getElementById('btn-actualizar')
  const alertaError = document.getElementById('alerta-error')
  const alertaExito = document.getElementById('alerta-exito')

  alertaError.classList.add('d-none')
  alertaExito.classList.add('d-none')

  if (password !== passwordConfirmar) {
    alertaError.textContent = 'Las contraseñas no coinciden.'
    alertaError.classList.remove('d-none')
    return
  }

  boton.disabled = true
  boton.textContent = 'Actualizando...'

  const { error } = await actualizarPassword(password)

  if (error) {
    alertaError.textContent = traducirErrorAuth(error.message)
    alertaError.classList.remove('d-none')
    boton.disabled = false
    boton.textContent = 'Actualizar contraseña'
    return
  }

  alertaExito.textContent = '¡Contraseña actualizada! Redirigiendo al login...'
  alertaExito.classList.remove('d-none')

  setTimeout(() => {
    window.location.href = 'login.html'
  }, 1500)
})
