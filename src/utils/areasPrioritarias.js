export function nombresAreasPrioritarias(configuration) {
  if (!Array.isArray(configuration?.areas_prioritarias)) return [];

  return configuration.areas_prioritarias
    .map((area) => (typeof area === "string" ? area : area?.nombre))
    .filter((nombre) => typeof nombre === "string" && nombre.trim())
    .map((nombre) => nombre.trim());
}

export function unirConY(items) {
  if (items.length < 2) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

export function avisoEtapaRegistro(configuration, { breve = false } = {}) {
  if (!configuration?.registro_restringido) return "";

  const nombres = nombresAreasPrioritarias(configuration);
  if (!nombres.length) {
    return breve
      ? "Inscripciones en etapa de prioridad por carrera; se ampliarán más adelante."
      : "Por ahora, las inscripciones están abiertas a un grupo de carreras y se ampliarán más adelante.";
  }

  const areas = unirConY(nombres);
  if (breve)
    return `Inscripciones abiertas para ${areas}; se ampliarán más adelante.`;

  return nombres.length === 1
    ? `En esta etapa, el registro está abierto al área ${areas} y se ampliará al resto más adelante.`
    : `En esta etapa, el registro está abierto a las áreas ${areas} y se ampliará al resto más adelante.`;
}
