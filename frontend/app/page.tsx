"use client";

import { useEffect, useMemo, useState } from "react";
import { getWeather } from "@/lib/api";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  AlertTriangle,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  CloudSun,
  Compass,
  Droplets,
  Eye,
  Gauge,
  Globe as GlobeIcon,
  Home,
  Info,
  LocateFixed,
  LogOut,
  Map,
  Menu,
  Moon,
  Navigation,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunset,
  User,
  Wind,
  X,
} from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { WeatherIcon } from "@/components/WeatherIcon";
import { WorldWeatherMap } from "@/components/WorldWeatherMap";

type HourlyWeather = {
  time: string;
  temp: number;
  condition: string;
};

type DailyWeather = {
  day: string;
  date: string;
  high: number;
  low: number;
  condition: string;
  description: string;
  rain_chance: number;
};

type WeatherData = {
  city: string;
  country: string;
  temperature: number;
  feels_like: number;
  condition: string;
  humidity: number;
  pressure: number;
  wind_speed: number;
  visibility: number;
  daily: DailyWeather[];
  hourly: HourlyWeather[];
};

type ChartWeather = {
  t: string;
  v: number;
  condition: string;
};

const defaultHourly: ChartWeather[] = [
  { t: "Now", v: 27, condition: "Clouds" },
  { t: "11 AM", v: 29, condition: "Clear" },
  { t: "1 PM", v: 31, condition: "Clear" },
  { t: "3 PM", v: 30, condition: "Rain" },
  { t: "5 PM", v: 28, condition: "Clouds" },
  { t: "7 PM", v: 26, condition: "Clouds" },
  { t: "9 PM", v: 24, condition: "Clear" },
];

const defaultDays = [
  { d: "Today", date: "20 Aug", hi: 33, lo: 24, k: "sunny", rainChance: 10, wind: 8.6, humidity: 53 },
  { d: "Tomorrow", date: "21 Aug", hi: 31, lo: 23, k: "rain", rainChance: 65, wind: 14.2, humidity: 72 },
  { d: "Saturday", date: "22 Aug", hi: 30, lo: 22, k: "rain", rainChance: 70, wind: 12.0, humidity: 78 },
  { d: "Sunday", date: "23 Aug", hi: 32, lo: 24, k: "sunny", rainChance: 15, wind: 9.1, humidity: 50 },
  { d: "Monday", date: "24 Aug", hi: 34, lo: 25, k: "sunny", rainChance: 5, wind: 7.5, humidity: 45 },
  { d: "Tuesday", date: "25 Aug", hi: 29, lo: 22, k: "rain", rainChance: 55, wind: 16.0, humidity: 80 },
];

function formatHour(value: string, index: number) {
  if (index === 0) return "Now";
  const parsedDate = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleTimeString([], { hour: "numeric" });
}

