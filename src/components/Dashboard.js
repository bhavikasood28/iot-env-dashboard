// src/components/Dashboard.js
import React, { useState, useEffect, useCallback } from "react";
import SensorChart from "./SensorChart";
import AlertCard from "./AlertCard";

const API_BASE =
  "https://s0gokgmff9.execute-api.us-east-2.amazonaws.com/latest";

const initialLatest = {
  temperature: null,
  humidity: null,
  airQuality: null,
  luminosity: null,
  co2: null,
  uvIndex: null,
};

// TEMPORARY: predicted temperature values
const generatePredictedSeries = (history) => {
  return history.map((d) => ({
    ts: d.ts,
    actual: d.temperature ?? null,
    predicted:
      d.temperature != null
        ? d.temperature + (Math.random() * 4 - 2)
        : null,
  }));
};

/* ------------------------------------------------------------------
   ALERT ENGINE — minimal + category emoji
-------------------------------------------------------------------*/
const getAlertsFromLatest = (latest) => {
  if (!latest) return [];

  const alerts = [];
  const toNum = (v) =>
    v === null || v === undefined || Number.isNaN(Number(v))
      ? null
      : Number(v);

  const t = toNum(latest.temperature);
  const h = toNum(latest.humidity);
  const aqi = toNum(latest.airQuality);
  const lux = toNum(latest.luminosity);
  const co2 = toNum(latest.co2);
  const uv = toNum(latest.uvIndex);

  // 🌡️ Temperature
  if (t !== null) {
    if (t > 95)
      alerts.push({
        key: "temp-heat",
        level: "danger",
        category: "Temperature",
        emoji: "🌡️",
        title: "Heat wave detected",
        message: "Temperature is dangerously high.",
        valueLabel: `${t.toFixed(1)} °F`,
      });
    else if (t > 85)
      alerts.push({
        key: "temp-high",
        level: "warning",
        category: "Temperature",
        emoji: "🌡️",
        title: "High temperature",
        message: "Temperature is above normal.",
        valueLabel: `${t.toFixed(1)} °F`,
      });
    else if (t < 40)
      alerts.push({
        key: "temp-low",
        level: "danger",
        category: "Temperature",
        emoji: "🌡️",
        title: "Low temperature",
        message: "Temperature is too low.",
        valueLabel: `${t.toFixed(1)} °F`,
      });
  }

  // 💧 Humidity
  if (h !== null) {
    if (h < 20)
      alerts.push({
        key: "hum-very-low",
        level: "danger",
        category: "Humidity",
        emoji: "💧",
        title: "Very low humidity",
        message: "Air is extremely dry.",
        valueLabel: `${h.toFixed(1)} %`,
      });
    else if (h < 30)
      alerts.push({
        key: "hum-low",
        level: "warning",
        category: "Humidity",
        emoji: "💧",
        title: "Low humidity",
        message: "Air is dry.",
        valueLabel: `${h.toFixed(1)} %`,
      });
    else if (h > 75)
      alerts.push({
        key: "hum-high",
        level: "danger",
        category: "Humidity",
        emoji: "💧",
        title: "High humidity",
        message: "Humidity may cause mold.",
        valueLabel: `${h.toFixed(1)} %`,
      });
  }

  // 🌫️ Air Quality
  if (aqi !== null) {
    if (aqi > 300)
      alerts.push({
        key: "aqi-hazardous",
        level: "danger",
        category: "Air Quality",
        emoji: "🌫️",
        title: "Hazardous air quality",
        message: "Extremely poor air.",
        valueLabel: `${aqi.toFixed(0)} AQI`,
      });
    else if (aqi > 200)
      alerts.push({
        key: "aqi-very-unhealthy",
        level: "danger",
        category: "Air Quality",
        emoji: "🌫️",
        title: "Very unhealthy air quality",
        message: "Avoid exposure.",
        valueLabel: `${aqi.toFixed(0)} AQI`,
      });
    else if (aqi > 150)
      alerts.push({
        key: "aqi-unhealthy",
        level: "warning",
        category: "Air Quality",
        emoji: "🌫️",
        title: "Unhealthy air quality",
        message: "Air quality may affect health.",
        valueLabel: `${aqi.toFixed(0)} AQI`,
      });
  }

  // 🫁 CO₂
  if (co2 !== null) {
    if (co2 > 5000)
      alerts.push({
        key: "co2-danger",
        level: "danger",
        category: "CO₂",
        emoji: "🫁",
        title: "Dangerous CO₂ level",
        message: "Ventilate immediately.",
        valueLabel: `${co2.toFixed(1)} ppm`,
      });
    else if (co2 > 1200)
      alerts.push({
        key: "co2-high",
        level: "warning",
        category: "CO₂",
        emoji: "🫁",
        title: "High CO₂ level",
        message: "Air is stuffy.",
        valueLabel: `${co2.toFixed(1)} ppm`,
      });
  }

  // 💡 Light
  if (lux !== null) {
    if (lux < 100)
      alerts.push({
        key: "lux-low",
        level: "info",
        category: "Luminosity",
        emoji: "💡",
        title: "Low light level",
        message: "Environment is dim.",
        valueLabel: `${lux.toFixed(0)} lx`,
      });
  }

  // ☀️ UV
  if (uv !== null) {
    if (uv > 8)
      alerts.push({
        key: "uv-extreme",
        level: "danger",
        category: "UV Index",
        emoji: "☀️",
        title: "Extreme UV",
        message: "Avoid sun exposure.",
        valueLabel: `${uv.toFixed(1)}`,
      });
    else if (uv > 6)
      alerts.push({
        key: "uv-high",
        level: "warning",
        category: "UV Index",
        emoji: "☀️",
        title: "High UV",
        message: "Wear sun protection.",
        valueLabel: `${uv.toFixed(1)}`,
      });
  }

  return alerts;
};

