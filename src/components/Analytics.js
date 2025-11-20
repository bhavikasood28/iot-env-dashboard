// src/components/Analytics.js
import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
  } from "react";
  import { motion } from "framer-motion";
  import SensorChart from "./SensorChart";
  
  const API_BASE =
    "https://s0gokgmff9.execute-api.us-east-2.amazonaws.com/latest";
  
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
  
  const saveThresholds = (t) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("iot-thresholds", JSON.stringify(t));
  };
  
  const sensors = [
    { key: "temperature", label: "Temperature", emoji: "🌡️", unit: "°F" },
    { key: "humidity", label: "Humidity", emoji: "💧", unit: "%" },
    { key: "airQuality", label: "Air Quality", emoji: "🌫️", unit: "AQI" },
    { key: "co2", label: "CO₂", emoji: "🫁", unit: "ppm" },
    { key: "luminosity", label: "Luminosity", emoji: "💡", unit: "lx" },
    { key: "uvIndex", label: "UV Index", emoji: "☀️", unit: "" },
  ];
  
  const rangeOptions = [
    { id: "all", label: "All" },
    { id: "1h", label: "1h" },
    { id: "24h", label: "24h" },
    { id: "7d", label: "7d" },
    { id: "30d", label: "30d" },
  ];
  
  const msMap = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  
  const fv = (v, d = 1) =>
    v == null ? "--" : Number(v).toFixed(d);
  
  // Generate ML-style prediction series for a given sensor
  const generatePredictionSeries = (history, key) => {
    if (!history || history.length < 3) return [];
  
    // Take the last N points
    const base = history.slice(-20);
    if (base.length < 3) return [];
  
    const numeric = base
      .map((d) => ({
        ts: d.ts,
        val:
          d[key] !== null && d[key] !== undefined
            ? Number(d[key])
            : null,
      }))
      .filter((d) => d.val !== null);
  
    if (numeric.length < 3) return [];
  
    const first = numeric[0];
    const last = numeric[numeric.length - 1];
    const steps = numeric.length - 1;
    const slope = (last.val - first.val) / Math.max(steps, 1);
  
    // Slight trend + small noise
    return numeric.map((p, idx) => {
      const noise = (Math.random() - 0.5) * (Math.abs(slope) || 1) * 0.5;
      const drift = slope * (idx / numeric.length);
      return {
        ts: p.ts,
        actual: p.val,
        predicted: p.val + drift + noise,
      };
    });
  };
  
  const Analytics = () => {
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState("all");
    const [thresholds, setThresholds] = useState(defaultThresholds);
    const [showThresholds, setShowThresholds] = useState(false);
  
    const [darkMode, setDarkMode] = useState(false);
    const [compareLeft, setCompareLeft] = useState("temperature");
    const [compareRight, setCompareRight] = useState("humidity");
    const [predictionSensor, setPredictionSensor] =
      useState("temperature");
  
    // colors based on dark/light
    const pageBg = darkMode ? "bg-slate-950" : "bg-slate-50";
    const textMain = darkMode ? "text-slate-50" : "text-slate-900";
    const textSub = darkMode ? "text-slate-400" : "text-slate-500";
    const surfaceBg = darkMode ? "bg-slate-900" : "bg-white";
    const surfaceBorder = darkMode ? "border-slate-700" : "border-slate-200";
  
    // load thresholds on mount
    useEffect(() => {
      setThresholds(loadThresholds());
    }, []);
  
    // persist thresholds
    useEffect(() => {
      saveThresholds(thresholds);
    }, [thresholds]);
  
    const fetchData = useCallback(async () => {
      try {
        setError(null);
        const res = await fetch(
          `${API_BASE}?deviceId=Rpi_grp2&limit=200`
        );
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        const readings = Array.isArray(data) ? data : [];
        readings.sort((a, b) => new Date(a.ts) - new Date(b.ts));
        setHistory(readings);
      } catch (err) {
        setError(err.message);
      }
    }, []);
  
    useEffect(() => {
      fetchData();
    }, [fetchData]);
  
    // filter by time range
    const filtered = useMemo(() => {
      if (!history.length || timeRange === "all") return history;
      const lastTs = new Date(history[history.length - 1].ts).getTime();
      const cutoff = lastTs - msMap[timeRange];
      return history.filter(
        (d) => new Date(d.ts).getTime() >= cutoff
      );
    }, [history, timeRange]);
  
    const calcStats = (key) => {
      const vals = filtered
        .map((d) => d[key])
        .filter((v) => v !== null && v !== undefined);
      if (!vals.length) return null;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const avg =
        vals.reduce((sum, v) => sum + Number(v), 0) / vals.length;
      const latest = vals[vals.length - 1];
      return { min, max, avg, latest };
    };
  
    const getTrend = (key) => {
      if (filtered.length < 2) return "stable";
      const first = Number(filtered[0][key]);
      const last = Number(filtered[filtered.length - 1][key]);
      if (isNaN(first) || isNaN(last)) return "stable";
      const diff = last - first;
      const rel = diff / Math.max(Math.abs(first), 1);
      if (rel > 0.1) return "rising";
      if (rel < -0.1) return "falling";
      return "stable";
    };
  
    // prediction data for selected sensor
    const predictionSeries = useMemo(
      () => generatePredictionSeries(filtered, predictionSensor),
      [filtered, predictionSensor]
    );
  
    // CSV export
    const handleExportCSV = () => {
      if (!filtered.length) return;
      const headers = [
        "ts",
        "temperature",
        "humidity",
        "airQuality",
        "co2",
        "luminosity",
        "uvIndex",
      ];
      const rows = filtered.map((r) =>
        headers
          .map((h) =>
            r[h] === null || r[h] === undefined ? "" : String(r[h])
          )
          .join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "iot_analytics.csv";
      a.click();
      URL.revokeObjectURL(url);
    };
  
    // PDF-like export (opens printable summary window)
    const handleExportPDF = () => {
      const statsBySensor = sensors.map((s) => ({
        sensor: s,
        stats: calcStats(s.key),
      }));
  
      const win = window.open("", "_blank");
      if (!win) return;
  
      const rowsHtml = statsBySensor
        .map(({ sensor, stats }) => {
          if (!stats) return "";
          return `<tr>
            <td style="padding:4px 8px;border:1px solid #ddd;">${sensor.emoji} ${
            sensor.label
          }</td>
            <td style="padding:4px 8px;border:1px solid #ddd;">${fv(
              stats.latest
            )} ${sensor.unit}</td>
            <td style="padding:4px 8px;border:1px solid #ddd;">${fv(
              stats.min
            )}</td>
            <td style="padding:4px 8px;border:1px solid #ddd;">${fv(
              stats.max
            )}</td>
            <td style="padding:4px 8px;border:1px solid #ddd;">${fv(
              stats.avg
            )}</td>
          </tr>`;
        })
        .join("");
  
      win.document.write(`
        <!doctype html>
        <html>
        <head>
          <title>IoT Analytics Report</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px;">
          <h1 style="font-size: 20px; margin-bottom: 4px;">IoT Analytics Report</h1>
          <p style="color:#555; margin-top:0;">Device: Rpi_grp2</p>
  
          <h2 style="font-size: 16px; margin-top:16px;">Summary Statistics</h2>
          <table style="border-collapse: collapse; font-size: 12px; margin-top: 8px;">
            <thead>
              <tr>
                <th style="padding:4px 8px;border:1px solid #ddd;">Sensor</th>
                <th style="padding:4px 8px;border:1px solid #ddd;">Latest</th>
                <th style="padding:4px 8px;border:1px solid #ddd;">Min</th>
                <th style="padding:4px 8px;border:1px solid #ddd;">Max</th>
                <th style="padding:4px 8px;border:1px solid #ddd;">Avg</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
  
          <p style="margin-top:24px; font-size:11px; color:#777;">
            Generated from IoT Analytics Dashboard.
          </p>
        </body>
        </html>
      `);
      win.document.close();
      win.focus();
      win.print();
    };
  
    const leftSensorMeta = sensors.find((s) => s.key === compareLeft);
    const rightSensorMeta = sensors.find((s) => s.key === compareRight);
    const predictionSensorMeta = sensors.find(
      (s) => s.key === predictionSensor
    );
  
    return (
      <div className={`min-h-screen ${pageBg} ${textMain}`}>
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          {/* header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <span>📈 Advanced Analytics</span>
              </h1>
              <p className={`text-sm ${textSub}`}>
                Deep insights for{" "}
                <span className="font-mono">Rpi_grp2</span>
              </p>
            </div>
  
            <div className="flex items-center gap-3 text-xs">
              {/* time range */}
              <div
                className={`${surfaceBg} ${surfaceBorder} border rounded-full px-2 py-1 flex items-center gap-1`}
              >
                <span className={textSub}>Range:</span>
                {rangeOptions.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setTimeRange(r.id)}
                    className={`px-2 py-0.5 rounded-full ${
                      timeRange === r.id
                        ? "bg-slate-900 text-slate-50"
                        : "text-slate-400"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
  
              {/* dark mode */}
              <button
                onClick={() => setDarkMode((d) => !d)}
                className={`${surfaceBg} ${surfaceBorder} border rounded-full px-3 py-1 flex items-center gap-1`}
              >
                <span>{darkMode ? "☀️" : "🌙"}</span>
                <span className="hidden sm:inline">
                  {darkMode ? "Light mode" : "Dark mode"}
                </span>
              </button>
  
              {/* thresholds */}
              <button
                onClick={() => setShowThresholds(true)}
                className={`${surfaceBg} ${surfaceBorder} border rounded-full px-3 py-1`}
              >
                ⚙️ Thresholds
              </button>
  
              {/* export */}
              <button
                onClick={handleExportCSV}
                className={`${surfaceBg} ${surfaceBorder} border rounded-full px-3 py-1`}
              >
                📤 CSV
              </button>
              <button
                onClick={handleExportPDF}
                className={`${surfaceBg} ${surfaceBorder} border rounded-full px-3 py-1`}
              >
                🖨️ PDF
              </button>
            </div>
          </header>
  
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-2 rounded-xl">
              Error loading analytics: {error}
            </div>
          )}
  
          {/* stats cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sensors.map((s) => {
              const stats = calcStats(s.key);
              const trend = getTrend(s.key);
              if (!stats) return null;
  
              const trendLabel =
                trend === "rising"
                  ? "↗ rising"
                  : trend === "falling"
                  ? "↘ falling"
                  : "→ stable";
  
              const trendColor =
                trend === "rising"
                  ? "text-emerald-400"
                  : trend === "falling"
                  ? "text-rose-400"
                  : textSub;
  
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`${surfaceBg} ${surfaceBorder} border rounded-2xl p-4 shadow-sm`}
                >
                  <p className={`text-xs uppercase font-medium ${textSub}`}>
                    {s.emoji} {s.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    {fv(
                      stats.latest,
                      s.key === "airQuality" ? 0 : 1
                    )}{" "}
                    {s.unit}
                  </p>
                  <p className={`mt-1 text-xs ${textSub}`}>
                    Min {fv(stats.min)} · Max {fv(stats.max)} · Avg{" "}
                    {fv(stats.avg)}
                  </p>
                  <p className={`mt-1 text-xs ${trendColor}`}>
                    Trend: {trendLabel}
                  </p>
                </motion.div>
              );
            })}
          </section>
  
          {/* comparison + co2/lux */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* comparison selector + chart */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`${surfaceBg} ${surfaceBorder} border rounded-2xl p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <h2 className="text-sm font-semibold">
                  ⚖️ Compare sensors side-by-side
                </h2>
                <div className="flex gap-2 text-xs">
                  <select
                    value={compareLeft}
                    onChange={(e) => setCompareLeft(e.target.value)}
                    className={`border rounded px-2 py-1 bg-transparent ${surfaceBorder}`}
                  >
                    {sensors.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.emoji} {s.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={compareRight}
                    onChange={(e) => setCompareRight(e.target.value)}
                    className={`border rounded px-2 py-1 bg-transparent ${surfaceBorder}`}
                  >
                    {sensors.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.emoji} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
  
              <SensorChart
                data={filtered}
                lines={[
                  leftSensorMeta && {
                    key: leftSensorMeta.key,
                    name: `${leftSensorMeta.label} (${leftSensorMeta.unit})`,
                  },
                  rightSensorMeta && {
                    key: rightSensorMeta.key,
                    name: `${rightSensorMeta.label} (${rightSensorMeta.unit})`,
                  },
                ].filter(Boolean)}
              />
            </motion.div>
  
            {/* CO2 + Luminosity chart */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`${surfaceBg} ${surfaceBorder} border rounded-2xl p-4 shadow-sm`}
            >
              <h2 className="text-sm font-semibold mb-2">
                🫁 CO₂ & 💡 Luminosity
              </h2>
              <SensorChart
                data={filtered}
                lines={[
                  { key: "co2", name: "CO₂ (ppm)" },
                  { key: "luminosity", name: "Luminosity (lx)" },
                ]}
              />
            </motion.div>
          </section>
  
          {/* prediction chart */}
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`${surfaceBg} ${surfaceBorder} border rounded-2xl p-4 shadow-sm`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-sm font-semibold">
                🤖 ML-style predictions ({predictionSensorMeta?.emoji}{" "}
                {predictionSensorMeta?.label})
              </h2>
              <select
                value={predictionSensor}
                onChange={(e) =>
                  setPredictionSensor(e.target.value)
                }
                className={`border rounded px-2 py-1 bg-transparent text-xs ${surfaceBorder}`}
              >
                {sensors.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </div>
            <p className={`text-xs mb-3 ${textSub}`}>
              This chart uses the recent trend + small noise to create a
              forward-looking predicted curve. Later you can swap this
              with a real ML API.
            </p>
  
            {predictionSeries.length ? (
              <SensorChart
                data={predictionSeries}
                lines={[
                  { key: "actual", name: "Actual" },
                  { key: "predicted", name: "Predicted" },
                ]}
              />
            ) : (
              <p className={`text-xs ${textSub}`}>
                Not enough data yet to generate predictions.
              </p>
            )}
          </motion.section>
        </div>
  
        {/* Threshold editor drawer */}
        {showThresholds && (
          <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
            <div className="w-80 bg-white h-full p-4 overflow-y-auto shadow-xl">
              <h2 className="text-lg font-semibold mb-1">
                ⚙️ Alert Thresholds
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                These values control alerts on the main Dashboard.
              </p>
  
              {Object.entries(thresholds).map(([key, value]) => (
                <div key={key} className="mb-3">
                  <p className="text-[11px] font-medium uppercase text-slate-500">
                    {key}
                  </p>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      setThresholds({
                        ...thresholds,
                        [key]: Number(e.target.value),
                      })
                    }
                    className="w-full mt-1 px-2 py-1 rounded border border-slate-200 text-sm"
                  />
                </div>
              ))}
  
              <button
                onClick={() => setShowThresholds(false)}
                className="w-full mt-4 bg-slate-900 text-white py-2 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export default Analytics;
  