export default function Dashboard() {
  const [city, setCity] = useState("Islamabad");
  const [search, setSearch] = useState("");
  const [chat, setChat] = useState(false);
  const [menu, setMenu] = useState(false);

  // Active View Tab: 'overview' | 'forecast' | 'weather_map'
  const [activeTab, setActiveTab] = useState<"overview" | "forecast" | "weather_map">("overview");

  // Active Modal: 'alerts' | 'settings' | 'golden_hour' | null
  const [activeModal, setActiveModal] = useState<"alerts" | "settings" | "golden_hour" | null>(null);

  // Profile Dropdown
  const [profileOpen, setProfileOpen] = useState(false);

  // Temperature Unit (°C or °F)
  const [unit, setUnit] = useState<"C" | "F">("C");

  // Weather Data
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");

  // Convert temperature based on selected unit
  const formatTemp = (celsius: number) => {
    if (unit === "F") {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  };

  const date = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      setWeatherLoading(true);
      setWeatherError("");

      try {
        const result = (await getWeather(city)) as WeatherData;
        if (!cancelled) {
          setWeather(result);
        }
      } catch (error) {
        if (!cancelled) {
          setWeatherError(
            error instanceof Error ? error.message : "Unable to load weather data.",
          );
        }
      } finally {
        if (!cancelled) {
          setWeatherLoading(false);
        }
      }
    }

    loadWeather();
    return () => {
      cancelled = true;
    };
  }, [city]);

  const chartData: ChartWeather[] = useMemo(() => {
    if (!weather?.hourly?.length) {
      return defaultHourly.map(item => ({ ...item, v: formatTemp(item.v) }));
    }

    return weather.hourly.map((item, index) => ({
      t: formatHour(item.time, index),
      v: formatTemp(item.temp),
      condition: item.condition,
    }));
  }, [weather, unit]);

  const forecastDays = useMemo(() => {
    if (!weather?.daily?.length) {
      return defaultDays.map(d => ({
        ...d,
        hi: formatTemp(d.hi),
        lo: formatTemp(d.lo),
      }));
    }

    return weather.daily.map((day) => ({
      d: day.day,
      date: day.date,
      hi: formatTemp(day.high),
      lo: formatTemp(day.low),
      k: day.condition.toLowerCase(),
      rainChance: day.rain_chance,
      wind: weather.wind_speed,
      humidity: weather.humidity,
    }));
  }, [weather, unit]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedCity = search.trim();
    if (!requestedCity) return;
    setCity(requestedCity);
    setSearch("");
  }

  const displayedCity = weather?.city || city;
  const displayedCountry = weather?.country || "PK";
  const condition = weather?.condition || "Partly cloudy";
  const conditionKind = condition.toLowerCase();

  const currentTemp = weather ? formatTemp(weather.temperature) : (unit === "F" ? 91 : 33);
  const feelsLikeTemp = weather ? formatTemp(weather.feels_like) : (unit === "F" ? 99 : 37);

  return (
    <main className="app-shell">
      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${menu ? "mobile-open" : ""}`}>
        <button
          className="mobile-close"
          onClick={() => setMenu(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>

        <div className="brand">
          <span>
            <CloudSun />
          </span>
          <strong>SkySense</strong>
        </div>

        <nav>
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => {
              setActiveTab("overview");
              setMenu(false);
            }}
          >
            <Home />
            Overview
          </button>

          <button
            className={activeTab === "forecast" ? "active" : ""}
            onClick={() => {
              setActiveTab("forecast");
              setMenu(false);
            }}
          >
            <CalendarDays />
            Forecast
          </button>

          <button
            className={activeTab === "weather_map" ? "active" : ""}
            onClick={() => {
              setActiveTab("weather_map");
              setMenu(false);
            }}
          >
            <Map />
            Weather map
          </button>

          <p>Workspace</p>

          <button
            onClick={() => {
              setActiveModal("alerts");
              setMenu(false);
            }}
          >
            <Bell />
            Alerts <em>2</em>
          </button>

          <button
            onClick={() => {
              setActiveModal("settings");
              setMenu(false);
            }}
          >
            <Settings />
            Settings
          </button>
        </nav>

        {/* GOLDEN HOUR WIDGET */}
        <div
          className="sidebar-tip"
          onClick={() => setActiveModal("golden_hour")}
          title="Click to view Golden Hour details"
        >
          <Sun />
          <strong>Golden hour</strong>
          <span>Starts at 6:14 PM</span>
          <div>
            <i />
          </div>
        </div>

        {/* PROFILE / ACCOUNT DROPDOWN */}
        <div
          className="profile"
          onClick={() => setProfileOpen(!profileOpen)}
        >
          <span>AM</span>
          <div>
            <strong>Alex Morgan</strong>
            <small>Free plan</small>
          </div>
          <ChevronDown style={{ transform: profileOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />

          {profileOpen && (
            <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setActiveModal("settings"); setProfileOpen(false); }}>
                <User size={15} /> Account Settings
              </button>
              <button onClick={() => { setActiveModal("alerts"); setProfileOpen(false); }}>
                <Bell size={15} /> Weather Alerts (2)
              </button>
              <button onClick={() => { setCity("London"); setProfileOpen(false); }}>
                <Compass size={15} /> Switch to London
              </button>
              <hr />
              <button style={{ color: "#ef4444" }} onClick={() => setProfileOpen(false)}>
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN DASHBOARD CONTAINER */}
      <section className="dashboard">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setMenu(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>

          <form className="search" onSubmit={submit}>
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search any city…"
              aria-label="Search city"
            />
            <kbd>Enter</kbd>
          </form>

          <button
            className="icon-button"
            onClick={() => setActiveModal("alerts")}
            aria-label="Notifications"
            title="Weather Alerts"
          >
            <Bell />
            <i />
          </button>

          {/* UNIT SWITCHER BUTTON */}
          <button
            className="unit"
            onClick={() => setUnit(unit === "C" ? "F" : "C")}
            title="Toggle Celsius / Fahrenheit"
          >
            °{unit} <ChevronDown size={15} />
          </button>
        </header>

        <div className="content">
          <div className="greeting">
            <div>
              <p>{date}</p>
              <h1>Good afternoon, Alex.</h1>
              <span>Here’s what the sky has planned for you.</span>
            </div>

            <button onClick={() => setChat(true)}>
              <Bot size={19} />
              Ask SkySense AI
            </button>
          </div>

          {weatherError && (
            <div
              style={{
                background: "#fff0f0",
                border: "1px solid #ffc9c9",
                borderRadius: "12px",
                color: "#b42318",
                marginBottom: "16px",
                padding: "12px 16px",
              }}
            >
              <strong>Weather could not be loaded.</strong>
              <div>{weatherError}</div>
            </div>
          )}

          {/* VIEW TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <>
              <section className="hero-weather">
                <div className="hero-glow" />

                <div className="location">
                  <LocateFixed />
                  {weatherLoading
                    ? `Loading ${city}…`
                    : `${displayedCity}, ${displayedCountry}`}
                  <ChevronDown size={16} />
                </div>

                <div className="temperature">
                  <WeatherIcon kind={conditionKind} large />
                  <div>
                    <strong>
                      {weatherLoading ? "..." : `${currentTemp}°`}
                    </strong>
                    <span>Feels like {feelsLikeTemp}°</span>
                  </div>
                </div>

                <div className="condition">
                  <h2>{weatherLoading ? "Loading weather…" : condition}</h2>
                  <p>
                    Current live weather information for {displayedCity}.
                    Ask Nimbus AI for clothing, travel, or outdoor advice.
                  </p>
                </div>

                <div className="hero-stats">
                  <span>
                    <Droplets />
                    Humidity
                    <b>{weather?.humidity ?? 68}%</b>
                  </span>

                  <span>
                    <Wind />
                    Wind
                    <b>{weather?.wind_speed ?? 12} km/h</b>
                  </span>

                  <span>
                    <Gauge />
                    Pressure
                    <b>{weather?.pressure ?? 1012} hPa</b>
                  </span>

                  <span>
                    <Navigation />
                    Visibility
                    <b>{weather?.visibility ?? 9.7} km</b>
                  </span>
                </div>

                <span className="updated">
                  {weatherLoading ? "Updating…" : "Live weather"}
                </span>
              </section>

              <div className="main-grid">
                <section className="card chart-card">
                  <div className="card-title">
                    <div>
                      <p>TODAY’S FORECAST</p>
                      <h3>Temperature (°{unit})</h3>
                    </div>
                    <span>
                      Hourly <ChevronDown size={14} />
                    </span>
                  </div>

                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={190}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="temp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6687ff" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#6687ff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="t"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#8d95aa", fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value) => [`${value}°${unit}`, "Temperature"]}
                          contentStyle={{
                            border: 0,
                            borderRadius: 12,
                            boxShadow: "0 10px 30px #3750a433",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke="#5578f6"
                          strokeWidth={3}
                          fill="url(#temp)"
                          dot={{
                            r: 4,
                            fill: "white",
                            stroke: "#5578f6",
                            strokeWidth: 2,
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mini-hours">
                    {chartData.slice(0, 5).map((hour) => (
                      <span key={`${hour.t}-${hour.v}`}>
                        <WeatherIcon kind={hour.condition.toLowerCase()} />
                        <b>{hour.v}°</b>
                      </span>
                    ))}
                  </div>
                </section>

                <section className="card details">
                  <div className="card-title">
                    <div>
                      <p>TODAY’S OVERVIEW</p>
                      <h3>Weather details</h3>
                    </div>
                  </div>

                  <div className="detail-grid">
                    <div>
                      <span className="metric-icon rain">
                        <Droplets />
                      </span>
                      <p>Humidity</p>
                      <strong>{weather?.humidity ?? 68}%</strong>
                      <small>Current humidity</small>
                    </div>

                    <div>
                      <span className="metric-icon uv">
                        <Gauge />
                      </span>
                      <p>Pressure</p>
                      <strong>
                        {weather?.pressure ?? 1012}
                        <small> hPa</small>
                      </strong>
                      <small>Atmospheric pressure</small>
                    </div>

                    <div>
                      <span className="metric-icon wind">
                        <Wind />
                      </span>
                      <p>Wind</p>
                      <strong>
                        {weather?.wind_speed ?? 12}
                        <small> km/h</small>
                      </strong>
                      <small>Current wind speed</small>
                    </div>

                    <div>
                      <span className="metric-icon sun">
                        <Navigation />
                      </span>
                      <p>Visibility</p>
                      <strong>
                        {weather?.visibility ?? 9.7}
                        <small> km</small>
                      </strong>
                      <small>Current visibility</small>
                    </div>
                  </div>
                </section>
              </div>

              <div className="bottom-grid">
                <section className="card forecast">
                  <div className="card-title">
                    <div>
                      <p>WEEK AHEAD</p>
                      <h3>6-day forecast</h3>
                    </div>
                    <button onClick={() => setActiveTab("forecast")}>
                      View full forecast →
                    </button>
                  </div>

                  <div className="days">
                    {forecastDays.map((day) => (
                      <div key={`${day.d}-${day.date}`}>
                        <span>
                          <strong>{day.d}</strong>
                          <small>{day.date}</small>
                        </span>
                        <WeatherIcon kind={day.k} />
                        <span className="range">
                          <b>{day.hi}°</b>
                          <i />
                          <small>{day.lo}°</small>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card world-map-card">
                  <WorldWeatherMap
                    selectedCity={displayedCity}
                    onCitySelect={setCity}
                  />
                </section>
              </div>
            </>
          )}

          {/* VIEW TAB 2: DETAILED FORECAST PAGE */}
          {activeTab === "forecast" && (
            <div className="forecast-page">
              <div className="card">
                <div className="card-title">
                  <div>
                    <p>EXTENDED WEATHER PREVIEW</p>
                    <h3>Multi-day Weather Forecast — {displayedCity}</h3>
                  </div>
                  <button onClick={() => setActiveTab("overview")}>← Back to Overview</button>
                </div>

                <div className="forecast-hero-grid" style={{ marginTop: "20px" }}>
                  {forecastDays.map((day, idx) => (
                    <div className="forecast-day-card" key={idx}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: "16px" }}>{day.d}</strong>
                          <div style={{ fontSize: "12px", color: "var(--muted)" }}>{day.date}</div>
                        </div>
                        <WeatherIcon kind={day.k} large />
                      </div>

                      <div style={{ display: "flex", gap: "12px", alignItems: "baseline", margin: "8px 0" }}>
                        <span style={{ fontSize: "32px", fontWeight: "800", fontFamily: "Manrope" }}>{day.hi}°</span>
                        <span style={{ fontSize: "18px", color: "var(--muted)" }}>/ {day.lo}°</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Droplets size={14} /> Rain chance
                          </span>
                          <strong>{day.rainChance}%</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Wind size={14} /> Wind speed
                          </span>
                          <strong>{day.wind} km/h</strong>
                        </div>
                      </div>

                      <div style={{ background: "#edf2ff", padding: "10px", borderRadius: "10px", fontSize: "11px", color: "#4d70ed", fontWeight: "600", marginTop: "6px" }}>
                        {day.rainChance > 50 ? "☂ Carry an umbrella & expect wet conditions" : "☀ Excellent outdoor conditions anticipated"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB 3: FULL WEATHER MAP PAGE */}
          {activeTab === "weather_map" && (
            <div className="map-page">
              <div className="card world-map-card" style={{ minHeight: "550px" }}>
                <div className="world-map-heading">
                  <div>
                    <p>GLOBAL WEATHER MATRIX</p>
                    <h3>Interactive Weather Map — {displayedCity}</h3>
                  </div>
                  <button
                    style={{ background: "#ffffff20", color: "#fff", border: 0, padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: "600" }}
                    onClick={() => setActiveTab("overview")}
                  >
                    ← Close Fullscreen Map
                  </button>
                </div>
                <WorldWeatherMap selectedCity={displayedCity} onCitySelect={setCity} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MODAL 1: ALERTS MODAL */}
      {activeModal === "alerts" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <AlertTriangle style={{ color: "#f79009" }} /> Live Weather Alerts ({displayedCity})
              </h3>
              <button onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="alerts-list">
                <div className="alert-item warning">
                  <div className="alert-icon">
                    <Wind />
                  </div>
                  <div className="alert-content">
                    <h4>High Wind Caution</h4>
                    <p>Wind gusts reaching up to 28 km/h expected in elevated areas around {displayedCity}. Secure lightweight outdoor belongings.</p>
                    <div className="alert-meta">
                      <span>Severity: Moderate</span>
                      <span>•</span>
                      <span>Valid until 9:00 PM</span>
                    </div>
                  </div>
                </div>

                <div className="alert-item info">
                  <div className="alert-icon">
                    <Droplets />
                  </div>
                  <div className="alert-content">
                    <h4>Precipitation Advisory</h4>
                    <p>65% probability of localized afternoon rain showers. Outdoor sports and photography recommended before 4:00 PM.</p>
                    <div className="alert-meta">
                      <span>Severity: Advisory</span>
                      <span>•</span>
                      <span>Valid for Today</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  style={{ background: "#5275f3", color: "#fff", border: 0, padding: "10px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: "600" }}
                  onClick={() => setActiveModal(null)}
                >
                  Acknowledge & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SETTINGS MODAL */}
      {activeModal === "settings" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Settings style={{ color: "#5275f3" }} /> Nimbus Settings
              </h3>
              <button onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="settings-group">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <strong>Temperature Unit</strong>
                    <span>Choose between Celsius (°C) and Fahrenheit (°F)</span>
                  </div>
                  <div className="unit-toggle-btn">
                    <button className={unit === "C" ? "active" : ""} onClick={() => setUnit("C")}>
                      °C (Celsius)
                    </button>
                    <button className={unit === "F" ? "active" : ""} onClick={() => setUnit("F")}>
                      °F (Fahrenheit)
                    </button>
                  </div>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <strong>Default Location</strong>
                    <span>Initial city when launching the app</span>
                  </div>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{ border: "1px solid var(--line)", padding: "8px 12px", borderRadius: "10px", fontSize: "13px" }}
                  >
                    <option value="Islamabad">Islamabad, PK</option>
                    <option value="London">London, UK</option>
                    <option value="New York">New York, US</option>
                    <option value="Tokyo">Tokyo, JP</option>
                    <option value="Dubai">Dubai, AE</option>
                  </select>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <strong>Live Weather Alerts</strong>
                    <span>Receive popup warnings for extreme rain or wind</span>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: "18px", height: "18px" }} />
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <strong>Backend Status</strong>
                    <span>OpenWeather API & Gemini AI Service</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#12b76a", fontSize: "12px", fontWeight: "700" }}>
                    <ShieldCheck size={16} /> Operational
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  style={{ background: "#5275f3", color: "#fff", border: 0, padding: "10px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: "600" }}
                  onClick={() => setActiveModal(null)}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GOLDEN HOUR DETAILS MODAL */}
      {activeModal === "golden_hour" && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Sun style={{ color: "#f59e0b" }} /> Golden Hour & Solar Calculation
              </h3>
              <button onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="golden-arc">
                <Sunset size={32} />
                <strong>6:14 PM – 7:02 PM</strong>
                <span>Evening Golden Hour Window in {displayedCity}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                <div style={{ border: "1px solid var(--line)", padding: "12px", borderRadius: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>Sunrise</div>
                  <strong style={{ fontSize: "15px" }}>6:02 AM</strong>
                </div>
                <div style={{ border: "1px solid var(--line)", padding: "12px", borderRadius: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>Sunset</div>
                  <strong style={{ fontSize: "15px" }}>7:08 PM</strong>
                </div>
                <div style={{ border: "1px solid var(--line)", padding: "12px", borderRadius: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>Blue Hour</div>
                  <strong style={{ fontSize: "15px" }}>7:03 PM – 7:18 PM</strong>
                </div>
                <div style={{ border: "1px solid var(--line)", padding: "12px", borderRadius: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>Lighting Rating</div>
                  <strong style={{ fontSize: "15px", color: "#f59e0b" }}>9.4 / 10 (Optimal)</strong>
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  style={{ background: "#5275f3", color: "#fff", border: 0, padding: "10px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: "600" }}
                  onClick={() => setActiveModal(null)}
                >
                  Close Solar Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION ASSISTANT BUTTON */}
      <button className="chat-fab" onClick={() => setChat(true)}>
        <Bot />
        <span>Ask about the weather</span>
      </button>

      {/* AI ASSISTANT CHAT PANEL */}
      <ChatPanel
        city={displayedCity}
        open={chat}
        onClose={() => setChat(false)}
      />
    </main>
  );
}