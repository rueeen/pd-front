export function limpiarRut(value = "") {
  return value.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function formatearRut(value = "") {
  const rut = limpiarRut(value);
  if (rut.length < 2) return rut;
  return `${Number(rut.slice(0, -1)).toLocaleString("es-CL")}-${rut.slice(-1)}`;
}

export function rutValido(value = "") {
  const rut = limpiarRut(value);
  const cuerpo = rut.slice(0, -1);
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i -= 1) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resultado = 11 - (suma % 11);
  const digito =
    resultado === 11 ? "0" : resultado === 10 ? "K" : String(resultado);
  return cuerpo.length >= 7 && digito === rut.slice(-1);
}
