"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => <div className="globe-loading">Loading world map...</div>,
}) as any;

type City = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  temperature: number;
  color: string;
};

type WorldWeatherMapProps = {
  selectedCity: string;
  onCitySelect: (city: string) => void;
};

const cities: City[] = [
  { name: "Vancouver", country: "CA", lat: 49.28, lng: -123.12, temperature: 16, color: "#78a7ff" },
  { name: "New York", country: "US", lat: 40.71, lng: -74.01, temperature: 24, color: "#ffd166" },
  { name: "Mexico City", country: "MX", lat: 19.43, lng: -99.13, temperature: 21, color: "#ffd166" },
  { name: "Sao Paulo", country: "BR", lat: -23.55, lng: -46.63, temperature: 25, color: "#ff9f68" },
  { name: "London", country: "GB", lat: 51.51, lng: -0.13, temperature: 17, color: "#78a7ff" },
  { name: "Cairo", country: "EG", lat: 30.04, lng: 31.24, temperature: 34, color: "#ff9f68" },
  { name: "Lagos", country: "NG", lat: 6.52, lng: 3.38, temperature: 29, color: "#ff9f68" },
  { name: "Cape Town", country: "ZA", lat: -33.92, lng: 18.42, temperature: 18, color: "#78a7ff" },
  { name: "Moscow", country: "RU", lat: 55.76, lng: 37.62, temperature: 13, color: "#78a7ff" },
  { name: "Dubai", country: "AE", lat: 25.2, lng: 55.27, temperature: 38, color: "#ff9f68" },
  { name: "Islamabad", country: "PK", lat: 33.69, lng: 73.04, temperature: 27, color: "#ffd166" },
  { name: "Mumbai", country: "IN", lat: 19.08, lng: 72.88, temperature: 30, color: "#ff9f68" },
  { name: "Singapore", country: "SG", lat: 1.35, lng: 103.82, temperature: 30, color: "#ff9f68" },
  { name: "Tokyo", country: "JP", lat: 35.68, lng: 139.69, temperature: 26, color: "#ffd166" },
  { name: "Sydney", country: "AU", lat: -33.87, lng: 151.21, temperature: 19, color: "#78a7ff" },
];

function distanceBetween(first: City, lat: number, lng: number) {
  const latDistance = first.lat - lat;
  const lngDistance = Math.min(
    Math.abs(first.lng - lng),
    360 - Math.abs(first.lng - lng),
  );
  return latDistance * latDistance + lngDistance * lngDistance;
}

function normalizeCityName(city: string) {
  return city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function WorldWeatherMap({
  selectedCity,
  onCitySelect,
}: WorldWeatherMapProps) {
  const [zoom, setZoom] = useState(1.65);
  const [globeInstance, setGlobeInstance] = useState<any>(null);
  const points = useMemo(
    () =>
      cities.map((city) => ({
        ...city,
        radius: normalizeCityName(city.name) === normalizeCityName(selectedCity) ? 0.72 : 0.42,
      })),
    [selectedCity],
  );

  useEffect(() => {
    const controls = globeInstance?.controls();

    if (!controls) return;

    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.enablePan = false;
    controls.minDistance = 125;
    controls.maxDistance = 300;
    controls.dampingFactor = 0.08;
    globeInstance.pointOfView({ altitude: zoom }, 450);
  }, [globeInstance, zoom]);

  function selectNearestCity(lat: number, lng: number) {
    const nearest = cities.reduce((current, city) =>
      distanceBetween(city, lat, lng) < distanceBetween(current, lat, lng)
        ? city
        : current,
    );
    onCitySelect(nearest.name);
  }

  return (
    <div className="world-map-wrap">
      <div className="world-map-heading">
        <div>
          <p>WORLD WEATHER</p>
          <h3>Explore the globe</h3>
        </div>
        <span className="map-live"><i /> Live</span>
      </div>

      <div className="globe-stage">
        <Globe
          width={560}
          height={276}
          backgroundColor="rgba(0, 0, 0, 0)"
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#73a9ff"
          atmosphereAltitude={0.18}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.025}
          pointRadius="radius"
          pointLabel={(point: City) => `${point.name}, ${point.country}`}
          onPointClick={(point: City) => onCitySelect(point.name)}
          onGlobeClick={({ lat, lng }: { lat: number; lng: number }) => selectNearestCity(lat, lng)}
          onGlobeReady={(globe: any) => setGlobeInstance(globe)}
          enablePointerInteraction
          showAtmosphere
          animateIn
        />
        <div className="globe-hint">Drag to rotate · click a city for details</div>
        <div className="globe-zoom" aria-label="Map zoom controls">
          <button onClick={() => setZoom((value) => Math.min(value + 0.18, 2.4))} aria-label="Zoom in">+</button>
          <button onClick={() => setZoom((value) => Math.max(value - 0.18, 1.1))} aria-label="Zoom out">−</button>
        </div>
      </div>

      <div className="map-selection">
        <span className="map-pin-dot" />
        <div>
          <strong>{selectedCity}</strong>
          <span>Click any city marker to update the dashboard</span>
        </div>
        <span className="map-temperature">
          {cities.find((city) => normalizeCityName(city.name) === normalizeCityName(selectedCity))?.temperature ?? "--"}°
        </span>
      </div>
    </div>
  );
}
