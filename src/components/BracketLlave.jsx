export default function BracketLlave({ rondas = [] }) {
  return (
    <div className="bracket">
      {rondas.map((round) => (
        <section className="round" key={round.ronda}>
          <h3>{round.nombre}</h3>
          {round.partidas.map((match) => (
            <article className="match" key={match.id}>
              {match.bye ? (
                <p>
                  <span>
                    {match.equipo_a?.nombre ?? "Error: falta equipo_a"}
                  </span>{" "}
                  <strong>pasa directo</strong>
                </p>
              ) : (
                [
                  ["equipo_a", "score_a"],
                  ["equipo_b", "score_b"],
                ].map(([teamKey, scoreKey]) => {
                  const team = match[teamKey];
                  const winner = team?.id === match.ganador?.id;
                  return (
                    <p
                      key={teamKey}
                      className={
                        match.ganador ? (winner ? "winner" : "loser") : ""
                      }
                    >
                      <span>
                        {team === null
                          ? "Por definir"
                          : (team?.nombre ?? `Error: falta ${teamKey}`)}
                      </span>
                      <b>
                        {match[scoreKey] === null
                          ? ""
                          : (match[scoreKey] ?? `Error: falta ${scoreKey}`)}
                      </b>
                    </p>
                  );
                })
              )}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
