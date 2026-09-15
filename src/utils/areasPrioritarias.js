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
      ? "Inscripciones limitadas a las personas convocadas; se ampliarán más adelante."
      : "El registro de esta etapa está limitado a las personas convocadas. Si no puedes inscribirte ahora, podrás hacerlo cuando se amplíen las inscripciones.";
  }

  const areas = unirConY(nombres);
  if (breve)
    return `Áreas prioritarias: ${areas}. Inscripciones limitadas a las personas convocadas; se ampliarán más adelante.`;

  const prioridad = nombres.length === 1
    ? `El área prioritaria en esta etapa es ${areas}.`
    : `Las áreas prioritarias en esta etapa son ${areas}.`;
  return `${prioridad} El registro está limitado a las personas convocadas. Si no puedes inscribirte ahora, podrás hacerlo cuando se amplíen las inscripciones.`;
}
