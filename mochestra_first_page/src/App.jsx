import { useState } from "react";
import ClockCard from "./components/ClockCard";
import WeatherCard from "./components/WeatherCard";
import "./App.css";

export default function App() {
  const [showClock, setShowClock] = useState(true);
  const [showWeather, setShowWeather] = useState(true);

  return (
    <div className="page">
      <div className="card-stack">
        {showClock && <ClockCard onClose={() => setShowClock(false)} />}
        {showWeather && <WeatherCard onClose={() => setShowWeather(false)} />}
      </div>
    </div>
  );
}
