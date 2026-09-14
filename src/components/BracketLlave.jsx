function teamName(team, field, matchId) {
  if (team?.nombre) return team.nombre;
  if (team !== null) console.error(`La partida ${matchId} no incluye ${field}.nombre.`);
  return "Por definir";
}

export default function BracketLlave({ rondas = [], renderEditor }) {
  return (
    <div className="bracket" aria-label="Llave de eliminación directa">
      {rondas.map((round, roundIndex) => (
        <section className="round" key={round.ronda ?? round.id ?? roundIndex}>
          <h3>{round.nombre || `Ronda ${roundIndex + 1}`}</h3>
          <div className="round-matches">
            {round.partidas.map((match, matchIndex) => {
              const editable = Boolean(renderEditor && match.equipo_a && match.equipo_b && !match.bye);
              const isLastRound = Boolean(match.es_final ?? roundIndex === rondas.length - 1);
              return (
                <div className="match-slot" key={match.id ?? matchIndex}>
                  <article
                    className={`match ${isLastRound ? "match-final" : ""} ${editable ? "match-editable" : ""}`}
                  >
                    {match.bye ? (
                      <p className="bye">
                        <span>{teamName(match.equipo_a || match.equipo_b, "equipo", match.id)}</span>
                        <strong>pasa directo</strong>
                      </p>
                    ) : (
                      [["equipo_a", "score_a"], ["equipo_b", "score_b"]].map(([teamKey, scoreKey]) => {
                        const team = match[teamKey];
                        const winner = team?.id === match.ganador?.id;
                        const walkoverLoser = match.por_walkover && match.ganador && !winner;
                        return (
                          <p key={teamKey} className={`${match.ganador ? (winner ? "winner" : "loser") : ""} ${!team ? "undefined-team" : ""}`}>
                            <span>{teamName(team, teamKey, match.id)}</span>
                            <b>{walkoverLoser ? "no se presentó" : (match[scoreKey] ?? "")}</b>
                          </p>
                        );
                      })
                    )}
                    {editable && renderEditor(match)}
                  </article>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
