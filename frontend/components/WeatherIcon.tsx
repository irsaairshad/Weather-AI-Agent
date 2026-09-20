export function WeatherIcon({ kind = "sunny", large = false }: { kind?: string; large?: boolean }) {
  const rainy = kind.includes("rain");
  return <span className={`weather-icon ${large ? "large" : ""}`} aria-label={rainy ? "Rainy" : "Partly cloudy"}>
    <span className="sun" />
    <span className="cloud" />
    {rainy && <span className="rain">•••</span>}
  </span>;
}

