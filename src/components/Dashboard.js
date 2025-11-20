// src/components/Dashboard.js
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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

const defaultThresholds = {
  tempHighWarning: 85,
  tempHighDanger: 95,
  tempLowDanger: 40,

  humLowDanger: 20,
  humLowWarning: 30,
  humHighWarning: 60,
  humHighDanger: 75,

  aqiUnhealthy: 150,
  aqiVeryUnhealthy: 200,
  aqiHazardous: 300,

  co2Elevated: 800,
  co2High: 1200,
  co2Dangerous: 5000,

  luxLow: 100,

  uvHigh: 6,
  uvExtreme: 8,
};

const loadThresholds = () => {
  if (typeof window === "undefined") return defaultThresholds;
  try {
    const saved = window.localStorage.getItem("iot-thresholds");
    return saved
      ? { ...defaultThresholds, ...JSON.parse(saved) }
      : defaultThresholds;
  } catch {
    return defaultThresholds;
  }
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
   ALERT ENGINE — minimal + category emoji, uses thresholds
-------------------------------------------------------------------*/
const getAlertsFromLatest = (latest) => {
  if (!latest) return [];

  const thresholds = loadThresholds();
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
    if (t > thresholds.tempHighDanger)
      alerts.push({
        key: "temp-heat",
        level: "danger",
        category: "Temperature",
        emoji: "🌡️",
        title: "Heat wave detected",
        message: "Temperature is dangerously high.",
        valueLabel: `${t.toFixed(1)} °F`,
      });
    else if (t > thresholds.tempHighWarning)
      alerts.push({
        key: "temp-high",
        level: "warning",
        category: "Temperature",
        emoji: "🌡️",
        title: "High temperature",
        message: "Temperature is above normal.",
        valueLabel: `${t.toFixed(1)} °F`,
      });
    else if (t < thresholds.tempLowDanger)
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
    if (h < thresholds.humLowDanger)
      alerts.push({
        key: "hum-very-low",
        level: "danger",
        category: "Humidity",
        emoji: "💧",
        title: "Very low humidity",
        message: "Air is extremely dry.",
        valueLabel: `${h.toFixed(1)} %`,
      });
    else if (h < thresholds.humLowWarning)
      alerts.push({
        key: "hum-low",
        level: "warning",
        category: "Humidity",
        emoji: "💧",
        title: "Low humidity",
        message: "Air is dry.",
        valueLabel: `${h.toFixed(1)} %`,
      });
    else if (h > thresholds.humHighDanger)
      alerts.push({
        key: "hum-high",
        level: "danger",
        category: "Humidity",
        emoji: "💧",
        title: "High humidity",
        message: "Humidity may cause mold.",
        valueLabel: `${h.toFixed(1)} %`,
      });
    else if (h > thresholds.humHighWarning)
      alerts.push({
        key: "hum-elevated",
        level: "warning",
        category: "Humidity",
        emoji: "💧",
        title: "Elevated humidity",
        message: "Humidity is above normal.",
        valueLabel: `${h.toFixed(1)} %`,
      });
  }

  // 🌫️ Air Quality
  if (aqi !== null) {
    if (aqi > thresholds.aqiHazardous)
      alerts.push({
        key: "aqi-hazardous",
        level: "danger",
        category: "Air Quality",
        emoji: "🌫️",
        title: "Hazardous air quality",
        message: "Extremely poor air.",
        valueLabel: `${aqi.toFixed(0)} AQI`,
      });
    else if (aqi > thresholds.aqiVeryUnhealthy)
      alerts.push({
        key: "aqi-very-unhealthy",
        level: "danger",
        category: "Air Quality",
        emoji: "🌫️",
        title: "Very unhealthy air quality",
        message: "Avoid exposure.",
        valueLabel: `${aqi.toFixed(0)} AQI`,
      });
    else if (aqi > thresholds.aqiUnhealthy)
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
    if (co2 > thresholds.co2Dangerous)
      alerts.push({
        key: "co2-danger",
        level: "danger",
        category: "CO₂",
        emoji: "🫁",
        title: "Dangerous CO₂ level",
        message: "Ventilate immediately.",
        valueLabel: `${co2.toFixed(1)} ppm`,
      });
    else if (co2 > thresholds.co2High)
      alerts.push({
        key: "co2-high",
        level: "warning",
        category: "CO₂",
        emoji: "🫁",
        title: "High CO₂ level",
        message: "Air is stuffy.",
        valueLabel: `${co2.toFixed(1)} ppm`,
      });
    else if (co2 > thresholds.co2Elevated)
      alerts.push({
        key: "co2-elevated",
        level: "info",
        category: "CO₂",
        emoji: "🫁",
        title: "Elevated CO₂",
        message: "CO₂ is slightly elevated.",
        valueLabel: `${co2.toFixed(1)} ppm`,
      });
  }

  // 💡 Light
  if (lux !== null) {
    if (lux < thresholds.luxLow)
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
    if (uv > thresholds.uvExtreme)
      alerts.push({
        key: "uv-extreme",
        level: "danger",
        category: "UV Index",
        emoji: "☀️",
        title: "Extreme UV",
        message: "Avoid sun exposure.",
        valueLabel: `${uv.toFixed(1)}`,
      });
    else if (uv > thresholds.uvHigh)
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
  const [darkMode, setDarkMode] = useState(false);
  const [readingLimit, setReadingLimit] = useState(30); // 30 or 100

  const alerts = getAlertsFromLatest(latest);

  const surfaceBg = darkMode ? "bg-slate-900" : "bg-white";
  const surfaceBorder = darkMode ? "border-slate-700" : "border-slate-100";
  const textMain = darkMode ? "text-slate-50" : "text-slate-900";
  const textSub = darkMode ? "text-slate-300" : "text-slate-500";
  const pageBg = darkMode ? "bg-slate-950" : "bg-slate-50";

  const fv = (v, d = 1) =>
    v == null ? "--" : Number(v).toFixed(d);

  // trend vs previous reading
  const getTrend = (key, threshold = 0.1) => {
    if (!history || history.length < 2) return null;
    const last = history[history.length - 1]?.[key];
    const prev = history[history.length - 2]?.[key];
    if (last == null || prev == null) return null;

    const diff = Number(last) - Number(prev);
    if (Math.abs(diff) < threshold) {
      return { symbol: "–", className: textSub, diff: 0 };
    }
    if (diff > 0) {
      return {
        symbol: "▲",
        className: "text-emerald-500",
        diff,
      };
    }
    return {
      symbol: "▼",
      className: "text-rose-500",
      diff,
    };
  };

  // sensor health summary based on alerts
  const sensorHealth = (() => {
    const hasDanger = alerts.some((a) => a.level === "danger");
    const hasWarning = alerts.some((a) => a.level === "warning");

    if (hasDanger) {
      return {
        label: "Critical",
        emoji: "🚨",
        color: "text-rose-500",
        bg: darkMode ? "bg-rose-950/40" : "bg-rose-50",
        desc: "One or more readings are in a dangerous range.",
      };
    }
    if (hasWarning) {
      return {
        label: "Watch",
        emoji: "⚠️",
        color: "text-amber-500",
        bg: darkMode ? "bg-amber-950/40" : "bg-amber-50",
        desc: "Some readings are elevated—keep an eye on conditions.",
      };
    }
    return {
      label: "Good",
      emoji: "✅",
      color: "text-emerald-500",
      bg: darkMode ? "bg-emerald-950/40" : "bg-emerald-50",
      desc: "All readings are within normal ranges.",
    };
  })();

  // FETCH DATA
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(
        `${API_BASE}?deviceId=Rpi_grp2&limit=${readingLimit}`
      );

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const readings = Array.isArray(data) ? data : [];

      if (readings.length === 0) {
        setLatest(initialLatest);
        setHistory([]);
        setPredictedSeries([]);
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
  }, [readingLimit]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className={`min-h-screen ${pageBg} ${textMain}`}>
      <div className="max-w-6xl mx-auto p-4 space-y-6">

        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <span>📊 IoT Dashboard</span>
            </h1>
            <p className={`text-sm ${textSub}`}>
              Device: <span className="font-mono">Rpi_grp2</span>
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* reading window toggle */}
            <div
              className={`${surfaceBg} ${surfaceBorder} border rounded-full px-2 py-1 flex items-center gap-1`}
            >
              <span className={textSub}>Window:</span>
              {[30, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setReadingLimit(n)}
                  className={`px-2 py-0.5 rounded-full ${
                    readingLimit === n
                      ? darkMode
                        ? "bg-slate-700 text-slate-50"
                        : "bg-slate-900 text-slate-50"
                      : "text-slate-500"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* dark mode toggle */}
            <button
              onClick={() => setDarkMode((d) => !d)}
              className={`${surfaceBg} ${surfaceBorder} border rounded-full px-3 py-1 flex items-center gap-1`}
            >
              <span>{darkMode ? "☀️" : "🌙"}</span>
              <span className="hidden sm:inline text-xs">
                {darkMode ? "Light mode" : "Dark mode"}
              </span>
            </button>

            {/* live / error badge */}
            {error ? (
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-700">
                {error}
              </span>
            ) : loading ? (
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                Fetching…
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                🟢 Live · 4s refresh
              </span>
            )}
          </div>
        </header>

        {/* ALERTS */}
        <section className="space-y-2">
          {alerts.length > 0 ? (
            alerts.map((a) => (
              <motion.div
                key={a.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AlertCard
                  level={a.level}
                  title={`${a.emoji} ${a.title}`}
                  message={a.message}
                  category={a.category}
                  valueLabel={a.valueLabel}
                />
              </motion.div>
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

        {/* SENSOR HEALTH SUMMARY */}
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`${sensorHealth.bg} rounded-2xl px-4 py-3 flex items-center justify-between`}
        >
          <div>
            <p className="text-xs uppercase tracking-wide font-medium text-slate-500">
              Sensor Health
            </p>
            <p className="mt-1 text-lg font-semibold flex items-center gap-2">
              <span className={sensorHealth.color}>
                {sensorHealth.emoji}
              </span>
              <span>{sensorHealth.label}</span>
            </p>
            <p className={`text-xs mt-1 ${textSub}`}>
              {sensorHealth.desc}
            </p>
          </div>
        </motion.section>

        {/* SENSOR CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SensorCard
            darkMode={darkMode}
            label="🌡️ Temperature"
            value={`${fv(latest.temperature)} °F`}
            trend={getTrend("temperature")}
          />
          <SensorCard
            darkMode={darkMode}
            label="💧 Humidity"
            value={`${fv(latest.humidity)} %`}
            trend={getTrend("humidity")}
          />
          <SensorCard
            darkMode={darkMode}
            label="🌫️ Air Quality"
            value={`${fv(latest.airQuality, 0)} AQI`}
            trend={getTrend("airQuality")}
          />
          <SensorCard
            darkMode={darkMode}
            label="💡 Luminosity"
            value={`${fv(latest.luminosity, 0)} lx`}
            trend={getTrend("luminosity")}
          />
          <SensorCard
            darkMode={darkMode}
            label="🫁 CO₂"
            value={`${fv(latest.co2, 1)} ppm`}
            trend={getTrend("co2")}
          />
          <SensorCard
            darkMode={darkMode}
            label="☀️ UV Index"
            value={`${fv(latest.uvIndex, 1)}`}
            trend={getTrend("uvIndex")}
          />
        </section>

        {/* CHARTS */}
        <section className="grid gap-6 lg:grid-cols-2">
          <ChartBlock
            title="🌡️ Temperature & 💧 Humidity"
            darkMode={darkMode}
          >
            <SensorChart
              data={history}
              lines={[
                { key: "temperature", name: "Temperature (°F)" },
                { key: "humidity", name: "Humidity (%)" },
              ]}
            />
          </ChartBlock>

          <ChartBlock
            title="🌫️ AQI · 🫁 CO₂ · 💡 Luminosity"
            darkMode={darkMode}
          >
            <SensorChart
              data={history}
              lines={[
                { key: "airQuality", name: "Air Quality (AQI)" },
                { key: "co2", name: "CO₂ (ppm)" },
                { key: "luminosity", name: "Luminosity (lx)" },
              ]}
            />
          </ChartBlock>

          <ChartBlock
            title="📈 Temperature: Actual vs Predicted"
            full
            darkMode={darkMode}
          >
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

const SensorCard = ({ label, value, trend, darkMode }) => {
  const surfaceBg = darkMode ? "bg-slate-900" : "bg-white";
  const surfaceBorder = darkMode ? "border-slate-700" : "border-slate-100";
  const textSub = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`${surfaceBg} ${surfaceBorder} rounded-2xl p-4 border shadow-sm flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-xs uppercase font-medium ${textSub}`}>
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        {trend && (
          <div className="text-right text-xs">
            <p className={`font-semibold ${trend.className}`}>
              {trend.symbol} {Math.abs(trend.diff).toFixed(1)}
            </p>
            <p className={textSub}>vs last reading</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const ChartBlock = ({ title, children, full, darkMode }) => {
  const surfaceBg = darkMode ? "bg-slate-900" : "bg-white";
  const surfaceBorder = darkMode ? "border-slate-700" : "border-slate-100";
  const titleText = darkMode ? "text-slate-100" : "text-slate-700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`${surfaceBg} ${surfaceBorder} rounded-2xl p-4 border shadow-sm ${
        full ? "lg:col-span-2" : ""
      }`}
    >
      <h2 className={`text-sm font-semibold mb-2 ${titleText}`}>
        {title}
      </h2>
      {children}
    </motion.div>
  );
};

export default Dashboard;