/* ------------------------------------------------------------------ */


const Dashboard = () => {
  const [latest, setLatest] = useState(initialLatest);
  const [history, setHistory] = useState([]);
  const [predictedSeries, setPredictedSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const alerts = getAlertsFromLatest(latest);

  // FETCH DATA
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(
        `${API_BASE}?deviceId=Rpi_grp2&limit=30`
      );

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const readings = Array.isArray(data) ? data : [];

      if (readings.length === 0) {
        setLatest(initialLatest);
        setHistory([]);
        setLoading(false);
        return;
      }

      readings.sort((a, b) => new Date(a.ts) - new Date(b.ts));

      setHistory(readings);
      setPredictedSeries(generatePredictedSeries(readings));

      const last = readings[readings.length - 1];

      setLatest({
        temperature: last.temperature,
        humidity: last.humidity,
        airQuality: last.airQuality,
        luminosity: last.luminosity,
        co2: last.co2,
        uvIndex: last.uvIndex,
      });

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fv = (v, d = 1) =>
    v == null ? "--" : Number(v).toFixed(d);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto p-4 space-y-6">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">📊 IoT Dashboard</h1>
            <p className="text-sm text-slate-500">
              Device: <span className="font-mono">Rpi_grp2</span>
            </p>
          </div>

          <div className="flex gap-2 text-xs">
            {loading ? (
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                Fetching…
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                🟢 Live · 4s refresh
              </span>
            )}

            {error && (
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-600">
                {error}
              </span>
            )}
          </div>
        </header>

        {/* ALERTS */}
        <section className="space-y-2">
          {alerts.length > 0 ? (
            alerts.map((a) => (
              <AlertCard
                key={a.key}
                level={a.level}
                title={`${a.emoji} ${a.title}`}
                message={a.message}
                category={a.category}
                valueLabel={a.valueLabel}
              />
            ))
          ) : (
            <AlertCard
              level="info"
              title="All readings normal"
              message="No abnormal sensor readings detected."
              category="Status"
            />
          )}
        </section>

        {/* SENSOR CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SensorCard label="🌡️ Temperature" value={`${fv(latest.temperature)} °F`} />
          <SensorCard label="💧 Humidity" value={`${fv(latest.humidity)} %`} />
          <SensorCard label="🌫️ Air Quality" value={`${fv(latest.airQuality, 0)} AQI`} />
          <SensorCard label="💡 Luminosity" value={`${fv(latest.luminosity, 0)} lx`} />
          <SensorCard label="🫁 CO₂" value={`${fv(latest.co2, 1)} ppm`} />
          <SensorCard label="☀️ UV Index" value={`${fv(latest.uvIndex, 1)}`} />
        </section>

        {/* CHARTS */}
        <section className="grid gap-6 lg:grid-cols-2">
          <ChartBlock title="🌡️ Temperature & 💧 Humidity">
            <SensorChart
              data={history}
              lines={[
                { key: "temperature", name: "Temperature (°F)" },
                { key: "humidity", name: "Humidity (%)" },
              ]}
            />
          </ChartBlock>

          <ChartBlock title="🌫️ AQI · 🫁 CO₂ · 💡 Luminosity">
            <SensorChart
              data={history}
              lines={[
                { key: "airQuality", name: "Air Quality (AQI)" },
                { key: "co2", name: "CO₂ (ppm)" },
                { key: "luminosity", name: "Luminosity (lx)" },
              ]}
            />
          </ChartBlock>

          <ChartBlock title="📈 Temperature: Actual vs Predicted" full>
            <SensorChart
              data={predictedSeries}
              lines={[
                { key: "actual", name: "Actual Temperature (°F)" },
                { key: "predicted", name: "Predicted Temperature (°F)" },
              ]}
            />
          </ChartBlock>
        </section>
      </div>
    </div>
  );
};

/* ----------------------------------------- */

const SensorCard = ({ label, value }) => (
  <div className="bg-white rounded-2xl p-4 border shadow-sm">
    <p className="text-xs text-slate-500 uppercase font-medium">
      {label}
    </p>
    <p className="mt-2 text-2xl font-semibold">{value}</p>
  </div>
);

const ChartBlock = ({ title, children, full }) => (
  <div
    className={`bg-white rounded-2xl p-4 border shadow-sm ${
      full ? "lg:col-span-2" : ""
    }`}
  >
    <h2 className="text-sm font-semibold text-slate-700 mb-2">
      {title}
    </h2>
    {children}
  </div>
);

export default Dashboard;
